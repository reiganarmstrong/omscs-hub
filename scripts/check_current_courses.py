"""Compare Georgia Tech's current OMSCS list with the published Catalog.

This writes a review proposal, never user-facing course data. Course pages and
the Registrar's catalog must be checked by a person before editing catalog.json.
"""

import argparse
import difflib
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

SOURCE_URL = "https://omscs.gatech.edu/current-courses"
CODE = re.compile(r"^([A-Z]{2,4} \d{4}(?: [A-Z0-9]+)?):\s*(.+)$")
FORMER = re.compile(r"\bformerly\s+([A-Z]{2,4} \d{4}(?: [A-Z0-9]+)?)", re.I)


class SourceError(ValueError):
    """The official listing cannot be interpreted safely."""


@dataclass(frozen=True)
class Listing:
    code: str
    title: str
    aliases: tuple[str, ...]
    foundational: bool
    source_url: str


class CourseListParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heading = False
        self.heading_text = ""
        self.next_list = False
        self.in_list = False
        self.finished = False
        self.li = None
        self.in_link = False
        self.items = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h4" and not self.finished:
            self.heading = True
            self.heading_text = ""
        elif tag == "ul" and self.next_list:
            self.next_list = False
            self.in_list = True
        elif tag == "li" and self.in_list:
            if self.li is not None:
                raise SourceError("Nested course list item")
            self.li = {"before": "", "after": "", "link": "", "href": None, "links": 0}
        elif tag == "a" and self.li is not None:
            self.li["links"] += 1
            self.li["href"] = attrs.get("href")
            self.in_link = True

    def handle_data(self, data):
        if self.heading:
            self.heading_text += data
        if self.li is not None:
            key = "link" if self.in_link else "after" if self.li["links"] else "before"
            self.li[key] += data

    def handle_endtag(self, tag):
        if tag == "h4" and self.heading:
            self.heading = False
            if " ".join(self.heading_text.split()) == "Current & Ongoing OMS Courses":
                self.next_list = True
        elif tag == "a" and self.li is not None:
            self.in_link = False
        elif tag == "li" and self.li is not None:
            if self.in_link:
                raise SourceError("Unclosed course link")
            self.items.append(self.li)
            self.li = None
        elif tag == "ul" and self.in_list:
            if self.li is not None:
                raise SourceError("Unclosed course list item")
            self.in_list = False
            self.finished = True


class CoursePageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.parts = []
        self.finished = False

    def handle_starttag(self, tag, attrs):
        if self.depth and tag not in {"area", "br", "hr", "img", "input", "link", "meta", "source", "wbr"}:
            self.depth += 1
        elif tag == "div" and "field--name-body" in dict(attrs).get("class", "").split():
            self.depth = 1

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1
            if not self.depth:
                self.finished = True

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)


def parse_course_page(html):
    parser = CoursePageParser()
    parser.feed(html)
    parser.close()
    text = " ".join(" ".join(parser.parts).split())
    if not parser.finished or not text:
        raise SourceError("Official course page body missing or malformed")
    return text


def fetch_html(url):
    request = Request(url, headers={"User-Agent": "omscs-hub-source-check/1.0"})
    with urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise SourceError(f"Official source returned HTTP {response.status}: {url}")
        return response.read().decode("utf-8")


def fetch_pages(listings):
    def fetch(listing):
        try:
            return listing.code, parse_course_page(fetch_html(listing.source_url))
        except (OSError, UnicodeError, ValueError) as error:
            raise SourceError(f"{listing.code} page failed: {error}") from error

    with ThreadPoolExecutor(max_workers=8) as pool:
        return dict(pool.map(fetch, listings))


def compare_page_facts(listings, pages, baseline):
    if not isinstance(baseline, dict) or baseline.get("sourceUrl") != SOURCE_URL:
        raise SourceError("Course page baseline missing or malformed")
    old_pages = baseline.get("pages")
    if not isinstance(old_pages, dict):
        raise SourceError("Course page baseline missing pages")
    changes = []
    details = []
    for listing in listings:
        previous = old_pages.get(listing.code)
        if previous is None:
            continue  # A new course is already proposed for human review.
        if not isinstance(previous, dict) or not isinstance(previous.get("url"), str) or not isinstance(previous.get("text"), str):
            raise SourceError(f"Course page baseline malformed for {listing.code}")
        previous_url = urlparse(previous["url"])
        if previous_url.scheme != "https" or previous_url.hostname not in {"omscs.gatech.edu", "www.omscs.gatech.edu"}:
            raise SourceError(f"Course page baseline URL malformed for {listing.code}")
        current = pages[listing.code]
        if previous["text"] == current:
            continue
        changes.append(("Changed page fact", listing.code, f"Official course page changed: {listing.source_url}"))
        diff = difflib.unified_diff(
            previous["text"].split(". "), current.split(". "),
            fromfile="previous source", tofile="current source", lineterm="",
        )
        details.append((listing.code, listing.source_url, "\n".join(diff)))
    return changes, details


