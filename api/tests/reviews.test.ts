import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/backend", () => ({
  verifyToken: async (token: string) => {
    if (!token.startsWith("fixture:")) throw new Error("Invalid token");
    return { sub: token.slice(8) };
  },
  createClerkClient: () => ({ users: { getUser: async (id: string) => ({
    id,
    primaryEmailAddressId: "primary",
    emailAddresses: [{ id: "primary", emailAddress: id, verification: { status: "verified" } }],
  }) } }),
}));
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

  it("catalog statistics use active imported and Hub Reviews only", async () => {
    const env = testEnv();
    const before = await app.request("/reviews/catalog-stats", {}, env);
    const initial = (await before.json()) as {
      courses: { courseId: string; numReviews: number; avgRating: number }[];
    };
    expect(initial.courses).toEqual([
      expect.objectContaining({
        courseId: "CS-6200",
        numReviews: 1,
        avgRating: 4,
      }),
    ]);

    await app.request(
      "/courses/CS-6200/reviews",
      {
        method: "POST",
        body: JSON.stringify(validReview()),
        headers: authHeaders("student@gatech.edu"),
      },
      env,
    );
    const added = (await (
      await app.request("/reviews/catalog-stats", {}, env)
    ).json()) as typeof initial;
    expect(added.courses).toEqual([
      expect.objectContaining({
        courseId: "CS-6200",
        numReviews: 2,
        avgRating: 4.5,
        avgDifficulty: 3,
        avgWorkload: 11,
      }),
    ]);

    await app.request(
      "/courses/CS-6200/reviews/me",
      {
        method: "DELETE",
        headers: authHeaders("student@gatech.edu"),
      },
      env,
    );
    const deleted = (await (
      await app.request("/reviews/catalog-stats", {}, env)
    ).json()) as typeof initial;
    expect(deleted.courses).toEqual(initial.courses);
  });

  it("returns no fabricated statistics for a course with no reviews", async () => {
    const db = new FakeD1();
    db.reviews.clear();
    const response = await app.request(
      "/reviews/catalog-stats",
      {},
      testEnv({ DB: db as unknown as D1Database }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ courses: [] });
  });

  it("reports a database failure instead of returning zero statistics", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const db = {
        prepare: () => {
          throw new Error("database unavailable");
        },
      } as unknown as D1Database;
      const response = await app.request(
        "/reviews/catalog-stats",
        {},
        testEnv({ DB: db }),
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Internal server error.",
      });
    } finally {
      log.mockRestore();
    }
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

  it("keeps author identity private through create, edit, delete, and repost", async () => {
    const env = testEnv();
    const course = "/courses/CS-6200/reviews";
    const owner = authHeaders("student@gatech.edu");
    const other = authHeaders("other@gatech.edu");
    const original = await app.request(course, {
      method: "POST", headers: owner, body: JSON.stringify(validReview()),
    }, env);
    expect(original.status).toBe(201);
    const originalId = ((await original.json()) as { reviewId: string }).reviewId;

    const publicBefore = await app.request(`${course}?source=app`, {}, env);
    const publicJson = await publicBefore.text();
    const first = (JSON.parse(publicJson) as { reviews: { id: string; metadata: { pseudonym: string } }[] }).reviews[0];
    expect(first.id).toBe(originalId);
    expect(first.metadata.pseudonym).toMatch(/^Reviewer-[0-9a-f]{16}$/);
    expect(publicJson).not.toContain("student@gatech.edu");
    expect(publicJson).not.toContain("userId");

    const otherLookup = await app.request(`${course}/me`, { headers: other }, env);
    expect(await otherLookup.json()).toEqual({ reviewId: null });
    const otherEdit = await app.request(`${course}/me`, {
      method: "PUT", headers: other,
      body: JSON.stringify(validReview({ body: "This outsider tried to edit the review body." })),
    }, env);
    const otherDelete = await app.request(`${course}/me`, { method: "DELETE", headers: other }, env);
    expect(otherEdit.status).toBe(404);
    expect(otherDelete.status).toBe(404);

    const edit = await app.request(`${course}/me`, {
      method: "PUT", headers: owner,
      body: JSON.stringify(validReview({ body: "Edited review with clearer details about the class." })),
    }, env);
    expect(edit.status).toBe(200);
    expect(await edit.json()).toEqual({ reviewId: originalId });
    const duplicate = await app.request(course, {
      method: "POST", headers: owner, body: JSON.stringify(validReview()),
    }, env);
    expect(duplicate.status).toBe(409);

    const deleted = await app.request(`${course}/me`, { method: "DELETE", headers: owner }, env);
    expect(deleted.status).toBe(200);
    expect((env.DB as unknown as FakeD1).reviews.get(originalId)?.deleted_at).not.toBeNull();
    const hidden = await app.request(`${course}?source=app&includeDeleted=true`, {}, env);
    expect((await hidden.json() as { reviews: unknown[] }).reviews).toEqual([]);

    const repost = await app.request(course, {
      method: "POST", headers: owner,
      body: JSON.stringify(validReview({ body: "A fresh review after deletion stays separate from history." })),
    }, env);
    expect(repost.status).toBe(201);
    const repostId = (await repost.json() as { reviewId: string }).reviewId;
    expect(repostId).not.toBe(originalId);
    expect((env.DB as unknown as FakeD1).reviews.get(originalId)?.deleted_at).not.toBeNull();
    const publicAfter = await app.request(`${course}?source=app`, {}, env);
    const second = (await publicAfter.json() as { reviews: { id: string; metadata: { pseudonym: string } }[] }).reviews;
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(repostId);
    expect(second[0].metadata.pseudonym).toBe(first.metadata.pseudonym);
    const imported = await app.request(`${course}?source=omscentral`, {}, env);
    expect((await imported.json() as { reviews: unknown[] }).reviews).toHaveLength(1);
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
    authorization: `Bearer fixture:${email}`,
  };
}

