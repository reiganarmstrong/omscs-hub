import Link from "next/link"
import { CourseFacts } from "@/components/courses/course-facts"
import type { Course } from "@/lib/types"
import { Tag, Stars } from "@/components/badges"
import {
  SPECIALIZATIONS_BY_ID,
  courseSpecializations,
} from "@/lib/data/specializations"

export function CourseCard({
  course,
  reviewStatsState,
}: {
  course: Course
  reviewStatsState: "loading" | "ready" | "unavailable"
}) {
  const s = course.stats
  const statsReady = reviewStatsState === "ready"
  const status = reviewStatsState === "loading" ? "Loading…" : "Unavailable"
  const tagSpecs = courseSpecializations(course.id).slice(0, 3)

  return (
    <article className="group fade-up relative block rounded-xl border border-border bg-card p-5 transition hover:border-foreground/30 hover:shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs tracking-wide text-muted-foreground">
          {course.code}
        </div>
        <div className="flex items-center gap-1.5">
          {statsReady && s.avgRating !== null && s.avgRating > 0 && (
            <Stars value={s.avgRating} />
          )}
          <span className="tabular text-xs text-muted-foreground">
            {statsReady
              ? s.numReviews
                ? s.avgRating !== null
                  ? s.avgRating.toFixed(1)
                  : "Unrated"
                : "No reviews"
              : status}
          </span>
        </div>
      </div>
      <h3 className="mt-1 font-display text-xl leading-snug tracking-tight group-hover:text-foreground">
        <Link
          href={`/courses/${course.id}`}
          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-leaf"
        >
          {course.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        <span className="sr-only">Official overview excerpt: </span>
        {course.description}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <Mini
          label="Difficulty"
          value={
            statsReady
              ? s.avgDifficulty !== null
                ? s.avgDifficulty.toFixed(1)
                : "Unknown"
              : status
          }
          suffix={statsReady && s.avgDifficulty !== null ? "/5" : undefined}
        />
        <Mini
          label="Workload"
          value={
            statsReady
              ? s.avgWorkload !== null
                ? s.avgWorkload.toFixed(0)
                : "Unknown"
              : status
          }
          suffix={statsReady && s.avgWorkload !== null ? "hr/wk" : undefined}
        />
        <Mini
          label="Reviews"
          value={statsReady ? s.numReviews.toString() : status}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {tagSpecs.map((sp) => (
          <Tag key={sp.id} variant={sp.role === "core" ? "leaf" : "outline"}>
            {SPECIALIZATIONS_BY_ID[sp.id]?.name?.split(" ")[0]}
            {sp.role === "core" ? " · core" : ""}
          </Tag>
        ))}
        {course.termsOffered.length === 3 && <Tag>Every term</Tag>}
      </div>
      <div className="relative z-10">
        <CourseFacts course={course} compact />
      </div>
    </article>
  )
}

function Mini({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="tabular font-display text-base text-foreground">
        {value}
        {suffix && (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
