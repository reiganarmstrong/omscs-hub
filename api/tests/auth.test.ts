import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";

const clerk = vi.hoisted(() => ({ verifyToken: vi.fn(), getUser: vi.fn() }));
vi.mock("@clerk/backend", () => ({
  verifyToken: clerk.verifyToken,
  createClerkClient: () => ({ users: { getUser: clerk.getUser } }),
}));

const email = (id: string, emailAddress: string, status = "verified") => ({
  id, emailAddress, verification: { status },
});
const env = { CLERK_SECRET_KEY: "sk_test_fixture" } as Env;
const routes = [
  ["GET", "/auth/session"],
  ["POST", "/courses/CS-6200/reviews"],
  ["PUT", "/courses/CS-6200/reviews/me"],
  ["DELETE", "/courses/CS-6200/reviews/me"],
];

beforeEach(() => {
  clerk.verifyToken.mockReset().mockResolvedValue({ sub: "user_private" });
  clerk.getUser.mockReset().mockResolvedValue({
    id: "user_private", primaryEmailAddressId: "primary",
    emailAddresses: [email("primary", "student@gatech.edu")],
  });
});

describe("Georgia Tech session eligibility", () => {
  it("allows a verified primary Georgia Tech email without returning account details", async () => {
    const res = await app.request("/auth/session", { headers: { authorization: "Bearer valid" } }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ eligible: true });
  });
});

for (const [method, path] of routes) {
  describe(`${method} ${path}`, () => {
    it("requires a bearer token", async () => {
      const res = await app.request(path, { method }, env);
      expect(res.status).toBe(401);
    });
    it("rejects an invalid or expired token", async () => {
      clerk.verifyToken.mockRejectedValue(new Error("Token expired"));
      const res = await app.request(path, { method, headers: { authorization: "Bearer invalid" } }, env);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Authentication required." });
    });
    it.each([
      ["unverified primary", "primary", [email("primary", "student@gatech.edu", "unverified")]],
      ["verified secondary with missing primary", "missing", [email("secondary", "student@gatech.edu")]],
      ["no primary ID", null, [email("secondary", "student@gatech.edu")]],
      ["unverified primary with verified secondary", "primary", [email("primary", "student@gatech.edu", "unverified"), email("secondary", "other@gatech.edu")]],
      ["non-Georgia-Tech primary with verified Georgia Tech secondary", "primary", [email("primary", "person@example.com"), email("secondary", "student@gatech.edu")]],
      ["lookalike domain", "primary", [email("primary", "person@gatech.edu.example.com")]],
      ["subdomain", "primary", [email("primary", "person@mail.gatech.edu")]],
      ["malformed email", "primary", [email("primary", "person@gatech.edu@evil.example")]],
    ])("rejects %s", async (_label, primaryEmailAddressId, emailAddresses) => {
      clerk.getUser.mockResolvedValue({ id: "user_private", primaryEmailAddressId, emailAddresses });
      const res = await app.request(path, { method, headers: { authorization: "Bearer valid" } }, env);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Sign-in requires a verified primary @gatech.edu email." });
    });
  });
}
