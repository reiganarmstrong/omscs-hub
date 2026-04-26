"use client";

import * as React from "react";
import Link from "next/link";
import type { Course, Term } from "@/lib/types";
import { WORKLOAD_BUCKETS } from "@/lib/types";
import { useReviews } from "@/lib/store/reviews-store";
import { aggregateStats } from "@/lib/data";

type Stats = ReturnType<typeof aggregateStats>;
import { usePlanner } from "@/lib/store/planner-store";
import { SPECIALIZATIONS_BY_ID } from "@/lib/data/specializations";
import { DistributionChart } from "@/components/distribution-chart";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { Tag, Stars } from "@/components/badges";
import { ArrowRight, CheckIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const ALL_TERMS: Term[] = ["Fall", "Spring", "Summer"];

export function CourseDetail({ course }: { course: Course }) {
  const { reviewsFor, statsFor } = useReviews();
  const reviews = reviewsFor(course.id);
  const stats = statsFor(course.id);
  const meanWLBucket = bucketIndexFor(stats.avgWorkload);
  const meanRatingIdx = clampIdx(Math.round(stats.avgRating) - 1, 0, 4);
  const meanDiffIdx = clampIdx(Math.round(stats.avgDifficulty) - 1, 0, 4);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <Crumbs course={course} />

      <header className="mt-4 grid grid-cols-12 gap-6 border-b border-ink pb-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              {course.code}
            </span>
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {course.credits} credit hours
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight md:text-4xl">
            {course.title}
            {course.shortTitle && (
              <span className="ml-2 text-base text-muted-foreground">
                ({course.shortTitle})
              </span>
            )}
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {course.specializations.map((s) => (
              <Tag key={s.id} variant={s.role === "core" ? "gold" : "outline"}>
                {SPECIALIZATIONS_BY_ID[s.id]?.name} · {s.role}
              </Tag>
            ))}
            {course.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <SidebarSummary course={course} stats={stats} />
        </aside>
      </header>

      <section className="mt-8">
        <SectionHead
          title="Distributions"
          note={`From ${stats.numReviews} reviews — mean bin highlighted.`}
        />
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <DistributionChart
            label="Difficulty"
            unit="of 5"
            bins={stats.distDifficulty}
            binLabels={["1", "2", "3", "4", "5"]}
            mean={stats.avgDifficulty}
            meanIndex={meanDiffIdx}
            accent="claret"
          />
          <DistributionChart
            label="Weekly workload"
            unit="hrs/wk"
            bins={stats.distWorkload}
            binLabels={WORKLOAD_BUCKETS.map((b) => b.label)}
            mean={stats.avgWorkload}
            meanIndex={meanWLBucket}
            accent="gold"
          />
          <DistributionChart
            label="Overall rating"
            unit="of 5"
            bins={stats.distRating}
            binLabels={["1★", "2★", "3★", "4★", "5★"]}
            mean={stats.avgRating}
            meanIndex={meanRatingIdx}
            accent="ink"
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHead title="Logistics" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Block heading="Terms offered">
            <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-sm border border-ink/25">
              {ALL_TERMS.map((t) => (
                <div
                  key={t}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 text-center font-mono text-[10px] tracking-widest uppercase",
                    course.termsOffered.includes(t)
                      ? "bg-ink text-paper"
                      : "bg-paper text-muted-foreground line-through",
                  )}
                >
                  {t}
                  {course.termsOffered.includes(t) && (
                    <CheckIcon size={13} className="shrink-0 text-leaf" />
                  )}
                </div>
              ))}
            </div>
          </Block>
          <Block heading="Prerequisites">
            {course.prereqs.length ? (
              <ul className="mt-1 list-disc pl-4 text-sm">
                {course.prereqs.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <span className="font-mono text-[11px] text-muted-foreground tracking-widest uppercase">
                None listed
              </span>
            )}
          </Block>
          <Block heading="Counts toward">
            <ul className="mt-1 space-y-1 text-sm">
              {course.specializations.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{SPECIALIZATIONS_BY_ID[s.id]?.name}</span>
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {s.role}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </section>

      <section className="mt-10">
        <SectionHead
          title={`Reviews (${reviews.length})`}
          note="Anonymous. Sort and filter below; add your own at any time."
        />

        <div className="mt-4">
          <ReviewForm courseId={course.id} />
        </div>

        <div className="mt-4">
          <ReviewList reviews={reviews} />
        </div>
      </section>
    </div>
  );
}

function bucketIndexFor(hours: number) {
  for (let i = 0; i < WORKLOAD_BUCKETS.length; i++) {
    const b = WORKLOAD_BUCKETS[i];
    if (hours >= b.min && hours <= b.max) return i;
  }
  return WORKLOAD_BUCKETS.length - 1;
}

function clampIdx(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function Crumbs({ course }: { course: Course }) {
  return (
    <nav className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
      <Link href="/" className="hover:text-ink">
        Catalog
      </Link>{" "}
      / <span className="text-ink">{course.code}</span>
    </nav>
  );
}

function SidebarSummary({
  course,
  stats,
}: {
  course: Course;
  stats: Stats;
}) {
  const { add, remove, has } = usePlanner();
  const inTerm = has(course.id);
  const [picker, setPicker] = React.useState(false);

  const yearOptions = ["2025", "2026", "2027"];
  const termOptions = ["Fall", "Spring", "Summer"] as const;
  const [year, setYear] = React.useState(yearOptions[0]);
  const [term, setTerm] = React.useState<typeof termOptions[number]>(
    course.termsOffered[0] ?? "Fall",
  );

  return (
    <div className="border border-ink p-5 shadow-[3px_3px_0_var(--ink)]">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-2">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase">
          At a glance
        </span>
        <Stars value={stats.avgRating} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-b border-ink/15 pb-4">
        <Mini
          label="Diff"
          value={stats.avgDifficulty.toFixed(1)}
          unit="/5"
        />
        <Mini
          label="Workload"
          value={stats.avgWorkload.toFixed(0)}
          unit="hrs/wk"
        />
        <Mini label="Reviews" value={String(stats.numReviews)} />
      </dl>

      <div className="mt-3 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Planner
      </div>
      {inTerm ? (
        <div className="mt-2 flex items-center justify-between rounded-sm bg-gold px-3 py-2 text-gold-fg">
          <span className="font-mono text-[11px] tracking-widest uppercase">
            <CheckIcon size={12} className="-mt-0.5 mr-1 inline" /> Planned · {inTerm.replace("-", " ")}
          </span>
          <button
            type="button"
            onClick={() => remove(inTerm, course.id)}
            className="font-mono text-[10px] tracking-widest underline hover:no-underline"
          >
            Remove
          </button>
        </div>
      ) : !picker ? (
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-ink py-2 font-mono text-[11px] tracking-widest uppercase hover:bg-ink hover:text-paper"
        >
          <PlusIcon size={12} /> Add to planner
        </button>
      ) : (
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1">
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value as typeof termOptions[number])}
            className="rounded-sm border border-ink/25 bg-paper px-2 py-1 font-mono text-[11px]"
          >
            {termOptions.map((t) => (
              <option key={t} value={t} disabled={!course.termsOffered.includes(t)}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-sm border border-ink/25 bg-paper px-2 py-1 font-mono text-[11px]"
          >
            {yearOptions.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              add(`${term}-${year}`, course.id);
              setPicker(false);
            }}
            className="rounded-sm bg-ink px-2 py-1 font-mono text-[10px] tracking-widest text-paper uppercase"
          >
            Save
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-ink/15 pt-3">
        <Link
          href="/planner"
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
        >
          Open planner <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function Mini({
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
      <span className="block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-display tabular text-2xl">
        {value}
        {unit && (
          <span className="ml-0.5 font-mono text-[10px] text-muted-foreground tracking-widest">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function SectionHead({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-ink/30 pb-2">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      {note && (
        <span className="hidden max-w-md text-right text-xs text-muted-foreground md:inline">
          {note}
        </span>
      )}
    </div>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-ink/15 bg-card p-4">
      <div className="border-b border-ink/15 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {heading}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
