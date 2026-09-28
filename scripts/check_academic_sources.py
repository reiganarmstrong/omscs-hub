"""Propose human review of official OMSCS specialization and term-schedule drift.

Official pages are evidence, not executable rule or offering updates. This check
only writes proposal files. Published academic facts change in a reviewed PR.
"""

import argparse
import difflib
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

CALENDAR_URL = "https://registrar.gatech.edu/current-academic-calendar"
CALENDAR_DATA_URL = "https://registrar.gatech.edu/calevents/proxy"
SCHEDULE_URL = "https://oscar.gatech.edu/bprod/bwckctlg.p_disp_listcrse"
RELEASE = re.compile(r"(?:\b(Spring|Summer|Fall) (\d{4}) )?Schedule of Classes available online", re.I)
SECTION = re.compile(r"<th\b[^>]*class=[\"']ddtitle[\"'][^>]*>\s*<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", re.I | re.S)
NO_CLASSES = "No classes were found that meet your search criteria"


class SourceError(ValueError):
    """Source cannot safely verify published academic data."""


@dataclass(frozen=True)
class ScheduleResult:
    state: str  # unreleased, unverified, or listed
    sections: tuple[str, ...] = ()


class SpecializationParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.blocks = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if self.depth:
            if tag not in {"br", "hr", "img", "input", "meta", "wbr"}:
                self.depth += 1
            if tag in {"p", "li", "h2", "h3", "h4", "h5"}:
                self.parts.append("\n")
            if tag in {"strong", "b"}:
                self.parts.append("**")
        elif tag == "div" and "field--name-field-multi-body" in dict(attrs).get("class", "").split():
            self.depth = 1
            self.parts = []

    def handle_endtag(self, tag):
        if self.depth and tag not in {"br", "hr", "img", "input", "meta", "wbr"}:
            if tag in {"strong", "b"}:
                self.parts.append("**")
            if tag in {"p", "li", "h2", "h3", "h4", "h5"}:
                self.parts.append("\n")
            self.depth -= 1
            if not self.depth:
                lines = [" ".join(line.split()) for line in "".join(self.parts).splitlines()]
                self.blocks.append("\n".join(line for line in lines if line))

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)


def parse_specialization(html):
    parser = SpecializationParser()
    parser.feed(html)
    parser.close()
    if len(parser.blocks) > 1:
        raise SourceError("Specialization rules ambiguous: multiple rule bodies")
    if parser.depth or not parser.blocks or not parser.blocks[0]:
        raise SourceError("Specialization source missing or malformed")
    return parser.blocks[0]


def parse_calendar(payload, *, allow_no_releases=False):
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list) or not rows:
        raise SourceError("Registrar calendar missing or malformed")
    releases = {}
    for row in rows:
        if not isinstance(row, dict):
            raise SourceError("Registrar calendar event malformed")
        event = re.sub(r"<[^>]+>", " ", str(row.get("event", "")))
        match = RELEASE.search(" ".join(unescape(event).split()))
        if not match:
            continue
        try:
            year = int(row["year"])
            date_match = re.fullmatch(r"([A-Za-z]+) (\d{1,2}) \([A-Za-z]+\)", row["date"])
            if not date_match:
                raise ValueError("date format")
            release = datetime.strptime(f"{date_match[1]} {date_match[2]} {year}", "%B %d %Y").date()
            semester = row["semester"]
        except (KeyError, TypeError, ValueError) as error:
            raise SourceError("Registrar release date malformed") from error
        if match[1]:
            term = f"{match[1].title()}-{match[2]}"
        else:
            season = {"2": "Spring", "5F": "Summer", "5M": "Summer", "5E": "Summer", "5L": "Summer", "8": "Fall"}.get(semester)
            if not season:
                raise SourceError(f"Unknown Registrar semester code: {semester}")
            term_year = year + 1 if season == "Spring" and release.month >= 8 else year
            term = f"{season}-{term_year}"
        previous = releases.get(term)
        if previous and previous != release:
            raise SourceError(f"Conflicting Registrar release dates for {term}")
        releases[term] = release
    if not releases and not allow_no_releases:
        raise SourceError("Registrar calendar has no Schedule of Classes release dates")
    return releases


