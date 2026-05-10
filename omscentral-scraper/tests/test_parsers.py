import json
import unittest

from omscentral_scraper.parsers import parse_courses, parse_reviews


def flight_chunk(text: str) -> str:
    return f'<script>self.__next_f.push([1,{json.dumps(text)}])</script>'


class ParserTests(unittest.TestCase):
    def test_parse_courses_from_next_flight_payload(self):
        course = {
            "_createdAt": "2026-01-01T00:00:00Z",
            "_id": "course-1",
            "_type": "course",
            "id": "external-import-CS-6250",
            "codes": ["CS-6250"],
            "name": "Computer Networks",
            "slug": "computer-networks",
            "rating": 4.1,
            "difficulty": "$undefined",
            "reviewCount": 500,
        }
        html = flight_chunk(f'1:["prefix",{json.dumps(course)},"suffix"]')

        courses = parse_courses(html)

        self.assertEqual(len(courses), 1)
        self.assertEqual(courses[0]["slug"], "computer-networks")
        self.assertIsNone(courses[0]["difficulty"])

    def test_parse_review_articles(self):
        html = """
        <article class="prose">
          <p><span class="font-medium">author-hash</span>
          <time dateTime="2026-04-25T23:02:19Z">April 25, 2026</time>
          <span class="capitalize">spring 2026</span></p>
          <a href="/courses/computer-networks/reviews">Computer Networks</a>
          <div class="wrap-break-word"><p>Good course.</p><p>Needs time.</p></div>
          <p><span>Rating: <!-- -->4 / 5</span><span>Difficulty: <!-- -->3 / 5</span><span>Workload: <!-- -->12 hours / week</span></p>
        </article>
        """

        reviews = parse_reviews(html)

        self.assertEqual(len(reviews), 1)
        self.assertEqual(reviews[0]["author"], "author-hash")
        self.assertEqual(reviews[0]["courseSlug"], "computer-networks")
        self.assertEqual(reviews[0]["courseName"], "Computer Networks")
        self.assertEqual(reviews[0]["body"], "Good course.\nNeeds time.")
        self.assertEqual(reviews[0]["rating"], 4)
        self.assertEqual(reviews[0]["difficulty"], 3)
        self.assertEqual(reviews[0]["workload"], 12)

    def test_course_context_overrides_article_course_link(self):
        html = """
        <article>
          <div class="wrap-break-word"><p>Review body.</p></div>
          <p><span>Rating: 5 / 5</span><span>Difficulty: 2 / 5</span><span>Workload: 6 hours / week</span></p>
        </article>
        """

        reviews = parse_reviews(html, course_slug="machine-learning", course_name="Machine Learning")

        self.assertEqual(reviews[0]["courseSlug"], "machine-learning")
        self.assertEqual(reviews[0]["courseName"], "Machine Learning")


if __name__ == "__main__":
    unittest.main()

