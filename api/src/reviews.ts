import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireGatechUser } from "./auth";
import { normalizeTerm } from "./terms";
import type { Bindings, ReviewRow, Variables } from "./types";
import {
  reviewBodySchema,
  sourceQuerySchema,
  validationErrorResponse,
  type ReviewBodyInput,
} from "./validation";

export const reviews = new Hono<{ Bindings: Bindings; Variables: Variables }>();

reviews.get("/reviews/catalog-stats", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT course_id AS courseId, COUNT(*) AS numReviews,
            AVG(difficulty) AS avgDifficulty, AVG(workload) AS avgWorkload,
            AVG(rating) AS avgRating
     FROM reviews
     WHERE deleted_at IS NULL AND source IN ('omscentral', 'app')
     GROUP BY course_id`,
  ).all<{
    courseId: string;
    numReviews: number;
    avgDifficulty: number | null;
    avgWorkload: number | null;
    avgRating: number | null;
  }>();
  return c.json({ courses: result.results ?? [] });
});

reviews.get(
  "/courses/:courseId/reviews",
  zValidator("query", sourceQuerySchema, (result, c) => {
    if (!result.success) return validationErrorResponse(result, c);
  }),
  async (c) => {
    const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
    if (!courseId) return c.json({ error: "Course not found." }, 404);

    const { source } = c.req.valid("query");
    const rows = await listReviews(c.env.DB, courseId, source);

    return c.json({
      courseId,
      reviews: rows.map((row) => serializeReview(row)),
    });
  },
);

reviews.get(
  "/courses/:courseId/reviews/summary",
  zValidator("query", sourceQuerySchema.pick({ source: true }), (result, c) => {
    if (!result.success) return validationErrorResponse(result, c);
  }),
  async (c) => {
    const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
    if (!courseId) return c.json({ error: "Course not found." }, 404);

    const { source } = c.req.valid("query");
    const rows = await listReviews(c.env.DB, courseId, source);
    return c.json({ courseId, summary: summarize(rows) });
  },
);

reviews.get("/courses/:courseId/reviews/me", requireGatechUser, async (c) => {
  const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
  if (!courseId) return c.json({ error: "Course not found." }, 404);
  const review = await findUserReview(c.env.DB, c.get("authUser").id, courseId);
  return c.json({ reviewId: review?.id ?? null });
});

reviews.post(
  "/courses/:courseId/reviews",
  requireGatechUser,
  zValidator("json", reviewBodySchema, (result, c) => {
    if (!result.success) return validationErrorResponse(result, c);
  }),
  async (c) => {
    const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
    if (!courseId) return c.json({ error: "Course not found." }, 404);

    const user = c.get("authUser");
    const input = c.req.valid("json");
    await upsertUser(c.env.DB, user.id, user.primaryEmail, user.emailDomain);

    const existing = await findUserReview(c.env.DB, user.id, courseId);
    if (existing) {
      return c.json({ error: "You already have an active review for this course." }, 409);
    }

    const reviewId = crypto.randomUUID();
    try {
      await writeAppReview(c.env.DB, reviewId, courseId, input, { mode: "insert", userId: user.id });
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: app_review_metadata\.(user_id|course_id)/.test(error.message)) {
        return c.json({ error: "You already have an active review for this course." }, 409);
      }
      throw error;
    }
    return c.json({ reviewId }, 201);
  },
);

reviews.put(
  "/courses/:courseId/reviews/me",
  requireGatechUser,
  zValidator("json", reviewBodySchema, (result, c) => {
    if (!result.success) return validationErrorResponse(result, c);
  }),
  async (c) => {
    const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
    if (!courseId) return c.json({ error: "Course not found." }, 404);

    const user = c.get("authUser");
    const review = await findUserReview(c.env.DB, user.id, courseId);
    if (!review) return c.json({ error: "Active review not found." }, 404);

    await writeAppReview(c.env.DB, review.id, courseId, c.req.valid("json"), { mode: "update" });
    return c.json({ reviewId: review.id });
  },
);

reviews.delete("/courses/:courseId/reviews/me", requireGatechUser, async (c) => {
  const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
  if (!courseId) return c.json({ error: "Course not found." }, 404);

  const user = c.get("authUser");
  const review = await findUserReview(c.env.DB, user.id, courseId);
  if (!review) return c.json({ error: "Active review not found." }, 404);

  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE reviews SET deleted_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, review.id),
    c.env.DB.prepare("UPDATE app_review_metadata SET active = 0, updated_at = ? WHERE review_id = ?")
      .bind(now, review.id),
  ]);

  return c.json({ reviewId: review.id, deletedAt: now });
});

async function resolveCourseId(db: D1Database, value: string) {
  const decoded = decodeURIComponent(value);
  const normalizedCode = decoded.toUpperCase().replace(/\s+/g, "-");
  const row = await db
    .prepare(
      `SELECT c.id
       FROM courses c
       LEFT JOIN course_codes cc ON cc.course_id = c.id
       LEFT JOIN course_source_slugs css ON css.course_id = c.id
       WHERE c.id = ? OR c.slug = ? OR cc.code = ? OR css.slug = ?
       LIMIT 1`,
    )
    .bind(decoded, decoded, normalizedCode, decoded)
    .first<{ id: string }>();

  return row?.id ?? null;
}

async function listReviews(
  db: D1Database,
  courseId: string,
  source: "all" | "omscentral" | "app",
) {
  const filters = ["r.course_id = ?"];
  const params: unknown[] = [courseId];
  if (source !== "all") {
    filters.push("r.source = ?");
    params.push(source);
  }
  filters.push("r.deleted_at IS NULL");

  const query = `
    SELECT r.*, u.public_pseudonym, orm.source_url, orm.source_author_hash
    FROM reviews r
    LEFT JOIN app_review_metadata arm ON arm.review_id = r.id
    LEFT JOIN app_users u ON u.id = arm.user_id
    LEFT JOIN omscentral_review_metadata orm ON orm.review_id = r.id
    WHERE ${filters.join(" AND ")}
    ORDER BY datetime(r.created_at) DESC`;

  const result = await db.prepare(query).bind(...params).all<ReviewRow>();
  return result.results ?? [];
}

async function upsertUser(db: D1Database, id: string, email: string, domain: string) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO app_users (id, primary_email, verified_email_domain, public_pseudonym, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         primary_email = excluded.primary_email,
         verified_email_domain = excluded.verified_email_domain,
         updated_at = excluded.updated_at`,
    )
    .bind(id, email, domain, `Reviewer-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, now, now)
    .run();
}

async function findUserReview(db: D1Database, userId: string, courseId: string) {
  return db
    .prepare(
      `SELECT r.id
       FROM app_review_metadata arm
       JOIN reviews r ON r.id = arm.review_id
       WHERE arm.user_id = ? AND arm.course_id = ? AND arm.active = 1 AND r.deleted_at IS NULL`,
    )
    .bind(userId, courseId)
    .first<{ id: string }>();
}

async function writeAppReview(
  db: D1Database,
  reviewId: string,
  courseId: string,
  input: ReviewBodyInput,
  operation: { mode: "insert"; userId: string } | { mode: "update" },
) {
  const now = new Date().toISOString();
  const term = normalizeTerm(input.semester);

  const termStatement = db
    .prepare(
      `INSERT INTO academic_terms (id, season, year, label, sort_key)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .bind(term.id, term.season, term.year, term.label, term.sortKey);

  if (operation.mode === "insert") {
    const reviewStatement = db
      .prepare(
        `INSERT INTO reviews (
          id, course_id, source, term_id, semester_label, body, difficulty,
          workload, rating, recommend, program_stage, created_at, updated_at
        )
        VALUES (?, ?, 'app', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        reviewId,
        courseId,
        term.id,
        term.label,
        input.body,
        input.difficulty,
        input.workload,
        input.rating,
        input.recommend ? 1 : 0,
        input.programStage,
        now,
        now,
      );
    await db.batch([
      termStatement,
      reviewStatement,
      db.prepare(`INSERT INTO app_review_metadata (review_id, user_id, course_id)
                  VALUES (?, ?, ?)`).bind(reviewId, operation.userId, courseId),
    ]);
  } else {
    const reviewStatement = db
      .prepare(
        `UPDATE reviews
         SET term_id = ?, semester_label = ?, body = ?, difficulty = ?,
             workload = ?, rating = ?, recommend = ?, program_stage = ?,
             updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .bind(
        term.id,
        term.label,
        input.body,
        input.difficulty,
        input.workload,
        input.rating,
        input.recommend ? 1 : 0,
        input.programStage,
        now,
        reviewId,
      );
    await db.batch([termStatement, reviewStatement]);
  }

}

function serializeReview(row: ReviewRow) {
  return {
    id: row.id,
    courseId: row.course_id,
    source: row.source,
    semester: row.semester_label,
    difficulty: row.difficulty,
    workload: row.workload,
    rating: row.rating,
    recommend: row.recommend === null ? null : row.recommend === 1,
    programStage: row.program_stage,
    body: row.body,
    pros: [],
    cons: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    metadata:
      row.source === "omscentral"
        ? {
            sourceUrl: row.source_url,
            sourceAuthorHash: row.source_author_hash,
          }
        : {
            pseudonym: row.public_pseudonym,
          },
  };
}

function summarize(rows: ReviewRow[]) {
  const active = rows.filter((row) => !row.deleted_at);
  const count = active.length;
  const rated = active.filter((row) => row.rating !== null);
  const difficult = active.filter((row) => row.difficulty !== null);
  const workload = active.filter((row) => row.workload !== null);

  return {
    count,
    sourceCounts: {
      omscentral: active.filter((row) => row.source === "omscentral").length,
      app: active.filter((row) => row.source === "app").length,
    },
    avgRating: avg(rated.map((row) => row.rating)),
    avgDifficulty: avg(difficult.map((row) => row.difficulty)),
    avgWorkload: avg(workload.map((row) => row.workload)),
    distRating: dist(active.map((row) => row.rating), 5),
    distDifficulty: dist(active.map((row) => row.difficulty), 5),
  };
}

function avg(values: (number | null)[]) {
  const nums = values.filter((value): value is number => value !== null);
  if (!nums.length) return null;
  return Number((nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(2));
}

function dist(values: (number | null)[], size: number) {
  const buckets = Array.from({ length: size }, () => 0);
  for (const value of values) {
    if (value === null) continue;
    const index = Math.max(0, Math.min(size - 1, Math.round(value) - 1));
    buckets[index]++;
  }
  return buckets;
}
