ALTER TABLE app_users ADD COLUMN public_pseudonym TEXT;
UPDATE app_users
SET public_pseudonym = 'Reviewer-' || lower(hex(randomblob(8)))
WHERE public_pseudonym IS NULL;
CREATE UNIQUE INDEX idx_app_users_public_pseudonym ON app_users(public_pseudonym);

CREATE TABLE app_review_metadata_next (
  review_id TEXT PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO app_review_metadata_next (review_id, user_id, course_id, active, created_at, updated_at)
SELECT arm.review_id, arm.user_id, arm.course_id,
       CASE WHEN r.deleted_at IS NULL THEN 1 ELSE 0 END,
       arm.created_at, arm.updated_at
FROM app_review_metadata arm JOIN reviews r ON r.id = arm.review_id;
DROP TABLE app_review_metadata;
ALTER TABLE app_review_metadata_next RENAME TO app_review_metadata;
CREATE INDEX idx_app_review_metadata_user ON app_review_metadata(user_id);
CREATE UNIQUE INDEX idx_app_review_one_active
  ON app_review_metadata(user_id, course_id) WHERE active = 1;
