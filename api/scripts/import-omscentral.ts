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
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const courses = readJson<CourseJson[]>(resolve(args.dataDir, "courses.json"));
const reviews = readJson<ReviewJson[]>(resolve(args.dataDir, "reviews.json"));
const courseIdsBySlug = new Map(courses.map((course) => [course.slug, normalizeCourseId(course)]));
const statements: string[] = ["PRAGMA foreign_keys = ON;"];

for (const course of courses) {
  const courseId = normalizeCourseId(course);
  statements.push(
    `INSERT INTO courses (
      id, slug, title, credits, description, is_deprecated, is_foundational,
      official_url, syllabus_url, source_created_at, source_updated_at, updated_at
    ) VALUES (
      ${q(courseId)}, ${q(course.slug)}, ${q(course.name)}, ${n(course.creditHours ?? 0)},
      ${q(course.description ?? "")}, ${b(course.isDeprecated)}, ${b(course.isFoundational)},
      ${q(course.officialURL)}, ${q(course.syllabus?.url)}, ${q(course._createdAt)},
      ${q(course._updatedAt)}, ${q(new Date().toISOString())}
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      credits = excluded.credits,
      description = excluded.description,
      is_deprecated = excluded.is_deprecated,
      is_foundational = excluded.is_foundational,
      official_url = excluded.official_url,
      syllabus_url = excluded.syllabus_url,
      source_created_at = excluded.source_created_at,
      source_updated_at = excluded.source_updated_at,
      updated_at = excluded.updated_at;`,
  );

  for (const [position, code] of (course.codes ?? []).entries()) {
    statements.push(
      `INSERT INTO course_codes (course_id, code, position)
       VALUES (${q(courseId)}, ${q(normalizeCode(code))}, ${position})
       ON CONFLICT(course_id, code) DO UPDATE SET position = excluded.position;`,
    );
  }

  for (const [position, tag] of (course.tags ?? []).entries()) {
    statements.push(
      `INSERT INTO course_tags (course_id, tag, position)
       VALUES (${q(courseId)}, ${q(tag)}, ${position})
       ON CONFLICT(course_id, tag) DO UPDATE SET position = excluded.position;`,
    );
  }

  for (const programRef of (course.programs ?? []).map((program) => program._ref).filter(Boolean)) {
    statements.push(
      `INSERT INTO course_programs (course_id, program_ref)
       VALUES (${q(courseId)}, ${q(programRef)})
       ON CONFLICT(course_id, program_ref) DO NOTHING;`,
    );
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
      ${q(reviewId)}, ${q(courseId)}, 'omscentral', ${q(term.id)}, ${q(term.label)},
      ${q(review.body?.trim() ?? "")}, ${n(review.difficulty)}, ${n(review.workload)}, ${n(review.rating)},
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
      ${q(reviewId)}, ${q(importKey)}, ${q(review.courseSlug)}, ${q(review.author)}, ${q(review.sourceUrl)}
    )
    ON CONFLICT(import_key) DO UPDATE SET
      review_id = excluded.review_id,
      course_slug = excluded.course_slug,
      source_author_hash = excluded.source_author_hash,
      source_url = excluded.source_url;`,
  );
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
  };

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === "--") continue;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--local") args.local = true;
    else if (arg === "--remote") args.local = false;
    else if (arg === "--database") args.database = mustValue(raw[++i], arg);
    else if (arg === "--data-dir") args.dataDir = mustValue(raw[++i], arg);
    else if (arg === "--sql-out") args.sqlOut = mustValue(raw[++i], arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.dataDir = resolve(scriptDir, "..", args.dataDir);
  return args;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
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