function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    CLERK_SECRET_KEY: "sk_test_fixture",
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
  appMetadata = new Map<string, { review_id: string; user_id: string; course_id: string; active: boolean }>();
  appUsers = new Map<string, { pseudonym: string }>();

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
      const metadata = [...this.db.appMetadata.values()].find((item) => item.user_id === userId && item.course_id === courseId && item.active);
      if (!metadata) return null;
      const review = this.db.reviews.get(metadata.review_id);
      return (review ? { id: review.id, deleted_at: review.deleted_at } : null) as T | null;
    }

    return null;
  }

  async all<T>() {
    if (this.query.includes("GROUP BY course_id")) {
      const grouped = new Map<string, Review[]>();
      for (const review of this.db.reviews.values()) {
        if (review.deleted_at || !["omscentral", "app"].includes(review.source))
          continue;
        grouped.set(review.course_id, [
          ...(grouped.get(review.course_id) ?? []),
          review,
        ]);
      }
      return {
        results: [...grouped].map(([courseId, rows]) => ({
          courseId,
          numReviews: rows.length,
          avgDifficulty: mean(rows.map((row) => row.difficulty)),
          avgWorkload: mean(rows.map((row) => row.workload)),
          avgRating: mean(rows.map((row) => row.rating)),
        })) as T[],
      };
    }
    if (this.query.includes("FROM reviews r")) {
      const [courseId, source] = this.params as [string, string | undefined];
      const includeDeleted = !this.query.includes("r.deleted_at IS NULL");
      const rows = [...this.db.reviews.values()].filter((review) => {
        if (review.course_id !== courseId) return false;
        if (source && review.source !== source) return false;
        if (!includeDeleted && review.deleted_at) return false;
        return true;
      });
      return { results: rows.map((row) => {
        const metadata = this.db.appMetadata.get(row.id);
        return {
          ...row,
          public_pseudonym: metadata ? this.db.appUsers.get(metadata.user_id)?.pseudonym : null,
        };
      }) } as { results: T[] };
    }

    return { results: [] as T[] };
  }

  async run() {
    if (this.query.includes("INSERT INTO app_users")) {
      const [id, , , pseudonym] = this.params as string[];
      if (!this.db.appUsers.has(id)) this.db.appUsers.set(id, { pseudonym });
    } else if (this.query.includes("INSERT INTO reviews")) {
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
      if ([...this.db.appMetadata.values()].some((item) => item.user_id === userId && item.course_id === courseId && item.active)) {
        throw new Error("UNIQUE constraint failed: app_review_metadata.user_id, app_review_metadata.course_id");
      }
      this.db.appMetadata.set(reviewId, { review_id: reviewId, user_id: userId, course_id: courseId, active: true });
    } else if (this.query.includes("UPDATE app_review_metadata")) {
      const [updatedAt, reviewId] = this.params as string[];
      void updatedAt;
      const metadata = this.db.appMetadata.get(reviewId);
      if (metadata) metadata.active = false;
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
      if (review && (!this.query.includes("deleted_at IS NULL") || !review.deleted_at)) {
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
          ...(this.query.includes("deleted_at = NULL") ? { deleted_at: null } : {}),
        });
      }
    }

    return { success: true };
  }
}

function mean(values: (number | null)[]) {
  const present = values.filter((value): value is number => value !== null);
  return present.length
    ? present.reduce((sum, value) => sum + value, 0) / present.length
    : null;
}
