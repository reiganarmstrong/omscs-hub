from __future__ import annotations

import json
import re
from html import unescape
from typing import Any

NEXT_FLIGHT_RE = re.compile(r'self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)')
ARTICLE_RE = re.compile(r"<article\b[^>]*>(.*?)</article>", re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def parse_courses(home_html: str) -> list[dict[str, Any]]:
    payload = _decode_next_flight_payload(home_html)
    courses: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    decoder = json.JSONDecoder()

    for match in re.finditer(r'\{"_createdAt"', payload):
        try:
            value, _ = decoder.raw_decode(payload[match.start() :])
        except json.JSONDecodeError:
            continue
        if not isinstance(value, dict) or value.get("_type") != "course":
            continue
        course = _replace_react_undefined(value)
        course_id = str(course.get("id") or course.get("_id") or course.get("slug"))
        if course_id in seen_ids:
            continue
        seen_ids.add(course_id)
        courses.append(course)

    courses.sort(key=lambda course: (course.get("codes") or [course.get("name", "")])[0])
    return courses


def parse_reviews(reviews_html: str, *, course_slug: str | None = None, course_name: str | None = None) -> list[dict[str, Any]]:
    reviews: list[dict[str, Any]] = []
    for article_html in ARTICLE_RE.findall(reviews_html):
        review = _parse_article(article_html, course_slug=course_slug, course_name=course_name)
        if review:
            reviews.append(review)
    return reviews


def _decode_next_flight_payload(html: str) -> str:
    chunks: list[str] = []
    for match in NEXT_FLIGHT_RE.finditer(html):
        try:
            chunks.append(json.loads(f'"{match.group(1)}"'))
        except json.JSONDecodeError:
            continue
    return "".join(chunks)


def _replace_react_undefined(value: Any) -> Any:
    if value == "$undefined":
        return None
    if isinstance(value, list):
        return [_replace_react_undefined(item) for item in value]
    if isinstance(value, dict):
        return {key: _replace_react_undefined(item) for key, item in value.items()}
    return value


def _parse_article(article_html: str, *, course_slug: str | None, course_name: str | None) -> dict[str, Any] | None:
    text = _html_to_text(article_html)
    rating = _find_number(r"Rating:\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*5", text)
    difficulty = _find_number(r"Difficulty:\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*5", text)
    workload = _find_number(r"Workload:\s*([0-9]+(?:\.[0-9]+)?)\s*hours?\s*/\s*week", text)
    created_at = _find_attr(article_html, "time", "datetime") or _find_attr(article_html, "time", "dateTime")
    author = _find_first(
        [
            r'<span[^>]*class="[^"]*\bfont-medium\b[^"]*"[^>]*>(.*?)</span>',
            r"<span[^>]*class='[^']*\bfont-medium\b[^']*'[^>]*>(.*?)</span>",
        ],
        article_html,
    )
    semester = _find_first(
        [
            r'<span[^>]*class="[^"]*\bcapitalize\b[^"]*"[^>]*>(.*?)</span>',
            r"<span[^>]*class='[^']*\bcapitalize\b[^']*'[^>]*>(.*?)</span>",
        ],
        article_html,
    )
    course_link = _parse_course_link(article_html)
    body_html = _find_first(
        [r'<div[^>]*class="[^"]*\bwrap-break-word\b[^"]*"[^>]*>(.*?)</div>'],
        article_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    body = _html_to_text(body_html or "")

    resolved_slug = course_slug or (course_link[0] if course_link else None)
    resolved_name = course_name or (course_link[1] if course_link else None)
    if not body and rating is None and created_at is None:
        return None

    return {
        "author": _clean_inline(author),
        "createdAt": created_at,
        "semester": _clean_inline(semester),
        "courseSlug": resolved_slug,
        "courseName": resolved_name,
        "body": body,
        "rating": rating,
        "difficulty": difficulty,
        "workload": workload,
    }


def _parse_course_link(article_html: str) -> tuple[str, str] | None:
    match = re.search(
        r'<a\b[^>]*href="\/courses\/([^"/]+)\/reviews"[^>]*>(.*?)</a>',
        article_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return None
    return match.group(1), _clean_inline(match.group(2)) or ""


def _find_number(pattern: str, text: str) -> float | int | None:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    return int(value) if value.is_integer() else value


def _find_attr(html: str, tag: str, attr: str) -> str | None:
    match = re.search(rf"<{tag}\b[^>]*\b{attr}=[\"']([^\"']+)[\"']", html, flags=re.IGNORECASE)
    return unescape(match.group(1)) if match else None


def _find_first(patterns: list[str], html: str, *, flags: int = re.IGNORECASE | re.DOTALL) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, html, flags=flags)
        if match:
            return match.group(1)
    return None


def _html_to_text(html: str) -> str:
    cleaned = COMMENT_RE.sub("", html)
    cleaned = re.sub(r"</(p|li|ul|ol|br|div|h[1-6])\s*>", "\n", cleaned, flags=re.IGNORECASE)
    cleaned = TAG_RE.sub(" ", cleaned)
    return _normalize_space(unescape(cleaned))


def _clean_inline(html: str | None) -> str | None:
    if html is None:
        return None
    value = _html_to_text(html)
    return value or None


def _normalize_space(text: str) -> str:
    lines = [" ".join(line.split()) for line in text.splitlines()]
    return "\n".join(line for line in lines if line).strip()

