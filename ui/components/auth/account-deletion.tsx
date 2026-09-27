"use client"

import * as React from "react"
import Link from "next/link"
import { useClerk } from "@clerk/react"
import { useGatechSession } from "./gatech-session"
import { clearAcademicStorage } from "@/lib/store/planner-store"
import { Button } from "@/components/ui/button"

const PHRASE = "DELETE MY ACCOUNT"

export function AccountDeletion() {
  const { isSignedIn, deletionPending, checking, userId, getToken } = useGatechSession()
  const { signOut } = useClerk()
  const [confirmation, setConfirmation] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function removeAccount() {
    if (confirmation !== PHRASE || !userId) return
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
      if (!token || !base) throw new Error("Account service unavailable. Try again.")
      const response = await fetch(`${base}/account`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ confirmation: PHRASE }),
        cache: "no-store",
      })
      if (!response.ok) {
        if (response.status === 503) {
          clearAcademicStorage(userId)
          throw new Error("Your Hub data was removed, but sign-in deletion is pending. Retry here.")
        }
        throw new Error("Account deletion failed. Try again.")
      }
      clearAcademicStorage(userId)
      await signOut().catch(() => {})
      window.location.assign("/")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account deletion failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8" aria-labelledby="account-title">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Account controls</p>
      <h1 id="account-title" className="mt-2 font-display text-3xl tracking-tight">Delete your account</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">This permanently removes your private Study Plan, Course Attempts, and Hub Reviews. Imported Reviews and other students’ data remain. Export your academic record from the <Link href="/planner" className="underline underline-offset-2">Planner</Link> first if you want a copy.</p>
      {checking && <p className="mt-6 text-sm">Checking your account…</p>}
      {!checking && !isSignedIn && !deletionPending && <p className="mt-6 text-sm"><Link href="/sign-in" className="underline underline-offset-2">Sign in</Link> to delete your account.</p>}
      {deletionPending && <p role="status" className="mt-6 text-sm text-rose">Your Hub data was removed. Finish deleting your sign-in below.</p>}
      {(isSignedIn || deletionPending) && (
        <div className="mt-8 border-t border-border pt-6">
          <label htmlFor="delete-confirmation" className="block text-sm font-medium">Type {PHRASE} to confirm</label>
          <input id="delete-confirmation" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose" />
          {error && <p role="alert" className="mt-3 text-sm text-rose">{error}</p>}
          <Button variant="destructive" size="lg" type="button" disabled={busy || confirmation !== PHRASE} onClick={() => void removeAccount()} className="mt-5">{busy ? "Deleting account…" : "Permanently delete account"}</Button>
        </div>
      )}
    </section>
  )
}
