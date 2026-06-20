"use client";

import * as React from "react";
import type { Review, ReviewSortKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/badges";
import { ChevronDown, SortIcon } from "@/components/icons";

const SORTS: { v: ReviewSortKey; label: string }[] = [
  { v: "newest", label: "Newest first" },
  { v: "oldest", label: "Oldest first" },
  { v: "highest", label: "Highest rated" },
  { v: "lowest", label: "Lowest rated" },
  { v: "hardest", label: "Hardest reported" },
  { v: "easiest", label: "Easiest reported" },
  { v: "longest", label: "Longest workload" },
  { v: "shortest", label: "Shortest workload" },
];

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [sort, setSort] = React.useState<ReviewSortKey>("newest");
  const [minRating, setMinRating] = React.useState(1);
  const [recommendOnly, setRecommendOnly] = React.useState(false);
  const [semQuery, setSemQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !sortMenuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const sorted = React.useMemo(() => {
    const filtered = reviews.filter((r) => {
      if ((r.rating ?? 0) < minRating) return false;
      if (recommendOnly && r.recommend !== true) return false;
      if (semQuery && !r.semester.toLowerCase().includes(semQuery.toLowerCase()))
        return false;
      return true;
    });
    const cmp: Record<ReviewSortKey, (a: Review, b: Review) => number> = {
      newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      oldest: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      highest: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      lowest: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
      hardest: (a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0),
      easiest: (a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0),
      longest: (a, b) => (b.workload ?? 0) - (a.workload ?? 0),
      shortest: (a, b) => (a.workload ?? 0) - (b.workload ?? 0),
    };
    return [...filtered].sort(cmp[sort]);
  }, [reviews, sort, minRating, recommendOnly, semQuery]);

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
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:border-foreground/30"
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
                      setSort(s.v);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-sm hover:bg-muted",
                      sort === s.v && "bg-muted",
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
                  {r.programStage ? `${r.programStage} of program` : "Not reported"}
                </div>
              </div>
              <div>
                <div className="label">Posted</div>
                <div className="text-muted-foreground">{fmtDate(r.createdAt)}</div>
              </div>
              <span
                className={cn(
                  "mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs",
                  r.source === "app"
                    ? "bg-leaf/12 text-leaf"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {r.source === "app" ? "OMSCS Hub" : "OMSCentral"}
              </span>
            </aside>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating ?? 0} />
                  <span className="text-xs tabular text-muted-foreground">
                    {r.rating ? `${r.rating} / 5` : "No rating"}
                  </span>
                </div>
                <Pill label="Difficulty" value={r.difficulty ? `${r.difficulty}/5` : "N/A"} />
                <Pill label="Workload" value={r.workload ? `${r.workload} hr/wk` : "N/A"} />
                <Pill
                  label="Recommend"
                  value={r.recommend === null ? "N/A" : r.recommend ? "Yes" : "No"}
                  tone={r.recommend === true ? "leaf" : r.recommend === false ? "rose" : "default"}
                />
              </div>
              <p className="reading mt-3 text-[15px] text-foreground">
                {r.body}
              </p>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No reviews match these filters.
          </li>
        )}
      </ol>
    </div>
  );
}

function Pill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "leaf" | "rose";
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular text-foreground",
          tone === "leaf" && "text-leaf",
          tone === "rose" && "text-rose",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
