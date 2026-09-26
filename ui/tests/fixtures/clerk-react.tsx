"use client"

// External Clerk boundary fixture. Only aliased by the development browser test server.
import * as React from "react"

const listeners = new Set<() => void>()
let active = false
let scenario = "verified"
let status = "needs_first_factor"
const notify = () => listeners.forEach((listener) => listener())
const signOut = async () => {
  active = false
  localStorage.removeItem("clerk-fixture-session")
  notify()
}
const getToken = async () => (active ? `fixture:${scenario}` : null)
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function useActive() {
  return React.useSyncExternalStore(
    subscribe,
    () => active,
    () => false
  )
}
const addresses = () => {
  const primary = {
    id: "primary",
    emailAddress:
      scenario === "non-gatech" ? "private@example.com" : "student@gatech.edu",
    verification: {
      status: scenario === "unverified" ? "unverified" : "verified",
    },
  }
  return [
    primary,
    {
      id: "secondary",
      emailAddress: "other@gatech.edu",
      verification: { status: "verified" },
    },
  ]
}
let user: { primaryEmailAddress: ReturnType<typeof addresses>[number] } | null =
  null
export function ClerkProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    scenario =
      new URLSearchParams(window.location.search).get("clerk") ??
      localStorage.getItem("clerk-fixture-scenario") ??
      "verified"
    localStorage.setItem("clerk-fixture-scenario", scenario)
    active = localStorage.getItem("clerk-fixture-session") === "active"
    user = { primaryEmailAddress: addresses()[0] }
    notify()
  }, [])
  return children
}
export function useAuth() {
  const signedIn = useActive()
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    sessionId: signedIn ? "session_fixture" : null,
    getToken,
  }
}
export function useUser() {
  const signedIn = useActive()
  return { user: signedIn ? user : null }
}
export function useClerk() {
  return { signOut }
}
export function UserButton() {
  return <button onClick={() => void signOut()}>Sign out</button>
}
const flow = {
  get status() {
    return status
  },
  create: async () => ({
    error:
      scenario === "account-error"
        ? new Error("private@example.com already has account user_private")
        : null,
  }),
  emailCode: {
    sendCode: async () => ({ error: null }),
    verifyCode: async ({ code }: { code: string }) => {
      if (code !== "123456")
        return { error: new Error("invalid code for private@example.com") }
      status = "complete"
      return { error: null }
    },
  },
  finalize: async ({
    navigate,
  }: {
    navigate: (params: {
      session: { getToken: typeof getToken }
      decorateUrl: (url: string) => string
    }) => Promise<void>
  }) => {
    active = true
    user = { primaryEmailAddress: addresses()[0] }
    localStorage.setItem("clerk-fixture-session", "active")
    notify()
    await navigate({ session: { getToken }, decorateUrl: (url) => url })
    return { error: null }
  },
}
export function useSignIn() {
  return { signIn: flow, fetchStatus: "idle" }
}
export function useSignUp() {
  return {
    signUp: {
      ...flow,
      get status() {
        return status
      },
      verifications: {
        sendEmailCode: flow.emailCode.sendCode,
        verifyEmailCode: flow.emailCode.verifyCode,
      },
    },
    fetchStatus: "idle",
  }
}
