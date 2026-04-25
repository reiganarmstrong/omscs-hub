"use client";

import * as React from "react";
import type { CatalogFilter, SpecializationId, Term, CourseRole } from "@/lib/types";
import { SPECIALIZATIONS } from "@/lib/data/specializations";
import { cn } from "@/lib/utils";
import { XIcon } from "@/components/icons";

type Props = {
  filter: CatalogFilter;
  setFilter: React.Dispatch<React.SetStateAction<CatalogFilter>>;
  count: number;
  total: number;
};

const TERMS: Term[] = ["Fall", "Spring", "Summer"];
const ROLES: { v: CourseRole | "any"; label: string }[] = [
  { v: "any", label: "Any role" },
  { v: "core", label: "Foundational" },
  { v: "elective", label: "Elective" },
];

export function FilterRail({ filter, setFilter, count, total }: Props) {
  const reset = () =>
    setFilter({
      q: "",
      specs: [],
      terms: [],
      difficulty: [1, 5],
      workload: [0, 50],
      rating: [1, 5],
      minReviews: 0,
      role: "any",
    });

  return (
    <aside className="sticky top-[88px] h-[calc(100svh-100px)] overflow-y-auto pr-2 text-sm">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="font-display text-2xl">Refine</h2>
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
        >
          ↻ Reset
        </button>
      </div>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mt-2">
        {count} / {total} courses match
      </div>

      <Section title="Specialization">
        <div className="flex flex-col gap-1.5">
          {SPECIALIZATIONS.map((s) => {
            const checked = filter.specs.includes(s.id);
            return (
              <label key={s.id} className="flex cursor-pointer items-center gap-2">
                <CheckBox
                  checked={checked}
                  onChange={() =>
                    setFilter((f) => ({
                      ...f,
                      specs: checked
                        ? f.specs.filter((x) => x !== s.id)
                        : [...f.specs, s.id as SpecializationId],
                    }))
                  }
                />
                <span className="text-[13px]">{s.name}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Role">
        <div className="flex flex-wrap gap-1">
          {ROLES.map((r) => (
            <Pill
              key={r.v}
              active={filter.role === r.v}
              onClick={() => setFilter((f) => ({ ...f, role: r.v }))}
            >
              {r.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Term offered">
        <div className="flex gap-1">
          {TERMS.map((t) => (
            <Pill
              key={t}
              active={filter.terms.includes(t)}
              onClick={() =>
                setFilter((f) => ({
                  ...f,
                  terms: f.terms.includes(t)
                    ? f.terms.filter((x) => x !== t)
                    : [...f.terms, t],
                }))
              }
            >
              {t}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Difficulty">
        <Range
          min={1}
          max={5}
          step={0.5}
          value={filter.difficulty}
          onChange={(v) => setFilter((f) => ({ ...f, difficulty: v }))}
          format={(v) => v.toFixed(1)}
        />
      </Section>

      <Section title="Workload (hrs/wk)">
        <Range
          min={0}
          max={50}
          step={1}
          value={filter.workload}
          onChange={(v) => setFilter((f) => ({ ...f, workload: v }))}
        />
      </Section>

      <Section title="Rating">
        <Range
          min={1}
          max={5}
          step={0.5}
          value={filter.rating}
          onChange={(v) => setFilter((f) => ({ ...f, rating: v }))}
          format={(v) => v.toFixed(1)}
        />
      </Section>

      <Section title="Min. reviews">
        <input
          type="number"
          min={0}
          value={filter.minReviews}
          onChange={(e) =>
            setFilter((f) => ({ ...f, minReviews: Number(e.target.value) || 0 }))
          }
          className="w-24 rounded-sm border border-ink/25 bg-paper px-2 py-1 font-mono text-sm tabular focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </Section>

      <ActiveChips filter={filter} setFilter={setFilter} />
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ink/12 py-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-widest uppercase transition",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/25 text-ink hover:border-ink/60",
      )}
    >
      {children}
    </button>
  );
}

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "grid size-4 place-items-center rounded-[2px] border border-ink/40 transition",
        checked ? "bg-ink text-paper border-ink" : "bg-paper",
      )}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

function Range({
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => String(v));
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[11px] tabular">
        <span>{fmt(lo)}</span>
        <span className="text-muted-foreground">to</span>
        <span>{fmt(hi)}</span>
      </div>
      <div className="relative mt-2 h-6">
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-ink/30" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-ink"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) =>
            onChange([Math.min(Number(e.target.value), hi - step), hi])
          }
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) =>
            onChange([lo, Math.max(Number(e.target.value), lo + step)])
          }
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink"
        />
      </div>
    </div>
  );
}

function ActiveChips({
  filter,
  setFilter,
}: {
  filter: CatalogFilter;
  setFilter: React.Dispatch<React.SetStateAction<CatalogFilter>>;
}) {
  const chips: { label: string; clear: () => void }[] = [];
  filter.specs.forEach((id) => {
    const s = SPECIALIZATIONS.find((x) => x.id === id);
    if (s)
      chips.push({
        label: s.name,
        clear: () =>
          setFilter((f) => ({ ...f, specs: f.specs.filter((x) => x !== id) })),
      });
  });
  filter.terms.forEach((t) =>
    chips.push({
      label: t,
      clear: () =>
        setFilter((f) => ({ ...f, terms: f.terms.filter((x) => x !== t) })),
    }),
  );
  if (filter.role !== "any")
    chips.push({
      label: filter.role,
      clear: () => setFilter((f) => ({ ...f, role: "any" })),
    });
  if (filter.q.trim())
    chips.push({
      label: `"${filter.q.trim()}"`,
      clear: () => setFilter((f) => ({ ...f, q: "" })),
    });

  if (!chips.length) return null;
  return (
    <div className="border-t border-ink/15 py-3">
      <div className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Active
      </div>
      <div className="flex flex-wrap gap-1">
        {chips.map((c, i) => (
          <button
            key={i}
            onClick={c.clear}
            className="inline-flex items-center gap-1 rounded-full border border-ink/40 bg-paper px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase hover:bg-ink hover:text-paper"
          >
            {c.label}
            <XIcon size={10} />
          </button>
        ))}
      </div>
    </div>
  );
}
