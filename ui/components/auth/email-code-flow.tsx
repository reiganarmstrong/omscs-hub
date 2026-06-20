"use client";

import * as React from "react";
import { useSignIn, useSignUp } from "@clerk/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

export function EmailCodeFlow({ mode }: { mode: Mode }) {
  const isSignIn = mode === "sign-in";
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const validGatech = email.trim().toLowerCase().endsWith("@gatech.edu");

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validGatech) {
      setError("Use your @gatech.edu email address.");
      return;
    }

    setLoading(true);
    try {
      const emailAddress = email.trim();
      if (isSignIn) {
        const created = await signIn.create({ identifier: emailAddress });
        if (created.error) throw created.error;

        const sent = await signIn.emailCode.sendCode({ emailAddress });
        if (sent.error) throw sent.error;
      } else {
        const created = await signUp.create({ emailAddress });
        if (created.error) throw created.error;

        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
      }
      setPending(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignIn) {
        const verified = await signIn.emailCode.verifyCode({ code: code.trim() });
        if (verified.error) throw verified.error;

        if (signIn.status !== "complete") {
          setError(signInStatusMessage(signIn.status));
          return;
        }

        const finalized = await signIn.finalize({ navigate: navigateHome });
        if (finalized.error) throw finalized.error;
        return;
      } else {
        const verified = await signUp.verifications.verifyEmailCode({
          code: code.trim(),
        });
        if (verified.error) throw verified.error;

        if (signUp.status !== "complete") {
          setError(signUpStatusMessage(signUp));
          return;
        }

        const finalized = await signUp.finalize({ navigate: navigateHome });
        if (finalized.error) throw finalized.error;
        return;
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100svh-140px)] max-w-[980px] items-center px-6 py-12">
      <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[0.85fr_1fr]">
        <div>
          <span className="text-xs tracking-wide text-muted-foreground">
            OMSCS Hub accounts
          </span>
          <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
            {isSignIn ? "Sign in with Georgia Tech email" : "Create your review account"}
          </h1>
          <p className="reading mt-3 text-sm text-muted-foreground">
            Reviews written here are tied to verified OMSCS Hub accounts and kept
            separate from imported OMSCentral reviews.
          </p>
        </div>

        <form onSubmit={pending ? verify : start} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gatech.edu"
              className={cn(
                "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none",
                email && !validGatech ? "border-rose" : "border-border focus:border-leaf/70",
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only verified @gatech.edu addresses can continue.
            </p>
          </div>

          {pending && (
            <div>
              <label className="label">Email code</label>
              <input
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-leaf/70 focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-rose">{error}</p>}

          {!isSignIn && !pending && (
            <div
              id="clerk-captcha"
              data-cl-theme="auto"
              data-cl-size="flexible"
            />
          )}

          <button
            type="submit"
            disabled={loading || signInFetchStatus === "fetching" || signUpFetchStatus === "fetching"}
            className="inline-flex w-full items-center justify-center rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working…" : pending ? "Verify code" : isSignIn ? "Send code" : "Create account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isSignIn ? "Need an account?" : "Already have an account?"}{" "}
            <Link href={isSignIn ? "/sign-up" : "/sign-in"} className="text-leaf hover:underline">
              {isSignIn ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function navigateHome({ decorateUrl }: { decorateUrl: (url: string) => string }) {
  window.location.assign(decorateUrl("/"));
}

function signInStatusMessage(status: string) {
  if (status === "needs_second_factor") return "Additional verification is required for this account.";
  if (status === "needs_client_trust") return "This browser needs additional trust verification.";
  return `Sign-in is not complete yet. Clerk status: ${status}.`;
}

function signUpStatusMessage(signUp: {
  status: string;
  missingFields: string[];
  unverifiedFields: string[];
  isTransferable: boolean;
}) {
  if (signUp.isTransferable) {
    return "An account already exists for this email. Use sign in instead.";
  }

  const missing = signUp.missingFields.join(", ");
  const unverified = signUp.unverifiedFields.join(", ");
  const details = [
    missing ? `missing: ${missing}` : null,
    unverified ? `unverified: ${unverified}` : null,
  ].filter(Boolean).join("; ");

  return details
    ? `Sign-up is not complete yet. ${details}.`
    : `Sign-up is not complete yet. Clerk status: ${signUp.status}.`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "errors" in error) {
    const clerkError = error as { errors?: { longMessage?: string; message?: string }[] };
    return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? "Auth failed.";
  }
  return "Auth failed.";
}
