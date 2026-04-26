from __future__ import annotations

import json
import tempfile
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol
from urllib.parse import urljoin

from omscentral_scraper.client import OmsCentralClient
from omscentral_scraper.parsers import parse_courses, parse_reviews


class TextClient(Protocol):
    base_url: str

    def fetch_text(self, path: str) -> str:
        ...


@dataclass(frozen=True)
class ScrapeResult:
    output_dir: Path
    courses_count: int
    reviews_count: int
    manifest_path: Path


def scrape_omscentral(
    *,
    output_dir: Path,
    client: TextClient | None = None,
    course_slugs: list[str] | None = None,
    limit_courses: int | None = None,
    skip_reviews: bool = False,
    delay_seconds: float = 0.25,
) -> ScrapeResult:
    client = client or OmsCentralClient()
    output_dir.mkdir(parents=True, exist_ok=True)
    course_reviews_dir = output_dir / "course_reviews"
    course_reviews_dir.mkdir(parents=True, exist_ok=True)

    home_html = client.fetch_text("/")
    courses = parse_courses(home_html)
    selected_courses = _select_courses(courses, course_slugs=course_slugs, limit_courses=limit_courses)
    all_reviews: list[dict] = []
    course_review_counts: dict[str, int] = {}

    if not skip_reviews:
        for index, course in enumerate(selected_courses):
            slug = course.get("slug")
            if not slug:
                continue
            if not course.get("reviewCount"):
                reviews = []
            else:
                reviews = _fetch_course_reviews(client, str(slug), str(course.get("name") or ""))
            course_review_counts[str(slug)] = len(reviews)
            all_reviews.extend(reviews)
            _write_json(course_reviews_dir / f"{slug}.json", reviews)
            if delay_seconds > 0 and index < len(selected_courses) - 1:
                time.sleep(delay_seconds)

    manifest = {
        "scrapedAt": datetime.now(UTC).isoformat(),
        "source": {
            "baseUrl": client.base_url,
            "coursesUrl": urljoin(client.base_url, "/"),
        },
        "coursesCount": len(courses),
        "selectedCoursesCount": len(selected_courses),
        "reviewsCount": len(all_reviews),
        "courseReviewCounts": course_review_counts,
    }
    _write_json(output_dir / "courses.json", courses)
    _write_json(output_dir / "reviews.json", all_reviews)
    _write_json(output_dir / "manifest.json", manifest)
    return ScrapeResult(
        output_dir=output_dir,
        courses_count=len(courses),
        reviews_count=len(all_reviews),
        manifest_path=output_dir / "manifest.json",
    )


def _select_courses(
    courses: list[dict],
    *,
    course_slugs: list[str] | None,
    limit_courses: int | None,
) -> list[dict]:
    selected = courses
    if course_slugs:
        wanted = set(course_slugs)
        selected = [course for course in courses if course.get("slug") in wanted]
    if limit_courses is not None:
        selected = selected[:limit_courses]
    return selected


def _fetch_course_reviews(client: TextClient, slug: str, name: str) -> list[dict]:
    html = client.fetch_text(f"/courses/{slug}/reviews")
    reviews = parse_reviews(html, course_slug=slug, course_name=name)
    for review in reviews:
        review["sourceUrl"] = urljoin(client.base_url, f"/courses/{slug}/reviews")
    return reviews


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as tmp:
        tmp.write(encoded)
        temp_path = Path(tmp.name)
    temp_path.replace(path)
