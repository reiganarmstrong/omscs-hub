import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { expect, it } from "vitest";
import app from "../src/index";

function importFixture() {
  const directory = mkdtempSync(join(tmpdir(), "omscs-import-"));
  const db = new DatabaseSync(":memory:");
  for (const file of ["0001_reviews.sql", "0002_course_source_slugs.sql"]) db.exec(readFileSync(`migrations/${file}`, "utf8"));
  for (const file of ["courses.json", "reviews.json"]) writeFileSync(join(directory, file), readFileSync(`tests/fixtures/omscentral/${file}`));
  return { db, directory, generate() {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/import-omscentral.ts", "--data-dir", directory, "--sql-out", join(directory, "import.sql"), "--historical-out", join(directory, "history.json")]);
    return readFileSync(join(directory, "import.sql"), "utf8");
  }, close() { db.close(); rmSync(directory, { recursive: true, force: true }); } };
}

it("reconciles verified codes and source slugs, preserves existing Imported and Hub Reviews, and reruns without duplicates", async () => {
  const fixture = importFixture();
  const { db, directory } = fixture;
  try {
    db.exec("INSERT INTO courses (id,slug,title) VALUES ('CS-8803-GA','graduate-algorithms','Old GA'); INSERT INTO reviews (id,course_id,source,body,created_at,updated_at) VALUES ('existing','CS-8803-GA','omscentral','Keep existing text','2020','2020'), ('hub','CS-8803-GA','app','Keep Hub Review','2020','2020'); INSERT INTO app_users (id,primary_email,verified_email_domain) VALUES ('owner','owner@gatech.edu','gatech.edu'); INSERT INTO app_review_metadata (review_id,user_id,course_id) VALUES ('hub','owner','CS-8803-GA');");
    const sql = fixture.generate();
    db.exec(sql);
    const before = db.prepare("SELECT id FROM reviews ORDER BY id").all();
    db.exec(sql);
    expect(db.prepare("SELECT id FROM reviews ORDER BY id").all()).toEqual(before);
    expect(db.prepare("SELECT course_id FROM reviews WHERE id='existing'").get()?.course_id).toBe("CS-6515");
    expect(db.prepare("SELECT course_id FROM app_review_metadata WHERE review_id='hub'").get()?.course_id).toBe("CS-6515");
    expect(db.prepare("SELECT course_id FROM course_source_slugs WHERE slug='graduate-algorithms'").get()?.course_id).toBe("CS-6515");
    expect(db.prepare("SELECT COUNT(*) AS count FROM courses WHERE id IN ('CS-8803-GA','CS-6515')").get()?.count).toBe(1);
    expect(JSON.parse(readFileSync(join(directory, "history.json"), "utf8")).map((course: { id: string }) => course.id)).toEqual(["CS-9999"]);
    const env = { DB: { prepare(sql: string) { let params: unknown[] = []; return {
      bind(...values: unknown[]) { params = values; return this; },
      first: async () => db.prepare(sql).get(...params as never[]),
      all: async () => ({ results: db.prepare(sql).all(...params as never[]) }),
    }; } } as unknown as D1Database, CLERK_SECRET_KEY: "fixture" };
    for (const identity of ["CS-8803-GA", "CS-6515", "graduate-algorithms", "introduction-to-graduate-algorithms"]) {
      const result = await app.request(`/courses/${identity}/reviews`, {}, env);
      const payload = await result.json() as { courseId: string; reviews: { body: string; metadata: { sourceUrl?: string } }[] };
      expect(result.status).toBe(200);
      expect(payload.courseId).toBe("CS-6515");
      const imported = payload.reviews.find(review => review.body.startsWith("First paragraph"));
      expect(imported?.body).toBe("First paragraph of the imported review.\nFinal paragraph stays intact, with details beyond any preview.");
      expect(imported?.metadata.sourceUrl).toBe("https://www.omscentral.com/courses/graduate-algorithms/reviews#fixture-review");
    }
    expect(db.prepare("SELECT source_url FROM omscentral_review_metadata WHERE course_slug='historical-fixture'").get()?.source_url).toBe("https://www.omscentral.com/courses/historical-fixture/reviews");
    const reviews = JSON.parse(readFileSync(join(directory, "reviews.json"), "utf8"));
    reviews[0].body = "Corrected full review text, same source author and timestamp.";
    writeFileSync(join(directory, "reviews.json"), JSON.stringify(reviews));
    db.exec(fixture.generate());
    expect(db.prepare("SELECT id FROM reviews ORDER BY id").all()).toEqual(before);
    expect(db.prepare("SELECT body FROM reviews WHERE body LIKE 'Corrected%'").get()?.body).toBe(reviews[0].body);
  } finally { fixture.close(); }
});

it("stops on conflicting Hub Review ownership without deleting either review", () => {
  const fixture = importFixture();
  try {
    fixture.db.exec("INSERT INTO courses (id,slug,title) VALUES ('CS-8803-GA','graduate-algorithms','Old GA'),('CS-6515','current-ga','Current GA'); INSERT INTO reviews (id,course_id,source,body,created_at,updated_at) VALUES ('old','CS-8803-GA','app','Old text','2020','2020'),('current','CS-6515','app','Current text','2021','2021'); INSERT INTO app_users (id,primary_email,verified_email_domain) VALUES ('owner','owner@gatech.edu','gatech.edu'); INSERT INTO app_review_metadata (review_id,user_id,course_id) VALUES ('old','owner','CS-8803-GA'),('current','owner','CS-6515');");
    expect(() => fixture.db.exec(fixture.generate())).toThrow(/UNIQUE constraint/);
    expect(fixture.db.prepare("SELECT id, body FROM reviews ORDER BY id").all()).toEqual([{ id: "current", body: "Current text" }, { id: "old", body: "Old text" }]);
  } finally { fixture.close(); }
});

it("keeps separate reviews that share source author and timestamp", () => {
  const fixture = importFixture();
  try {
    const path = join(fixture.directory, "reviews.json");
    const reviews = JSON.parse(readFileSync(path, "utf8"));
    reviews.push({ ...reviews[0], body: "Another real review by the same anonymized author at the same timestamp." });
    writeFileSync(path, JSON.stringify(reviews));
    const sql = fixture.generate();
    fixture.db.exec(sql);
    expect(fixture.db.prepare("SELECT body FROM reviews WHERE source='omscentral' AND course_id='CS-6515' ORDER BY body").all()).toEqual([
      { body: "Another real review by the same anonymized author at the same timestamp." },
      { body: reviews[0].body },
    ]);
    fixture.db.exec(sql);
    expect(fixture.db.prepare("SELECT COUNT(*) AS count FROM reviews WHERE source='omscentral' AND course_id='CS-6515'").get()?.count).toBe(2);
  } finally { fixture.close(); }
});
