"use client"

import * as React from "react"
import Link from "next/link"
import { emptyReviewStats, courseMatchesSearch } from "@/lib/data"
import { fetchCatalogStats } from "@/lib/api/reviews"
import type { Course, CatalogFilter } from "@/lib/types"
import { FilterRail } from "./filter-rail"
import { CourseCard } from "./course-card"
import { CourseRow } from "./course-row"
import { SearchIcon, SortIcon, ChevronDown } from "@/components/icons"
import { cn } from "@/lib/utils"

type SortKey =
  | "code"
  | "title"
  | "title-desc"
  | "rating-desc"
  | "rating-asc"
  | "difficulty-desc"
  | "difficulty-asc"
  | "workload-desc"
  | "workload-asc"
  | "reviews-desc"

const SORTS: { v: SortKey; label: string }[] = [
  { v: "code", label: "Course code" },
  { v: "title", label: "Title (A–Z)" },
  { v: "title-desc", label: "Title (Z–A)" },
  { v: "rating-desc", label: "Rating ↓" },
  { v: "rating-asc", label: "Rating ↑" },
  { v: "difficulty-desc", label: "Difficulty ↓" },
  { v: "difficulty-asc", label: "Difficulty ↑" },
  { v: "workload-desc", label: "Workload ↓" },
  { v: "workload-asc", label: "Workload ↑" },
  { v: "reviews-desc", label: "Most reviewed" },
]

const DEFAULT_FILTER: CatalogFilter = {
  q: "",
  specs: [],
  terms: [],
  difficulty: [1, 5],
  workload: [0, 50],
  rating: [1, 5],
  minReviews: 0,
  role: "any",
}

