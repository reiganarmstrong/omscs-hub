PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credits REAL NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  is_deprecated INTEGER NOT NULL DEFAULT 0,
  is_foundational INTEGER NOT NULL DEFAULT 0,
  official_url TEXT,
  syllabus_url TEXT,
  source_created_at TEXT,
  source_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS course_codes (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, code)
);

CREATE TABLE IF NOT EXISTS course_tags (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, tag)
);

CREATE TABLE IF NOT EXISTS course_programs (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  program_ref TEXT NOT NULL,
  PRIMARY KEY (course_id, program_ref)
);

CREATE TABLE IF NOT EXISTS academic_terms (
  id TEXT PRIMARY KEY,
  season TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'unknown')),
  year INTEGER,
  label TEXT NOT NULL UNIQUE,
  sort_key INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  primary_email TEXT NOT NULL,
  verified_email_domain TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('omscentral', 'app')),
  term_id TEXT REFERENCES academic_terms(id),
  semester_label TEXT NOT NULL DEFAULT 'Unspecified',
  body TEXT NOT NULL,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  workload REAL CHECK (workload >= 0),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  recommend INTEGER CHECK (recommend IN (0, 1)),
  program_stage TEXT CHECK (program_stage IN ('First', 'Mid', 'Late')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_course_source_created
  ON reviews(course_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_active_course
  ON reviews(course_id, deleted_at);

CREATE TABLE IF NOT EXISTS omscentral_review_metadata (
  review_id TEXT PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  import_key TEXT NOT NULL UNIQUE,
  course_slug TEXT NOT NULL,
  source_author_hash TEXT,
  source_url TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS app_review_metadata (
  review_id TEXT PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_app_review_metadata_user
  ON app_review_metadata(user_id);
