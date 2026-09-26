import { z } from "zod"

export const gatechEmailSchema = z.email().regex(/^[^\s@]+@gatech\.edu$/i)
export const SIGN_IN_RESTRICTION =
  "Sign-in requires a verified primary @gatech.edu email."
const eligibilitySchema = z.object({ eligible: z.literal(true) })

export async function authorizeSession(token: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
  if (!baseUrl || !token)
    throw new Error("Unable to verify sign-in. Try again later.")
  const res = await fetch(`${baseUrl}/auth/session`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (res.status === 401 || res.status === 403)
    throw new Error(SIGN_IN_RESTRICTION)
  if (!res.ok) throw new Error("Unable to verify sign-in. Try again later.")
  eligibilitySchema.parse(await res.json())
}