export function CatalogClient({ courses }: { courses: Course[] }) {
  const [reviewStats, setReviewStats] = React.useState<
    | { state: "loading" | "unavailable"; courses?: never }
    | { state: "ready"; courses: Record<string, Course["stats"]> }
  >({ state: "loading" })
  const [filter, setFilter] = React.useState<CatalogFilter>(DEFAULT_FILTER)
  const [sort, setSort] = React.useState<SortKey>("code")
  const [view, setView] = React.useState<"grid" | "table">("grid")
  const [sortOpen, setSortOpen] = React.useState(false)
  const sortMenuRef = React.useRef<HTMLDivElement>(null)

  const loadStats = React.useCallback(async () => {
    try {
      const rows = await fetchCatalogStats()
      setReviewStats({ state: "ready", courses: statsByCourse(rows) })
    } catch {
      setReviewStats({ state: "unavailable" })
    }
  }, [])

  const retryStats = () => {
    setFilter((current) => ({
      ...current,
      difficulty: DEFAULT_FILTER.difficulty,
      workload: DEFAULT_FILTER.workload,
      rating: DEFAULT_FILTER.rating,
      minReviews: 0,
    }))
    setSort((current) =>
      ["code", "title", "title-desc"].includes(current) ? current : "code"
    )
    setReviewStats({ state: "loading" })
    void loadStats()
  }

  React.useEffect(() => {
    let active = true
    void fetchCatalogStats().then(
      (rows) => {
        if (active)
          setReviewStats({ state: "ready", courses: statsByCourse(rows) })
      },
      () => {
        if (active) setReviewStats({ state: "unavailable" })
      }
    )
    return () => {
      active = false
    }
  }, [])

  const coursesWithStats = React.useMemo(
    () =>
      reviewStats.state === "ready"
        ? courses.map((course) => ({
            ...course,
            stats: reviewStats.courses[course.id] ?? emptyReviewStats(),
          }))
        : courses,
    [courses, reviewStats]
  )

  React.useEffect(() => {
    if (!sortOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !sortMenuRef.current?.contains(event.target)
      ) {
        setSortOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [sortOpen])

  const filtered = React.useMemo(() => {
    const q = filter.q.trim().toLowerCase()
    const out = coursesWithStats.filter((c) => {
      if (!courseMatchesSearch(c, q)) return false
      if (filter.specs.length) {
        const has = c.specializations.some((s) => filter.specs.includes(s.id))
        if (!has) return false
      }
      if (filter.terms.length) {
        if (!c.termsOffered.some((t) => filter.terms.includes(t))) return false
      }
      if (filter.role !== "any") {
        const has = c.specializations.some((s) => s.role === filter.role)
        if (!has) return false
      }
      if (reviewStats.state !== "ready") return true
      const s = c.stats
      const hasReviews = s.numReviews > 0
      if (
        hasReviews &&
        !matchesAverage(
          s.avgDifficulty,
          filter.difficulty,
          DEFAULT_FILTER.difficulty
        )
      )
        return false
      if (
        hasReviews &&
        !matchesAverage(s.avgWorkload, filter.workload, DEFAULT_FILTER.workload)
      )
        return false
      if (
        hasReviews &&
        !matchesAverage(s.avgRating, filter.rating, DEFAULT_FILTER.rating)
      )
        return false
      if (
        !hasReviews &&
        (filter.difficulty[0] !== DEFAULT_FILTER.difficulty[0] ||
          filter.difficulty[1] !== DEFAULT_FILTER.difficulty[1] ||
          filter.workload[0] !== DEFAULT_FILTER.workload[0] ||
          filter.workload[1] !== DEFAULT_FILTER.workload[1] ||
          filter.rating[0] !== DEFAULT_FILTER.rating[0] ||
          filter.rating[1] !== DEFAULT_FILTER.rating[1])
      )
        return false
      if (s.numReviews < filter.minReviews) return false
      return true
    })
    out.sort((a, b) => {
      switch (reviewStats.state === "ready" ? sort : "code") {
        case "code":
          return a.code.localeCompare(b.code)
        case "title":
          return a.title.localeCompare(b.title)
        case "title-desc":
          return b.title.localeCompare(a.title)
        case "rating-desc":
          return compareAverage(a.stats.avgRating, b.stats.avgRating, "desc")
        case "rating-asc":
          return compareAverage(a.stats.avgRating, b.stats.avgRating, "asc")
        case "difficulty-desc":
          return compareAverage(
            a.stats.avgDifficulty,
            b.stats.avgDifficulty,
            "desc"
          )
        case "difficulty-asc":
          return compareAverage(
            a.stats.avgDifficulty,
            b.stats.avgDifficulty,
            "asc"
          )
        case "workload-desc":
          return compareAverage(
            a.stats.avgWorkload,
            b.stats.avgWorkload,
            "desc"
          )
        case "workload-asc":
          return compareAverage(a.stats.avgWorkload, b.stats.avgWorkload, "asc")
        case "reviews-desc":
          return b.stats.numReviews - a.stats.numReviews
        default:
          return 0
      }
    })
    return out
  }, [coursesWithStats, filter, sort, reviewStats.state])

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 pt-4 pb-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:pt-5 lg:pb-12">
      <FilterRail
        filter={filter}
        setFilter={setFilter}
        count={filtered.length}
        total={courses.length}
        reviewStatsAvailable={reviewStats.state === "ready"}
      />
      <div className="min-w-0">
        {reviewStats.state !== "ready" && (
          <div
            role="status"
            className="mb-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
          >
            {reviewStats.state === "loading"
              ? "Loading review statistics…"
              : "Review statistics unavailable. Course facts remain available."}
            {reviewStats.state === "unavailable" && (
              <button
                type="button"
                onClick={retryStats}
                className="ml-3 underline underline-offset-4"
              >
                Retry statistics
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <div className="relative flex min-w-full flex-1 items-center sm:min-w-72">
            <span className="absolute left-3 text-muted-foreground">
              <SearchIcon size={15} />
            </span>
            <input
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search by code, title, tag, keyword…"
              className="w-full rounded-md border border-border bg-card py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none"
            />
          </div>
          <div ref={sortMenuRef} className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/30 sm:w-auto"
            >
              <SortIcon size={14} />
              <span className="truncate">
                {SORTS.find((s) => s.v === sort)?.label}
              </span>
              <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-md max-sm:right-auto max-sm:left-0"
                onMouseLeave={() => setSortOpen(false)}
              >
                {SORTS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    disabled={
                      reviewStats.state !== "ready" &&
                      !["code", "title", "title-desc"].includes(s.v)
                    }
                    onClick={() => {
                      setSort(s.v)
                      setSortOpen(false)
                    }}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-sm transition-colors",
                      sort === s.v
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "hover:bg-leaf/12 hover:text-leaf dark:hover:bg-leaf dark:hover:text-leaf-fg"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-1 overflow-hidden rounded-md border border-border bg-card sm:flex-none">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "flex-1 px-3 py-2 text-sm transition-colors sm:flex-none",
                  view === v
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
                )}
              >
                {v === "grid" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
        </div>

        {view === "grid" ? (
          filtered.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  reviewStatsState={reviewStats.state}
                />
              ))}
            </div>
          ) : (
            <Empty />
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="grid min-w-[680px] grid-cols-[100px_1fr_72px_72px_72px_88px] gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground">
              <span>Code</span>
              <span>Title</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Hrs/wk</span>
              <span className="text-right">Rating</span>
              <span className="text-right">Reviews</span>
            </div>
            <div className="min-w-[680px] divide-y divide-border">
              {filtered.length ? (
                filtered.map((c) => (
                  <CourseRow
                    key={c.id}
                    course={c}
                    reviewStatsState={reviewStats.state}
                  />
                ))
              ) : (
                <Empty />
              )}
            </div>
          </div>
        )}
        <Link
          href="/historical"
          className="mt-6 inline-block text-sm underline underline-offset-4"
        >
          Historical review archive
        </Link>
      </div>
    </div>
  )
}

function statsByCourse(rows: Awaited<ReturnType<typeof fetchCatalogStats>>) {
  const byCourse: Record<string, Course["stats"]> = {}
  for (const row of rows) {
    byCourse[row.courseId] = {
      ...emptyReviewStats(),
      numReviews: row.numReviews,
      avgDifficulty: row.avgDifficulty,
      avgWorkload: row.avgWorkload,
      avgRating: row.avgRating,
    }
  }
  return byCourse
}

function matchesAverage(
  value: number | null,
  range: [number, number],
  defaultRange: [number, number]
) {
  if (value === null)
    return range[0] === defaultRange[0] && range[1] === defaultRange[1]
  return value >= range[0] && value <= range[1]
}

function compareAverage(
  a: number | null,
  b: number | null,
  order: "asc" | "desc"
) {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  return order === "asc" ? a - b : b - a
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <div className="text-base font-medium text-foreground">
        No courses match.
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        Loosen a filter, then try again.
      </div>
    </div>
  )
}
