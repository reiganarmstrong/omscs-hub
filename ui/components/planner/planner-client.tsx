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

const UNSCHEDULED = "unassigned";
const YEARS = ["2025", "2026", "2027"];

function gridTerms(): TermLabel[] {
  const out: TermLabel[] = [];
  const order: TermLabel["term"][] = ["Spring", "Summer", "Fall"];
  for (const y of YEARS) {
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
  const unscheduled = plan[UNSCHEDULED] ?? [];
  const allPickedCourses = allPicked
    .map((id) => COURSES_BY_ID[id])
    .filter(Boolean);
  const totalHours = allPicked.length * 3;
  const avgDiff = avg(allPickedCourses.map((c) => c.stats.avgDifficulty));
  const avgWL = avg(allPickedCourses.map((c) => c.stats.avgWorkload));

  const spec = SPECIALIZATIONS.find((s) => s.id === selectedSpec);
  const progress = spec ? bucketProgress(spec, plannedIds) : null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
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
              ? `${progress?.matchedFulfilled ?? 0}/${progress?.requiredFulfilled ?? 0}`
              : undefined
          }
          onClear={clear}
        />

        {unscheduled.length > 0 && (
          <UnscheduledPanel
            ids={unscheduled}
            specId={spec?.id ?? null}
            onAssign={(id, key) => add(key, id)}
            onRemove={(id) => remove(UNSCHEDULED, id)}
          />
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map(({ term, year }) => {
            const key = `${term}-${year}`;
            const ids = plan[key] ?? [];
            return (
              <div
                key={key}
                className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
                  <span className="font-display text-lg tracking-tight">
                    {term} {year}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ids.length} · {ids.length * 3} hr
                  </span>
                </div>
                <ul className="flex-1 divide-y divide-border px-2">
                  {ids.length === 0 && (
                    <li className="py-3 text-center text-xs text-muted-foreground">
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
                          <span className="text-xs text-muted-foreground">
                            {c.code}
                          </span>{" "}
                          <span>{c.title}</span>
                          {role && (
                            <span
                              className={cn(
                                "ml-1.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium",
                                role === "required"
                                  ? "bg-leaf/12 text-leaf"
                                  : role === "bucket"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-rose/12 text-rose",
                              )}
                            >
                              {role === "required"
                                ? "Required"
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
                          className="text-muted-foreground hover:text-rose"
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
                  className="border-t border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PlusIcon size={12} className="-mt-0.5 mr-1 inline" /> Add course
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

      <aside className="self-start xl:sticky xl:top-[80px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="label">Plan health</div>
          <Health
            courses={allPicked.length}
            avgDiff={avgDiff}
            avgWL={avgWL}
          />
        </div>
        {spec && progress && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="label">{spec.name} progress</div>
              <Link
                href="/specializations"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Details →
              </Link>
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
                          "grid size-4 place-items-center rounded-sm border",
                          done
                            ? "border-leaf bg-leaf text-leaf-fg"
                            : "border-border",
                        )}
                      >
                        {done && <CheckIcon size={10} />}
                      </span>
                      <span className="truncate text-[13px]">{req.label}</span>
                    </span>
                    <span className="tabular text-xs text-muted-foreground">
                      {Math.min(filled, req.pick)}/{req.pick}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-sm border",
                      progress.freeElectivesUsed >= spec.freeElectiveCount
                        ? "border-leaf bg-leaf text-leaf-fg"
                        : "border-dashed border-border",
                    )}
                  >
                    {progress.freeElectivesUsed >= spec.freeElectiveCount && (
                      <CheckIcon size={10} />
                    )}
                  </span>
                  <span className="truncate text-[13px]">Free electives</span>
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {progress.freeElectivesUsed}/{spec.freeElectiveCount}
                </span>
              </li>
            </ul>
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
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">Track</span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition",
            selected === null
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40",
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
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40",
              )}
            >
              {s.name.replace(" & Robotics", "")}
              <span className="ml-1 opacity-70 tabular">{matched}</span>
            </button>
          );
        })}
        <Link
          href="/specializations"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Compare →
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
    <div className="mt-3 grid grid-cols-2 items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 sm:grid-cols-3 md:grid-cols-6">
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
        className="ml-auto inline-flex items-center gap-2 self-end justify-self-end text-xs text-muted-foreground hover:text-rose"
      >
        <TrashIcon size={12} /> Clear plan
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
      <div className="label">{label}</div>
      <div className="font-display tabular text-xl text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
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
        accent="rose"
      />
      <Bar
        label="Avg workload"
        value={Math.min(100, (avgWL / 35) * 100)}
        note={courses ? `${avgWL.toFixed(0)} hrs/wk` : "—"}
        accent="leaf"
      />
      <div className="text-xs text-muted-foreground">
        {remaining ? `${remaining} courses to go.` : "All 10 courses planned."}
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
  accent?: "ink" | "leaf" | "rose";
}) {
  const color =
    accent === "leaf"
      ? "var(--leaf)"
      : accent === "rose"
        ? "var(--rose)"
        : "var(--foreground)";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular">{note}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function UnscheduledPanel({
  ids,
  specId,
  onAssign,
  onRemove,
}: {
  ids: string[];
  specId: string | null;
  onAssign: (courseId: string, termKey: string) => void;
  onRemove: (courseId: string) => void;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-leaf/40 bg-leaf/[0.04]">
      <header className="flex items-baseline justify-between gap-3 border-b border-leaf/30 bg-leaf/[0.06] px-4 py-2.5">
        <div>
          <div className="text-sm font-medium text-foreground">
            Unscheduled
            <span className="ml-2 tabular text-xs text-muted-foreground">
              {ids.length} {ids.length === 1 ? "course" : "courses"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Added from the catalog or specializations page. Pick a semester to
            slot each one in.
          </div>
        </div>
      </header>
      <ul className="divide-y divide-leaf/20">
        {ids.map((id) => {
          const c = COURSES_BY_ID[id];
          if (!c) return null;
          const role = roleInSpec(specId, id);
          return (
            <UnscheduledRow
              key={id}
              course={c}
              role={role}
              onAssign={(key) => onAssign(id, key)}
              onRemove={() => onRemove(id)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function UnscheduledRow({
  course,
  role,
  onAssign,
  onRemove,
}: {
  course: { id: string; code: string; title: string; termsOffered: ("Fall" | "Spring" | "Summer")[] };
  role: "required" | "bucket" | "free" | null;
  onAssign: (termKey: string) => void;
  onRemove: () => void;
}) {
  const [term, setTerm] = React.useState<"Fall" | "Spring" | "Summer">(
    course.termsOffered[0] ?? "Fall",
  );
  const [year, setYear] = React.useState(YEARS[0]);

  return (
    <li className="grid items-center gap-3 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 truncate">
        <Link
          href={`/courses/${course.id}`}
          className="hover:underline"
        >
          <span className="text-xs text-muted-foreground">{course.code}</span>{" "}
          <span className="text-foreground">{course.title}</span>
        </Link>
        {role && (
          <span
            className={cn(
              "ml-2 inline-block rounded-full px-1.5 py-px text-[10px] font-medium align-middle",
              role === "required"
                ? "bg-leaf/12 text-leaf"
                : role === "bucket"
                  ? "bg-muted text-muted-foreground"
                  : "bg-rose/12 text-rose",
            )}
          >
            {role === "required" ? "Required" : role === "bucket" ? "Bucket" : "Free"}
          </span>
        )}
        {course.termsOffered.length < 3 && (
          <span className="ml-2 text-[11px] text-muted-foreground">
            offered: {course.termsOffered.join(", ")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Term"
          value={term}
          onChange={(e) =>
            setTerm(e.target.value as "Fall" | "Spring" | "Summer")
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {(["Fall", "Spring", "Summer"] as const).map((t) => (
            <option
              key={t}
              value={t}
              disabled={!course.termsOffered.includes(t)}
            >
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAssign(`${term}-${year}`)}
          className="rounded-md bg-foreground px-3 py-1 text-xs text-background hover:opacity-90"
        >
          Assign
        </button>
        <button
          type="button"
          aria-label="Remove from plan"
          onClick={onRemove}
          className="ml-1 text-muted-foreground hover:text-rose"
        >
          <TrashIcon size={14} />
        </button>
      </div>
    </li>
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
    <div className="border-t border-border bg-background p-2">
      <div className="relative">
        <span className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon size={12} />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Find a ${term} course…`}
          className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-7 text-sm focus:border-foreground/40 focus:outline-none"
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
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  planned && "opacity-50",
                )}
              >
                <span className="truncate">
                  <span className="text-xs text-muted-foreground">{c.code}</span>{" "}
                  {c.title}
                </span>
                <Stars value={c.stats.avgRating} />
              </button>
            </li>
          );
        })}
        {matches.length === 0 && (
          <li className="py-3 text-center text-xs text-muted-foreground">
            Nothing matches.
          </li>
        )}
      </ul>
    </div>
  );
}
