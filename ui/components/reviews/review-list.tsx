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
      <div className="flex flex-wrap items-center gap-3 border-y border-ink py-3">
        <div className="font-mono text-[11px] tracking-widest uppercase">
          {sorted.length} of {reviews.length} reviews
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            placeholder="Filter by semester (e.g. Fall 2024)"
            value={semQuery}
            onChange={(e) => setSemQuery(e.target.value)}
            className="rounded-sm border border-ink/25 bg-paper px-2 py-1 font-mono text-[11px] focus:border-ink focus:outline-none"
          />
          <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase">
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
            className="rounded-sm border border-ink/25 bg-paper px-2 py-1 font-mono text-[11px]"
          >
            <option value={1}>≥ 1★</option>
            <option value={2}>≥ 2★</option>
            <option value={3}>≥ 3★</option>
            <option value={4}>≥ 4★</option>
            <option value={5}>= 5★</option>
          </select>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-sm border border-ink/25 px-3 py-1 font-mono text-[11px] tracking-widest uppercase hover:border-ink"
            >
              <SortIcon size={12} />
              {SORTS.find((s) => s.v === sort)?.label}
              <ChevronDown size={12} />
            </button>
            {open && (
              <div
                className="absolute right-0 z-30 mt-1 w-52 border border-ink bg-paper shadow-[3px_3px_0_var(--ink)]"
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
                      "block w-full px-3 py-1.5 text-left font-mono text-[11px] tracking-widest uppercase hover:bg-ink hover:text-paper",
                      sort === s.v && "bg-ink/8",
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

      <ol className="divide-y divide-ink/12">
        {sorted.map((r, idx) => (
          <li key={r.id} className="grid grid-cols-[auto_1fr] gap-6 py-6">
            <aside className="flex w-32 flex-col gap-2 border-r border-ink/15 pr-4 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <span className="text-ink text-base font-display tabular">
                #{String(idx + 1).padStart(3, "0")}
              </span>
              <Mini label="Semester" value={r.semester} />
              <Mini label="Stage" value={r.programStage} />
              <Mini label="Posted" value={fmtDate(r.createdAt)} />
              {r.id.startsWith("user-") && (
                <span className="inline-block w-fit bg-gold px-1.5 py-0.5 text-gold-fg uppercase">
                  You
                </span>
              )}
            </aside>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="font-mono text-[11px] tabular text-muted-foreground">
                    {r.rating} / 5
                  </span>
                </div>
                <Pill label="Difficulty" value={`${r.difficulty}/5`} />
                <Pill label="Workload" value={`${r.workload} hrs/wk`} />
                <Pill
                  label="Recommend"
                  value={r.recommend ? "Yes" : "No"}
                  tone={r.recommend ? "gold" : "claret"}
                />
              </div>
              <p className="mt-3 text-[15px] leading-relaxed">{r.body}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Bullets label="Pros" items={r.pros} accent="gold" />
                <Bullets label="Cons" items={r.cons} accent="claret" />
              </div>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="py-10 text-center font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            No reviews match these filters.
          </li>
        )}
      </ol>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block">{label}</span>
      <span className="text-ink normal-case font-sans tracking-normal text-[12px]">
        {value}
      </span>
    </span>
  );
}

function Pill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gold" | "claret";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 border-l pl-3 font-mono text-[11px] tabular tracking-widest uppercase",
        tone === "gold" && "border-gold",
        tone === "claret" && "border-claret",
        tone === "default" && "border-ink/30",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-ink">{value}</span>
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
  accent: "gold" | "claret";
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-1 inline-flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase",
          accent === "gold" ? "text-gold-fg" : "text-claret",
        )}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background: accent === "gold" ? "var(--gold)" : "var(--claret)",
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
