CREATE TABLE account_deletions (
  user_id TEXT PRIMARY KEY,
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Reject in-flight writes authenticated before the deletion transaction commits.
CREATE TRIGGER account_deleted_plan_insert BEFORE INSERT ON study_plans
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.user_id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
CREATE TRIGGER account_deleted_plan_update BEFORE UPDATE ON study_plans
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.user_id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
CREATE TRIGGER account_deleted_user_insert BEFORE INSERT ON app_users
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
CREATE TRIGGER account_deleted_user_update BEFORE UPDATE ON app_users
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
CREATE TRIGGER account_deleted_review_insert BEFORE INSERT ON app_review_metadata
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.user_id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
CREATE TRIGGER account_deleted_review_update BEFORE UPDATE ON app_review_metadata
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id = NEW.user_id)
BEGIN SELECT RAISE(ABORT, 'Account deleted'); END;