def parse_listing(html):
    parser = CourseListParser()
    parser.feed(html)
    parser.close()
    if not parser.finished or not parser.items:
        raise SourceError("Current & Ongoing OMS Courses list missing or empty")

    courses = []
    seen_codes = set()
    seen_aliases = set()
    for item in parser.items:
        if item["links"] != 1 or not item["href"]:
            raise SourceError("Course list item has missing or multiple links")
        linked_text = " ".join(item["link"].split())
        linked_marker = linked_text.startswith("*")
        if linked_marker:
            linked_text = linked_text[1:].strip()
        match = CODE.fullmatch(linked_text)
        if not match:
            raise SourceError(f"Malformed course link: {linked_text!r}")
        code, title = match.groups()
        url = urljoin(SOURCE_URL, item["href"])
        parsed_url = urlparse(url)
        if parsed_url.scheme != "https" or parsed_url.hostname not in {"omscs.gatech.edu", "www.omscs.gatech.edu"}:
            raise SourceError(f"Unexpected course URL for {code}: {url}")
        if code in seen_codes:
            raise SourceError(f"Duplicate course code: {code}")
        seen_codes.add(code)
        before = " ".join(item["before"].split())
        if before not in {"", "*"}:
            raise SourceError(f"Unexpected course marker for {code}: {before!r}")
        after = " ".join(item["after"].split())
        aliases = tuple(FORMER.findall(after))
        if "formerly" in after.lower() and not aliases:
            raise SourceError(f"Malformed former-code annotation for {code}")
        for alias in aliases:
            if alias in seen_aliases:
                raise SourceError(f"Duplicate former code: {alias}")
            seen_aliases.add(alias)
        courses.append(Listing(code, title, aliases, before == "*" or linked_marker, url))
    if seen_codes & seen_aliases:
        raise SourceError(f"Current code also appears as former code: {sorted(seen_codes & seen_aliases)}")
    return courses


