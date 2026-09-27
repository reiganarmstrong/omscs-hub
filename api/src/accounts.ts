import { createClerkClient } from "@clerk/backend";
import { Hono } from "hono";
import { z } from "zod";
import { requireGatechUserForDeletion } from "./auth";
import type { Bindings, Variables } from "./types";

const confirmation = z.object({ confirmation: z.literal("DELETE MY ACCOUNT") });
export const accounts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

accounts.delete("/account", requireGatechUserForDeletion, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Enter DELETE MY ACCOUNT to confirm." }, 400); }
  if (!confirmation.safeParse(body).success) {
    return c.json({ error: "Enter DELETE MY ACCOUNT to confirm." }, 400);
  }

  const userId = c.get("authUser").id;
  // D1 batch is atomic: tombstone, private records, and public reviews change together.
  // The tombstone survives Clerk failures so an old token cannot restore access.
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT OR IGNORE INTO account_deletions (user_id) VALUES (?)").bind(userId),
    c.env.DB.prepare("DELETE FROM study_plans WHERE user_id = ?").bind(userId),
    c.env.DB.prepare("DELETE FROM reviews WHERE id IN (SELECT review_id FROM app_review_metadata WHERE user_id = ?)").bind(userId),
    c.env.DB.prepare("DELETE FROM app_users WHERE id = ?").bind(userId),
  ]);

  try {
    await createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY }).users.deleteUser(userId);
  } catch (error) {
    console.error("Clerk account deletion failed", error);
    return c.json({ error: "Account data removed, but sign-in deletion is pending. Retry account deletion." }, 503);
  }
  return c.json({ deleted: true });
});
