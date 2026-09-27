import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const clerk = vi.hoisted(() => ({ deleted: new Set<string>(), fail: false, deleteUser: vi.fn() }));
vi.mock("@clerk/backend", () => ({
  verifyToken: async (token: string) => ({ sub: token }),
  createClerkClient: () => ({ users: {
    getUser: async (id: string) => {
      if (clerk.deleted.has(id)) throw Object.assign(new Error("User deleted"), { status: 404 });
      return { id, primaryEmailAddressId: "primary", emailAddresses: [{ id: "primary", emailAddress: "student@gatech.edu", verification: { status: "verified" } }] };
    },
    deleteUser: clerk.deleteUser,
  } }),
}));
import app from "../src/index";

let sqlite: DatabaseSync;
let env: Env;
const auth = (id: string) => ({ authorization: `Bearer ${id}` });
const get = (id: string, path: string) => app.request(path, { headers: auth(id) }, env);
const remove = (id: string, confirmation = "DELETE MY ACCOUNT") => app.request("/account", {
  method: "DELETE", headers: { ...auth(id), "content-type": "application/json" },
  body: JSON.stringify({ confirmation }),
}, env);

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of ["0001_reviews.sql", "0002_course_source_slugs.sql", "0003_study_plans.sql", "0004_course_attempts.sql", "0005_hub_review_authors.sql", "0006_account_deletions.sql", "0007_hub_review_moderation.sql"]) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  sqlite.exec(`
    INSERT INTO courses (id, slug, title) VALUES ('CS-6200', 'cs-6200', 'Operating Systems');
    INSERT INTO app_users (id, primary_email, verified_email_domain, public_pseudonym) VALUES
      ('alice', 'alice@gatech.edu', 'gatech.edu', 'Reviewer-alice'),
      ('bob', 'bob@gatech.edu', 'gatech.edu', 'Reviewer-bob');
    INSERT INTO study_plans (user_id, plan_json, attempts_json) VALUES
      ('alice', '{"Fall-2026":["CS-6200"]}', '[{"id":"00000000-0000-0000-0000-000000000001","courseId":"CS-6200","term":"Fall-2026","outcome":"A"}]'),
      ('bob', '{"Spring-2027":["CS-6200"]}', '[]');
    INSERT INTO reviews (id, course_id, source, body, rating, created_at, updated_at) VALUES
      ('alice-review', 'CS-6200', 'app', 'Alice Hub Review', 5, '2026-01-01', '2026-01-01'),
      ('bob-review', 'CS-6200', 'app', 'Bob Hub Review', 3, '2026-01-01', '2026-01-01'),
      ('imported', 'CS-6200', 'omscentral', 'Imported Review', 4, '2026-01-01', '2026-01-01');
    INSERT INTO app_review_metadata (review_id, user_id, course_id) VALUES
      ('alice-review', 'alice', 'CS-6200'), ('bob-review', 'bob', 'CS-6200');
  `);
  env = { CLERK_SECRET_KEY: "test", DB: {
    prepare(sql: string) { let values: unknown[] = []; return {
      bind(...params: unknown[]) { values = params; return this; },
      first: async () => sqlite.prepare(sql).get(...values as [] ) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...values as []) }),
      run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...values as []).changes } }),
    }; },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  } } as unknown as Env;
  clerk.deleted.clear();
  clerk.fail = false;
  clerk.deleteUser.mockReset().mockImplementation(async (id: string) => {
    if (clerk.fail) throw new Error("Clerk unavailable");
    clerk.deleted.add(id);
  });
});
afterEach(() => sqlite.close());

describe("account deletion", () => {
  it("requires authenticated, explicit confirmation", async () => {
    expect((await app.request("/account", { method: "DELETE" }, env)).status).toBe(401);
    expect((await remove("alice", "delete" )).status).toBe(400);
    expect((await get("alice", "/study-plan")).status).toBe(200);
    expect(clerk.deleteUser).not.toHaveBeenCalled();
  });

  it("purges one user's plan, attempts, account, and Hub Reviews while preserving others and imports", async () => {
    expect((await remove("alice")).status).toBe(200);
    expect(clerk.deleteUser).toHaveBeenCalledWith("alice");
    expect(sqlite.prepare("SELECT count(*) AS n FROM study_plans WHERE user_id = 'alice'").get()).toEqual({ n: 0 });
    expect(sqlite.prepare("SELECT count(*) AS n FROM app_users WHERE id = 'alice'").get()).toEqual({ n: 0 });
    expect(() => sqlite.exec("INSERT INTO study_plans (user_id, plan_json, attempts_json) VALUES ('alice', '{}', '[]')")).toThrow(/Account deleted/);
    expect(() => sqlite.exec("INSERT INTO app_users (id, primary_email, verified_email_domain) VALUES ('alice', 'alice@gatech.edu', 'gatech.edu')")).toThrow(/Account deleted/);
    expect(sqlite.prepare("SELECT id FROM reviews ORDER BY id").all()).toEqual([{ id: "bob-review" }, { id: "imported" }]);
    expect((await get("alice", "/study-plan")).status).toBe(401);
    expect((await get("alice", "/auth/session")).status).toBe(401);
    expect((await get("alice", "/courses/CS-6200/reviews/me")).status).toBe(401);
    const bobPlan = await (await get("bob", "/study-plan")).json() as { plan: Record<string, string[]>; attempts: unknown[] };
    expect(bobPlan.plan).toEqual({ "Spring-2027": ["CS-6200"] });
    expect(bobPlan.attempts).toEqual([]);
    const publicReviews = await (await app.request("/courses/CS-6200/reviews", {}, env)).json() as { reviews: { id: string }[] };
    expect(publicReviews.reviews.map((review) => review.id).sort()).toEqual(["bob-review", "imported"]);
    const summary = await (await app.request("/courses/CS-6200/reviews/summary", {}, env)).json() as { summary: { count: number } };
    expect(summary.summary.count).toBe(2);
    const stats = await (await app.request("/reviews/catalog-stats", {}, env)).json() as { courses: { numReviews: number }[] };
    expect(stats.courses[0].numReviews).toBe(2);
  });

  it("keeps a tombstone on Clerk failure, blocks stale tokens, and permits retry", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      clerk.fail = true;
      expect((await remove("alice")).status).toBe(503);
      expect((await get("alice", "/study-plan")).status).toBe(403);
      expect((await get("alice", "/auth/session")).status).toBe(403);
      expect(sqlite.prepare("SELECT count(*) AS n FROM reviews WHERE id = 'alice-review'").get()).toEqual({ n: 0 });
      clerk.fail = false;
      expect((await remove("alice")).status).toBe(200);
      expect((await get("alice", "/study-plan")).status).toBe(401);
    } finally { log.mockRestore(); }
  });
});
