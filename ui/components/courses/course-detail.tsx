"use client";

import * as React from "react";
import Link from "next/link";
import type { Course, Term } from "@/lib/types";
import { WORKLOAD_BUCKETS } from "@/lib/types";
import { useReviews } from "@/lib/store/reviews-store";
import { aggregateStats } from "@/lib/data";
import { usePlanner } from "@/lib/store/planner-store";
import { SPECIALIZATIONS_BY_ID } from "@/lib/data/specializations";
import { DistributionChart } from "@/components/distribution-chart";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { Tag, Stars } from "@/components/badges";
import { ArrowLeft, ArrowRight, CheckIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Stats = ReturnType<typeof aggregateStats>;

const ALL_TERMS: Term[] = ["Fall", "Spring", "Summer"];

export function CourseDetail({ course }: { course: Course }) {
  const { reviewsFor, statsFor, loadCourseReviews, loadingCourseIds, reviewErrors } = useReviews();
  const reviews = reviewsFor(course.id);
  const stats = statsFor(course.id);
  const meanWLBucket = bucketIndexFor(stats.avgWorkload);
  const meanRatingIdx = clampIdx(Math.round(stats.avgRating) - 1, 0, 4);
  const meanDiffIdx = clampIdx(Math.round(stats.avgDifficulty) - 1, 0, 4);
  const reviewError = reviewErrors[course.id];
  const isReviewFallbackNotice = reviewError?.startsWith("Review API unavailable.");

  React.useEffect(() => {
    void loadCourseReviews(course.id);
  }, [course.id, loadCourseReviews]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <Crumbs course={course} />

      <header className="mt-3 grid grid-cols-12 gap-6 border-b border-border pb-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <span className="text-xs tracking-wide text-muted-foreground">
              {course.code}
            </span>
            <span className="text-xs text-muted-foreground">
              {course.credits} credit hours
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight md:text-[2.6rem]">
            {course.title}
            {course.shortTitle && (
              <span className="ml-2 text-base text-muted-foreground">
                ({course.shortTitle})
              </span>
            )}
          </h1>
          <p className="reading mt-3 max-w-3xl text-[15px] text-muted-foreground">
            {course.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {course.specializations.map((s) => (
              <Tag key={s.id} variant={s.role === "core" ? "leaf" : "outline"}>
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

      <section className="mt-10">
        <SectionHead
          title="Distributions"
          note={`${stats.numReviews} reviews — mean bin highlighted.`}
        />
        <div className="mt-5 grid grid-cols-1 gap-8 rounded-xl border border-border bg-card p-6 lg:grid-cols-3">
          <DistributionChart
            label="Difficulty"
            unit="of 5"
            bins={stats.distDifficulty}
            binLabels={["1", "2", "3", "4", "5"]}
            mean={stats.avgDifficulty}
            meanIndex={meanDiffIdx}
            accent="rose"
          />
          <DistributionChart
            label="Weekly workload"
            unit="hrs/wk"
            bins={stats.distWorkload}
            binLabels={WORKLOAD_BUCKETS.map((b) => b.label)}
            mean={stats.avgWorkload}
            meanIndex={meanWLBucket}
            accent="leaf"
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
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Block heading="Terms offered">
            <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-md border border-border">
              {ALL_TERMS.map((t) => (
                <div
                  key={t}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 text-center text-xs",
                    course.termsOffered.includes(t)
                      ? "bg-neutral-950 text-white dark:bg-white dark:text-black"
                      : "bg-card text-muted-foreground line-through",
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
              <span className="text-sm text-muted-foreground">None listed.</span>
            )}
          </Block>
          <Block heading="Counts toward">
            <ul className="mt-1 space-y-1 text-sm">
              {course.specializations.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{SPECIALIZATIONS_BY_ID[s.id]?.name}</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </section>

      <section className="mt-10">
        <SectionHead
          title={`Reviews (${reviews.length})`}
          note="OMSCentral imports are public. OMSCS Hub reviews require a verified gatech.edu account."
        />
        {loadingCourseIds.has(course.id) && (
          <p className="mt-3 text-xs text-muted-foreground">Loading review archive…</p>
        )}
        {reviewError && (
          <p
            className={cn(
              "mt-3 text-xs",
              isReviewFallbackNotice ? "text-muted-foreground" : "text-rose",
            )}
          >
            {reviewError}
          </p>
        )}

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
    <nav className="text-xs text-muted-foreground">
      <Link href="/" className="hover:text-foreground">
        Catalog
      </Link>{" "}
      / <span className="text-foreground">{course.code}</span>
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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <span className="label">At a glance</span>
        <Stars value={stats.avgRating} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Mini label="Difficulty" value={stats.avgDifficulty.toFixed(1)} unit="/5" />
        <Mini
          label="Workload"
          value={stats.avgWorkload.toFixed(0)}
          unit="hr/wk"
        />
        <Mini label="Reviews" value={String(stats.numReviews)} />
      </dl>

      <div className="mt-4 border-t border-border pt-3">
        <div className="label">Planner</div>
        {inTerm ? (
          <div className="mt-2 flex items-center justify-between rounded-md bg-leaf/12 px-3 py-2 text-leaf">
            <span className="text-sm">
              {inTerm === "unassigned"
                ? "Planned (Unscheduled)"
                : `Planned · ${inTerm.replace("-", " ")}`}
              <CheckIcon size={13} className="-mt-0.5 ml-1 inline" />
            </span>
            <button
              type="button"
              onClick={() => remove(inTerm, course.id)}
              className="text-xs underline hover:no-underline"
            >
              Remove
            </button>
          </div>
        ) : !picker ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-2 text-sm transition-colors hover:border-foreground/30 dark:border-white dark:bg-white dark:text-black"
            >
              <PlusIcon size={14} /> Schedule…
            </button>
            <button
              type="button"
              onClick={() => add("unassigned", course.id)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-2 text-sm transition-colors hover:border-foreground/30 dark:border-white dark:bg-white dark:text-black"
            >
              Add unscheduled
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <select
                value={term}
                onChange={(e) =>
                  setTerm(e.target.value as typeof termOptions[number])
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm dark:border-white dark:bg-white dark:text-black"
              >
                {termOptions.map((t) => (
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
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm dark:border-white dark:bg-white dark:text-black"
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
                className="rounded-md bg-leaf px-3 py-1.5 text-xs text-leaf-fg hover:opacity-90"
              >
                Save
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPicker(false)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-white dark:bg-white dark:text-black"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <Link
          href="/planner"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
      <span className="block label">{label}</span>
      <span className="font-display tabular text-2xl text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
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
    <div className="flex items-end justify-between border-b border-border pb-2">
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="label">{heading}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
