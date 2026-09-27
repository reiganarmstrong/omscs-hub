# Current-course source check

`.github/workflows/check-current-courses.yml` runs daily and through `workflow_dispatch`. It compares the published `ui/lib/data/catalog.json` with Georgia Tech's [current OMSCS course list](https://omscs.gatech.edu/current-courses) and the saved text of each linked official course page in `scripts/data/current-course-pages.json`.

The check compares current course codes, titles, former-code aliases, foundational markers, page URLs, and page body text. It does not derive credit hours from the Registrar, infer prerequisites from prose, or change user-facing Catalog data. A detected difference opens a **draft** PR containing `proposals/current-course-catalog.md` and `proposals/catalog-change-set.json`, with source URL, checked time, readable differences, and explicit Catalog operations. Reviewers must verify each changed course page and its Registrar credit entry, then complete the `catalog.json` and page-baseline changes **in that PR**. While an open proposal exists, later checks fail with an explicit message instead of overwriting human edits to its branch. The baseline is source evidence for drift detection, not a replacement for academic review.

Missing or malformed listings, duplicate or ambiguous identities, unavailable pages, and malformed page bodies fail the workflow without proposing changes. A source check can be exercised locally with:

```sh
python -m unittest discover -s scripts/tests -v
python scripts/check_current_courses.py
```

GitHub Actions must have permission to create pull requests in repository settings. A successful run on the published workflow is needed to verify that the scheduled/manual automation works in GitHub, beyond these local checks.
