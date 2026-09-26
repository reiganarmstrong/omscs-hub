"use client"

import * as React from "react"
import type { Review, ReviewSortKey } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Stars } from "@/components/badges"
import { ChevronDown, SortIcon } from "@/components/icons"
import { DistributionChart } from "@/components/distribution-chart"
import { aggregateStats } from "@/lib/data"
import { WORKLOAD_BUCKETS } from "@/lib/types"

const SORTS: { v: ReviewSortKey; label: string }[] = [
  { v: "newest", label: "Newest first" },
  { v: "oldest", label: "Oldest first" },
  { v: "highest", label: "Highest rated" },
  { v: "lowest", label: "Lowest rated" },
  { v: "hardest", label: "Hardest reported" },
  { v: "easiest", label: "Easiest reported" },
  { v: "longest", label: "Longest workload" },
  { v: "shortest", label: "Shortest workload" },
]

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [sort, setSort] = React.useState<ReviewSortKey>("newest")
  const [minRating, setMinRating] = React.useState(0)
  const [recommendOnly, setRecommendOnly] = React.useState(false)
  const [semQuery, setSemQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const sortMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !sortMenuRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  const sorted = React.useMemo(() => {
    const filtered = reviews.filter((r) => {
      if (minRating > 0 && (r.rating ?? 0) < minRating) return false
      if (recommendOnly && r.recommend !== true) return false
      if (
        semQuery &&
        !r.semester.toLowerCase().includes(semQuery.toLowerCase())
      )
        return false
      return true
    })
    const cmp: Record<ReviewSortKey, (a: Review, b: Review) => number> = {
      newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      oldest: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      highest: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      lowest: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
      hardest: (a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0),
      easiest: (a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0),
      longest: (a, b) => (b.workload ?? 0) - (a.workload ?? 0),
      shortest: (a, b) => (a.workload ?? 0) - (b.workload ?? 0),
    }
    return [...filtered].sort(cmp[sort])
  }, [reviews, sort, minRating, recommendOnly, semQuery])
  const stats = React.useMemo(() => aggregateStats(sorted), [sorted])
  const meanWLBucket = WORKLOAD_BUCKETS.findIndex(
    (bucket) =>
      stats.avgWorkload >= bucket.min && stats.avgWorkload <= bucket.max
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="text-sm text-muted-foreground">
          {sorted.length} of {reviews.length}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            placeholder="Filter by semester"
            value={semQuery}
            onChange={(e) => setSemQuery(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-foreground/40 focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={recommendOnly}
              onChange={(e) => setRecommendOnly(e.target.checked)}
            />
            Would recommend
          </label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value={0}>All ratings</option>
            <option value={1}>≥ 1★</option>
            <option value={2}>≥ 2★</option>
            <option value={3}>≥ 3★</option>
            <option value={4}>≥ 4★</option>
            <option value={5}>= 5★</option>
          </select>
          <div ref={sortMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs transition-colors hover:border-foreground/30"
            >
              <SortIcon size={12} />
              {SORTS.find((s) => s.v === sort)?.label}
              <ChevronDown size={12} />
            </button>
            {open && (
              <div
                className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-md border border-border bg-popover shadow-md"
                onMouseLeave={() => setOpen(false)}
              >
                {SORTS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => {
                      setSort(s.v)
                      setOpen(false)
                    }}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted dark:hover:bg-leaf dark:hover:text-leaf-fg",
                      sort === s.v && "bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {sorted.length > 0 && (
        <section className="mt-5" aria-label="Distributions">
          <h3 className="font-display text-xl">Distributions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {sorted.length} displayed reviews. Mean bin highlighted.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-8 rounded-xl border border-border bg-card p-6 lg:grid-cols-3">
            <DistributionChart
              label="Difficulty"
              unit="of 5"
              bins={stats.distDifficulty}
              binLabels={["1", "2", "3", "4", "5"]}
              mean={
                stats.distDifficulty.some(Boolean)
                  ? stats.avgDifficulty
                  : undefined
              }
              meanIndex={
                stats.distDifficulty.some(Boolean)
                  ? Math.round(stats.avgDifficulty) - 1
                  : undefined
              }
              accent="rose"
            />
            <DistributionChart
              label="Weekly workload"
              unit="hrs/wk"
              bins={stats.distWorkload}
              binLabels={WORKLOAD_BUCKETS.map((bucket) => bucket.label)}
              mean={
                stats.distWorkload.some(Boolean) ? stats.avgWorkload : undefined
              }
              meanIndex={
                stats.distWorkload.some(Boolean) ? meanWLBucket : undefined
              }
              accent="leaf"
            />
            <DistributionChart
              label="Overall rating"
              unit="of 5"
              bins={stats.distRating}
              binLabels={["1★", "2★", "3★", "4★", "5★"]}
              mean={
                stats.distRating.some(Boolean) ? stats.avgRating : undefined
              }
              meanIndex={
                stats.distRating.some(Boolean)
                  ? Math.round(stats.avgRating) - 1
                  : undefined
              }
              accent="ink"
            />
          </div>
        </section>
      )}

      <ol className="mt-4 space-y-4">
        {sorted.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-1 gap-5 rounded-lg border border-border bg-card p-5 sm:grid-cols-[140px_1fr]"
          >
            <aside className="flex flex-col gap-1.5 text-sm sm:border-r sm:border-border sm:pr-4">
              <div>
                <div className="label">Semester</div>
                <div className="text-foreground">{r.semester}</div>
              </div>
              <div>
                <div className="label">Stage</div>
                <div className="text-foreground">
                  {r.programStage
                    ? `${r.programStage} of program`
                    : "Not reported"}
                </div>
              </div>
              <div>
                <div className="label">Posted</div>
                <div className="text-muted-foreground">
                  {fmtDate(r.createdAt)}
                </div>
              </div>
              <span
                className={cn(
                  "mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs",
                  r.source === "app"
                    ? "bg-leaf/12 text-leaf"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {r.source === "app"
                  ? "OMSCS Hub"
                  : "OMSCentral Imported Review"}
              </span>
            </aside>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating ?? 0} />
                  <span className="tabular text-xs text-muted-foreground">
                    {r.rating ? `${r.rating} / 5` : "No rating"}
                  </span>
                </div>
                <Pill
                  label="Difficulty"
                  value={r.difficulty ? `${r.difficulty}/5` : "N/A"}
                />
                <Pill
                  label="Workload"
                  value={r.workload ? `${r.workload} hr/wk` : "N/A"}
                />
                <Pill
                  label="Recommend"
                  value={
                    r.recommend === null ? "N/A" : r.recommend ? "Yes" : "No"
                  }
                  tone={
                    r.recommend === true
                      ? "leaf"
                      : r.recommend === false
                        ? "rose"
                        : "default"
                  }
                />
              </div>
              <p className="reading mt-3 text-[15px] whitespace-pre-wrap text-foreground">
                {r.body}
              </p>
              {r.source === "omscentral" && r.metadata?.sourceUrl && (
                <ImportedSourceLink url={r.metadata.sourceUrl} />
              )}
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            {reviews.length === 0
              ? "No reviews yet."
              : "No reviews match these filters."}
          </li>
        )}
      </ol>
    </div>
  )
}

function ImportedSourceLink({ url }: { url: string }) {
  const isArchive = url.endsWith("/reviews")
  return (
    <>
      <a
        className="mt-3 inline-block text-xs underline underline-offset-4"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        {isArchive ? "OMSCentral source archive" : "Read original review"}
      </a>
      {isArchive && (
        <p className="mt-1 text-xs text-muted-foreground">
          OMSCentral links to the course review archive; individual review links
          are not available.
        </p>
      )}
    </>
  )
}

function Pill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "leaf" | "rose"
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular text-foreground",
          tone === "leaf" && "text-leaf",
          tone === "rose" && "text-rose"
        )}
      >
        {value}
      </span>
    </span>
  )
}

function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
