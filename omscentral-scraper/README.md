# OMSCentral Scraper

Small `uv` Python project for scraping public OMSCentral course and review data into JSON.

## Run

```bash
uv run omscentral-scrape
```

Default output goes to `data/`:

- `courses.json`: current course catalog from `https://www.omscentral.com/`
- `reviews.json`: combined reviews from every scraped course page
- `course_reviews/{slug}.json`: one review file per course
- `manifest.json`: scrape timestamp, source URLs, and counts

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

The scraper intentionally uses only Python stdlib so it can run in automation without runtime dependencies.

