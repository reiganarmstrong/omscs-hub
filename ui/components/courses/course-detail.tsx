"use client"

import * as React from "react"
import { CourseFacts } from "./course-facts"
import Link from "next/link"
import type { Course } from "@/lib/types"
import { useReviews } from "@/lib/store/reviews-store"
import { aggregateStats } from "@/lib/data"
import { usePlanner } from "@/lib/store/planner-store"
import {
  SPECIALIZATIONS_BY_ID,
  SPECIALIZATION_LAST_CHECKED,
  courseSpecializations,
} from "@/lib/data/specializations"
import { ReviewList } from "@/components/reviews/review-list"
import { ReviewForm } from "@/components/reviews/review-form"
import { Tag, Stars } from "@/components/badges"
import { ArrowLeft, ArrowRight, CheckIcon, PlusIcon } from "@/components/icons"

type Stats = ReturnType<typeof aggregateStats>

export function CourseDetail({ course }: { course: Course }) {
  const {
    reviewsFor,
    statsFor,
    loadCourseReviews,
    loadingCourseIds,
    reviewErrors,
  } = useReviews()
  const reviews = reviewsFor(course.id)
  const stats = statsFor(course.id)
  const reviewError = reviewErrors[course.id]
  const [loadedCourseId, setLoadedCourseId] = React.useState<string | null>(
    null
  )
  const reviewLoading =
    loadedCourseId !== course.id || loadingCourseIds.has(course.id)
  const reviewsAvailable = !reviewError && !reviewLoading

  React.useEffect(() => {
    let active = true
    void loadCourseReviews(course.id).then(() => {
      if (active) setLoadedCourseId(course.id)
    })
    return () => {
      active = false
    }
  }, [course.id, loadCourseReviews])

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <Crumbs course={course} />

      <header className="mt-3 grid grid-cols-12 gap-6 border-b border-border pb-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <span className="text-xs tracking-wide text-muted-foreground">
              {course.code}
            </span>
            <span className="text-xs text-muted-foreground">
              {course.historical
                ? "Historical review archive"
                : `${course.credits} credit hours`}
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight md:text-[2.6rem]">
            {course.title}
            {course.shortTitle && (
              <span className="ml-2 text-base text-muted-foreground">
                ({course.shortTitle})
              </span>
            )}
          </h1>
          <p className="reading mt-3 max-w-3xl text-[15px] text-muted-foreground">
            <span className="block text-xs">
              {course.historical
                ? "Archived source description · Unverified"
                : "Official overview excerpt"}
            </span>
            {course.description}
          </p>

          <CourseFacts course={course} />
          {course.aliases.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Former codes: {course.aliases.join(", ")}. These refer to this
              same Course.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-1.5">
            {courseSpecializations(course.id).map((s) => (
              <Tag key={s.id} variant={s.role === "core" ? "leaf" : "outline"}>
                {SPECIALIZATIONS_BY_ID[s.id]?.name} · {s.role}
              </Tag>
            ))}
            {course.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <SidebarSummary
            course={course}
            stats={stats}
            reviewState={
              reviewLoading ? "loading" : reviewError ? "unavailable" : "ready"
            }
          />
        </aside>
      </header>

      <section className="mt-10">
        <SectionHead title="Logistics" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Block heading="Term availability">
            <p className="text-sm text-muted-foreground">
              Unverified for future terms. Current-list inclusion does not
              guarantee a term offering.
            </p>
          </Block>
          <Block heading="Prerequisites">
            {course.prereqs.length ? (
              <ul className="mt-1 list-disc pl-4 text-sm">
                {course.prereqs.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">
                Unverified. Consult the official course page.
              </span>
            )}
          </Block>
          <Block heading="Counts toward">
            <ul className="mt-1 space-y-1 text-sm">
              {courseSpecializations(course.id).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <a
                    href={SPECIALIZATIONS_BY_ID[s.id]?.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {SPECIALIZATIONS_BY_ID[s.id]?.name}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {s.role}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Current-catalog guidance · Rule pages last checked{" "}
              {SPECIALIZATION_LAST_CHECKED}. Verify your applicable catalog;
              this is not a degree-completion decision.
            </p>
            <a
              href="https://omscs.gatech.edu/specializations"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs underline underline-offset-2"
            >
              Official specialization sources
            </a>
          </Block>
        </div>
      </section>

      <section className="mt-10">
        <SectionHead
          title={reviewsAvailable ? `Reviews (${reviews.length})` : "Reviews"}
          note="OMSCentral imports are public. OMSCS Hub reviews require a verified gatech.edu account."
        />
        {(reviewLoading || reviewError) && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {reviewLoading
              ? "Loading reviews…"
              : "Reviews unavailable. Course facts remain available. Try again."}
          </p>
        )}
        <button
          type="button"
          disabled={reviewLoading}
          onClick={() => void loadCourseReviews(course.id)}
          className="mt-3 rounded-md border border-border px-3 py-2 text-xs disabled:opacity-50"
        >
          {reviewError ? "Retry reviews" : "Refresh reviews"}
        </button>
        {reviewsAvailable && (
          <>
            <div className="mt-4">
              <ReviewForm courseId={course.id} />
            </div>
            <div className="mt-4">
              <ReviewList reviews={reviews} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Crumbs({ course }: { course: Course }) {
  return (
    <nav className="text-xs text-muted-foreground">
      <Link href="/" className="hover:text-foreground">
        Catalog
      </Link>{" "}
      / <span className="text-foreground">{course.code}</span>
    </nav>
  )
}

function SidebarSummary({
  course,
  stats,
  reviewState,
}: {
  course: Course
  stats: Stats
  reviewState: "loading" | "ready" | "unavailable"
}) {
  const { add, remove, has } = usePlanner()
  const inTerm = has(course.id)
  const [picker, setPicker] = React.useState(false)

  const yearOptions = ["2025", "2026", "2027"]
  const termOptions = ["Fall", "Spring", "Summer"] as const
  const [year, setYear] = React.useState(yearOptions[0])
  const [term, setTerm] = React.useState<(typeof termOptions)[number]>(
    course.termsOffered[0] ?? "Fall"
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <span className="label">At a glance</span>
        {reviewState === "ready" && stats.avgRating > 0 && (
          <Stars value={stats.avgRating} />
        )}
      </div>
      {reviewState === "ready" && stats.numReviews > 0 ? (
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Mini
            label="Difficulty"
            value={
              stats.avgDifficulty ? stats.avgDifficulty.toFixed(1) : "Unknown"
            }
            unit={stats.avgDifficulty ? "/5" : undefined}
          />
          <Mini
            label="Workload"
            value={
              stats.distWorkload.some(Boolean)
                ? stats.avgWorkload.toFixed(0)
                : "Unknown"
            }
            unit={stats.distWorkload.some(Boolean) ? "hr/wk" : undefined}
          />
          <Mini label="Reviews" value={String(stats.numReviews)} />
        </dl>
      ) : reviewState === "ready" ? (
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {reviewState === "loading"
            ? "Loading review summary…"
            : "Review summary unavailable."}
        </p>
      )}

      {!course.historical && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="label">Planner</div>
          {inTerm ? (
            <div className="mt-2 flex items-center justify-between rounded-md bg-leaf/12 px-3 py-2 text-leaf">
              <span className="text-sm">
                {inTerm === "unassigned"
                  ? "Planned (Unscheduled)"
                  : `Planned · ${inTerm.replace("-", " ")}`}
                <CheckIcon size={13} className="-mt-0.5 ml-1 inline" />
              </span>
              <button
                type="button"
                onClick={() => remove(inTerm, course.id)}
                className="text-xs underline hover:no-underline"
              >
                Remove
              </button>
            </div>
          ) : !picker ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-2 text-sm transition-colors hover:border-foreground/30 dark:border-white dark:bg-white dark:text-black"
              >
                <PlusIcon size={14} /> Schedule…
              </button>
              <button
                type="button"
                onClick={() => add("unassigned", course.id)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-2 text-sm transition-colors hover:border-foreground/30 dark:border-white dark:bg-white dark:text-black"
              >
                Add unscheduled
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Future term availability unverified. Choose your intended term.
              </p>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                <select
                  value={term}
                  onChange={(e) =>
                    setTerm(e.target.value as (typeof termOptions)[number])
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm dark:border-white dark:bg-white dark:text-black"
                >
                  {termOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm dark:border-white dark:bg-white dark:text-black"
                >
                  {yearOptions.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    add(`${term}-${year}`, course.id)
                    setPicker(false)
                  }}
                  className="rounded-md bg-leaf px-3 py-1.5 text-xs text-leaf-fg hover:opacity-90"
                >
                  Save
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPicker(false)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-white dark:bg-white dark:text-black"
              >
                <ArrowLeft size={12} /> Back
              </button>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 border-t border-border pt-3">
        <Link
          href="/planner"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open planner <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

function Mini({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div>
      <span className="label block">{label}</span>
      <span className="tabular font-display text-2xl text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      {note && (
        <span className="hidden max-w-md text-right text-xs text-muted-foreground md:inline">
          {note}
        </span>
      )}
    </div>
  )
}

function Block({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="label">{heading}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}
