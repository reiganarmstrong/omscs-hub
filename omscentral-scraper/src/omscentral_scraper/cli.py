from __future__ import annotations

import argparse
from pathlib import Path

from omscentral_scraper.client import OmsCentralClient
from omscentral_scraper.scraper import scrape_omscentral


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape OMSCentral course and review data into JSON files.")
    parser.add_argument("--base-url", default="https://www.omscentral.com/", help="OMSCentral base URL.")
    parser.add_argument("--output-dir", type=Path, default=Path("data"), help="Directory for JSON output.")
    parser.add_argument("--course-slug", action="append", dest="course_slugs", help="Only scrape one course slug. Repeatable.")
    parser.add_argument("--limit-courses", type=int, help="Limit number of courses scraped, useful for smoke tests.")
    parser.add_argument("--skip-reviews", action="store_true", help="Only scrape course catalog.")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between course review requests in seconds.")
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout in seconds.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    client = OmsCentralClient(base_url=args.base_url, timeout=args.timeout)
    result = scrape_omscentral(
        output_dir=args.output_dir,
        client=client,
        course_slugs=args.course_slugs,
        limit_courses=args.limit_courses,
        skip_reviews=args.skip_reviews,
        delay_seconds=args.delay,
    )
    print(f"wrote {result.courses_count} courses and {result.reviews_count} reviews to {result.output_dir}")
    print(f"manifest: {result.manifest_path}")
    return 0

