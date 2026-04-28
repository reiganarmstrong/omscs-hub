"use client"

import * as React from "react"
import type {
  CatalogFilter,
  SpecializationId,
  Term,
  CourseRole,
} from "@/lib/types"
import { SPECIALIZATIONS } from "@/lib/data/specializations"
import { cn } from "@/lib/utils"
import { XIcon } from "@/components/icons"
import { Slider } from "@/components/ui/slider"

type Props = {
  filter: CatalogFilter
  setFilter: React.Dispatch<React.SetStateAction<CatalogFilter>>
  count: number
  total: number
}

const TERMS: Term[] = ["Fall", "Spring", "Summer"]
const ROLES: { v: CourseRole | "any"; label: string }[] = [
  { v: "any", label: "Any role" },
  { v: "core", label: "Foundational" },
  { v: "elective", label: "Elective" },
]

export function FilterRail({ filter, setFilter, count, total }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
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
    })

  return (
    <aside className="rounded-xl border border-sidebar-border bg-sidebar px-4 py-4 text-sm shadow-sm lg:sticky lg:top-[68px] lg:h-[calc(100svh-80px)] lg:overflow-y-auto">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          className="flex items-baseline gap-2 text-left lg:pointer-events-none"
        >
          <h2 className="text-base font-semibold">Filters</h2>
          <span className="text-xs text-muted-foreground lg:hidden">
            {mobileOpen ? "Hide" : "Show"}
          </span>
        </button>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        {count} of {total} courses
      </div>

      <ActiveChips filter={filter} setFilter={setFilter} />

      <div className={cn("mt-1", mobileOpen ? "block" : "hidden lg:block")}>
        <Section title="Specialization">
          <div className="flex flex-col gap-1">
            {SPECIALIZATIONS.map((s) => {
              const checked = filter.specs.includes(s.id)
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 py-0.5"
                >
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
              )
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
          <div className="flex flex-wrap gap-1">
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
            label="Difficulty"
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
            label="Workload"
            min={0}
            max={50}
            step={1}
            value={filter.workload}
            onChange={(v) => setFilter((f) => ({ ...f, workload: v }))}
          />
        </Section>

        <Section title="Rating">
          <Range
            label="Rating"
            min={1}
            max={5}
            step={0.5}
            value={filter.rating}
            onChange={(v) => setFilter((f) => ({ ...f, rating: v }))}
            format={(v) => v.toFixed(1)}
          />
        </Section>

        <Section title="Minimum reviews">
          <input
            type="number"
            min={0}
            value={filter.minReviews}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                minReviews: Number(e.target.value) || 0,
              }))
            }
            className="tabular w-24 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-foreground/40 focus:outline-none"
          />
        </Section>
      </div>
    </aside>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border py-3">
      <div className="label mb-1.5">{title}</div>
      {children}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition",
        active
          ? "border-leaf bg-leaf text-leaf-fg"
          : "border-border text-muted-foreground hover:border-leaf/60 hover:text-leaf"
      )}
    >
      {children}
    </button>
  )
}

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "grid size-4 place-items-center rounded-sm border transition",
        checked
          ? "border-leaf bg-leaf text-leaf-fg"
          : "border-border bg-background hover:border-leaf/60"
      )}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
    </button>
  )
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string
  min: number
  max: number
  step: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  format?: (v: number) => string
}) {
  const fmt = format ?? ((v: number) => String(v))
  const [lo, hi] = value

  return (
    <div>
      <div className="tabular flex items-baseline justify-between text-xs">
        <span className="text-foreground">{fmt(lo)}</span>
        <span className="text-muted-foreground">to</span>
        <span className="text-foreground">{fmt(hi)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        minStepsBetweenThumbs={1}
        thumbLabels={[
          `Minimum ${label.toLowerCase()}`,
          `Maximum ${label.toLowerCase()}`,
        ]}
        onValueChange={(next) =>
          onChange([next[0] ?? value[0], next[1] ?? value[1]])
        }
        className="mt-2"
      />
    </div>
  )
}

function ActiveChips({
  filter,
  setFilter,
}: {
  filter: CatalogFilter
  setFilter: React.Dispatch<React.SetStateAction<CatalogFilter>>
}) {
  const chips: { label: string; clear: () => void }[] = []
  filter.specs.forEach((id) => {
    const s = SPECIALIZATIONS.find((x) => x.id === id)
    if (s)
      chips.push({
        label: s.name,
        clear: () =>
          setFilter((f) => ({ ...f, specs: f.specs.filter((x) => x !== id) })),
      })
  })
  filter.terms.forEach((t) =>
    chips.push({
      label: t,
      clear: () =>
        setFilter((f) => ({ ...f, terms: f.terms.filter((x) => x !== t) })),
    })
  )
  if (filter.role !== "any")
    chips.push({
      label: filter.role,
      clear: () => setFilter((f) => ({ ...f, role: "any" })),
    })
  if (filter.q.trim())
    chips.push({
      label: `“${filter.q.trim()}”`,
      clear: () => setFilter((f) => ({ ...f, q: "" })),
    })

  if (!chips.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={c.clear}
          className="inline-flex items-center gap-1 rounded-full bg-leaf/12 px-2 py-0.5 text-xs text-leaf hover:bg-leaf hover:text-leaf-fg"
        >
          {c.label}
          <XIcon size={11} />
        </button>
      ))}
    </div>
  )
}
