import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizeTerm } from "../src/terms";

type CourseJson = {
  _createdAt?: string;
  _updatedAt?: string;
  codes?: string[];
  creditHours?: number;
  description?: string;
  id?: string;
  isDeprecated?: boolean;
  isFoundational?: boolean;
  name: string;
  officialURL?: string;
  programs?: { _ref?: string }[];
  slug: string;
  syllabus?: { url?: string };
  tags?: string[];
};

type ReviewJson = {
  author?: string;
  body?: string;
  courseSlug: string;
  createdAt?: string;
  difficulty?: number | null;
  rating?: number | null;
  semester?: string | null;
  sourceUrl?: string;
  workload?: number | null;
};

type Args = {
  apply: boolean;
  database: string;
  dataDir: string;
  local: boolean;
  sqlOut: string;
  historicalOut: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const courses = readJson<CourseJson[]>(resolve(args.dataDir, "courses.json"));
const reviews = readJson<ReviewJson[]>(resolve(args.dataDir, "reviews.json"));
const reviewIdentityCounts = new Map<string, number>();
for (const review of reviews) {
  if (review.author && review.createdAt) {
    const key = sourceIdentityFor(review);
    reviewIdentityCounts.set(key, (reviewIdentityCounts.get(key) ?? 0) + 1);
  }
}
const catalog = readJson<{ courses: { id: string; code: string; title: string; aliases: string[]; credits: number; description: string; foundational: boolean; sourceUrl: string }[] }>(resolve(scriptDir, "../../ui/lib/data/catalog.json"));
const canonicalByCode = new Map(catalog.courses.flatMap(course => [course.code, ...course.aliases].map(code => [normalizeCode(code), course.id] as const)));
const courseIdsBySlug = new Map<string, string>();
for (const course of courses) {
  const matches = new Set((course.codes ?? []).map(code => canonicalByCode.get(normalizeCode(code))).filter(Boolean));
  if (matches.size > 1) throw new Error(`Ambiguous course mapping: ${course.slug}`);
  courseIdsBySlug.set(course.slug, [...matches][0] ?? normalizeCourseId(course));
}
const statements: string[] = ["PRAGMA foreign_keys = ON;"];

// Official facts belong to the curated Catalog, never the review source.
for (const course of catalog.courses) {
  statements.push(`INSERT INTO courses (id, slug, title, credits, description, is_foundational)
    VALUES (${q(course.id)}, ${q(course.id.toLowerCase())}, ${q(course.title)}, ${course.credits}, ${q(course.description)}, ${b(course.foundational)})
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, credits=excluded.credits, description=excluded.description, is_deprecated=0, is_foundational=excluded.is_foundational;`);
  for (const code of [course.code, ...course.aliases]) {
    statements.push(`INSERT INTO course_codes (course_id, code) VALUES (${q(course.id)}, ${q(normalizeCode(code))}) ON CONFLICT(course_id, code) DO NOTHING;`);
  }
}

// Reconcile stored identities even when the latest scraper no longer lists old codes.
for (const [code, courseId] of canonicalByCode) {
  if (code !== courseId) statements.push(reconcileCourseSql(code, courseId));
}
const historical = [];
for (const course of courses) {
  const courseId = courseIdsBySlug.get(course.slug)!;
  const oldId = normalizeCourseId(course);
  const current = catalog.courses.some(item => item.id === courseId);
  if (!current) {
    statements.push(`INSERT INTO courses (id, slug, title, credits, description, is_deprecated)
      VALUES (${q(courseId)}, ${q(course.slug)}, ${q(course.name)}, 0, ${q(course.description ?? "")}, 1)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, is_deprecated=1;`);
    if (reviews.some(review => review.courseSlug === course.slug)) {
      historical.push({ id: courseId, code: course.codes?.[0]?.replaceAll("-", " ") ?? course.slug, title: course.name,
        aliases: (course.codes ?? []).slice(1), description: course.description ?? "",
        sourceUrl: `https://www.omscentral.com/courses/${encodeURIComponent(course.slug)}/reviews` });
    }
  }
  if (oldId !== courseId) {
    statements.push(reconcileCourseSql(oldId, courseId));
  }
  statements.push(`INSERT INTO course_source_slugs (slug, course_id) VALUES (${q(course.slug)}, ${q(courseId)}) ON CONFLICT(slug) DO UPDATE SET course_id=excluded.course_id;`);
  for (const code of course.codes ?? []) {
    statements.push(`INSERT INTO course_codes (course_id, code) VALUES (${q(courseId)}, ${q(normalizeCode(code))}) ON CONFLICT(course_id, code) DO NOTHING;`);
  }
}

let skippedReviews = 0;
for (const review of reviews) {
  const courseId = courseIdsBySlug.get(review.courseSlug);
  if (!courseId) {
    skippedReviews++;
    continue;
  }

  const term = normalizeTerm(review.semester);
  const importKey = importKeyFor(review);
  const reviewId = `omscentral-${importKey.slice(0, 24)}`;
  const uniqueSourceIdentity = review.author && review.createdAt && reviewIdentityCounts.get(sourceIdentityFor(review)) === 1;
  const storedReviewId = `COALESCE(
    (SELECT review_id FROM omscentral_review_metadata WHERE import_key=${q(importKey)}),
    ${uniqueSourceIdentity ? `(SELECT orm.review_id FROM omscentral_review_metadata orm JOIN reviews r ON r.id=orm.review_id
      WHERE orm.course_slug=${q(review.courseSlug)} AND orm.source_author_hash=${q(review.author)} AND r.created_at=${q(review.createdAt)}
      GROUP BY orm.course_slug, orm.source_author_hash, r.created_at HAVING COUNT(*)=1),` : ""}
    ${q(reviewId)})`;
  const createdAt = review.createdAt ?? new Date().toISOString();

  statements.push(
    `INSERT INTO academic_terms (id, season, year, label, sort_key)
     VALUES (${q(term.id)}, ${q(term.season)}, ${n(term.year)}, ${q(term.label)}, ${term.sortKey})
     ON CONFLICT(id) DO NOTHING;`,
  );

  statements.push(
    `INSERT INTO reviews (
      id, course_id, source, term_id, semester_label, body, difficulty,
      workload, rating, recommend, program_stage, created_at, updated_at, deleted_at
    ) VALUES (
      ${storedReviewId}, ${q(courseId)}, 'omscentral', ${q(term.id)}, ${q(term.label)},
      ${q(review.body ?? "")}, ${n(review.difficulty)}, ${n(review.workload)}, ${n(review.rating)},
      NULL, NULL, ${q(createdAt)}, ${q(createdAt)}, NULL
    )
    ON CONFLICT(id) DO UPDATE SET
      course_id = excluded.course_id,
      term_id = excluded.term_id,
      semester_label = excluded.semester_label,
      body = excluded.body,
      difficulty = excluded.difficulty,
      workload = excluded.workload,
      rating = excluded.rating,
      updated_at = excluded.updated_at,
      deleted_at = NULL;`,
  );

  statements.push(
    `INSERT INTO omscentral_review_metadata (
      review_id, import_key, course_slug, source_author_hash, source_url
    ) VALUES (
      ${storedReviewId}, ${q(importKey)}, ${q(review.courseSlug)}, ${q(review.author)}, ${q(review.sourceUrl ?? `https://www.omscentral.com/courses/${encodeURIComponent(review.courseSlug)}/reviews`)}
    )
    ON CONFLICT(review_id) DO UPDATE SET
      import_key = excluded.import_key,
      course_slug = excluded.course_slug,
      source_author_hash = excluded.source_author_hash,
      source_url = excluded.source_url;`,
  );
}

if (skippedReviews) throw new Error(`${skippedReviews} reviews have unknown source slugs; import stopped.`);
if (args.historicalOut) {
  const out = resolve(args.historicalOut);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify([...new Map(historical.map(course => [course.id, course])).values()], null, 2) + "\n");
}
const sql = statements.join("\n\n");
if (args.sqlOut) {
  const out = resolve(args.sqlOut);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, sql);
}

console.log(
  JSON.stringify(
    {
      courses: courses.length,
      reviews: reviews.length,
      skippedReviews,
      sqlStatements: statements.length,
      sqlOut: args.sqlOut ? resolve(args.sqlOut) : null,
      apply: args.apply,
    },
    null,
    2,
  ),
);

if (args.apply) {
  const file = args.sqlOut ? resolve(args.sqlOut) : ".wrangler/tmp/omscentral-import.sql";
  if (!args.sqlOut) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, sql);
  }

  const wranglerArgs = ["d1", "execute", args.database, "--file", file];
  if (args.local) wranglerArgs.push("--local");
  else wranglerArgs.push("--remote");
  const result = spawnSync("pnpm", ["wrangler", ...wranglerArgs], {
    stdio: "inherit",
    cwd: resolve(scriptDir, ".."),
  });
  process.exit(result.status ?? 1);
}

function parseArgs(raw: string[]): Args {
  const args: Args = {
    apply: false,
    database: "omscs-hub-reviews-dev",
    dataDir: "../omscentral-scraper/data",
    local: true,
    sqlOut: "",
    historicalOut: "",
  };

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === "--") continue;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--local") args.local = true;
    else if (arg === "--remote") args.local = false;
    else if (arg === "--database") args.database = mustValue(raw[++i], arg);
    else if (arg === "--data-dir") args.dataDir = mustValue(raw[++i], arg);
    else if (arg === "--historical-out") args.historicalOut = mustValue(raw[++i], arg);
    else if (arg === "--sql-out") args.sqlOut = mustValue(raw[++i], arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.dataDir = resolve(scriptDir, "..", args.dataDir);
  return args;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function reconcileCourseSql(oldId: string, courseId: string) {
  // Unique Hub Review conflicts stop the import for human reconciliation.
  return `UPDATE app_review_metadata SET course_id=${q(courseId)} WHERE course_id=${q(oldId)};
    UPDATE reviews SET course_id=${q(courseId)} WHERE course_id=${q(oldId)};
    UPDATE course_source_slugs SET course_id=${q(courseId)} WHERE course_id=${q(oldId)};
    INSERT INTO course_codes (course_id,code,position) SELECT ${q(courseId)},code,position FROM course_codes WHERE course_id=${q(oldId)} ON CONFLICT(course_id,code) DO NOTHING;
    DELETE FROM courses WHERE id=${q(oldId)};`;
}

function normalizeCourseId(course: CourseJson) {
  const code = course.codes?.[0];
  return code ? normalizeCode(code) : course.slug;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

function importKeyFor(review: ReviewJson) {
  return createHash("sha256")
    .update(
      [
        review.courseSlug,
        review.author ?? "",
        review.createdAt ?? "",
        review.semester ?? "",
        review.body ?? "",
      ].join("\0"),
    )
    .digest("hex");
}

function sourceIdentityFor(review: ReviewJson) {
  return [review.courseSlug, review.author, review.createdAt].join("\0");
}

function q(value: string | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function n(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "NULL" : String(value);
}

function b(value: boolean | null | undefined) {
  return value ? "1" : "0";
}

function mustValue(value: string | undefined, flag: string) {
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}
