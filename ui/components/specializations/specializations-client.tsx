"use client";

import * as React from "react";
import Link from "next/link";
import {
  SPECIALIZATIONS,
  bucketProgress,
  earnedBucketProgress,
} from "@/lib/data/specializations";
import { COURSES, COURSES_BY_ID, courseMatchesSearch } from "@/lib/data";
import { usePlanner } from "@/lib/store/planner-store";
import { CheckIcon, ChevronRight, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type {
  Course,
  Specialization,
  SpecRequirement,
  Term,
} from "@/lib/types";

const UNSCHEDULED = "unassigned";

export function SpecializationsClient() {
  const { plan, attempts, add, remove, has, selectedSpec, setSelectedSpec } =
    usePlanner();
  const plannedIds = React.useMemo(
    () => new Set(Object.values(plan).flat()),
    [plan],
  );

  const toggleCourse = React.useCallback(
    (courseId: string) => {
      const term = has(courseId);
      if (term) remove(term, courseId);
      else add(UNSCHEDULED, courseId);
    },
    [add, remove, has],
  );

  const [override, setOverride] = React.useState<typeof selectedSpec>(null);
  const active = override ?? selectedSpec ?? SPECIALIZATIONS[0].id;
  const setActive = setOverride;

  const spec =
    SPECIALIZATIONS.find((s) => s.id === active) ?? SPECIALIZATIONS[0];
  const progress = React.useMemo(
    () => bucketProgress(spec, plannedIds),
    [spec, plannedIds],
  );
  const earned = React.useMemo(
    () => earnedBucketProgress(spec, attempts),
    [spec, attempts],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="pb-4">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Specializations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a path to see its current core and elective buckets. Click any
          course to add or remove it from your plan — newly added courses land
          in the planner&apos;s
          <em> Unscheduled </em>
          area, ready to assign to a semester. This is current-catalog planning
          guidance, not an official degree audit. If your catalog year differs,
          check your Degree Works audit and advisor.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <nav>
          <div className="label">Tracks</div>
          <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
            {SPECIALIZATIONS.map((s, i) => {
              const ids = new Set(
                s.requirements.flatMap((r) => r.poolCourseIds),
              );
              const matched = [...ids].filter((id) =>
                plannedIds.has(id),
              ).length;
              const isActive = s.id === spec.id;
              const isMine = s.id === selectedSpec;
              return (
                <li
                  key={s.id}
                  className={i > 0 ? "border-t border-border" : ""}
                >
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition",
                      isActive
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {s.name}
                        </span>
                        {isMine && (
                          <span className="rounded-full bg-black/10 px-1.5 py-px text-[10px] font-medium text-black dark:bg-white/12 dark:text-white">
                            mine
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-white/70 dark:text-black/65"
                            : "text-muted-foreground dark:group-hover:text-leaf-fg",
                        )}
                      >
                        {matched} planned · {s.totalCourses} total
                      </span>
                    </span>
                    {isActive && (
                      <ChevronRight
                        size={14}
                        className="text-white/70 dark:text-black/65"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div>
          <SpecHeader
            spec={spec}
            isMine={selectedSpec === spec.id}
            onPick={() => setSelectedSpec(spec.id)}
            onUnpick={() => setSelectedSpec(null)}
            prog={progress}
            earned={earned}
          />
          <div className="mt-5 space-y-4">
            {spec.requirements.map((req, idx) => (
              <RequirementBlock
                key={req.id}
                index={idx + 1}
                req={req}
                plannedIds={plannedIds}
                matchedIds={progress.byBucket[req.id]?.matched ?? []}
                onToggle={toggleCourse}
              />
            ))}
            {spec.freeElectiveCount > 0 && (
              <FreeElectiveBlock
                index={spec.requirements.length + 1}
                spec={spec}
                plannedIds={plannedIds}
                freeElectivesUsed={progress.freeElectivesUsed}
                onToggle={toggleCourse}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecHeader({
  spec,
  isMine,
  onPick,
  onUnpick,
  prog,
  earned,
}: {
  spec: Specialization;
  isMine: boolean;
  onPick: () => void;
  onUnpick: () => void;
  prog: ReturnType<typeof bucketProgress>;
  earned: ReturnType<typeof earnedBucketProgress>;
}) {
  const requiredPct =
    prog.requiredFulfilled === 0
      ? 0
      : (prog.matchedFulfilled / prog.requiredFulfilled) * 100;
  const totalPct =
    ((prog.matchedFulfilled + prog.freeElectivesUsed) / spec.totalCourses) *
    100;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">
          {spec.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{spec.blurb}</p>
        <p className="reading mt-2 max-w-2xl text-[14px] text-foreground">
          {spec.description}
        </p>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {spec.totalHours - spec.freeElectiveCount * 3} specialization hours ·{" "}
          {spec.freeElectiveCount * 3} free-elective hours · {spec.totalHours}{" "}
          total hours
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Total courses" value={String(spec.totalCourses)} />
          <Mini
            label="Required slots"
            value={`${prog.matchedFulfilled}/${prog.requiredFulfilled}`}
          />
          <Mini
            label="Free electives"
            value={`${prog.freeElectivesUsed}/${spec.freeElectiveCount}`}
          />
          <Mini
            label="Total planned"
            value={`${prog.plannedTotal}/${spec.totalCourses}`}
          />
        </div>
        <div
          aria-label="Earned progress"
          className="mt-4 border-t border-border pt-3"
        >
          <p className="label">Earned from latest attempts</p>
          <p className="tabular mt-1 text-sm">
            {earned.degreeHours}/{spec.totalHours} credit hours ·{" "}
            {earned.matchedFulfilled}/{earned.requiredFulfilled} specialization
            slots · {earned.freeElectivesUsed}/{spec.freeElectiveCount} free
            electives
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            B or better fills specialization slots. C or better can fill free
            electives. Each course counts once; later attempts replace earlier
            outcomes.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <ProgressBar
            label="Required structure"
            value={requiredPct}
            note={`${prog.matchedFulfilled} / ${prog.requiredFulfilled} slots`}
          />
          <ProgressBar
            label="Planned course slots"
            value={totalPct}
            note={`${prog.matchedFulfilled + prog.freeElectivesUsed} / ${spec.totalCourses} courses`}
            accent="leaf"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Current-catalog guidance · Last checked {spec.lastChecked} ·{" "}
          <a
            href={spec.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Official specialization rules
          </a>
          {" · "}
          <a
            href="https://omscs.gatech.edu/degree-requirements"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            OMSCS degree requirements
          </a>
          . Planned and earned progress are guidance under current rules, not
          official degree completion. Check your applicable catalog and Degree
          Works audit.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          At most six combined 4000-level or non-CS/CSE credit hours can count.
          To continue after the first 12 months, complete two foundational
          courses with B or better; see the{" "}
          <a
            href="https://omscs.gatech.edu/current-courses"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            current-course list
          </a>
          . See the{" "}
          <a
            href="https://catalog.gatech.edu/programs/computer-science-ms/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Georgia Tech catalog
          </a>{" "}
          for the combined credit limit.
        </p>
        {prog.limitedCreditHours > prog.limitedCreditLimit && (
          <p role="status" className="mt-2 text-xs text-rose">
            {prog.limitedCreditHours} combined 4000-level/non-CS/CSE hours
            planned; only {prog.limitedCreditLimit} hours count in the slot
            guidance above.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {isMine ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/12 px-3 py-1 text-xs font-medium text-leaf">
              <CheckIcon size={12} /> Selected as your track
            </span>
            <button
              type="button"
              onClick={onUnpick}
              className="text-xs text-muted-foreground hover:text-rose"
            >
              Clear selection
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90"
          >
            Pick this track
          </button>
        )}
      </div>
    </div>
  );
}

function RequirementBlock({
  index,
  req,
  plannedIds,
  matchedIds,
  onToggle,
}: {
  index: number;
  req: SpecRequirement;
  plannedIds: Set<string>;
  matchedIds: string[];
  onToggle: (id: string) => void;
}) {
  const filled = matchedIds.length;
  const fulfilled = filled >= req.pick;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="tabular text-xs text-muted-foreground">
            #{String(index).padStart(2, "0")}
          </span>
          <h3 className="font-display text-lg tracking-tight">{req.label}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "tabular text-sm",
              fulfilled ? "text-leaf" : "text-muted-foreground",
            )}
          >
            {filled} / {req.pick}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              fulfilled
                ? "bg-leaf/12 text-leaf"
                : "bg-muted text-muted-foreground",
            )}
          >
            {fulfilled ? "Planned" : "Open"}
          </span>
        </div>
      </header>
      {req.notes && (
        <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          {req.notes}
        </p>
      )}
      <CourseTableHeader />
      <ul className="divide-y divide-border">
        {req.poolCourseIds.map((id) => {
          const c = COURSES_BY_ID[id];
          if (!c) return null;
          return (
            <CourseRow
              key={id}
              course={c}
              planned={plannedIds.has(id)}
              onToggle={() => onToggle(id)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function FreeElectiveBlock({
  index,
  spec,
  plannedIds,
  freeElectivesUsed,
  onToggle,
}: {
  index: number;
  spec: Specialization;
  plannedIds: Set<string>;
  freeElectivesUsed: number;
  onToggle: (id: string) => void;
}) {
  const count = spec.freeElectiveCount;
  // Courses in a specialization bucket remain free-elective eligible if not
  // used there, but appear only once in this browser.
  const candidates = React.useMemo(() => {
    const bucketIds = new Set(
      spec.requirements.flatMap((req) => req.poolCourseIds),
    );
    return COURSES.filter((course) => !bucketIds.has(course.id)).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [spec]);
  const filled = freeElectivesUsed;
  const fulfilled = filled >= count;

  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const filteredCandidates = candidates.filter((c) => {
    if (!ql) return true;
    return courseMatchesSearch(c, ql);
  });

  return (
    <section className="overflow-hidden rounded-lg border border-dashed border-border bg-card/60">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="tabular text-xs text-muted-foreground">
            #{String(index).padStart(2, "0")}
          </span>
          <h3 className="font-display text-lg tracking-tight">
            Pick {count} free electives
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "tabular text-sm",
              fulfilled ? "text-leaf" : "text-muted-foreground",
            )}
          >
            {filled} / {count}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              fulfilled
                ? "bg-leaf/12 text-leaf"
                : "bg-muted text-muted-foreground",
            )}
          >
            {fulfilled ? "Planned" : "Open"}
          </span>
        </div>
      </header>
      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        Any current OMSCS course not used in a specialization slot may count as
        a free elective, including unused courses listed above. Courses listed
        above appear only in their buckets. Check degree requirements for credit
        limits.
      </p>
      <div className="border-b border-border px-4 py-2">
        <div className="relative">
          <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">
            <SearchIcon size={13} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search free-elective candidates by code, title, or tag…"
            className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-8 text-sm focus:border-foreground/40 focus:outline-none"
          />
        </div>
      </div>

      <CourseTableHeader />
      <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
        {filteredCandidates.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            No candidates match.
          </li>
        )}
        {filteredCandidates.map((c) => (
          <CourseRow
            key={c.id}
            course={c}
            planned={plannedIds.has(c.id)}
            onToggle={() => onToggle(c.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function CourseTableHeader() {
  return (
    <div className="hidden border-b border-border px-4 py-1.5 text-[11px] text-muted-foreground md:grid md:grid-cols-[24px_84px_minmax(0,1fr)_72px] md:items-baseline md:gap-3">
      <span></span>
      <span>Code</span>
      <span>Title</span>
      <span>Terms</span>
    </div>
  );
}

function CourseRow({
  course,
  planned,
  onToggle,
}: {
  course: Course;
  planned: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "grid items-baseline gap-2 px-4 py-2 text-sm",
        "grid-cols-[24px_minmax(0,1fr)] sm:grid-cols-[24px_84px_minmax(0,1fr)]",
        "md:grid-cols-[24px_84px_minmax(0,1fr)_72px] md:gap-3",
        planned && "bg-leaf/[0.06]",
      )}
    >
      <button
        type="button"
        aria-label={planned ? "Remove from plan" : "Add to plan"}
        aria-pressed={planned}
        onClick={onToggle}
        className={cn(
          "grid size-4 place-items-center rounded-sm border transition",
          planned
            ? "border-leaf bg-leaf text-leaf-fg"
            : "border-border hover:border-leaf/60",
        )}
      >
        {planned && <CheckIcon size={11} />}
      </button>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {course.code}
      </span>
      <Link
        href={`/courses/${course.id}`}
        className={cn(
          "truncate hover:underline",
          planned && "font-medium text-foreground",
        )}
      >
        <span className="text-xs text-muted-foreground sm:hidden">
          {course.code} ·{" "}
        </span>
        {course.title}
      </Link>
      <span className="hidden justify-start gap-0.5 md:flex">
        <TermBadges terms={course.termsOffered} />
      </span>
    </li>
  );
}

function TermBadges({ terms }: { terms: Term[] }) {
  const all: Term[] = ["Fall", "Spring", "Summer"];
  const labels: Record<Term, string> = {
    Fall: "Fa",
    Spring: "Sp",
    Summer: "Su",
  };
  return (
    <span className="inline-flex items-baseline gap-0.5">
      {terms.length === 0 && (
        <span
          title="Future term availability unverified"
          className="text-[10px] text-muted-foreground"
        >
          Unverified
        </span>
      )}
      {terms.length > 0 &&
        all.map((t) => (
          <span
            key={t}
            title={`${t}${terms.includes(t) ? "" : " — not offered"}`}
            className={cn(
              "inline-flex h-4 w-6 items-center justify-center rounded-sm border text-[10px] font-medium",
              terms.includes(t)
                ? "border-leaf bg-leaf text-leaf-fg"
                : "border-border bg-transparent text-muted-foreground/45",
            )}
          >
            {labels[t]}
          </span>
        ))}
    </span>
  );
}

function ProgressBar({
  label,
  value,
  note,
  accent = "ink",
}: {
  label: string;
  value: number;
  note: string;
  accent?: "ink" | "leaf";
}) {
  const color = accent === "leaf" ? "var(--leaf)" : "var(--foreground)";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular">{note}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(100, value)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="tabular font-display text-xl text-foreground">
        {value}
      </div>
    </div>
  );
}
