import { Hono } from "hono";
import { cors } from "hono/cors";
import { reviews } from "./reviews";
import { requireGatechUser } from "./auth";
import { studyPlans } from "./study-plans";
import { accounts } from "./accounts";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  return cors({
    origin: corsOrigin(c.env.CORS_ORIGIN),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["authorization", "content-type"],
  })(c, next);
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "omscs-hub-review-api",
    time: new Date().toISOString(),
  }),
);

app.route("/", reviews);
app.route("/", studyPlans);
app.route("/", accounts);

app.get("/auth/session", requireGatechUser, (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ eligible: true });
});

app.notFound((c) => c.json({ error: "Not found." }, 404));

app.onError((error, c) => {
  if (error instanceof Response) return error;
  console.error(error);
  return c.json({ error: "Internal server error." }, 500);
});

function corsOrigin(value: string | undefined) {
  if (!value) return "*";

  const configured = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowLocalDev = configured.some(isLocalDevOrigin);

  if (allowLocalDev) {
    return (origin: string) =>
      configured.includes(origin) || isLocalDevOrigin(origin) ? origin : undefined;
  }

  return configured.length === 1 ? configured[0] : configured;
}

function isLocalDevOrigin(origin: string) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);
}

export default app;
