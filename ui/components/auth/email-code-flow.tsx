"use client"

import * as React from "react"
import { useClerk, useSignIn, useSignUp } from "@clerk/react"
import Link from "next/link"
import { useGatechSession } from "./gatech-session"
import {
  authorizeSession,
  gatechEmailSchema,
  SIGN_IN_RESTRICTION,
} from "@/lib/auth/session"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up"

export function EmailCodeFlow({ mode }: { mode: Mode }) {
  const { authConfigured } = useGatechSession()
  if (!authConfigured)
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-3xl">Sign-in is unavailable</h1>
        <p className="mt-3 text-sm">
          You can still <Link href="/">browse the Catalog</Link> and{" "}
          <Link href="/planner">keep a local Study Plan</Link>.
        </p>
      </div>
    )
  return <ConfiguredEmailCodeFlow mode={mode} />
}

function ConfiguredEmailCodeFlow({ mode }: { mode: Mode }) {
  const { signOut } = useClerk()
  const isSignIn = mode === "sign-in"
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn()
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp()
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const validGatech = gatechEmailSchema.safeParse(email.trim()).success

  const start = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!validGatech) {
      setError("Use your @gatech.edu email address.")
      return
    }

    setLoading(true)
    try {
      const emailAddress = email.trim()
      if (isSignIn) {
        const created = await signIn.create({ identifier: emailAddress })
        if (created.error) throw created.error

        const sent = await signIn.emailCode.sendCode({ emailAddress })
        if (sent.error) throw sent.error
      } else {
        const created = await signUp.create({ emailAddress })
        if (created.error) throw created.error

        const sent = await signUp.verifications.sendEmailCode()
        if (sent.error) throw sent.error
      }
      setPending(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const navigateHome = async ({
    session,
    decorateUrl,
  }: {
    session: { getToken: () => Promise<string | null> }
    decorateUrl: (url: string) => string
  }) => {
    try {
      await authorizeSession(await session.getToken())
      window.location.assign(decorateUrl("/"))
    } catch (cause) {
      setError(errorMessage(cause))
      await signOut().catch(() => {})
    }
  }

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignIn) {
        const verified = await signIn.emailCode.verifyCode({
          code: code.trim(),
        })
        if (verified.error) throw verified.error

        if (signIn.status !== "complete") {
          setError(
            "Additional verification is required. Complete your account verification and try again."
          )
          return
        }

        const finalized = await signIn.finalize({ navigate: navigateHome })
        if (finalized.error) throw finalized.error
        return
      } else {
        const verified = await signUp.verifications.verifyEmailCode({
          code: code.trim(),
        })
        if (verified.error) throw verified.error

        if (signUp.status !== "complete") {
          setError(
            "Account verification is incomplete. Verify your email and try again."
          )
          return
        }

        const finalized = await signUp.finalize({ navigate: navigateHome })
        if (finalized.error) throw finalized.error
        return
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100svh-140px)] max-w-[980px] items-center px-6 py-12">
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[0.85fr_1fr]">
        <div className="border-b border-border bg-secondary/50 p-6 sm:p-8 md:border-r md:border-b-0 md:p-10">
          <span className="text-xs tracking-wide text-muted-foreground">
            OMSCS Hub accounts
          </span>
          <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
            {isSignIn
              ? "Sign in with Georgia Tech email"
              : "Create your review account"}
          </h1>
          <p className="reading mt-3 text-sm text-muted-foreground">
            Sign-in requires a verified primary @gatech.edu email. Browsing and
            local Study Plans are available to everyone.
          </p>
          <Link
            href="/planner"
            className="mt-5 inline-block text-sm text-leaf underline underline-offset-4"
          >
            Continue with a local Study Plan
          </Link>
        </div>

        <form
          onSubmit={pending ? verify : start}
          className="space-y-4 p-6 sm:p-8 md:p-10"
        >
          <div>
            <label htmlFor="auth-email" className="label">
              Email
            </label>
            <input
              id="auth-email"
              autoComplete="email"
              required
              type="email"
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gatech.edu"
              className={cn(
                "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none",
                email && !validGatech
                  ? "border-rose"
                  : "border-border focus:border-leaf/70"
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only verified @gatech.edu addresses can continue.
            </p>
          </div>

          {pending && (
            <div>
              <label htmlFor="auth-code" className="label">
                Email code
              </label>
              <input
                id="auth-code"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-leaf/70 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-rose">
              {error}
            </p>
          )}

          {!isSignIn && !pending && (
            <div
              id="clerk-captcha"
              data-cl-theme="auto"
              data-cl-size="flexible"
            />
          )}

          <button
            type="submit"
            disabled={
              loading ||
              signInFetchStatus === "fetching" ||
              signUpFetchStatus === "fetching"
            }
            className="inline-flex w-full items-center justify-center rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Working…"
              : pending
                ? "Verify code"
                : isSignIn
                  ? "Send code"
                  : "Create account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isSignIn ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              href={isSignIn ? "/sign-up" : "/sign-in"}
              className="text-leaf hover:underline"
            >
              {isSignIn ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message === SIGN_IN_RESTRICTION)
    return SIGN_IN_RESTRICTION
  // Clerk errors can disclose account existence, field state, or email addresses.
  return "Unable to sign in. Check your email and code, or try again later."
}
