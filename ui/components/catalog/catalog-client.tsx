"use client";

import * as React from "react";
import type { Course, CatalogFilter } from "@/lib/types";
import { FilterRail } from "./filter-rail";
import { CourseCard } from "./course-card";
import { CourseRow } from "./course-row";
import { SearchIcon, SortIcon, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

type SortKey =
  | "code"
  | "title"
  | "rating-desc"
  | "rating-asc"
  | "difficulty-desc"
  | "difficulty-asc"
  | "workload-desc"
  | "workload-asc"
  | "reviews-desc";

const SORTS: { v: SortKey; label: string }[] = [
  { v: "code", label: "Course code" },
  { v: "title", label: "Title (A→Z)" },
  { v: "rating-desc", label: "Rating ↓" },
  { v: "rating-asc", label: "Rating ↑" },
  { v: "difficulty-desc", label: "Difficulty ↓" },
  { v: "difficulty-asc", label: "Difficulty ↑" },
  { v: "workload-desc", label: "Workload ↓" },
  { v: "workload-asc", label: "Workload ↑" },
  { v: "reviews-desc", label: "Most reviewed" },
];

const DEFAULT_FILTER: CatalogFilter = {
  q: "",
  specs: [],
  terms: [],
  difficulty: [1, 5],
  workload: [0, 50],
  rating: [1, 5],
  minReviews: 0,
  role: "any",
};

export function CatalogClient({ courses }: { courses: Course[] }) {
  const [filter, setFilter] = React.useState<CatalogFilter>(DEFAULT_FILTER);
  const [sort, setSort] = React.useState<SortKey>("rating-desc");
  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [sortOpen, setSortOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    const out = courses.filter((c) => {
      if (q) {
        const hay = `${c.code} ${c.title} ${c.description} ${c.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter.specs.length) {
        const has = c.specializations.some((s) => filter.specs.includes(s.id));
        if (!has) return false;
      }
      if (filter.terms.length) {
        if (!c.termsOffered.some((t) => filter.terms.includes(t))) return false;
      }
      if (filter.role !== "any") {
        const has = c.specializations.some((s) => s.role === filter.role);
        if (!has) return false;
      }
      const s = c.stats;
      if (s.avgDifficulty < filter.difficulty[0] || s.avgDifficulty > filter.difficulty[1])
        return false;
      if (s.avgWorkload < filter.workload[0] || s.avgWorkload > filter.workload[1])
        return false;
      if (s.avgRating < filter.rating[0] || s.avgRating > filter.rating[1])
        return false;
      if (s.numReviews < filter.minReviews) return false;
      return true;
    });
    out.sort((a, b) => {
      switch (sort) {
        case "code": return a.code.localeCompare(b.code);
        case "title": return a.title.localeCompare(b.title);
        case "rating-desc": return b.stats.avgRating - a.stats.avgRating;
        case "rating-asc": return a.stats.avgRating - b.stats.avgRating;
        case "difficulty-desc": return b.stats.avgDifficulty - a.stats.avgDifficulty;
        case "difficulty-asc": return a.stats.avgDifficulty - b.stats.avgDifficulty;
        case "workload-desc": return b.stats.avgWorkload - a.stats.avgWorkload;
        case "workload-asc": return a.stats.avgWorkload - b.stats.avgWorkload;
        case "reviews-desc": return b.stats.numReviews - a.stats.numReviews;
        default: return 0;
      }
    });
    return out;
  }, [courses, filter, sort]);

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-[240px_1fr] gap-8 px-6 pt-5 pb-10">
      <FilterRail
        filter={filter}
        setFilter={setFilter}
        count={filtered.length}
        total={courses.length}
      />
      <div>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink pb-3">
          <div className="relative flex flex-1 items-center">
            <span className="absolute left-3 text-muted-foreground">
              <SearchIcon size={14} />
            </span>
            <input
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search by code, title, tag, keyword…"
              className="w-full rounded-sm border border-ink/25 bg-paper py-2 pr-3 pl-9 font-mono text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-2 rounded-sm border border-ink/25 px-3 py-2 font-mono text-[11px] tracking-widest uppercase hover:border-ink"
            >
              <SortIcon size={12} />
              {SORTS.find((s) => s.v === sort)?.label}
              <ChevronDown size={12} />
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 z-30 mt-1 w-56 border border-ink bg-paper shadow-[3px_3px_0_var(--ink)]"
                onMouseLeave={() => setSortOpen(false)}
              >
                {SORTS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => {
                      setSort(s.v);
                      setSortOpen(false);
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
          <div className="flex overflow-hidden rounded-sm border border-ink/25">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-2 font-mono text-[11px] tracking-widest uppercase",
                  view === v ? "bg-ink text-paper" : "hover:bg-ink/8",
                )}
              >
                {v === "grid" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
        </div>

        {view === "grid" ? (
          filtered.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <Empty />
          )
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-[100px_1fr_72px_72px_72px_120px] gap-3 border-b border-ink px-2 pb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <span>Code</span>
              <span>Title</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Hrs/wk</span>
              <span className="text-right">Rating</span>
              <span className="text-right">Reviews</span>
            </div>
            {filtered.length ? (
              filtered.map((c) => <CourseRow key={c.id} course={c} />)
            ) : (
              <Empty />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-12 border border-dashed border-ink/30 p-10 text-center">
      <div className="font-display text-2xl">No courses match.</div>
      <div className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        Loosen a filter, then try again.
      </div>
    </div>
  );
}
