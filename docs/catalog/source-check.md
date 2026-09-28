# Current-course source check

`.github/workflows/check-current-courses.yml` runs daily and through `workflow_dispatch`. It compares the published `ui/lib/data/catalog.json` with Georgia Tech's [current OMSCS course list](https://omscs.gatech.edu/current-courses) and the saved text of each linked official course page in `scripts/data/current-course-pages.json`.

The check compares current course codes, titles, former-code aliases, foundational markers, page URLs, and page body text. It does not derive credit hours from the Registrar, infer prerequisites from prose, or change user-facing Catalog data. A detected difference opens a **draft** PR containing `proposals/current-course-catalog.md` and `proposals/catalog-change-set.json`, with source URL, checked time, readable differences, and explicit Catalog operations. Reviewers must verify each changed course page and its Registrar credit entry, then complete the `catalog.json` and page-baseline changes **in that PR**. While an open proposal exists, later checks fail with an explicit message instead of overwriting human edits to its branch. The baseline is source evidence for drift detection, not a replacement for academic review.

Missing or malformed listings, duplicate or ambiguous identities, unavailable pages, and malformed page bodies fail the workflow without proposing changes. A source check can be exercised locally with:

```sh
python -m unittest discover -s scripts/tests -v
python scripts/check_current_courses.py
```

GitHub Actions must have permission to create pull requests in repository settings. A successful run on the published workflow is needed to verify that the scheduled/manual automation works in GitHub, beyond these local checks.

## Specialization rules and term offerings

`.github/workflows/check-academic-sources.yml` checks daily and through `workflow_dispatch`. It compares the six published Specializations with reviewed text and rule snapshots from their [official OMSCS pages](https://omscs.gatech.edu/specializations), saved in `scripts/data/specialization-pages.json`. Bold course markers, which indicate online eligibility on those pages, are preserved. Source changes create a readable diff alongside the exact published rule object. Published rules that differ from the reviewed snapshot fail closed. A reviewer must interpret new source text, check online eligibility, and update `specializations.ts` and the reviewed baseline together in the draft PR. The checker does not infer degree rules from prose.

The same workflow reads the Registrar's [term-specific Academic Calendar](https://registrar.gatech.edu/current-academic-calendar) data for the “Schedule of Classes available online” date. It merges the overlapping previous, current, and next calendar windows each day, fails closed on conflicting dates, and warns when the next calendar lacks a release date. Before a term's published release date, it does not query OSCAR. After the date, it keeps polling [OSCAR's Schedule of Classes](https://registrar.gatech.edu/academic-scheduling/schedule-of-classes) daily until the listing exists. A late listing produces a workflow warning, not a proposal. When OSCAR finds no classes for a course with a published confirmed offering, the run warns and leaves that offering for human review. “Not a valid term,” “No classes found,” missing dates, unavailable schedules, malformed pages, or inconsistent term responses never produce confirmed offerings or inferred removals. A valid listing with online sections is compared with `ui/lib/data/confirmed-offerings.json`; additions and removals remain review proposals, never published data. Missing courses are not treated as guaranteed future unavailability.

Detected changes use the same draft-PR review path as the current-course check. `proposals/academic-sources.md` includes source URLs, checked time, published rules and readable differences; `proposals/academic-change-set.json` records each candidate operation. The report also lists terms and course checks that remain unverified. An open proposal is never overwritten by another run. If sources match published evidence while a proposal remains open, the run fails so a reviewer closes the obsolete PR.

Run deterministic fixtures and the live check locally with:

```sh
python -m unittest discover -s scripts/tests -v
cd ui && node scripts/export-specialization-rules.mjs > /dev/null && cd ..
python scripts/check_academic_sources.py
```

The live command may write a proposal for source drift. Review and remove generated proposal files before committing implementation changes.
