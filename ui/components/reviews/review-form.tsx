"use client"

import * as React from "react"
import { useAuth } from "@clerk/react"
import Link from "next/link"
import { useReviews } from "@/lib/store/reviews-store"
import {
  createReview, deleteMyReview, fetchMyReviewId, hasApiBaseUrl, reviewInputSchema,
  updateMyReview,
} from "@/lib/api/reviews"
import { useGatechSession } from "@/components/auth/gatech-session"
import { cn } from "@/lib/utils"
import { CheckIcon, PlusIcon } from "@/components/icons"

export function ReviewForm({ courseId, available }: { courseId: string; available: boolean }) {
  const { authConfigured } = useGatechSession()
  if (!authConfigured)
    return (
      <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Sign-in is unavailable. You can still browse the Catalog and keep a
        local Study Plan.
      </p>
    )
  return <AuthenticatedReviewForm courseId={courseId} available={available} />
}

function AuthenticatedReviewForm({ courseId, available }: { courseId: string; available: boolean }) {
  const { loadCourseReviews, reviewsFor } = useReviews()
  const { getToken } = useAuth()
  const { isSignedIn, checking } = useGatechSession()
  const [open, setOpen] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ownReviewId, setOwnReviewId] = React.useState<string | null>(null)
  const [checkingOwnReview, setCheckingOwnReview] = React.useState(false)
  const [ownLookupError, setOwnLookupError] = React.useState(false)

  const [rating, setRating] = React.useState(4)
  const [difficulty, setDifficulty] = React.useState(3)
  const [workload, setWorkload] = React.useState(15)
  const [recommend, setRecommend] = React.useState(true)
  const [stage, setStage] = React.useState<"First" | "Mid" | "Late">("Mid")
  const [semester, setSemester] = React.useState("Fall 2025")
  const [body, setBody] = React.useState("")

  const canWrite = isSignedIn
  const apiConfigured = hasApiBaseUrl()
  const ownReview = reviewsFor(courseId).find((review) => review.id === ownReviewId)

  React.useEffect(() => {
    let active = true
    if (!isSignedIn) {
      queueMicrotask(() => {
        if (active) {
          setOwnReviewId(null)
          setNotice(null)
        }
      })
      return () => { active = false }
    }
    if (!apiConfigured) return
    queueMicrotask(() => { if (active) setCheckingOwnReview(true) })
    void getToken().then((token) => {
      if (!token) throw new Error("Sign in again to manage your review.")
      return fetchMyReviewId(courseId, token)
    }).then((reviewId) => {
      if (active) {
        setOwnReviewId(reviewId)
        setOwnLookupError(false)
      }
    }).catch(() => {
      if (active) setOwnLookupError(true)
    }).finally(() => {
      if (active) setCheckingOwnReview(false)
    })
    return () => { active = false }
  }, [apiConfigured, courseId, getToken, isSignedIn])

  const startEditing = () => {
    if (!ownReview) return
    setRating(ownReview.rating ?? 4)
    setDifficulty(ownReview.difficulty ?? 3)
    setWorkload(ownReview.workload ?? 15)
    setRecommend(ownReview.recommend ?? true)
    setStage(ownReview.programStage ?? "Mid")
    setSemester(ownReview.semester)
    setBody(ownReview.body)
    setError(null)
    setOpen(true)
  }

  const remove = async () => {
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Sign in again to delete your review.")
      await deleteMyReview(courseId, token)
      setOwnReviewId(null)
      setConfirmDelete(false)
      setNotice("Review deleted. You can write a new one.")
      await loadCourseReviews(courseId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete review.")
    } finally {
      setDeleting(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) {
      setError(
        "Sign in with a verified primary @gatech.edu email before submitting."
      )
      return
    }
    const parsed = reviewInputSchema.safeParse({
      rating,
      difficulty,
      workload,
      recommend,
      programStage: stage,
      semester: semester.trim() || "Unspecified",
      body,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your review and try again.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Sign in again before submitting.")
      const saved = await (ownReviewId ? updateMyReview : createReview)(
        courseId,
        parsed.data,
        token
      )
      setOwnReviewId(saved.reviewId)
      setNotice(ownReviewId ? "Changes saved." : "Review published.")
      await loadCourseReviews(courseId)
      setBody("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!available) return notice ? (
    <p role="status" className="text-sm text-leaf">{notice} Review list unavailable; retry reviews to refresh it.</p>
  ) : null

  if (!open || !canWrite) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <div className="text-sm font-medium">Add your review</div>
          <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
            Verified Georgia Tech email required. Review appears as OMSCS Hub,
            not OMSCentral.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {notice && (
            <span role="status" className="inline-flex items-center gap-1 text-xs text-leaf">
              <CheckIcon size={13} /> {notice}
            </span>
          )}
          {checking ? (
            <span className="text-xs text-muted-foreground">
              Verifying sign-in…
            </span>
          ) : !isSignedIn ? (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90"
            >
              Sign in to review
            </Link>
          ) : !apiConfigured ? (
            <span className="max-w-xs text-xs text-rose">
              API URL not configured.
            </span>
          ) : checkingOwnReview ? (
            <span role="status" className="text-xs text-muted-foreground">Checking your review…</span>
          ) : ownLookupError ? (
            <button type="button" onClick={() => window.location.reload()} className="text-xs text-rose underline">
              Unable to check your review. Retry
            </button>
          ) : ownReviewId ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={startEditing} disabled={!ownReview} className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50">
                Edit your review
              </button>
              {confirmDelete ? (
                <>
                  <span className="text-xs text-muted-foreground">Remove your review from public view?</span>
                  <button type="button" onClick={() => void remove()} disabled={deleting} className="rounded-md bg-rose px-4 py-2 text-sm text-white disabled:opacity-50">
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-xs underline">Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-rose underline">Delete your review</button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90"
            >
              <PlusIcon size={14} /> Write a review
            </button>
          )}
        </div>
        {error && !open && <p role="alert" className="w-full text-xs text-rose">{error}</p>}
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <div className="text-sm font-medium">{ownReviewId ? "Edit your review" : "Write a review"}</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Numeric
          label="Overall rating"
          value={rating}
          onChange={setRating}
          min={1}
          max={5}
          step={1}
          hints={["1 — bad", "5 — excellent"]}
        />
        <Numeric
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          min={1}
          max={5}
          step={1}
          hints={["1 — easy", "5 — brutal"]}
        />
        <Numeric
          label="Workload (hrs/wk)"
          value={workload}
          onChange={setWorkload}
          min={1}
          max={50}
          step={1}
          hints={["1", "50"]}
        />
        <div className="space-y-2">
          <Label>Semester taken</Label>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="e.g. Fall 2025"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none"
          />
          <Label>Program stage</Label>
          <div className="flex gap-1">
            {(["First", "Mid", "Late"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  stage === s
                    ? "border-leaf bg-leaf text-leaf-fg"
                    : "border-border text-muted-foreground hover:border-leaf/60 hover:text-leaf"
                )}
              >
                {s} of program
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Label>Your take</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={8000}
          rows={5}
          placeholder="What was the experience like? What surprised you? Who should take it?"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[15px] leading-relaxed focus:border-foreground/40 focus:outline-none"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={recommend}
            onChange={(e) => setRecommend(e.target.checked)}
          />
          I would recommend this course
        </label>
        {error && <span role="alert" className="max-w-md text-xs text-rose">{error}</span>}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-leaf px-5 py-2 text-sm text-leaf-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? "Saving…" : ownReviewId ? "Save changes" : "Publish review"}
        </button>
      </div>
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label block">{children}</label>
}

function Numeric({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hints,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step: number
  hints: [string, string]
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 cursor-pointer accent-[color:var(--leaf)]"
        />
        <span className="tabular w-12 text-right font-display text-2xl">
          {value}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  )
}
