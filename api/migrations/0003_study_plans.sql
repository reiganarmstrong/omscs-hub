CREATE TABLE IF NOT EXISTS study_plans (
  user_id TEXT PRIMARY KEY,
  plan_json TEXT NOT NULL,
  selected_spec TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
