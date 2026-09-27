ALTER TABLE reviews ADD COLUMN hidden_at TEXT;

CREATE TABLE hub_review_moderation_events (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hide', 'unhide')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 10 AND 1000),
  actor_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_hub_review_moderation_events_review
  ON hub_review_moderation_events(review_id, created_at);

-- Audit insertion is the state transition. An invalid or repeated action aborts
-- the insert, so a hidden review cannot change without its audit event.
CREATE TRIGGER hub_review_moderation_validate BEFORE INSERT ON hub_review_moderation_events
BEGIN
  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1 FROM reviews WHERE id = NEW.review_id AND source = 'app' AND deleted_at IS NULL
      AND ((NEW.action = 'hide' AND hidden_at IS NULL)
        OR (NEW.action = 'unhide' AND hidden_at IS NOT NULL))
  ) THEN RAISE(ABORT, 'Hub Review not found or already in requested state') END);
END;

CREATE TRIGGER hub_review_moderation_apply AFTER INSERT ON hub_review_moderation_events
BEGIN
  UPDATE reviews SET hidden_at = CASE WHEN NEW.action = 'hide' THEN NEW.created_at ELSE NULL END
  WHERE id = NEW.review_id;
END;
