"use client"

import * as React from "react"
import { useAuth, useClerk, useUser } from "@clerk/react"
import {
  authorizeSession,
  gatechEmailSchema,
  SIGN_IN_RESTRICTION,
} from "@/lib/auth/session"

type Session = {
  authConfigured: boolean
  isSignedIn: boolean
  checking: boolean
  error: string | null
  userId: string | null
  getToken: () => Promise<string | null>
}
const SessionContext = React.createContext<Session>({
  authConfigured: false,
  isSignedIn: false,
  checking: false,
  error: null,
  userId: null,
  getToken: async () => null,
})

export function GuestSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionContext.Provider
      value={{
        authConfigured: false,
        isSignedIn: false,
        checking: false,
        error: null,
        userId: null,
        getToken: async () => null,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function GatechSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, isSignedIn, sessionId, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const primary = user?.primaryEmailAddress
  const email = primary?.emailAddress
  const verification = primary?.verification.status
  const validPrimary =
    verification === "verified" && gatechEmailSchema.safeParse(email).success
  const key =
    isSignedIn && validPrimary ? `${sessionId}:${email}:${verification}` : null
  const [approval, setApproval] = React.useState<{
    key: typeof key
    user: typeof user
    getToken: typeof getToken
    signOut: typeof signOut
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return
    let cancelled = false
    async function check() {
      try {
        if (!validPrimary) throw new Error(SIGN_IN_RESTRICTION)
        await authorizeSession(await getToken())
        if (!cancelled) {
          setApproval({ key, user, getToken, signOut })
          setError(null)
        }
      } catch (cause) {
        if (cancelled) return
        setApproval(null)
        setError(
          cause instanceof Error && cause.message === SIGN_IN_RESTRICTION
            ? SIGN_IN_RESTRICTION
            : "Unable to verify sign-in. Try again later."
        )
        // Rejected sessions never unlock account UI, even if sign-out fails.
        await signOut().catch(() => {})
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, user, validPrimary, key, getToken, signOut])

  const allowed = Boolean(
    key &&
    key === approval?.key &&
    user === approval.user &&
    getToken === approval.getToken &&
    signOut === approval.signOut
  )
  return (
    <SessionContext.Provider
      value={{
        authConfigured: true,
        isSignedIn: allowed,
        checking: Boolean(isSignedIn && !allowed && !error),
        error,
        userId: allowed ? (user?.id ?? null) : null,
        getToken: allowed ? getToken : async () => null,
      }}
    >
      {error && (
        <p
          role="alert"
          className="border-b border-border bg-secondary px-6 py-3 text-center text-sm"
        >
          {error} You can still browse the Catalog and keep a local Study Plan.
        </p>
      )}
      {children}
    </SessionContext.Provider>
  )
}

export function useGatechSession() {
  return React.useContext(SessionContext)
}
