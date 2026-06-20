import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("review API", () => {
  it("allows local UI ports when local CORS origin is configured", async () => {
    const res = await app.request(
      "/courses/CS-6200/reviews?source=omscentral",
      { headers: { origin: "http://localhost:3001" } },
      testEnv({ CORS_ORIGIN: "http://localhost:3001" }),
    );

    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3001");
  });

  it("supports comma-separated production CORS origins", async () => {
    const res = await app.request(
      "/courses/CS-6200/reviews?source=omscentral",
      { headers: { origin: "https://app.example.com" } },
      testEnv({ CORS_ORIGIN: "https://admin.example.com, https://app.example.com" }),
    );

    expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });

  it("returns public reviews with source filtering", async () => {
    const env = testEnv();
    const res = await app.request("/courses/CS-6200/reviews?source=omscentral", {}, env);
    const body = await res.json() as { reviews: { source: string }[] };

    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].source).toBe("omscentral");
  });

  it("requires auth for review writes", async () => {
    const res = await app.request(
      "/courses/CS-6200/reviews",
      { method: "POST", body: JSON.stringify(validReview()), headers: jsonHeaders() },
      testEnv(),
    );

    expect(res.status).toBe(401);
  });

  it("rejects non-gatech review writers", async () => {
    const res = await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview()),
        headers: authHeaders("person@example.com"),
      },
      testEnv(),
    );

    expect(res.status).toBe(403);
  });

  it("rejects invalid app review payloads", async () => {
    const res = await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview({ rating: 6, body: "Too short" })),
        headers: authHeaders("student@gatech.edu"),
      },
      testEnv(),
    );
    const body = await res.json() as { error?: unknown; issues?: { message: string }[] };

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request.");
    expect(body.issues?.some((issue) => issue.message === "Review must be at least 20 characters.")).toBe(true);
  });

  it("enforces one active app review per user/course", async () => {
    const env = testEnv();
    const first = await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview()),
        headers: authHeaders("student@gatech.edu"),
      },
      env,
    );
    const second = await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview({ body: "This is another valid review body for the same course." })),
        headers: authHeaders("student@gatech.edu"),
      },
      env,
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it("soft deletes active user review", async () => {
    const env = testEnv();
    await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview()),
        headers: authHeaders("student@gatech.edu"),
      },
      env,
    );

    const deleted = await app.request(
      "/courses/CS-6200/reviews/me",
      { method: "DELETE", headers: authHeaders("student@gatech.edu") },
      env,
    );
    const list = await app.request("/courses/CS-6200/reviews?source=app", {}, env);
    const body = await list.json() as { reviews: unknown[] };

    expect(deleted.status).toBe(200);
    expect(body.reviews).toHaveLength(0);
  });
});

function validReview(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    semester: "Fall 2025",
    difficulty: 3,
    workload: 12,
    rating: 5,
    recommend: true,
    programStage: "Mid",
    body: "Strong course with useful projects and manageable weekly workload.",
    ...overrides,
  };
}

function jsonHeaders() {
  return { "content-type": "application/json" };
}

function authHeaders(email: string) {
  return {
    ...jsonHeaders(),
    authorization: "Bearer test",
    "x-test-user-id": "user_1",
    "x-test-email": email,
  };
}

function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    CLERK_SECRET_KEY: "test",
    DB: new FakeD1() as unknown as D1Database,
    ...overrides,
  };
}

