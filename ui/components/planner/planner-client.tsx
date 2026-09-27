"use client";

import * as React from "react";
import Link from "next/link";
import { COURSES, COURSES_BY_ID, courseMatchesSearch } from "@/lib/data";
import type { SpecializationId, Term } from "@/lib/types";
import {
  SPECIALIZATIONS,
  DEGREE_REQUIREMENT_HOURS,
  bucketProgress,
  courseSpecializations,
  earnedBucketProgress,
  eligibleCreditHours,
  latestAttemptEligibility,
} from "@/lib/data/specializations";
import { usePlanner } from "@/lib/store/planner-store";
import { cn } from "@/lib/utils";
import { PlusIcon, TrashIcon, SearchIcon, CheckIcon } from "@/components/icons";
import {
  planningTerms,
  visiblePlanningTerms,
  TERM_ORDER,
  type PlanningTerm,
} from "@/lib/data/planning-terms";
import { OfferingNote } from "./offering-note";
import { useCurrentTermKey } from "@/lib/store/current-term";
import { PlanSyncPanel } from "./plan-sync-panel";
import { CompletedCourses } from "./completed-courses";

const UNSCHEDULED = "unassigned";

export function PlannerClient({ initialTermKey }: { initialTermKey: string }) {
  const {
    plan,
    attempts,
    add,
    remove,
    clear,
    has,
    selectedSpec,
    setSelectedSpec,
  } = usePlanner();
  const currentTermKey = useCurrentTermKey(initialTermKey);
  const windowTerms = planningTerms(currentTermKey);
  const currentYear = windowTerms[0].year;
  const [earlierYear, setEarlierYear] = React.useState<number>();
  const terms = visiblePlanningTerms(
    Object.keys(plan),
    earlierYear,
    currentTermKey,
  );
  const [picker, setPicker] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  const allPicked = Object.values(plan).flat();
  const plannedIds = React.useMemo(() => new Set(allPicked), [allPicked]);
  const unscheduled = plan[UNSCHEDULED] ?? [];
  const totalHours = [...plannedIds].reduce(
    (sum, id) => sum + (COURSES_BY_ID[id]?.credits ?? 0),
    0,
  );

  const spec = SPECIALIZATIONS.find((s) => s.id === selectedSpec);
  const progress = spec ? bucketProgress(spec, plannedIds) : null;
  const earned = spec ? earnedBucketProgress(spec, attempts) : null;
  const earnedCourseIds = React.useMemo(
    () => latestAttemptEligibility(attempts).degreeIds,
    [attempts],
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <PlanSyncPanel />
      <div>
        <h2 className="font-display text-2xl tracking-tight">
          Intended Courses
        </h2>
        <SpecSelector
          selected={selectedSpec}
          onSelect={setSelectedSpec}
          plannedIds={plannedIds}
        />

        <SummaryStrip
          courses={plannedIds.size}
          hours={totalHours}
          required={
            spec
              ? `${progress?.matchedFulfilled ?? 0}/${progress?.requiredFulfilled ?? 0}`
              : undefined
          }
          onClear={clear}
        />
        {spec && progress && earned && (
          <section
            aria-label="Planned and earned progress"
            className="mt-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <h3 className="font-medium">Current-catalog progress guidance</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="label">Intended</p>
                <p className="tabular">
                  {progress.degreeHours}/{spec.totalHours} credit hours ·{" "}
                  {progress.matchedFulfilled}/{progress.requiredFulfilled}{" "}
                  specialization slots · {progress.freeElectivesUsed}/
                  {spec.freeElectiveCount} free electives
                </p>
              </div>
              <div>
                <p className="label">Earned from latest attempts</p>
                <p className="tabular">
                  {earned.degreeHours}/{spec.totalHours} credit hours ·{" "}
                  {earned.matchedFulfilled}/{earned.requiredFulfilled}{" "}
                  specialization slots · {earned.freeElectivesUsed}/
                  {spec.freeElectiveCount} free electives
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              B or better fills specialization slots; C or better can fill free
              electives. Repeated courses count once, using the latest attempt.
              This is guidance, not an official degree audit.{" "}
              <a
                href="https://omscs.gatech.edu/degree-requirements"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Official degree requirements
              </a>{" "}
              ·{" "}
              <a
                href="https://catalog.gatech.edu/programs/computer-science-ms/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Georgia Tech catalog
              </a>{" "}
              · checked {spec.lastChecked}.
            </p>
          </section>
        )}
        {!spec && (
          <section
            aria-label="Planned and earned progress"
            className="mt-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <h3 className="font-medium">Current-catalog credit guidance</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="label">Intended</p>
                <p className="tabular">
                  {eligibleCreditHours(plannedIds)}/{DEGREE_REQUIREMENT_HOURS}{" "}
                  potentially eligible credit hours
                </p>
              </div>
              <div>
                <p className="label">Earned from latest attempts</p>
                <p className="tabular">
                  {eligibleCreditHours(earnedCourseIds)}/
                  {DEGREE_REQUIREMENT_HOURS} C-or-better credit hours
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pick a specialization to see its requirements and free-elective
              slots. This is guidance, not an official degree audit.{" "}
              <a
                href="https://omscs.gatech.edu/degree-requirements"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Official degree requirements
              </a>{" "}
              ·{" "}
              <a
                href="https://catalog.gatech.edu/programs/computer-science-ms/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Georgia Tech catalog
              </a>{" "}
              · checked 2026-09-26.
            </p>
          </section>
        )}

        {unscheduled.length > 0 && (
          <UnscheduledPanel
            ids={unscheduled}
            specId={spec?.id ?? null}
            terms={windowTerms}
            onAssign={(id, key) => add(key, id)}
            onRemove={(id) => remove(UNSCHEDULED, id)}
          />
        )}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">Planning window</p>
            <p className="text-sm text-muted-foreground">
              {windowTerms[0].term} {windowTerms[0].year}–{windowTerms[17].term}{" "}
              {windowTerms[17].year} · 18 terms
            </p>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Window rolls after typical exam weeks; exact dates vary. Confirmed
              means a dated online section in OSCAR. Typically offered comes
              from course history, not a guarantee. No matching evidence does
              not prove a course is unavailable.
            </p>
          </div>
          <label className="text-xs text-muted-foreground">
            View earlier year{" "}
            <select
              aria-label="View earlier year"
              value={earlierYear ?? ""}
              onChange={(event) =>
                setEarlierYear(
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
              className="ml-2 rounded-md border border-border bg-background px-2 py-1"
            >
              <option value="">Choose year</option>
              {Array.from(
                { length: currentYear - 2013 },
                (_, index) => currentYear - index,
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map(({ term, year, key }) => {
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
                    {ids.length} ·{" "}
                    {ids.reduce(
                      (sum, id) => sum + (COURSES_BY_ID[id]?.credits ?? 0),
                      0,
                    )}{" "}
                    hr
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
                        <div className="min-w-0 flex-1 text-sm">
                          <Link
                            href={`/courses/${c.id}`}
                            className="hover:underline"
                          >
                            <span className="text-xs text-muted-foreground">
                              {c.code}
                            </span>{" "}
                            <span>{c.title}</span>
                          </Link>
                          <OfferingNote courseId={id} termKey={key} />
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
                                ? "Core option"
                                : role === "bucket"
                                  ? "Bucket"
                                  : "Free"}
                            </span>
                          )}
                        </div>
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
                  className="border-t border-border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
                >
                  <PlusIcon size={12} className="-mt-0.5 mr-1 inline" /> Add
                  course
                </button>
                {picker === key && (
                  <CoursePicker
                    term={term}
                    termKey={key}
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
        <CompletedCourses currentTermKey={currentTermKey} />
      </div>

      <aside className="self-start xl:sticky xl:top-[80px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="label">Plan health</div>
          <Health courses={allPicked.length} />
        </div>
        {spec && progress && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="label">{spec.name} planned slots</div>
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
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Current-catalog guidance · Last checked {spec.lastChecked}.{" "}
              <a
                href={spec.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Official specialization rules
              </a>
              . This plan does not establish earned credit or degree completion;
              check your applicable catalog and Degree Works audit.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              At most six combined 4000-level or non-CS/CSE hours can count. To
              continue after the first 12 months, complete two foundational
              courses with B or better; see the{" "}
              <a
                href="https://omscs.gatech.edu/current-courses"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                current-course list
              </a>
              .
            </p>
            {progress.limitedCreditHours > progress.limitedCreditLimit && (
              <p role="status" className="mt-2 text-xs text-rose">
                {progress.limitedCreditHours} combined 4000-level/non-CS/CSE
                hours planned; only {progress.limitedCreditLimit} hours count in
                this guidance.
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function roleInSpec(
  specId: string | null | undefined,
  courseId: string,
): "required" | "bucket" | "free" | null {
  if (!specId) return null;
  const spec = SPECIALIZATIONS.find((s) => s.id === specId);
  if (!spec) return null;
  const role = courseSpecializations(courseId).find(
    (entry) => entry.id === spec.id,
  )?.role;
  return role === "core" ? "required" : role === "elective" ? "bucket" : "free";
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
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground",
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
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground",
              )}
            >
              {s.name.replace(" & Robotics", "")}
              <span className="tabular ml-1 opacity-70">{matched}</span>
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
  required,
  onClear,
}: {
  courses: number;
  hours: number;
  required?: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 sm:grid-cols-4">
      <Stat label="Courses" value={String(courses)} />
      <Stat
        label="Credit hours"
        value={String(hours)}
        unit={`/${DEGREE_REQUIREMENT_HOURS}`}
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
      <div className="tabular font-display text-xl text-foreground">
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

function Health({ courses }: { courses: number }) {
  const remaining = Math.max(0, 10 - courses);
  return (
    <div className="mt-3 space-y-3">
      <Bar
        label="Courses"
        value={(courses / 10) * 100}
        note={`${courses} / 10`}
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
  terms,
  onAssign,
  onRemove,
}: {
  ids: string[];
  specId: string | null;
  terms: PlanningTerm[];
  onAssign: (courseId: string, termKey: string) => void;
  onRemove: (courseId: string) => void;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-leaf/40 bg-leaf/[0.04]">
      <header className="flex items-baseline justify-between gap-3 border-b border-leaf/30 bg-leaf/[0.06] px-4 py-2.5">
        <div>
          <div className="text-sm font-medium text-foreground">
            Unscheduled
            <span className="tabular ml-2 text-xs text-muted-foreground">
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
              terms={terms}
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
  terms,
  onAssign,
  onRemove,
}: {
  course: {
    id: string;
    code: string;
    title: string;
  };
  role: "required" | "bucket" | "free" | null;
  terms: PlanningTerm[];
  onAssign: (termKey: string) => void;
  onRemove: () => void;
}) {
  const [term, setTerm] = React.useState<Term>(terms[0].term);
  const [year, setYear] = React.useState(String(terms[0].year));
  const years = terms
    .filter((choice) => choice.term === term)
    .map((choice) => String(choice.year));
  const selectedYear = years.includes(year) ? year : years[0];

  return (
    <li className="grid items-center gap-3 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 truncate">
        <Link href={`/courses/${course.id}`} className="hover:underline">
          <span className="text-xs text-muted-foreground">{course.code}</span>{" "}
          <span className="text-foreground">{course.title}</span>
        </Link>
        {role && (
          <span
            className={cn(
              "ml-2 inline-block rounded-full px-1.5 py-px align-middle text-[10px] font-medium",
              role === "required"
                ? "bg-leaf/12 text-leaf"
                : role === "bucket"
                  ? "bg-muted text-muted-foreground"
                  : "bg-rose/12 text-rose",
            )}
          >
            {role === "required"
              ? "Core option"
              : role === "bucket"
                ? "Bucket"
                : "Free"}
          </span>
        )}
        <OfferingNote
          courseId={course.id}
          termKey={`${term}-${selectedYear}`}
        />
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
          {TERM_ORDER.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={selectedYear}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAssign(`${term}-${selectedYear}`)}
          className="rounded-md bg-leaf px-3 py-1 text-xs text-leaf-fg hover:opacity-90"
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
  termKey,
  q,
  setQ,
  onPick,
  has,
}: {
  term: "Fall" | "Spring" | "Summer";
  termKey: string;
  q: string;
  setQ: (s: string) => void;
  onPick: (id: string) => void;
  has: (id: string) => string | null;
}) {
  const ql = q.trim().toLowerCase();
  const matches = COURSES.filter((c) => {
    if (!ql) return true;
    return courseMatchesSearch(c, ql);
  }).slice(0, 16);

  return (
    <div className="border-t border-border bg-background p-2">
      <p className="mb-2 text-xs text-muted-foreground">
        Current Courses only. Availability varies by term; check evidence before
        choosing.
      </p>
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
                  "group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted dark:hover:bg-leaf dark:hover:text-black",
                  planned && "opacity-50",
                )}
              >
                <span className="truncate">
                  <span className="text-xs text-muted-foreground dark:group-hover:text-black">
                    {c.code}
                  </span>{" "}
                  {c.title}
                  <OfferingNote
                    courseId={c.id}
                    termKey={termKey}
                    showLink={false}
                  />
                </span>
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
