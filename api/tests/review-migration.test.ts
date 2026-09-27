import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

describe("Hub Review author migration", () => {
  it("assigns existing authors pseudonyms and keeps only active reviews unique", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(readFileSync(new URL("../migrations/0001_reviews.sql", import.meta.url), "utf8"));
      db.exec("INSERT INTO courses (id, slug, title) VALUES ('CS-6200', 'cs-6200', 'Operating Systems')");
      db.exec("INSERT INTO app_users (id, primary_email, verified_email_domain) VALUES ('clerk_1', 'student@gatech.edu', 'gatech.edu')");
      db.exec(`INSERT INTO reviews (id, course_id, source, body, created_at, updated_at)
        VALUES ('old', 'CS-6200', 'app', 'Existing review body with enough content.', '2026-01-01', '2026-01-01')`);
      db.exec("INSERT INTO app_review_metadata (review_id, user_id, course_id) VALUES ('old', 'clerk_1', 'CS-6200')");

      db.exec(readFileSync(new URL("../migrations/0005_hub_review_authors.sql", import.meta.url), "utf8"));
      const author = db.prepare("SELECT public_pseudonym FROM app_users WHERE id = 'clerk_1'").get() as { public_pseudonym: string };
      expect(author.public_pseudonym).toMatch(/^Reviewer-[0-9a-f]{16}$/);
      expect(db.prepare("SELECT active FROM app_review_metadata WHERE review_id = 'old'").get()).toEqual({ active: 1 });

      db.exec("INSERT INTO reviews (id, course_id, source, body, created_at, updated_at) VALUES ('new', 'CS-6200', 'app', 'Second review body with enough content.', '2026-02-01', '2026-02-01')");
      expect(() => db.exec("INSERT INTO app_review_metadata (review_id, user_id, course_id) VALUES ('new', 'clerk_1', 'CS-6200')")).toThrow(/UNIQUE constraint/);
      db.exec("UPDATE reviews SET deleted_at = '2026-03-01' WHERE id = 'old'");
      db.exec("UPDATE app_review_metadata SET active = 0 WHERE review_id = 'old'");
      db.exec("INSERT INTO app_review_metadata (review_id, user_id, course_id) VALUES ('new', 'clerk_1', 'CS-6200')");
      expect(db.prepare("SELECT COUNT(*) AS count FROM app_review_metadata WHERE user_id = 'clerk_1'").get()).toEqual({ count: 2 });
    } finally {
      db.close();
    }
  });
});
