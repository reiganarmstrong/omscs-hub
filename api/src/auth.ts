import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Context, MiddlewareHandler } from "hono";
import type { Bindings, Variables, AuthUser } from "./types";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const requireGatechUser: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const user = await authenticate(c).catch((error) => {
    if (error instanceof Response) return error;
    throw error;
  });
  if (user instanceof Response) return user;

  if (user.emailDomain !== "gatech.edu") {
    return c.json({ error: "Only verified @gatech.edu accounts can write reviews." }, 403);
  }

  c.set("authUser", user);
  await next();
};

async function authenticate(c: AppContext): Promise<AuthUser> {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throwUnauthorized();

  if (c.env.CLERK_SECRET_KEY === "test") {
    const primaryEmail = c.req.header("x-test-email");
    const id = c.req.header("x-test-user-id") ?? "user_test";
    if (!primaryEmail) throwUnauthorized();
    return toAuthUser(id, primaryEmail);
  }

  const payload = await verifyToken(token, {
    secretKey: c.env.CLERK_SECRET_KEY,
  });

  const userId = payload.sub;
  if (!userId) throwUnauthorized();

  const client = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
  const user = await client.users.getUser(userId);
  const primaryEmailId = user.primaryEmailAddressId;
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === primaryEmailId) ??
    user.emailAddresses.find((email) => email.verification?.status === "verified");

  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    throwUnauthorized("Verified primary email required.");
  }

  return toAuthUser(user.id, primaryEmail.emailAddress);
}

function toAuthUser(id: string, primaryEmail: string): AuthUser {
  const emailDomain = primaryEmail.split("@").at(1)?.toLowerCase() ?? "";
  return { id, primaryEmail, emailDomain };
}

function throwUnauthorized(message = "Authentication required."): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