def term_to_code(term):
    match = re.fullmatch(r"(Spring|Summer|Fall)-(\d{4})", term)
    if not match:
        raise SourceError(f"Malformed term: {term}")
    suffix = {"Spring": "02", "Summer": "05", "Fall": "08"}[match[1]]
    return f"{match[2]}{suffix}"


def schedule_url(course_code, term):
    match = re.fullmatch(r"([A-Z]{2,4}) (\d{4})(?: ([A-Z0-9]+))?", course_code)
    if not match:
        raise SourceError(f"Malformed published course code: {course_code}")
    return f"{SCHEDULE_URL}?crse_in={match[2]}&schd_in=%25&subj_in={match[1]}&term_in={term_to_code(term)}"


def parse_schedule(html, course_code, term, known_sections=()):
    if "Not a valid term" in html:
        return ScheduleResult("unreleased")
    if NO_CLASSES in html:
        return ScheduleResult("unverified")
    if f"{term.split('-')[0]} {term.split('-')[1]}" not in html:
        raise SourceError(f"OSCAR schedule malformed for {course_code} {term}")
    matches = list(SECTION.finditer(html))
    if not matches:
        raise SourceError(f"OSCAR schedule malformed for {course_code} {term}")
    target = re.fullmatch(r"([A-Z]{2,4} \d{4})(?: ([A-Z0-9]+))?", course_code)
    if not target:
        raise SourceError(f"Malformed published course code: {course_code}")
    sections = set()
    for index, match in enumerate(matches):
        href, label = unescape(match[1]), " ".join(unescape(re.sub(r"<[^>]+>", "", match[2])).split())
        if f"term_in={term_to_code(term)}" not in href or not href.startswith("/bprod/bwckschd.p_disp_detail_sched?"):
            raise SourceError(f"OSCAR section URL malformed for {course_code} {term}")
        detail = re.fullmatch(r".+ - \d+ - ([A-Z]{2,4} \d{4}(?: [A-Z0-9]+)?) - ([A-Z0-9]+)", label)
        if not detail:
            raise SourceError(f"OSCAR section label malformed for {course_code} {term}")
        if detail[1] != target[1]:
            raise SourceError(f"OSCAR returned unexpected course {detail[1]} for {course_code}")
        if target[2] and detail[2] != target[2]:
            continue
        body = html[match.end():matches[index + 1].start() if index + 1 < len(matches) else len(html)]
        if "Online Campus" in body and (re.fullmatch(r"O\d{2}", detail[2]) or detail[2] == target[2] or detail[2] in known_sections):
            sections.add(detail[2])
    return ScheduleResult("listed", tuple(sorted(sections)))


def fetch(url, *, calendar=False):
    headers = {"User-Agent": "Mozilla/5.0 (compatible; omscs-hub-source-check/1.0)"}
    if calendar:
        headers.update({"Referer": CALENDAR_URL, "Accept": "application/json, text/javascript, */*; q=0.01", "X-Requested-With": "XMLHttpRequest"})
    with urlopen(Request(url, headers=headers), timeout=30) as response:
        if response.status != 200:
            raise SourceError(f"Official source returned HTTP {response.status}: {url}")
        return response.read().decode("utf-8")


