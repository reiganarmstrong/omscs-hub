import io
import json
import tempfile
import unittest
from argparse import Namespace
from datetime import date
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from scripts import check_academic_sources
from scripts.check_academic_sources import (
    SourceError,
    compare_offerings,
    compare_rules,
    parse_calendar,
    parse_schedule,
    parse_specialization,
    render_report,
    check,
    load_releases,
    term_to_code,
)


FIXTURES = Path(__file__).parent / "fixtures" / "academic"


def fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


class AcademicSourceTests(unittest.TestCase):
    def test_calendar_uses_term_specific_release_and_waits_for_late_listing(self):
        releases = parse_calendar(json.loads(fixture("calendar.json")))
        spring = releases["Spring-2027"]
        self.assertEqual(spring, date(2026, 10, 14))
        self.assertEqual(term_to_code("Spring-2027"), "202702")
        self.assertEqual(parse_schedule(fixture("schedule-unavailable.html"), "CS 6035", "Spring-2027").state, "unreleased")

    def test_conflicting_release_dates_across_calendar_windows_fail_closed(self):
        later = fixture("calendar.json").replace("October 14", "October 21")
        payloads = iter([fixture("calendar.json"), later, fixture("calendar.json")])
        with patch.object(check_academic_sources, "fetch", side_effect=lambda url, calendar=False: next(payloads)):
            with self.assertRaisesRegex(SourceError, "Conflicting Registrar release dates"):
                load_releases(date(2026, 10, 15))

    def test_no_classes_for_confirmed_offering_warns_without_proposal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_url = "https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence"
            rule = {"id": "artificial-intelligence", "name": "Artificial Intelligence", "sourceUrl": source_url, "requirements": []}
            files = {
                "rules": [rule],
                "baseline": {"pages": {rule["id"]: {"sourceUrl": source_url, "text": parse_specialization(fixture("specialization-old.html")), "published": rule}}},
                "confirmed": {"offerings": [
                    {"courseId": "CS-6035", "termKey": "Fall-2026", "section": "O01", "sourceUrl": "https://oscar.gatech.edu/example"},
                    {"courseId": "CS-6200", "termKey": "Fall-2026", "section": "O01", "sourceUrl": "https://oscar.gatech.edu/example"},
                ]},
                "catalog": {"courses": [{"id": "CS-6035", "code": "CS 6035"}, {"id": "CS-6200", "code": "CS 6200"}]},
            }
            paths = {}
            for name, value in files.items():
                paths[name] = root / f"{name}.json"
                paths[name].write_text(json.dumps(value), encoding="utf-8")
            args = Namespace(**paths, today="2026-10-01", report=root / "proposal.md", change_set=root / "change-set.json")

            def fetch_source(url, *, calendar=False):
                if calendar:
                    return fixture("calendar.json")
                if url == source_url:
                    return fixture("specialization-old.html")
                if "subj_in=CS&term_in=202608" in url and "crse_in=6035" in url:
                    return fixture("schedule-available.html")
                return fixture("schedule-no-classes.html")

            output = io.StringIO()
            with patch.object(check_academic_sources, "fetch", side_effect=fetch_source), redirect_stdout(output):
                self.assertEqual(check(args), 0)
            self.assertFalse(args.report.exists())
            self.assertIn("::warning::OSCAR found no classes for confirmed Fall-2026 CS-6200 O01", output.getvalue())

    def test_schedule_parses_only_online_sections(self):
        sections = parse_schedule(fixture("schedule-available.html"), "CS 6035", "Fall-2026")
        self.assertEqual(sections.state, "listed")
        self.assertEqual(sections.sections, ("O01",))
        with self.assertRaisesRegex(SourceError, "unexpected course"):
            parse_schedule(fixture("schedule-available.html"), "CS 6200", "Fall-2026")

    def test_schedule_parser_failure_stays_unverified(self):
        with self.assertRaisesRegex(SourceError, "malformed"):
            parse_schedule("<html>Maintenance</html>", "CS 6035", "Fall-2026")

    def test_generic_no_classes_cannot_propose_removal(self):
        result = parse_schedule(fixture("schedule-no-classes.html"), "CS 6035", "Fall-2026")
        self.assertEqual(result.state, "unverified")
        published = {"offerings": [{"courseId": "CS-6035", "termKey": "Fall-2026", "section": "O01", "sourceUrl": "https://oscar.gatech.edu/example"}]}
        self.assertEqual(compare_offerings([], published, "Fall-2026", set()), [])

    def test_offering_changes_are_review_proposal_only(self):
        published = {"offerings": [{"courseId": "CS-6035", "termKey": "Fall-2026", "section": "O01", "sourceUrl": "https://oscar.gatech.edu/example"}]}
        observed = [{"courseId": "CS-6035", "termKey": "Fall-2026", "section": "O02", "sourceUrl": "https://oscar.gatech.edu/example"}]
        changes = compare_offerings(observed, published, "Fall-2026")
        self.assertEqual({item["kind"] for item in changes}, {"Added", "Removed"})
        report = render_report([], changes, "2026-09-27T00:00:00+00:00", "https://registrar.gatech.edu/current-academic-calendar")
        self.assertIn("O01", report)
        self.assertIn("O02", report)
        self.assertIn("https://oscar.gatech.edu/example", report)

    def test_report_lists_unverified_terms_and_course_checks(self):
        report = render_report([], [], "2026-09-27T00:00:00+00:00", "https://registrar.gatech.edu/current-academic-calendar", ["Spring-2027"], ["Fall-2026: CS-6035"])
        self.assertIn("## Unverified", report)
        self.assertIn("Spring-2027", report)
        self.assertIn("Fall-2026: CS-6035", report)

    def test_rule_source_drift_shows_diff_and_published_rule(self):
        old = parse_specialization(fixture("specialization-old.html"))
        new = parse_specialization(fixture("specialization-changed.html"))
        rules = [{"id": "artificial-intelligence", "name": "Artificial Intelligence", "sourceUrl": "https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence", "requirements": [{"id": "ai-core", "pick": 2, "poolCourseIds": ["CS-6601"]}]}]
        baseline = {"pages": {"artificial-intelligence": {"sourceUrl": rules[0]["sourceUrl"], "text": old, "published": rules[0]}}}
        changes = compare_rules({"artificial-intelligence": new}, rules, baseline)
        self.assertEqual(len(changes), 1)
        self.assertIn("+CS 7643 Deep Learning", changes[0]["difference"])
        self.assertIn("CS-6601", render_report(changes, [], "2026-09-27T00:00:00+00:00", "https://registrar.gatech.edu/current-academic-calendar"))

    def test_bold_only_change_is_rule_source_drift(self):
        old = parse_specialization(fixture("specialization-old.html"))
        plain = parse_specialization(fixture("specialization-old.html").replace("<strong>", "").replace("</strong>", ""))
        self.assertNotEqual(old, plain)
        self.assertIn("**CS 6601", old)

    def test_published_rules_must_match_reviewed_source_snapshot(self):
        old = parse_specialization(fixture("specialization-old.html"))
        rule = {"id": "artificial-intelligence", "name": "Artificial Intelligence", "sourceUrl": "https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence", "requirements": []}
        baseline = {"pages": {rule["id"]: {"sourceUrl": rule["sourceUrl"], "text": old, "published": rule}}}
        changed = {**rule, "requirements": [{"id": "new-rule"}]}
        with self.assertRaisesRegex(SourceError, "differ from reviewed source baseline"):
            compare_rules({rule["id"]: old}, [changed], baseline)

    def test_ambiguous_rule_and_missing_page_fail_closed(self):
        with self.assertRaisesRegex(SourceError, "ambiguous"):
            parse_specialization(fixture("specialization-ambiguous.html"))
        with self.assertRaisesRegex(SourceError, "missing or malformed"):
            parse_specialization("<h1>Access denied</h1>")

    def test_check_retries_late_term_without_proposal_then_writes_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_url = "https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence"
            rule = {"id": "artificial-intelligence", "name": "Artificial Intelligence", "sourceUrl": source_url, "requirements": []}
            files = {
                "rules": [rule],
                "baseline": {"pages": {rule["id"]: {"sourceUrl": source_url, "text": parse_specialization(fixture("specialization-old.html")), "published": rule}}},
                "confirmed": {"offerings": [{"courseId": "CS-6035", "termKey": "Fall-2026", "section": "O01", "sourceUrl": "https://oscar.gatech.edu/example"}]},
                "catalog": {"courses": [{"id": "CS-6035", "code": "CS 6035"}]},
            }
            paths = {}
            for name, value in files.items():
                paths[name] = root / f"{name}.json"
                paths[name].write_text(json.dumps(value), encoding="utf-8")
            args = Namespace(**paths, today="2026-10-15", report=root / "proposal.md", change_set=root / "evidence" / "change-set.json")

            def fetch_source(url, *, calendar=False):
                if calendar:
                    return fixture("calendar.json")
                if url == source_url:
                    return fixture("specialization-old.html")
                if "term_in=202608" in url:
                    return fixture("schedule-available.html")
                return fixture("schedule-unavailable.html")

            output = io.StringIO()
            with patch.object(check_academic_sources, "fetch", side_effect=fetch_source), redirect_stdout(output):
                self.assertEqual(check(args), 0)
            self.assertFalse(args.report.exists())
            self.assertIn("::warning::OSCAR Spring-2027 Schedule of Classes is not listed after its 2026-10-14 release date", output.getvalue())

            spring = fixture("schedule-available.html").replace("Fall 2026", "Spring 2027").replace("202608", "202702")
            def released_source(url, *, calendar=False):
                return spring if "term_in=202702" in url else fetch_source(url, calendar=calendar)

            with patch.object(check_academic_sources, "fetch", side_effect=released_source):
                self.assertEqual(check(args), 0)
            self.assertIn("Spring-2027", args.report.read_text(encoding="utf-8"))
            self.assertEqual(json.loads(args.change_set.read_text(encoding="utf-8"))["offeringChanges"][0]["kind"], "Added")

            args.report.unlink()
            args.change_set.unlink()
            def broken_source(url, *, calendar=False):
                return "<html>Maintenance</html>" if "term_in=202702" in url else fetch_source(url, calendar=calendar)

            with patch.object(check_academic_sources, "fetch", side_effect=broken_source):
                with self.assertRaisesRegex(SourceError, "malformed"):
                    check(args)
            self.assertFalse(args.report.exists())
            self.assertFalse(args.change_set.exists())


if __name__ == "__main__":
    unittest.main()