type Review = {
  id: string;
  course_id: string;
  source: "omscentral" | "app";
  term_id: string | null;
  semester_label: string;
  body: string;
  difficulty: number | null;
  workload: number | null;
  rating: number | null;
  recommend: number | null;
  program_stage: "First" | "Mid" | "Late" | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

class FakeD1 {
  courses = new Map([["CS-6200", { id: "CS-6200", slug: "graduate-introduction-to-operating-systems" }]]);
  codes = new Map([["CS-6200", "CS-6200"]]);
  reviews = new Map<string, Review>([
    [
      "omscentral-1",
      {
        id: "omscentral-1",
        course_id: "CS-6200",
        source: "omscentral",
        term_id: "fall-2025",
        semester_label: "Fall 2025",
        body: "Good scraped review",
        difficulty: 3,
        workload: 10,
        rating: 4,
        recommend: null,
        program_stage: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ],
  ]);
  appMetadata = new Map<string, { review_id: string; user_id: string; course_id: string }>();

  prepare(query: string) {
    return new FakeStatement(this, query);
  }

  async batch(statements: FakeStatement[]) {
    for (const statement of statements) await statement.run();
    return [];
  }
}

class FakeStatement {
  params: unknown[] = [];

  constructor(private db: FakeD1, private query: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T>() {
    if (this.query.includes("FROM courses c")) {
      const [id, slug, code] = this.params as string[];
      const found = [...this.db.courses.values()].find(
        (course) => course.id === id || course.slug === slug || this.db.codes.get(code) === course.id,
      );
      return (found ? { id: found.id } : null) as T | null;
    }

    if (this.query.includes("FROM app_review_metadata arm")) {
      const [userId, courseId] = this.params as string[];
      const metadata = this.db.appMetadata.get(`${userId}:${courseId}`);
      if (!metadata) return null;
      const review = this.db.reviews.get(metadata.review_id);
      return (review ? { id: review.id, deleted_at: review.deleted_at } : null) as T | null;
    }

    return null;
  }

  async all<T>() {
    if (this.query.includes("FROM reviews r")) {
      const [courseId, source] = this.params as [string, string | undefined];
      const includeDeleted = !this.query.includes("r.deleted_at IS NULL");
      const rows = [...this.db.reviews.values()].filter((review) => {
        if (review.course_id !== courseId) return false;
        if (source && review.source !== source) return false;
        if (!includeDeleted && review.deleted_at) return false;
        return true;
      });
      return { results: rows } as { results: T[] };
    }

    return { results: [] as T[] };
  }

  async run() {
    if (this.query.includes("INSERT INTO reviews")) {
      const [
        id,
        courseId,
        termId,
        semesterLabel,
        body,
        difficulty,
        workload,
        rating,
        recommend,
        programStage,
        createdAt,
        updatedAt,
      ] = this.params;
      this.db.reviews.set(String(id), {
        id: String(id),
        course_id: String(courseId),
        source: "app",
        term_id: String(termId),
        semester_label: String(semesterLabel),
        body: String(body),
        difficulty: Number(difficulty),
        workload: Number(workload),
        rating: Number(rating),
        recommend: Number(recommend),
        program_stage: programStage as "First" | "Mid" | "Late",
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        deleted_at: null,
      });
    } else if (this.query.includes("INSERT INTO app_review_metadata")) {
      const [reviewId, userId, courseId] = this.params as string[];
      this.db.appMetadata.set(`${userId}:${courseId}`, { review_id: reviewId, user_id: userId, course_id: courseId });
    } else if (this.query.includes("UPDATE reviews") && this.query.includes("deleted_at = ?")) {
      const [deletedAt, updatedAt, reviewId] = this.params as string[];
      const review = this.db.reviews.get(reviewId);
      if (review) {
        review.deleted_at = deletedAt;
        review.updated_at = updatedAt;
      }
    } else if (this.query.includes("UPDATE reviews")) {
      const [
        termId,
        semesterLabel,
        body,
        difficulty,
        workload,
        rating,
        recommend,
        programStage,
        updatedAt,
        reviewId,
      ] = this.params;
      const review = this.db.reviews.get(String(reviewId));
      if (review) {
        Object.assign(review, {
          term_id: String(termId),
          semester_label: String(semesterLabel),
          body: String(body),
          difficulty: Number(difficulty),
          workload: Number(workload),
          rating: Number(rating),
          recommend: Number(recommend),
          program_stage: programStage,
          updated_at: String(updatedAt),
          deleted_at: null,
        });
      }
    }

    return { success: true };
  }
}
