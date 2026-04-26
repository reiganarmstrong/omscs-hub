import json
import tempfile
import unittest
from pathlib import Path

from omscentral_scraper.scraper import scrape_omscentral


def flight_chunk(text: str) -> str:
    return f'<script>self.__next_f.push([1,{json.dumps(text)}])</script>'


class FakeClient:
    base_url = "https://example.test/"

    def __init__(self):
        course = {
            "_createdAt": "2026-01-01T00:00:00Z",
            "_id": "course-1",
            "_type": "course",
            "id": "external-import-CS-6250",
            "codes": ["CS-6250"],
            "name": "Computer Networks",
            "slug": "computer-networks",
            "reviewCount": 1,
        }
        self.responses = {
            "/": flight_chunk(json.dumps(course)),
            "/courses/computer-networks/reviews": """
              <article>
                <span class="font-medium">author</span>
                <time dateTime="2026-04-25T23:02:19Z">April 25, 2026</time>
                <span class="capitalize">spring 2026</span>
                <div class="wrap-break-word"><p>Worth taking.</p></div>
                <p><span>Rating: 4 / 5</span><span>Difficulty: 3 / 5</span><span>Workload: 9 hours / week</span></p>
              </article>
            """,
        }

    def fetch_text(self, path: str) -> str:
        return self.responses[path]


class ScraperTests(unittest.TestCase):
    def test_scrape_writes_repeatable_json_outputs(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            result = scrape_omscentral(output_dir=Path(tmp_dir), client=FakeClient(), delay_seconds=0)

            courses = json.loads((Path(tmp_dir) / "courses.json").read_text())
            reviews = json.loads((Path(tmp_dir) / "reviews.json").read_text())
            manifest = json.loads((Path(tmp_dir) / "manifest.json").read_text())
            per_course = json.loads((Path(tmp_dir) / "course_reviews" / "computer-networks.json").read_text())

            self.assertEqual(result.courses_count, 1)
            self.assertEqual(result.reviews_count, 1)
            self.assertEqual(courses[0]["slug"], "computer-networks")
            self.assertEqual(reviews[0]["body"], "Worth taking.")
            self.assertEqual(per_course[0]["sourceUrl"], "https://example.test/courses/computer-networks/reviews")
            self.assertEqual(manifest["courseReviewCounts"]["computer-networks"], 1)


if __name__ == "__main__":
    unittest.main()