def compare_rules(observed, published, baseline):
    if not isinstance(published, list) or not published or not isinstance(baseline, dict):
        raise SourceError("Published Specialization rules or baseline malformed")
    pages = baseline.get("pages")
    if not isinstance(pages, dict) or set(pages) != {rule.get("id") for rule in published} or set(observed) != set(pages):
        raise SourceError("Specialization source identity mismatch")
    changes = []
    for rule in published:
        key, url = rule["id"], rule["sourceUrl"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in {"omscs.gatech.edu", "www.omscs.gatech.edu"}:
            raise SourceError(f"Invalid official Specialization URL: {key}")
        old = pages[key]
        if not isinstance(old, dict) or old.get("sourceUrl") != url or not isinstance(old.get("text"), str) or not old["text"] or not isinstance(old.get("published"), dict):
            raise SourceError(f"Specialization baseline malformed: {key}")
        if old["published"] != rule:
            raise SourceError(f"Published Specialization rules differ from reviewed source baseline: {key}")
        if old["text"] != observed[key]:
            diff = "\n".join(difflib.unified_diff(old["text"].splitlines(), observed[key].splitlines(), fromfile="reviewed source", tofile="current source", lineterm=""))
            changes.append({"kind": "Changed rule source", "id": key, "sourceUrl": url, "difference": diff, "published": rule, "requiresHumanVerification": True})
    return changes


def compare_offerings(observed, published, term, verified_course_ids=None):
    rows = published.get("offerings") if isinstance(published, dict) else None
    if not isinstance(rows, list):
        raise SourceError("Published confirmed offerings malformed")
    old = {(row["courseId"], row["section"]): row for row in rows if row.get("termKey") == term and (verified_course_ids is None or row.get("courseId") in verified_course_ids)}
    new = {(row["courseId"], row["section"]): row for row in observed}
    if len(new) != len(observed):
        raise SourceError(f"Duplicate official online section for {term}")
    changes = []
    for key in sorted(new.keys() - old.keys()):
        changes.append({"kind": "Added", "termKey": term, "courseId": key[0], "section": key[1], "sourceUrl": new[key]["sourceUrl"], "official": new[key], "published": None, "requiresHumanVerification": True})
    for key in sorted(old.keys() - new.keys()):
        changes.append({"kind": "Removed", "termKey": term, "courseId": key[0], "section": key[1], "sourceUrl": old[key]["sourceUrl"], "published": old[key], "requiresHumanVerification": True})
    return changes


def render_report(rule_changes, offering_changes, checked_at, calendar_url, unverified_terms=(), unverified_courses=()):
    lines = ["# Academic source review proposal", "", f"Checked at: {checked_at}", f"Registrar release calendar: {calendar_url}", "", "Official source differences require human verification. This proposal does not change published rules or confirmed offerings.", "", "## Specialization rules", ""]
    if not rule_changes:
        lines.append("No rule-source differences.")
    for item in rule_changes:
        lines += ["", f"### {item['published']['name']}", "", f"Source: {item['sourceUrl']}", "", "Published rule:", "", "```json", json.dumps(item["published"], indent=2, ensure_ascii=False), "```", "", "```diff", item["difference"], "```"]
    lines += ["", "## Confirmed term offerings", ""]
    if offering_changes:
        lines += ["| Change | Term | Course | Section | Official source |", "| --- | --- | --- | --- | --- |"]
        for item in offering_changes:
            cells = (item["kind"], item["termKey"], item["courseId"], item["section"], item["sourceUrl"])
            lines.append("| " + " | ".join(str(cell).replace("|", "&#124;") for cell in cells) + " |")
    else:
        lines.append("No confirmed-offering differences.")
    if unverified_terms or unverified_courses:
        lines += ["", "## Unverified", "", "These remain unverified and produce no offering changes until OSCAR lists them."]
        lines += [f"- Term schedule not yet listed: {term}" for term in unverified_terms]
        lines += [f"- No classes found: {item}" for item in unverified_courses]
    lines += ["", "Review source pages and section identity, then edit `ui/lib/data/specializations.ts`, `ui/lib/data/confirmed-offerings.json`, and the reviewed source baseline as appropriate in this draft PR. Do not merge a proposal alone.", ""]
    return "\n".join(lines)


def load_rules(path):
    if path:
        return json.loads(path.read_text(encoding="utf-8"))
    result = subprocess.run(["node", "scripts/export-specialization-rules.mjs"], cwd="ui", capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def load_releases(today):
    """Merge release dates from overlapping Registrar calendar windows around today."""
    academic_start = today.year if today.month >= 5 else today.year - 1
    releases = {}
    for start in (academic_start - 1, academic_start, academic_start + 1):
        window = f"{start}-{start + 1}"
        payload = json.loads(fetch(f"{CALENDAR_DATA_URL}?year={window}&status=current", calendar=True))
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise SourceError(f"Registrar {window} calendar malformed")
        found = parse_calendar(payload, allow_no_releases=True) if payload["data"] else {}
        if start == academic_start + 1 and not found:
            print(f"::warning::Registrar {window} calendar has no Schedule of Classes release date; future terms remain unverified")
        for term, release in found.items():
            if releases.get(term, release) != release:
                raise SourceError(f"Conflicting Registrar release dates for {term}")
            releases[term] = release
    if not releases:
        raise SourceError("Registrar calendar has no Schedule of Classes release dates")
    return releases


def check(args):
    rules = load_rules(args.rules)
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    confirmed = json.loads(args.confirmed.read_text(encoding="utf-8"))
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    today = date.fromisoformat(args.today) if args.today else datetime.now(timezone.utc).date()
    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    urls = {rule["id"]: rule["sourceUrl"] for rule in rules}
    def get_rule(item):
        key, url = item
        return key, parse_specialization(fetch(url))
    with ThreadPoolExecutor(max_workers=6) as pool:
        observed_rules = dict(pool.map(get_rule, urls.items()))
    rule_changes = compare_rules(observed_rules, rules, baseline)

    releases = load_releases(today)
    season_order = {"Spring": 0, "Summer": 1, "Fall": 2}
    current_season = "Spring" if today.month <= 4 else "Summer" if today.month <= 8 else "Fall"
    current_order = (today.year, season_order[current_season])
    terms = [term for term, release in sorted(releases.items()) if release <= today and (int(term.split("-")[1]), season_order[term.split("-")[0]]) >= current_order]
    courses = catalog.get("courses") if isinstance(catalog, dict) else None
    if not isinstance(courses, list) or not courses:
        raise SourceError("Published Catalog missing courses")
    confirmed_rows = confirmed.get("offerings") if isinstance(confirmed, dict) else None
    if not isinstance(confirmed_rows, list):
        raise SourceError("Published confirmed offerings malformed")
    offerings = []
    pending = []
    unverified_courses = []
    for term in terms:
        def get_course(course):
            code = course["code"]
            url = schedule_url(code, term)
            known = {row["section"] for row in confirmed_rows if row["courseId"] == course["id"]}
            return course["id"], url, parse_schedule(fetch(url), code, term, known)
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(get_course, courses))
        unreleased = sum(result.state == "unreleased" for _, _, result in results)
        if unreleased == len(results):
            pending.append(term)
            print(f"::warning::OSCAR {term} Schedule of Classes is not listed after its {releases[term].isoformat()} release date; term remains unverified and will be checked again")
            continue
        if unreleased:
            raise SourceError(f"OSCAR returned inconsistent availability for {term}")
        verified_ids = {course_id for course_id, _, result in results if result.state == "listed"}
        unverified_ids = {course_id for course_id, _, result in results if result.state == "unverified"}
        unverified_courses += [f"{term}: {course_id}" for course_id in sorted(unverified_ids)]
        for row in confirmed_rows:
            if row.get("termKey") == term and row.get("courseId") in unverified_ids:
                print(f"::warning::OSCAR found no classes for confirmed {term} {row['courseId']} {row.get('section')}; published offering left unchanged for human review")
        observed = [{"courseId": course_id, "termKey": term, "section": section, "sourceUrl": url, "scheduleDate": today.isoformat()} for course_id, url, result in results if result.state == "listed" for section in result.sections]
        if not observed:
            raise SourceError(f"OSCAR {term} has no verified online sections; keep term unverified")
        offerings += compare_offerings(observed, confirmed, term, verified_ids)
    if not rule_changes and not offerings:
        print(f"Official rules and released offerings match published evidence; unverified terms: {', '.join(pending) or 'none'}; unverified course checks: {len(unverified_courses)}")
        return 0
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.change_set.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(render_report(rule_changes, offerings, checked_at, CALENDAR_URL, pending, unverified_courses), encoding="utf-8")
    args.change_set.write_text(json.dumps({"schemaVersion": 1, "checkedAt": checked_at, "calendarUrl": CALENDAR_URL, "ruleChanges": rule_changes, "offeringChanges": offerings, "unverifiedTerms": pending, "unverifiedCourseChecks": unverified_courses}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Found {len(rule_changes)} rule-source and {len(offerings)} offering differences; proposal: {args.report}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules", type=Path)
    parser.add_argument("--baseline", type=Path, default=Path("scripts/data/specialization-pages.json"))
    parser.add_argument("--confirmed", type=Path, default=Path("ui/lib/data/confirmed-offerings.json"))
    parser.add_argument("--catalog", type=Path, default=Path("ui/lib/data/catalog.json"))
    parser.add_argument("--today", help="UTC date override for deterministic fixture runs")
    parser.add_argument("--report", type=Path, default=Path("proposals/academic-sources.md"))
    parser.add_argument("--change-set", type=Path, default=Path("proposals/academic-change-set.json"))
    args = parser.parse_args()
    try:
        return check(args)
    except (OSError, UnicodeError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as error:
        print(f"Academic source check failed closed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
