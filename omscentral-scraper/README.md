# OMSCentral Scraper

Small Python project that scrapes public OMSCentral course and review data into
JSON files consumed by the OMSCS Hub API import script.

## Current State

- Python package name: `omscentral-scraper`
- CLI command: `omscentral-scrape`
- Python requirement: 3.11+
- Runtime dependencies: Python standard library only
- Package/build backend: Hatchling
- Test runner: `unittest`
- Default output directory: `data/`

## Layout

```text
omscentral-scraper/
  src/omscentral_scraper/
    __main__.py
    cli.py          # CLI argument parsing and command entrypoint
    client.py       # HTTP fetching
    parsers.py      # Course/review page parsing
    scraper.py      # Orchestration and JSON writing
  tests/
    test_parsers.py
    test_scraper.py
  pyproject.toml
  uv.lock
```

## Install

Use `uv`:

```bash
uv sync
```

## Run

Scrape all courses and reviews to `data/`:

```bash
uv run omscentral-scrape
```

Default output files:

- `data/courses.json`: course catalog from OMSCentral
- `data/reviews.json`: combined review list from scraped course pages
- `data/course_reviews/{slug}.json`: one review file per course
- `data/manifest.json`: scrape timestamp, source URLs, and counts

Useful options:

```bash
uv run omscentral-scrape --output-dir data/omscentral
uv run omscentral-scrape --course-slug computer-networks --course-slug machine-learning
uv run omscentral-scrape --limit-courses 5
uv run omscentral-scrape --skip-reviews
```

## Test

```bash
uv run python -m unittest discover -s tests
```

## API Import Flow

The API import helper reads from `../omscentral-scraper/data` by default:

```bash
cd ../api
pnpm import:omscentral --sql-out .wrangler/tmp/omscentral-import.sql
```

Apply locally after D1 migrations:

```bash
pnpm import:omscentral --apply --local --sql-out .wrangler/tmp/omscentral-import.sql
```

Apply to remote dev:

```bash
pnpm import:omscentral --apply --remote --database omscs-hub-reviews-dev --sql-out .wrangler/tmp/omscentral-import.sql
```

Use `--data-dir` when scraper output lives somewhere else:

```bash
pnpm import:omscentral --data-dir ../omscentral-scraper/data/omscentral --sql-out .wrangler/tmp/omscentral-import.sql
```

The currently documented full-data baseline is 134 courses and 9298 reviews.

## Data Notes

- `courses.json` is normalized by the API importer into `courses`,
  `course_codes`, `course_tags`, and `course_programs`.
- `reviews.json` is normalized into `reviews`, `academic_terms`, and
  `omscentral_review_metadata`.
- OMSCentral review IDs are deterministic hashes of course slug, author,
  timestamp, semester, and body, so imports are idempotent.
- OMSCentral imports are source-labeled as `omscentral` in D1 and remain
  distinct from OMSCS Hub app reviews.