def compare(listings, catalog):
    published = catalog.get("courses")
    if not isinstance(published, list) or not published:
        raise SourceError("Published Catalog missing courses")
    if len(listings) < max(1, len(published) * 3 // 4):
        raise SourceError(f"Official listing unexpectedly small: {len(listings)} vs {len(published)} published")
    if catalog.get("sourceUrl") != SOURCE_URL:
        raise SourceError("Published Catalog uses an unexpected current-course source")

    by_code = {}
    title_to_codes = {}
    aliases = {}
    for course in published:
        code = course.get("code")
        title = course.get("title")
        if not isinstance(code, str) or not isinstance(title, str) or code in by_code:
            raise SourceError("Published Catalog has malformed or duplicate course identity")
        by_code[code] = course
        title_to_codes.setdefault(title.casefold(), []).append(code)
        for alias in course.get("aliases", []):
            if alias in aliases and aliases[alias] != code:
                raise SourceError(f"Published alias has multiple owners: {alias}")
            aliases[alias] = code

    changes = []
    matched = set()
    for listing in listings:
        course = by_code.get(listing.code)
        if course is None:
            owners = {by_code[a]["code"] for a in listing.aliases if a in by_code}
            if listing.code in aliases:
                owners.add(aliases[listing.code])
            owners.update(title_to_codes.get(listing.title.casefold(), []))
            if len(owners) != 1 or not any(a in by_code for a in listing.aliases):
                if owners:
                    raise SourceError(f"Ambiguous identity for {listing.code}: {sorted(owners)}")
                changes.append(("Added", listing.code, "New official listing; verify credits, description, and preparation before adding to Catalog."))
                continue
            old_code = next(iter(owners))
            if old_code in matched:
                raise SourceError(f"Multiple official entries map to {old_code}")
            matched.add(old_code)
            changes.append(("Renamed", listing.code, f"{old_code} to {listing.code}; explicit former-code annotation. Review identity and related references."))
            continue
        if listing.code in matched:
            raise SourceError(f"Multiple official entries map to {listing.code}")
        matched.add(listing.code)
        for field, observed in (
            ("title", listing.title),
            ("foundational", listing.foundational),
            ("aliases", list(listing.aliases)),
            ("sourceUrl", listing.source_url),
        ):
            if course.get(field) != observed:
                changes.append(("Changed fact", listing.code, f"{field}: {course.get(field)!r} to {observed!r}"))
    for code in by_code.keys() - matched:
        changes.append(("Removed", code, "Absent from official current-course list; verify before changing current availability."))
    return sorted(changes)


def render_report(changes, checked_at, page_details=()):
    lines = [
        "# Current-course Catalog review proposal",
        "",
        f"Official source: {SOURCE_URL}",
        f"Checked at: {checked_at}",
        "",
        "Review each item against its linked course page and the Registrar's catalog. This proposal does not update published Catalog facts.",
        "",
        "| Change | Course | Published vs official source |",
        "| --- | --- | --- |",
    ]
    for kind, code, detail in changes:
        lines.append(f"| {kind} | {code} | {detail.replace('|', '&#124;')} |")
    for code, url, diff in page_details:
        lines += ["", f"## {code} page text change", "", f"Source: {url}", "", "```diff", diff, "```"]
    lines += ["", "The companion `proposals/catalog-change-set.json` records proposed Catalog operations with official and published values. Verify every operation, fill facts absent from the source list, then edit `ui/lib/data/catalog.json` and the page baseline in this draft PR before merge.", ""]
    return "\n".join(lines)


def build_change_set(changes, listings, catalog, checked_at, page_details):
    by_code = {course["code"]: course for course in catalog["courses"]}
    official = {listing.code: listing for listing in listings}
    page_diffs = {code: diff for code, _, diff in page_details}
    operations = []
    for kind, code, detail in changes:
        listing = official.get(code)
        source_fields = None if listing is None else {
            "code": listing.code,
            "title": listing.title,
            "aliases": list(listing.aliases),
            "foundational": listing.foundational,
            "sourceUrl": listing.source_url,
        }
        published = by_code.get(code)
        if kind == "Renamed" and listing is not None:
            old_codes = [alias for alias in listing.aliases if alias in by_code]
            published = by_code[old_codes[0]] if len(old_codes) == 1 else None
        operation = {"kind": kind, "code": code, "difference": detail, "official": source_fields, "published": published}
        if kind == "Added":
            operation["requiresHumanVerification"] = ["identity", "credits", "description", "prerequisites"]
        if code in page_diffs:
            operation["pageTextDiff"] = page_diffs[code]
        operations.append(operation)
    return {"schemaVersion": 1, "sourceUrl": SOURCE_URL, "checkedAt": checked_at, "operations": operations}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-file", type=Path, help="Local HTML for a deterministic dry run")
    parser.add_argument("--catalog", type=Path, default=Path("ui/lib/data/catalog.json"))
    parser.add_argument("--page-baseline", type=Path, default=Path("scripts/data/current-course-pages.json"))
    parser.add_argument("--report", type=Path, default=Path("proposals/current-course-catalog.md"))
    parser.add_argument("--change-set", type=Path, default=Path("proposals/catalog-change-set.json"))
    args = parser.parse_args()
    try:
        if args.source_file:
            html = args.source_file.read_text(encoding="utf-8")
        else:
            html = fetch_html(SOURCE_URL)
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        listings = parse_listing(html)
        changes = compare(listings, catalog)
        page_details = []
        if not args.source_file:
            baseline = json.loads(args.page_baseline.read_text(encoding="utf-8"))
            page_changes, page_details = compare_page_facts(listings, fetch_pages(listings), baseline)
            changes += page_changes
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Source check failed closed: {error}", file=sys.stderr)
        return 1
    if not changes:
        print("Official current-course list matches published Catalog list facts")
        return 0
    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(render_report(changes, checked_at, page_details), encoding="utf-8")
    args.change_set.parent.mkdir(parents=True, exist_ok=True)
    args.change_set.write_text(json.dumps(build_change_set(changes, listings, catalog, checked_at, page_details), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Found {len(changes)} Catalog differences; proposal: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
