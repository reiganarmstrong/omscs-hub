"use client"

import * as React from "react"
import Link from "next/link"
import { COURSES, COURSES_BY_ID, courseMatchesSearch } from "@/lib/data"
import { usePlanner } from "@/lib/store/planner-store"
import { TERM_ORDER, parsePlanningTermKey } from "@/lib/data/planning-terms"
import { courseAttemptInputSchema, type CourseAttempt, type StudyPlanData } from "@/lib/api/study-plan"
import { estimatedGpa, exportAcademicRecord } from "@/lib/data/academic-record"

const OUTCOMES: CourseAttempt["outcome"][] = ["A", "B", "C", "D", "F", "W", "I"]

export function CompletedCourses({ currentTermKey }: { currentTermKey: string }) {
  const { attempts, addAttempt, updateAttempt, removeAttempt, syncStatus, accountDraft, localDraft } = usePlanner()
  const gpa = estimatedGpa(attempts)
  const canEdit = syncStatus === "guest" || syncStatus === "ready" || syncStatus === "saving"
  const [search, setSearch] = React.useState("")
  const [courseId, setCourseId] = React.useState("")
  const [term, setTerm] = React.useState(currentTermKey)
  const [outcome, setOutcome] = React.useState<CourseAttempt["outcome"]>("A")
  const currentYear = parsePlanningTermKey(currentTermKey)?.year ?? new Date().getFullYear()
  const matches = COURSES.filter((course) => courseMatchesSearch(course, search.trim().toLowerCase())).slice(0, 30)
  const editAttempt = (id: string, courseId: string, nextTerm: string, nextOutcome: CourseAttempt["outcome"]) => {
    const parsed = courseAttemptInputSchema.safeParse({ courseId, term: nextTerm, outcome: nextOutcome })
    if (parsed.success) updateAttempt(id, parsed.data.term, parsed.data.outcome)
  }
  const grouped = new Map<string, CourseAttempt[]>()
  for (const attempt of attempts) {
    const rows = grouped.get(attempt.courseId) ?? []
    rows.push(attempt)
    grouped.set(attempt.courseId, rows)
  }
  const download = (data: StudyPlanData, source: "account" | "device") => {
    const exportedAt = new Date().toISOString()
    const record = exportAcademicRecord(data, exportedAt)
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2) + "\n"], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `omscs-hub-academic-record-${source}-${exportedAt.slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <section aria-label="Completed Courses" className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="border-b border-border pb-4">
        <p className="label">Academic record</p>
        <h2 className="font-display text-2xl tracking-tight">Completed Courses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Record each Course Attempt separately, including repeats and outcomes that earned no credit. {syncStatus === "guest" ? "Guest entries stay on this device until you choose how to sync after sign-in." : "Your account entries are private and sync across devices."}</p>
        {syncStatus !== "guest" && syncStatus !== "loading" && <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {accountDraft && <button type="button" onClick={() => download(accountDraft, "account")} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">{syncStatus === "ready" ? "Export private Study Plan (JSON)" : "Export account Study Plan draft (JSON)"}</button>}
            {(syncStatus === "reconcile" || (syncStatus === "sync-error" && !accountDraft)) && <button type="button" onClick={() => download(localDraft, "device")} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">Export device Study Plan draft (JSON)</button>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Downloads intended Courses, Specialization, Completed Courses, and every Course Attempt. A draft may contain changes not saved to your account. <Link href="/about#academic-record-export" className="underline underline-offset-2">Export format</Link></p>
        </div>}
      </div>
      <section aria-label="Estimated GPA" className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
        <p className="label">Estimated GPA</p>
        <p className="mt-1 font-display text-3xl tabular-nums">{gpa.value === null ? "—" : (Math.trunc(gpa.value * 100) / 100).toFixed(2)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{gpa.gradedAttempts} graded {gpa.gradedAttempts === 1 ? "attempt" : "attempts"} · {gpa.gradedHours} attempted credit hours. Every entered A/B/C/D/F attempt counts at its Course credit hours, including repeats. W and unresolved outcomes are omitted.</p>
        {gpa.omittedOutcomes > 0 && <p className="mt-1 text-xs text-muted-foreground">{gpa.omittedOutcomes} W or unresolved {gpa.omittedOutcomes === 1 ? "outcome" : "outcomes"} omitted.</p>}
        {gpa.unknownCreditAttempts > 0 && <p className="mt-1 text-sm text-rose">{gpa.unknownCreditAttempts} graded {gpa.unknownCreditAttempts === 1 ? "attempt is" : "attempts are"} omitted because Course credits are unavailable.</p>}
        <p className="mt-2 text-xs text-muted-foreground">This is an estimate from entered attempts, not your official Georgia Tech GPA. Missing coursework and approved grade substitution may change the official GPA. See <a href="https://catalog.gatech.edu/rules/5/" target="_blank" rel="noreferrer" className="underline underline-offset-2">Georgia Tech grading rules</a>.</p>
      </section>
      <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={(event) => {
        event.preventDefault()
        const parsed = courseAttemptInputSchema.safeParse({ courseId, term, outcome })
        if (!parsed.success) return
        addAttempt(parsed.data.courseId, parsed.data.term, parsed.data.outcome)
        setCourseId("")
        setSearch("")
      }}>
        <label className="text-xs text-muted-foreground">Course
          <input aria-label="Find Course for attempt" value={search} onChange={(event) => { setSearch(event.target.value); setCourseId("") }} placeholder="Search current Courses" className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <select aria-label="Course for attempt" value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">Choose Course</option>
            {matches.map((course) => <option key={course.id} value={course.id}>{course.code} {course.title}</option>)}
          </select>
        </label>
        <TermSelect label="Attempt" value={term} currentYear={currentYear} onChange={setTerm} />
        <label className="text-xs text-muted-foreground">Outcome
          <select aria-label="Attempt outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as CourseAttempt["outcome"])} className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            {OUTCOMES.map((grade) => <option key={grade}>{grade}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!courseId || !canEdit} className="rounded-md bg-leaf px-3 py-2 text-sm text-leaf-fg disabled:opacity-50 sm:col-span-3 sm:justify-self-start">Record Course Attempt</button>
      </form>
      {grouped.size === 0 ? <p className="mt-5 text-sm text-muted-foreground">No Course Attempts recorded yet.</p> : (
        <ul className="mt-5 divide-y divide-border border-t border-border">
          {[...grouped].map(([id, rows]) => {
            const course = COURSES_BY_ID[id]
            return <li key={id} className="py-4">
              <div className="flex flex-wrap items-baseline gap-2">
                {course ? <Link href={`/courses/${id}`} className="font-medium hover:underline">{course.code} {course.title}</Link> : <span className="font-medium">{id}</span>}
                <span className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "attempt" : "attempts"}</span>
              </div>
              <ul className="mt-2 space-y-2">
                {rows.map((attempt, index) => <li key={attempt.id} aria-label={`Attempt ${index + 1} for ${id}`} className="flex flex-wrap items-end gap-2 rounded-md bg-muted/50 p-2">
                  <TermSelect label={`Attempt ${index + 1}`} value={attempt.term} currentYear={currentYear} disabled={!canEdit} onChange={(next) => editAttempt(attempt.id, attempt.courseId, next, attempt.outcome)} />
                  <label className="text-xs text-muted-foreground">Outcome
                    <select aria-label="Outcome" value={attempt.outcome} disabled={!canEdit} onChange={(event) => editAttempt(attempt.id, attempt.courseId, attempt.term, event.target.value as CourseAttempt["outcome"])} className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                      {OUTCOMES.map((grade) => <option key={grade}>{grade}</option>)}
                    </select>
                  </label>
                  <button type="button" aria-label={`Remove attempt ${index + 1} for ${id}`} disabled={!canEdit} onClick={() => removeAttempt(attempt.id)} className="mb-1 ml-auto text-xs text-muted-foreground hover:text-rose disabled:opacity-50">Remove attempt</button>
                </li>)}
              </ul>
            </li>
          })}
        </ul>
      )}
    </section>
  )
}

function TermSelect({ label, value, currentYear, onChange, disabled = false }: { label: string; value: string; currentYear: number; onChange: (term: string) => void; disabled?: boolean }) {
  const parsed = parsePlanningTermKey(value)
  const season = parsed?.term ?? "Spring"
  const year = parsed?.year ?? currentYear
  const [draftYear, setDraftYear] = React.useState<string | null>(null)
  const saveYear = () => {
    const next = Number(draftYear ?? year)
    if (Number.isInteger(next) && next >= 1000 && next <= 9999) onChange(`${season}-${next}`)
    setDraftYear(null)
  }
  return <div className="text-xs text-muted-foreground">{label} term
    <div className="mt-1 flex gap-1">
      <select aria-label={`${label} season`} value={season} disabled={disabled} onChange={(event) => onChange(`${event.target.value}-${year}`)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
        {TERM_ORDER.map((choice) => <option key={choice}>{choice}</option>)}
      </select>
      <input aria-label={`${label} year`} type="number" min={1000} max={9999} value={draftYear ?? year} disabled={disabled} onChange={(event) => setDraftYear(event.target.value)} onBlur={saveYear} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }} className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
    </div>
  </div>
}
