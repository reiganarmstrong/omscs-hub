"use client";

import * as React from "react";
import Link from "next/link";
import {
  SPECIALIZATIONS,
  bucketProgress,
} from "@/lib/data/specializations";
import { COURSES, COURSES_BY_ID } from "@/lib/data";
import { usePlanner } from "@/lib/store/planner-store";
import { usePrefs } from "@/lib/store/prefs-store";
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
  const { plan, add, remove, has } = usePlanner();
  const { selectedSpec, setSelectedSpec } = usePrefs();
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

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="pb-4">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Specializations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a track to see its required core, foundational pool, and
          elective buckets. Click any course to add or remove it from your
          plan — newly added courses land in the planner&apos;s
          <em> Unscheduled </em>
          area, ready to assign to a semester.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <nav>
          <div className="label">Tracks</div>
          <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
            {SPECIALIZATIONS.map((s, i) => {
              const ids = new Set(s.requirements.flatMap((r) => r.poolCourseIds));
              const matched = [...ids].filter((id) => plannedIds.has(id)).length;
              const isActive = s.id === spec.id;
              const isMine = s.id === selectedSpec;
              return (
                <li key={s.id} className={i > 0 ? "border-t border-border" : ""}>
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition",
                      isActive ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {s.name}
                        </span>
                        {isMine && (
                          <span className="rounded-full bg-leaf/12 px-1.5 py-px text-[10px] font-medium text-leaf">
                            mine
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {matched} planned · {s.totalCourses} total
                      </span>
                    </span>
                    {isActive && (
                      <ChevronRight size={14} className="text-muted-foreground" />
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
            plannedIds={plannedIds}
          />
          <div className="mt-5 space-y-4">
            {spec.requirements.map((req, idx) => (
              <RequirementBlock
                key={req.id}
                index={idx + 1}
                req={req}
                plannedIds={plannedIds}
                onToggle={toggleCourse}
              />
            ))}
            {spec.freeElectiveCount > 0 && (
              <FreeElectiveBlock
                index={spec.requirements.length + 1}
                spec={spec}
                plannedIds={plannedIds}
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
  plannedIds,
}: {
  spec: Specialization;
  isMine: boolean;
  onPick: () => void;
  onUnpick: () => void;
  plannedIds: Set<string>;
}) {
  const prog = bucketProgress(spec, plannedIds);
  const requiredPct =
    prog.requiredFulfilled === 0
      ? 0
      : (prog.matchedFulfilled / prog.requiredFulfilled) * 100;
  const totalPct =
    ((prog.matchedFulfilled + prog.freeElectivesUsed) / spec.totalCourses) * 100;

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
        <div className="mt-4 space-y-2">
          <ProgressBar
            label="Required structure"
            value={requiredPct}
            note={`${prog.matchedFulfilled} / ${prog.requiredFulfilled} slots`}
          />
          <ProgressBar
            label="Degree progress"
            value={totalPct}
            note={`${prog.matchedFulfilled + prog.freeElectivesUsed} / ${spec.totalCourses} courses`}
            accent="leaf"
          />
        </div>
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
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
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
  onToggle,
}: {
  index: number;
  req: SpecRequirement;
  plannedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const matched = req.poolCourseIds.filter((id) => plannedIds.has(id));
  const filled = Math.min(matched.length, req.pick);
  const fulfilled = filled >= req.pick;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-muted-foreground tabular">
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
            {fulfilled ? "Fulfilled" : req.required ? "Required" : "Pending"}
          </span>
        </div>
      </header>
      {req.notes && (
        <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
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
  onToggle,
}: {
  index: number;
  spec: Specialization;
  plannedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const count = spec.freeElectiveCount;
  // Eligible candidates for free electives: any course not in this spec's
  // bucket pools (the official rule allows any approved 6XXX/7XXX/8XXX).
  const candidates = React.useMemo(() => {
    const bucketIds = new Set(
      spec.requirements.flatMap((r) => r.poolCourseIds),
    );
    return COURSES.filter((c) => !bucketIds.has(c.id)).sort(
      (a, b) => b.stats.avgRating - a.stats.avgRating,
    );
  }, [spec]);
  const used = candidates.filter((c) => plannedIds.has(c.id));
  const filled = Math.min(used.length, count);
  const fulfilled = filled >= count;

  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const filteredCandidates = candidates.filter((c) => {
    if (!ql) return true;
    return `${c.code} ${c.title} ${c.tags.join(" ")}`.toLowerCase().includes(ql);
  });

  return (
    <section className="overflow-hidden rounded-lg border border-dashed border-border bg-card/60">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-muted-foreground tabular">
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
            {fulfilled ? "Fulfilled" : "Pending"}
          </span>
        </div>
      </header>
      <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Any approved 6XXX/7XXX/8XXX OMSCS course outside the buckets above.
        Pick favourites here; they&apos;ll count toward your remaining slots.
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
    <div className="hidden border-b border-border bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground md:grid md:grid-cols-[24px_84px_minmax(0,1fr)_50px_50px_60px_72px] md:items-baseline md:gap-3">
      <span></span>
      <span>Code</span>
      <span>Title</span>
      <span className="text-right">Diff</span>
      <span className="text-right">★</span>
      <span className="text-right">hr/wk</span>
      <span className="text-right">Terms</span>
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
        "md:grid-cols-[24px_84px_minmax(0,1fr)_50px_50px_60px_72px] md:gap-3",
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
            ? "border-foreground bg-foreground text-background"
            : "border-border hover:border-foreground/40",
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
        <span className="sm:hidden text-xs text-muted-foreground">
          {course.code} ·{" "}
        </span>
        {course.title}
      </Link>
      <span className="hidden text-right tabular text-xs text-muted-foreground md:inline">
        {course.stats.avgDifficulty.toFixed(1)}
      </span>
      <span className="hidden text-right tabular text-xs text-muted-foreground md:inline">
        {course.stats.avgRating.toFixed(1)}
      </span>
      <span className="hidden text-right tabular text-xs text-muted-foreground md:inline">
        {course.stats.avgWorkload.toFixed(0)}
      </span>
      <span className="hidden justify-end gap-0.5 text-right md:flex">
        <TermBadges terms={course.termsOffered} />
      </span>
    </li>
  );
}

function TermBadges({ terms }: { terms: Term[] }) {
  const all: Term[] = ["Fall", "Spring", "Summer"];
  return (
    <span className="inline-flex items-baseline gap-0.5">
      {all.map((t) => (
        <span
          key={t}
          title={`${t}${terms.includes(t) ? "" : " — not offered"}`}
          className={cn(
            "inline-flex h-4 w-5 items-center justify-center rounded-sm text-[10px] font-medium",
            terms.includes(t)
              ? "bg-leaf/12 text-leaf"
              : "bg-muted text-muted-foreground/60",
          )}
        >
          {t.charAt(0)}
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
      <div className="font-display tabular text-xl text-foreground">{value}</div>
    </div>
  );
}
