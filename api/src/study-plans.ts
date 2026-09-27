import { Hono } from "hono";
import { z } from "zod";
import { requireGatechUser } from "./auth";
import { validationErrorResponse } from "./validation";
import type { Bindings, Variables } from "./types";

const courseId = z.string().regex(/^[A-Z]{2,5}-\d{4}[A-Z]?$/);
const term = z.union([z.literal("unassigned"), z.string().regex(/^(Spring|Summer|Fall)-\d{4}$/)]);
const planSchema = z.record(term, z.array(courseId).max(200)).superRefine((plan, ctx) => {
  const placed = new Set<string>();
  for (const ids of Object.values(plan)) {
    for (const id of ids) {
      if (placed.has(id)) ctx.addIssue({ code: "custom", message: `${id} appears in more than one placement.` });
      placed.add(id);
    }
  }
});
const selectedSpecSchema = z.enum([
  "computing-systems", "machine-learning", "artificial-intelligence",
  "computational-perception", "human-computer-interaction", "computer-graphics",
]).nullable();
const attemptsSchema = z.array(z.object({
  id: z.string().uuid(),
  courseId,
  term: z.string().regex(/^(Spring|Summer|Fall)-\d{4}$/),
  outcome: z.enum(["A", "B", "C", "D", "F", "W", "I"]),
})).max(500).superRefine((attempts, ctx) => {
  const ids = new Set<string>();
  for (const attempt of attempts) {
    if (ids.has(attempt.id)) ctx.addIssue({ code: "custom", message: `Duplicate Course Attempt ${attempt.id}.` });
    ids.add(attempt.id);
  }
});
const writeSchema = z.object({
  revision: z.number().int().nonnegative(),
  plan: planSchema,
  selectedSpec: selectedSpecSchema,
  attempts: attemptsSchema,
});

type PlanRow = { plan_json: string; selected_spec: string | null; attempts_json: string; revision: number };
export const studyPlans = new Hono<{ Bindings: Bindings; Variables: Variables }>();
studyPlans.use("/study-plan", requireGatechUser);

studyPlans.get("/study-plan", async (c) => {
  const row = await c.env.DB.prepare("SELECT plan_json, selected_spec, attempts_json, revision FROM study_plans WHERE user_id = ?")
    .bind(c.get("authUser").id).first<PlanRow>();
  c.header("Cache-Control", "no-store");
  return c.json(row
    ? { plan: JSON.parse(row.plan_json), selectedSpec: row.selected_spec, attempts: JSON.parse(row.attempts_json), revision: row.revision }
    : { plan: {}, selectedSpec: null, attempts: [], revision: 0 });
});

studyPlans.put("/study-plan", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Invalid JSON." }, 400); }
  const parsed = writeSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed, c);
  const { revision, plan, selectedSpec, attempts } = parsed.data;
  const userId = c.get("authUser").id;
  const updated = revision === 0
    ? await c.env.DB.prepare("INSERT OR IGNORE INTO study_plans (user_id, plan_json, selected_spec, attempts_json) VALUES (?, ?, ?, ?)")
      .bind(userId, JSON.stringify(plan), selectedSpec, JSON.stringify(attempts)).run()
    : await c.env.DB.prepare("UPDATE study_plans SET plan_json = ?, selected_spec = ?, attempts_json = ?, revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ? AND revision = ?")
      .bind(JSON.stringify(plan), selectedSpec, JSON.stringify(attempts), userId, revision).run();
  if (!updated.meta.changes) return c.json({ error: "Study Plan changed in another session. Reload before saving." }, 409);
  c.header("Cache-Control", "no-store");
  return c.json({ plan, selectedSpec, attempts, revision: revision + 1 });
});
