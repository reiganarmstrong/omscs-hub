import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Context, MiddlewareHandler } from "hono";
import type { Bindings, Variables, AuthUser } from "./types";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

type AuthMiddleware = MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}>;

function gatechUserMiddleware(allowDeleted: boolean): AuthMiddleware {
  return async (c, next) => {
    c.header("Cache-Control", "no-store");
    const user = await authenticate(c).catch((error) => {
      if (error instanceof Response) return error;
      throw error;
    });
    if (user instanceof Response) return user;

    if (!allowDeleted) {
      const deleted = await c.env.DB.prepare("SELECT 1 FROM account_deletions WHERE user_id = ?")
        .bind(user.id).first();
      if (deleted) return new Response(JSON.stringify({ error: "Account deleted." }), {
        status: 403, headers: { "content-type": "application/json" },
      });
    }

    c.set("authUser", user);
    await next();
  };
}

export const requireGatechUser = gatechUserMiddleware(false);
export const requireGatechUserForDeletion = gatechUserMiddleware(true);
export const requireOperator: AuthMiddleware = async (c, next) => {
  const operatorId = c.env.OPERATOR_CLERK_USER_ID?.trim();
  if (!operatorId || c.get("authUser").id !== operatorId) {
    return c.json({ error: "Operator access required." }, 403);
  }
  await next();
};

async function authenticate(c: AppContext): Promise<AuthUser> {
  const token = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throwUnauthorized();

  const payload = await verifyToken(token, {
    secretKey: c.env.CLERK_SECRET_KEY,
  }).catch(() => throwUnauthorized());
  if (!payload.sub) throwUnauthorized();

  const client = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
  const user = await client.users.getUser(payload.sub).catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 404) throwUnauthorized();
    throw error;
  });
  // A verified secondary address never substitutes for the primary address.
  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  );
  if (
    !primaryEmail ||
    primaryEmail.verification?.status !== "verified" ||
    !/^[^\s@]+@gatech\.edu$/i.test(primaryEmail.emailAddress)
  ) {
    throw new Response(
      JSON.stringify({ error: "Sign-in requires a verified primary @gatech.edu email." }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }

  return { id: user.id, primaryEmail: primaryEmail.emailAddress, emailDomain: "gatech.edu" };
}

function throwUnauthorized(): never {
  throw new Response(JSON.stringify({ error: "Authentication required." }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
