import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scripts.check_current_courses import SOURCE_URL, SourceError, build_change_set, compare, compare_page_facts, parse_course_page, parse_listing, render_report


FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def page(items):
    return f"<h4>Current &amp; Ongoing OMS Courses</h4><ul>{items}</ul><h4>Seminars</h4>"


def item(code, title, *, former="", foundational=False, href="/course"):
    marker = "*" if foundational else ""
    return f'<li>{marker}<a href="{href}">{code}: {title}</a>{former}</li>'


CATALOG = {
    "sourceUrl": SOURCE_URL,
    "courses": [
        {
            "code": "CS 6035",
            "title": "Introduction to Information Security",
            "aliases": [],
            "foundational": True,
            "sourceUrl": "https://omscs.gatech.edu/course",
        },
        {
            "code": "CS 6200",
            "title": "Introduction to Operating Systems",
            "aliases": ["CS 8803 O02"],
            "foundational": True,
            "sourceUrl": "https://omscs.gatech.edu/course",
        },
    ],
}


class CurrentCourseCheckTests(unittest.TestCase):
    def setUp(self):
        self.unchanged = fixture("unchanged.html")

    def test_unchanged_listing_has_no_proposal(self):
        self.assertEqual(compare(parse_listing(self.unchanged), CATALOG), [])

    def test_changed_listing_reports_addition_removal_and_fact_change(self):
        changed = fixture("changed.html")
        changes = compare(parse_listing(changed), CATALOG)
        self.assertEqual({change[0] for change in changes}, {"Added", "Removed", "Changed fact"})
        report = render_report(changes, "2026-09-27T00:00:00+00:00")
        self.assertIn(SOURCE_URL, report)
        self.assertIn("2026-09-27T00:00:00+00:00", report)
        self.assertIn("CS 6300", report)
        proposal = build_change_set(changes, parse_listing(changed), CATALOG, "2026-09-27T00:00:00+00:00", [])
        self.assertEqual(proposal["sourceUrl"], SOURCE_URL)
        self.assertEqual({op["kind"] for op in proposal["operations"]}, {"Added", "Removed", "Changed fact"})
        addition = next(op for op in proposal["operations"] if op["kind"] == "Added")
        self.assertEqual(addition["official"]["code"], "CS 6300")
        self.assertIn("credits", addition["requiresHumanVerification"])

    def test_changed_fixture_writes_review_proposal_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog = root / "catalog.json"
            report = root / "report.md"
            change_set = root / "change-set.json"
            catalog.write_text(json.dumps(CATALOG), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, "scripts/check_current_courses.py", "--source-file", str(FIXTURES / "changed.html"), "--catalog", str(catalog), "--report", str(report), "--change-set", str(change_set)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Checked at:", report.read_text(encoding="utf-8"))
            self.assertEqual(len(json.loads(change_set.read_text(encoding="utf-8"))["operations"]), 3)

    def test_missing_listing_fails_closed(self):
        with self.assertRaisesRegex(SourceError, "missing or empty"):
            parse_listing(fixture("missing.html"))

    def test_malformed_listing_fails_closed(self):
        with self.assertRaisesRegex(SourceError, "Malformed course link"):
            parse_listing(fixture("malformed.html"))

    def test_unclosed_list_item_fails_closed(self):
        with self.assertRaisesRegex(SourceError, "Unclosed course list item"):
            parse_listing(fixture("unclosed.html"))

    def test_duplicate_and_ambiguous_identity_fail_closed(self):
        duplicate = page(item("CS 6035", "Security") * 2)
        with self.assertRaisesRegex(SourceError, "Duplicate course code"):
            parse_listing(duplicate)
        ambiguous = page(
            item("CS 6035", "Introduction to Information Security", foundational=True)
            + item("CS 6300", "Introduction to Operating Systems")
        )
        with self.assertRaisesRegex(SourceError, "Ambiguous identity"):
            compare(parse_listing(ambiguous), CATALOG)

    def test_explicit_rename_is_reported(self):
        renamed = page(
            item("CS 6035", "Introduction to Information Security", foundational=True)
            + item("CS 6250", "Introduction to Operating Systems", former=" (formerly CS 6200)", foundational=True)
        )
        changes = compare(parse_listing(renamed), CATALOG)
        self.assertEqual(changes[0][0], "Renamed")

    def test_course_page_change_has_readable_diff(self):
        listings = parse_listing(self.unchanged)
        html = '<div class="field--name-body"><p>Introduction to Information Security covers essential security foundations.</p></div>'
        current = parse_course_page(html)
        baseline = {
            "sourceUrl": SOURCE_URL,
            "pages": {"CS 6035": {"url": listings[0].source_url, "text": "Old security overview."}},
        }
        changes, details = compare_page_facts(listings[:1], {"CS 6035": current}, baseline)
        self.assertEqual(changes[0][0], "Changed page fact")
        self.assertIn("-Old security overview.", details[0][2])
        self.assertIn("+Introduction to Information Security", details[0][2])

    def test_missing_course_page_body_fails_closed(self):
        with self.assertRaisesRegex(SourceError, "missing or malformed"):
            parse_course_page("<h1>Access denied</h1>")

    def test_course_page_url_change_is_proposed(self):
        listings = parse_listing(self.unchanged)
        old_url = "https://omscs.gatech.edu/old-course"
        baseline = {
            "sourceUrl": SOURCE_URL,
            "pages": {"CS 6035": {"url": old_url, "text": "Old official overview."}},
        }
        changes, details = compare_page_facts(listings[:1], {"CS 6035": "New official overview."}, baseline)
        self.assertEqual(changes[0][0], "Changed page fact")
        self.assertIn("+New official overview.", details[0][2])


if __name__ == "__main__":
    unittest.main()
