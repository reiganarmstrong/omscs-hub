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

reviews.get(
  "/courses/:courseId/reviews",
  zValidator("query", sourceQuerySchema, (result, c) => {
    if (!result.success) return validationErrorResponse(result, c);
  }),
  async (c) => {
    const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
    if (!courseId) return c.json({ error: "Course not found." }, 404);

    const { source, includeDeleted } = c.req.valid("query");
    const rows = await listReviews(c.env.DB, courseId, source, includeDeleted);

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
    const rows = await listReviews(c.env.DB, courseId, source, false);
    return c.json({ courseId, summary: summarize(rows) });
  },
);

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

    const existing = await c.env.DB.prepare(
      `SELECT r.id, r.deleted_at
       FROM app_review_metadata arm
       JOIN reviews r ON r.id = arm.review_id
       WHERE arm.user_id = ? AND arm.course_id = ?`,
    )
      .bind(user.id, courseId)
      .first<{ id: string; deleted_at: string | null }>();

    if (existing?.id && !existing.deleted_at) {
      return c.json({ error: "You already have an active review for this course." }, 409);
    }

    const reviewId = existing?.id ?? crypto.randomUUID();
    await writeAppReview(c.env.DB, reviewId, courseId, input, existing?.id ? "update" : "insert");

    if (!existing?.id) {
      await c.env.DB.prepare(
        `INSERT INTO app_review_metadata (review_id, user_id, course_id)
         VALUES (?, ?, ?)`,
      )
        .bind(reviewId, user.id, courseId)
        .run();
    }

    return c.json({ reviewId }, existing?.id ? 200 : 201);
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
    if (!review || review.deleted_at) return c.json({ error: "Active review not found." }, 404);

    await writeAppReview(c.env.DB, review.id, courseId, c.req.valid("json"), "update");
    return c.json({ reviewId: review.id });
  },
);

reviews.delete("/courses/:courseId/reviews/me", requireGatechUser, async (c) => {
  const courseId = await resolveCourseId(c.env.DB, c.req.param("courseId"));
  if (!courseId) return c.json({ error: "Course not found." }, 404);

  const user = c.get("authUser");
  const review = await findUserReview(c.env.DB, user.id, courseId);
  if (!review || review.deleted_at) return c.json({ error: "Active review not found." }, 404);

  const now = new Date().toISOString();
  await c.env.DB.prepare("UPDATE reviews SET deleted_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, review.id)
    .run();

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
       WHERE c.id = ? OR c.slug = ? OR cc.code = ?
       LIMIT 1`,
    )
    .bind(decoded, decoded, normalizedCode)
    .first<{ id: string }>();

  return row?.id ?? null;
}

async function listReviews(
  db: D1Database,
  courseId: string,
  source: "all" | "omscentral" | "app",
  includeDeleted: boolean,
) {
  const filters = ["r.course_id = ?"];
  const params: unknown[] = [courseId];
  if (source !== "all") {
    filters.push("r.source = ?");
    params.push(source);
  }
  if (!includeDeleted) filters.push("r.deleted_at IS NULL");

  const query = `
    SELECT r.*, arm.user_id, orm.source_url, orm.source_author_hash
    FROM reviews r
    LEFT JOIN app_review_metadata arm ON arm.review_id = r.id
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
      `INSERT INTO app_users (id, primary_email, verified_email_domain, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         primary_email = excluded.primary_email,
         verified_email_domain = excluded.verified_email_domain,
         updated_at = excluded.updated_at`,
    )
    .bind(id, email, domain, now, now)
    .run();
}

async function findUserReview(db: D1Database, userId: string, courseId: string) {
  return db
    .prepare(
      `SELECT r.id, r.deleted_at
       FROM app_review_metadata arm
       JOIN reviews r ON r.id = arm.review_id
       WHERE arm.user_id = ? AND arm.course_id = ?`,
    )
    .bind(userId, courseId)
    .first<{ id: string; deleted_at: string | null }>();
}

async function writeAppReview(
  db: D1Database,
  reviewId: string,
  courseId: string,
  input: ReviewBodyInput,
  mode: "insert" | "update",
) {
  const now = new Date().toISOString();
  const term = normalizeTerm(input.semester);

  await db
    .prepare(
      `INSERT INTO academic_terms (id, season, year, label, sort_key)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .bind(term.id, term.season, term.year, term.label, term.sortKey)
    .run();

  if (mode === "insert") {
    await db
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
      )
      .run();
  } else {
    await db
      .prepare(
        `UPDATE reviews
         SET term_id = ?, semester_label = ?, body = ?, difficulty = ?,
             workload = ?, rating = ?, recommend = ?, program_stage = ?,
             updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
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
      )
      .run();
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
            userId: row.user_id,
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
