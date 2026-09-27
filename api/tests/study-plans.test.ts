import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "../src/index";

const clerk = vi.hoisted(() => ({ verifyToken: vi.fn(), getUser: vi.fn() }));
vi.mock("@clerk/backend", () => ({
  verifyToken: clerk.verifyToken,
  createClerkClient: () => ({ users: { getUser: clerk.getUser } }),
}));

let sqlite: DatabaseSync;
let env: Env;
const bearer = (user: string) => ({ authorization: `Bearer ${user}` });
const request = (user: string, method = "GET", body?: unknown) => app.request("/study-plan", {
  method, headers: { ...bearer(user), ...(body ? { "content-type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}, env);

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../migrations/0003_study_plans.sql", import.meta.url), "utf8"));
  env = { CLERK_SECRET_KEY: "sk_test_fixture", DB: { prepare(sql: string) {
    let params: unknown[] = [];
    return {
      bind(...values: unknown[]) { params = values; return this; },
      first: async () => sqlite.prepare(sql).get(...params as [] ) ?? null,
      run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...params as []).changes } }),
    };
  } } } as unknown as Env;
  clerk.verifyToken.mockReset().mockImplementation(async (token: string) => ({ sub: token }));
  clerk.getUser.mockReset().mockImplementation(async (id: string) => ({
    id, primaryEmailAddressId: "primary",
    emailAddresses: [{ id: "primary", emailAddress: "student@gatech.edu", verification: { status: "verified" } }],
  }));
});

describe("private Study Plan", () => {
  it("gates reads and writes with verified Georgia Tech auth", async () => {
    expect((await app.request("/study-plan", {}, env)).status).toBe(401);
    expect((await app.request("/study-plan", { method: "PUT" }, env)).status).toBe(401);
    clerk.getUser.mockResolvedValue({ id: "outsider", primaryEmailAddressId: "primary", emailAddresses: [{ id: "primary", emailAddress: "person@example.com", verification: { status: "verified" } }] });
    expect((await request("outsider")).status).toBe(403);
    expect((await request("outsider", "PUT", { revision: 0, plan: {}, selectedSpec: null })).status).toBe(403);
  });

  it("stores one plan and specialization per owner, rejects cross-user revision", async () => {
    const first = { revision: 0, plan: { "Fall-2026": ["CS-6200"] }, selectedSpec: "computing-systems" };
    expect(await (await request("alice")).json()).toEqual({ plan: {}, selectedSpec: null, revision: 0 });
    expect(await (await request("alice", "PUT", first)).json()).toEqual({ ...first, revision: 1 });
    expect(await (await request("alice")).json()).toEqual({ ...first, revision: 1 });
    expect(await (await request("bob")).json()).toEqual({ plan: {}, selectedSpec: null, revision: 0 });
    expect((await request("bob", "PUT", { ...first, revision: 1 })).status).toBe(409);
    expect(await (await request("bob")).json()).toEqual({ plan: {}, selectedSpec: null, revision: 0 });
    expect((await request("alice", "PUT", { ...first, plan: { "Spring-2027": ["CS-6200"] } })).status).toBe(409);
    expect(await (await request("alice")).json()).toEqual({ ...first, revision: 1 });
  });

  it("rejects duplicate placement, invalid term, and malformed specialization", async () => {
    for (const payload of [
      { revision: 0, plan: { "Fall-2026": ["CS-6200"], "Spring-2027": ["CS-6200"] }, selectedSpec: null },
      { revision: 0, plan: { "Winter-2026": ["CS-6200"] }, selectedSpec: null },
      { revision: 0, plan: {}, selectedSpec: "made-up" },
    ]) expect((await request("alice", "PUT", payload)).status).toBe(400);
    expect(await (await request("alice")).json()).toEqual({ plan: {}, selectedSpec: null, revision: 0 });
  });
});
