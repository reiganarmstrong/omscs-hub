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
      if (r.rating < minRating) return false;
      if (recommendOnly && !r.recommend) return false;
      if (semQuery && !r.semester.toLowerCase().includes(semQuery.toLowerCase()))
        return false;
      return true;
    });
    const cmp: Record<ReviewSortKey, (a: Review, b: Review) => number> = {
      newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      oldest: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      highest: (a, b) => b.rating - a.rating,
      lowest: (a, b) => a.rating - b.rating,
      hardest: (a, b) => b.difficulty - a.difficulty,
      easiest: (a, b) => a.difficulty - b.difficulty,
      longest: (a, b) => b.workload - a.workload,
      shortest: (a, b) => a.workload - b.workload,
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
                <div className="text-foreground">{r.programStage} of program</div>
              </div>
              <div>
                <div className="label">Posted</div>
                <div className="text-muted-foreground">{fmtDate(r.createdAt)}</div>
              </div>
              {r.id.startsWith("user-") && (
                <span className="mt-1 inline-block w-fit rounded-full bg-leaf/12 px-2 py-0.5 text-xs text-leaf">
                  Your review
                </span>
              )}
            </aside>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs tabular text-muted-foreground">
                    {r.rating} / 5
                  </span>
                </div>
                <Pill label="Difficulty" value={`${r.difficulty}/5`} />
                <Pill label="Workload" value={`${r.workload} hr/wk`} />
                <Pill
                  label="Recommend"
                  value={r.recommend ? "Yes" : "No"}
                  tone={r.recommend ? "leaf" : "rose"}
                />
              </div>
              <p className="reading mt-3 text-[15px] text-foreground">
                {r.body}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Bullets label="Pros" items={r.pros} accent="leaf" />
                <Bullets label="Cons" items={r.cons} accent="rose" />
              </div>
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

function Bullets({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: "leaf" | "rose";
}) {
  if (!items.length) return null;
  return (
    <div>
      <div
        className={cn(
          "mb-1 inline-flex items-center gap-1.5 text-xs font-medium",
          accent === "leaf" ? "text-leaf" : "text-rose",
        )}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background:
              accent === "leaf" ? "var(--leaf)" : "var(--rose)",
          }}
        />
        {label}
      </div>
      <ul className="ml-4 list-disc text-[13px] text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
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
