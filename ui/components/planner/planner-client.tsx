"use client";

import * as React from "react";
import Link from "next/link";
import { COURSES, COURSES_BY_ID } from "@/lib/data";
import type { SpecializationId } from "@/lib/types";
import { SPECIALIZATIONS, bucketProgress } from "@/lib/data/specializations";
import { usePlanner } from "@/lib/store/planner-store";
import { usePrefs } from "@/lib/store/prefs-store";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/badges";
import {
  PlusIcon,
  TrashIcon,
  SearchIcon,
  CheckIcon,
} from "@/components/icons";

type TermLabel = { term: "Fall" | "Spring" | "Summer"; year: string };

function gridTerms(): TermLabel[] {
  const out: TermLabel[] = [];
  const order: TermLabel["term"][] = ["Spring", "Summer", "Fall"];
  for (const y of ["2025", "2026", "2027"]) {
    for (const t of order) out.push({ term: t, year: y });
  }
  return out;
}

export function PlannerClient() {
  const { plan, add, remove, clear, has } = usePlanner();
  const { selectedSpec, setSelectedSpec } = usePrefs();
  const terms = gridTerms();
  const [picker, setPicker] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  const allPicked = Object.values(plan).flat();
  const plannedIds = React.useMemo(() => new Set(allPicked), [allPicked]);
  const allPickedCourses = allPicked
    .map((id) => COURSES_BY_ID[id])
    .filter(Boolean);
  const totalHours = allPicked.length * 3;
  const avgDiff = avg(allPickedCourses.map((c) => c.stats.avgDifficulty));
  const avgWL = avg(allPickedCourses.map((c) => c.stats.avgWorkload));

  const spec = SPECIALIZATIONS.find((s) => s.id === selectedSpec);
  const progress = spec ? bucketProgress(spec, plannedIds) : null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_340px]">
      <div>
        <SpecSelector
          selected={selectedSpec}
          onSelect={setSelectedSpec}
          plannedIds={plannedIds}
        />

        <SummaryStrip
          courses={allPicked.length}
          hours={totalHours}
          avgDiff={avgDiff}
          avgWL={avgWL}
          required={
            spec
              ? `${(progress?.matchedFulfilled ?? 0)}/${progress?.requiredFulfilled ?? 0}`
              : undefined
          }
          onClear={clear}
        />

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map(({ term, year }) => {
            const key = `${term}-${year}`;
            const ids = plan[key] ?? [];
            return (
              <div
                key={key}
                className="flex h-full flex-col border border-ink/15 bg-card"
              >
                <div className="flex items-baseline justify-between border-b border-ink/15 px-3 py-2">
                  <span className="font-display text-lg tracking-tight">
                    {term} {year}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {ids.length} · {ids.length * 3} hr
                  </span>
                </div>
                <ul className="flex-1 divide-y divide-ink/10 px-2">
                  {ids.length === 0 && (
                    <li className="py-3 text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      Empty term
                    </li>
                  )}
                  {ids.map((id) => {
                    const c = COURSES_BY_ID[id];
                    if (!c) return null;
                    const role = roleInSpec(spec?.id, id);
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <Link
                          href={`/courses/${c.id}`}
                          className="flex-1 truncate text-sm hover:underline"
                        >
                          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                            {c.code}
                          </span>{" "}
                          <span>{c.title}</span>
                          {role && (
                            <span
                              className={cn(
                                "ml-1 inline-block rounded-full px-1.5 py-px font-mono text-[9px] tracking-widest uppercase",
                                role === "required"
                                  ? "bg-gold text-gold-fg"
                                  : role === "bucket"
                                    ? "bg-ink/8 text-ink"
                                    : "bg-claret/10 text-claret",
                              )}
                            >
                              {role === "required"
                                ? "Req"
                                : role === "bucket"
                                  ? "Bucket"
                                  : "Free"}
                            </span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(key, id)}
                          aria-label="Remove from term"
                          className="text-muted-foreground hover:text-claret"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => setPicker(picker === key ? null : key)}
                  className="border-t border-ink/15 px-3 py-1.5 text-left font-mono text-[10px] tracking-widest text-ink uppercase hover:bg-ink hover:text-paper"
                >
                  <PlusIcon size={11} className="-mt-0.5 mr-1 inline" /> Add course
                </button>
                {picker === key && (
                  <CoursePicker
                    term={term}
                    q={q}
                    setQ={setQ}
                    onPick={(id) => {
                      add(key, id);
                      setPicker(null);
                      setQ("");
                    }}
                    has={has}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="self-start xl:sticky xl:top-[88px]">
        <div className="border border-ink/15 bg-card p-4">
          <div className="border-b border-ink pb-2 font-mono text-[10px] tracking-widest uppercase">
            Plan health
          </div>
          <Health
            courses={allPicked.length}
            avgDiff={avgDiff}
            avgWL={avgWL}
          />
        </div>
        {spec && progress && (
          <div className="mt-4 border border-ink/15 bg-card p-4">
            <div className="border-b border-ink pb-2 font-mono text-[10px] tracking-widest uppercase">
              {spec.name} progress
            </div>
            <ul className="mt-3 space-y-2">
              {spec.requirements.map((req) => {
                const filled = progress.byBucket[req.id]?.count ?? 0;
                const done = filled >= req.pick;
                return (
                  <li
                    key={req.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={cn(
                          "grid size-4 place-items-center rounded-[2px] border",
                          done
                            ? "border-gold bg-gold text-gold-fg"
                            : "border-ink/30",
                        )}
                      >
                        {done && <CheckIcon size={10} />}
                      </span>
                      <span className="truncate text-[12px]">{req.label}</span>
                    </span>
                    <span className="font-mono tabular text-[11px]">
                      {Math.min(filled, req.pick)}/{req.pick}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-[2px] border",
                      progress.freeElectivesUsed >= spec.freeElectiveCount
                        ? "border-gold bg-gold text-gold-fg"
                        : "border-dashed border-ink/30",
                    )}
                  >
                    {progress.freeElectivesUsed >= spec.freeElectiveCount && (
                      <CheckIcon size={10} />
                    )}
                  </span>
                  <span className="truncate text-[12px]">Free electives</span>
                </span>
                <span className="font-mono tabular text-[11px]">
                  {progress.freeElectivesUsed}/{spec.freeElectiveCount}
                </span>
              </li>
            </ul>
            <Link
              href="/specializations"
              className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
            >
              View track requirements →
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function avg(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function roleInSpec(
  specId: string | null | undefined,
  courseId: string,
): "required" | "bucket" | "free" | null {
  if (!specId) return null;
  const spec = SPECIALIZATIONS.find((s) => s.id === specId);
  if (!spec) return null;
  for (const req of spec.requirements) {
    if (req.poolCourseIds.includes(courseId)) {
      return req.required ? "required" : "bucket";
    }
  }
  return "free";
}

function SpecSelector({
  selected,
  onSelect,
  plannedIds,
}: {
  selected: SpecializationId | null;
  onSelect: (id: SpecializationId | null) => void;
  plannedIds: Set<string>;
}) {
  return (
    <div className="border border-ink/15 bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Track
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-widest uppercase transition",
            selected === null
              ? "border-ink bg-ink text-paper"
              : "border-ink/25 hover:border-ink/60",
          )}
        >
          None
        </button>
        {SPECIALIZATIONS.map((s) => {
          const isActive = selected === s.id;
          const ids = new Set(s.requirements.flatMap((r) => r.poolCourseIds));
          const matched = [...ids].filter((id) => plannedIds.has(id)).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-widest uppercase transition",
                isActive
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 hover:border-ink/60",
              )}
            >
              {s.name.replace(" & Robotics", "")}
              <span className="ml-1 opacity-70">{matched}</span>
            </button>
          );
        })}
        <Link
          href="/specializations"
          className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
        >
          Compare tracks →
        </Link>
      </div>
    </div>
  );
}

function SummaryStrip({
  courses,
  hours,
  avgDiff,
  avgWL,
  required,
  onClear,
}: {
  courses: number;
  hours: number;
  avgDiff: number;
  avgWL: number;
  required?: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 items-center gap-4 border-y border-ink py-3 sm:grid-cols-3 md:grid-cols-6">
      <Stat label="Courses" value={String(courses)} />
      <Stat label="Credit hours" value={String(hours)} unit="/30" />
      <Stat
        label="Avg difficulty"
        value={courses ? avgDiff.toFixed(1) : "—"}
        unit="/5"
      />
      <Stat
        label="Avg workload"
        value={courses ? avgWL.toFixed(0) : "—"}
        unit="hr/wk"
      />
      <Stat label="Bucket slots" value={required ?? "—"} />
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-2 self-end justify-self-end font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-claret"
      >
        <TrashIcon size={11} /> Clear plan
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-display tabular text-2xl">
        {value}
        {unit && (
          <span className="ml-1 font-mono text-[10px] text-muted-foreground tracking-widest">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Health({
  courses,
  avgDiff,
  avgWL,
}: {
  courses: number;
  avgDiff: number;
  avgWL: number;
}) {
  const remaining = Math.max(0, 10 - courses);
  return (
    <div className="mt-3 space-y-3">
      <Bar
        label="Courses"
        value={(courses / 10) * 100}
        note={`${courses} / 10`}
      />
      <Bar
        label="Avg difficulty"
        value={(avgDiff / 5) * 100}
        note={courses ? `${avgDiff.toFixed(1)} / 5` : "—"}
        accent="claret"
      />
      <Bar
        label="Avg workload"
        value={Math.min(100, (avgWL / 35) * 100)}
        note={courses ? `${avgWL.toFixed(0)} hrs/wk` : "—"}
        accent="gold"
      />
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {remaining ? `${remaining} courses to go` : "All 10 courses planned"}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  note,
  accent = "ink",
}: {
  label: string;
  value: number;
  note: string;
  accent?: "ink" | "gold" | "claret";
}) {
  const color =
    accent === "gold"
      ? "var(--gold)"
      : accent === "claret"
        ? "var(--claret)"
        : "var(--ink)";
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>{label}</span>
        <span>{note}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-ink/10">
        <div
          className="h-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function CoursePicker({
  term,
  q,
  setQ,
  onPick,
  has,
}: {
  term: "Fall" | "Spring" | "Summer";
  q: string;
  setQ: (s: string) => void;
  onPick: (id: string) => void;
  has: (id: string) => string | null;
}) {
  const ql = q.trim().toLowerCase();
  const matches = COURSES.filter((c) => {
    if (!c.termsOffered.includes(term)) return false;
    if (!ql) return true;
    return `${c.code} ${c.title}`.toLowerCase().includes(ql);
  }).slice(0, 16);

  return (
    <div className="border-t border-ink/15 bg-paper p-2">
      <div className="relative">
        <span className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon size={12} />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Find a ${term} course…`}
          className="w-full rounded-sm border border-ink/25 bg-paper py-1 pr-2 pl-7 font-mono text-[12px] focus:border-ink focus:outline-none"
        />
      </div>
      <ul className="mt-2 max-h-60 overflow-y-auto">
        {matches.map((c) => {
          const planned = has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink/8",
                  planned && "opacity-50",
                )}
              >
                <span className="truncate">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {c.code}
                  </span>{" "}
                  {c.title}
                </span>
                <Stars value={c.stats.avgRating} />
              </button>
            </li>
          );
        })}
        {matches.length === 0 && (
          <li className="py-3 text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Nothing matches
          </li>
        )}
      </ul>
    </div>
  );
}
