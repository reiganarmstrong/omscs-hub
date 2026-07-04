"use client"

import * as React from "react"
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
  const [filter, setFilter] = React.useState<CatalogFilter>(DEFAULT_FILTER)
  const [sort, setSort] = React.useState<SortKey>("rating-desc")
  const [view, setView] = React.useState<"grid" | "table">("grid")
  const [sortOpen, setSortOpen] = React.useState(false)
  const sortMenuRef = React.useRef<HTMLDivElement>(null)

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
    const out = courses.filter((c) => {
      if (q) {
        const hay =
          `${c.code} ${c.title} ${c.description} ${c.tags.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
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
      const s = c.stats
      if (
        s.avgDifficulty < filter.difficulty[0] ||
        s.avgDifficulty > filter.difficulty[1]
      )
        return false
      if (
        s.avgWorkload < filter.workload[0] ||
        s.avgWorkload > filter.workload[1]
      )
        return false
      if (s.avgRating < filter.rating[0] || s.avgRating > filter.rating[1])
        return false
      if (s.numReviews < filter.minReviews) return false
      return true
    })
    out.sort((a, b) => {
      switch (sort) {
        case "code":
          return a.code.localeCompare(b.code)
        case "title":
          return a.title.localeCompare(b.title)
        case "title-desc":
          return b.title.localeCompare(a.title)
        case "rating-desc":
          return b.stats.avgRating - a.stats.avgRating
        case "rating-asc":
          return a.stats.avgRating - b.stats.avgRating
        case "difficulty-desc":
          return b.stats.avgDifficulty - a.stats.avgDifficulty
        case "difficulty-asc":
          return a.stats.avgDifficulty - b.stats.avgDifficulty
        case "workload-desc":
          return b.stats.avgWorkload - a.stats.avgWorkload
        case "workload-asc":
          return a.stats.avgWorkload - b.stats.avgWorkload
        case "reviews-desc":
          return b.stats.numReviews - a.stats.numReviews
        default:
          return 0
      }
    })
    return out
  }, [courses, filter, sort])

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 pt-4 pb-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:pt-5 lg:pb-12">
      <FilterRail
        filter={filter}
        setFilter={setFilter}
        count={filtered.length}
        total={courses.length}
      />
      <div className="min-w-0">
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
                <CourseCard key={c.id} course={c} />
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
                filtered.map((c) => <CourseRow key={c.id} course={c} />)
              ) : (
                <Empty />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
