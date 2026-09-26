-- Preserve every imported source slug when several source courses map to one Course.
CREATE TABLE IF NOT EXISTS course_source_slugs (
  slug TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE
);
INSERT INTO course_source_slugs (slug, course_id)
SELECT slug, id FROM courses;
