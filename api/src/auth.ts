import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Context, MiddlewareHandler } from "hono";
import type { Bindings, Variables, AuthUser } from "./types";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const requireGatechUser: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  const user = await authenticate(c).catch((error) => {
    if (error instanceof Response) return error;
    throw error;
  });
  if (user instanceof Response) return user;

  c.set("authUser", user);
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
  const user = await client.users.getUser(payload.sub);
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
