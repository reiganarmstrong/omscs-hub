"use client";

import * as React from "react";
import Link from "next/link";
import {
  SPECIALIZATIONS,
  bucketProgress,
} from "@/lib/data/specializations";
import { COURSES_BY_ID } from "@/lib/data";
import { usePlanner } from "@/lib/store/planner-store";
import { usePrefs } from "@/lib/store/prefs-store";
import { CheckIcon, ChevronRight } from "@/components/icons";
import { Stars } from "@/components/badges";
import { cn } from "@/lib/utils";
import type { Specialization, SpecRequirement } from "@/lib/types";

export function SpecializationsClient() {
  const { plan } = usePlanner();
  const { selectedSpec, setSelectedSpec } = usePrefs();
  const plannedIds = React.useMemo(
    () => new Set(Object.values(plan).flat()),
    [plan],
  );

  // Local override lets the user browse a different track without changing
  // their saved selection. When no override is set, the active view follows
  // the saved track (or the first track as a fallback).
  const [override, setOverride] = React.useState<typeof selectedSpec>(null);
  const active = override ?? selectedSpec ?? SPECIALIZATIONS[0].id;
  const setActive = setOverride;

  const spec = SPECIALIZATIONS.find((s) => s.id === active) ?? SPECIALIZATIONS[0];

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-6 pb-16">
      <header className="border-b border-ink/15 pb-3">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Specializations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a track to see its required core, foundational pool, and elective
          buckets. Courses you&apos;ve added to your planner are checked off.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <nav>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Tracks
          </div>
          <ul className="mt-2 divide-y divide-ink/12 border-y border-ink/12">
            {SPECIALIZATIONS.map((s) => {
              const ids = new Set(s.requirements.flatMap((r) => r.poolCourseIds));
              const matched = [...ids].filter((id) => plannedIds.has(id)).length;
              const isActive = s.id === spec.id;
              const isMine = s.id === selectedSpec;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 py-2.5 pr-2 pl-2 text-left transition",
                      isActive ? "bg-ink/5" : "hover:bg-ink/3",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{s.name}</span>
                        {isMine && (
                          <span className="rounded-full bg-gold px-1.5 py-px font-mono text-[9px] tracking-widest text-gold-fg uppercase">
                            mine
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        {matched} planned · {s.totalCourses} total
                      </span>
                    </span>
                    {isActive && <ChevronRight size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Tip
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Setting a track here is the same setting used by the planner.
            Switch any time without losing your plan.
          </p>
        </nav>

        <div>
          <SpecHeader
            spec={spec}
            isMine={selectedSpec === spec.id}
            onPick={() => setSelectedSpec(spec.id)}
            onUnpick={() => setSelectedSpec(null)}
            plannedIds={plannedIds}
          />
          <div className="mt-6 space-y-5">
            {spec.requirements.map((req, idx) => (
              <RequirementBlock
                key={req.id}
                index={idx + 1}
                req={req}
                plannedIds={plannedIds}
              />
            ))}
            {spec.freeElectiveCount > 0 && (
              <FreeElectiveBlock
                index={spec.requirements.length + 1}
                count={spec.freeElectiveCount}
                spec={spec}
                plannedIds={plannedIds}
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
  const requiredPct = (prog.matchedFulfilled / prog.requiredFulfilled) * 100;
  const totalPct = ((prog.matchedFulfilled + prog.freeElectivesUsed) / spec.totalCourses) * 100;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border border-ink/15 bg-card p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-3xl tracking-tight">{spec.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{spec.blurb}</p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed">
          {spec.description}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Total courses" value={String(spec.totalCourses)} />
          <Mini
            label="Required buckets"
            value={`${prog.matchedFulfilled}/${prog.requiredFulfilled}`}
          />
          <Mini
            label="Free electives used"
            value={`${prog.freeElectivesUsed}/${spec.freeElectiveCount}`}
          />
          <Mini
            label="Total planned"
            value={`${prog.plannedTotal}/${spec.totalCourses}`}
          />
        </div>
        <div className="mt-3 space-y-2">
          <ProgressBar
            label="Required structure"
            value={requiredPct}
            note={`${prog.matchedFulfilled} / ${prog.requiredFulfilled} bucket slots filled`}
          />
          <ProgressBar
            label="Degree progress"
            value={totalPct}
            note={`${prog.matchedFulfilled + prog.freeElectivesUsed} / ${spec.totalCourses} courses`}
            accent="gold"
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        {isMine ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 font-mono text-[10px] tracking-widest text-gold-fg uppercase">
              <CheckIcon size={12} /> Selected as your track
            </span>
            <button
              type="button"
              onClick={onUnpick}
              className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-claret"
            >
              Clear selection
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-mono text-[11px] tracking-widest text-paper uppercase hover:bg-claret"
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
}: {
  index: number;
  req: SpecRequirement;
  plannedIds: Set<string>;
}) {
  const matched = req.poolCourseIds.filter((id) => plannedIds.has(id));
  const filled = Math.min(matched.length, req.pick);
  const fulfilled = filled >= req.pick;

  return (
    <section className="border border-ink/15 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-ink/15 px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            #{String(index).padStart(2, "0")}
          </span>
          <h3 className="font-display text-xl tracking-tight">{req.label}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "font-mono text-[11px] tabular tracking-widest uppercase",
              fulfilled ? "text-gold-fg" : "text-muted-foreground",
            )}
          >
            {filled} / {req.pick}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase",
              fulfilled ? "bg-gold text-gold-fg" : "bg-ink/8 text-muted-foreground",
            )}
          >
            {fulfilled ? "Fulfilled" : req.required ? "Required" : "Pending"}
          </span>
        </div>
      </header>
      {req.notes && (
        <p className="border-b border-ink/10 px-4 py-2 text-[12px] text-muted-foreground">
          {req.notes}
        </p>
      )}
      <ul className="divide-y divide-ink/10">
        {req.poolCourseIds.map((id) => {
          const c = COURSES_BY_ID[id];
          if (!c) return null;
          const planned = plannedIds.has(id);
          return (
            <li
              key={id}
              className="grid grid-cols-[28px_90px_1fr_72px_72px] items-baseline gap-3 px-4 py-2 text-sm"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 place-items-center rounded-[2px] border border-ink/30",
                  planned && "bg-ink text-paper border-ink",
                )}
              >
                {planned && <CheckIcon size={12} />}
              </span>
              <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                {c.code}
              </span>
              <Link
                href={`/courses/${c.id}`}
                className={cn("flex-1 truncate hover:underline", planned && "font-medium")}
              >
                {c.title}
              </Link>
              <span className="text-right font-mono tabular text-[11px] text-muted-foreground">
                ★{c.stats.avgRating.toFixed(1)}
              </span>
              <span className="text-right font-mono tabular text-[11px] text-muted-foreground">
                {c.stats.avgWorkload.toFixed(0)} hr
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FreeElectiveBlock({
  index,
  count,
  spec,
  plannedIds,
}: {
  index: number;
  count: number;
  spec: Specialization;
  plannedIds: Set<string>;
}) {
  const bucketIds = new Set(spec.requirements.flatMap((r) => r.poolCourseIds));
  const used = [...plannedIds].filter((id) => !bucketIds.has(id));
  const filled = Math.min(used.length, count);
  const fulfilled = filled >= count;

  return (
    <section className="border border-dashed border-ink/30 bg-card/50">
      <header className="flex items-center justify-between gap-3 border-b border-ink/15 px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            #{String(index).padStart(2, "0")}
          </span>
          <h3 className="font-display text-xl tracking-tight">
            Pick {count} free electives
          </h3>
        </div>
        <span
          className={cn(
            "font-mono text-[11px] tabular tracking-widest uppercase",
            fulfilled ? "text-gold-fg" : "text-muted-foreground",
          )}
        >
          {filled} / {count}
        </span>
      </header>
      <p className="px-4 py-2 text-[12px] text-muted-foreground">
        Any approved 6XXX/7XXX/8XXX OMSCS course outside the buckets above.
        Common choices: ML4T, DVA, AI Ethics, HCI, Educational Technology, Game
        Design.
      </p>
      <ul className="px-4 pb-3">
        {used.length === 0 ? (
          <li className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            No free electives planned yet.
          </li>
        ) : (
          used.slice(0, count).map((id) => {
            const c = COURSES_BY_ID[id];
            if (!c) return null;
            return (
              <li key={id} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                <span className="flex items-baseline gap-2 truncate">
                  <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    {c.code}
                  </span>
                  <Link
                    href={`/courses/${c.id}`}
                    className="truncate hover:underline"
                  >
                    {c.title}
                  </Link>
                </span>
                <Stars value={c.stats.avgRating} />
              </li>
            );
          })
        )}
      </ul>
    </section>
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
  accent?: "ink" | "gold";
}) {
  const color = accent === "gold" ? "var(--gold)" : "var(--ink)";
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>{label}</span>
        <span>{note}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-ink/10">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-ink/15 pl-2">
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-display tabular text-xl">{value}</div>
    </div>
  );
}
