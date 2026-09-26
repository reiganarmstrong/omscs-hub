import Link from "next/link"
import { CourseFacts } from "@/components/courses/course-facts"
import type { Course } from "@/lib/types"

export function CourseRow({
  course,
  reviewStatsState,
}: {
  course: Course
  reviewStatsState: "loading" | "ready" | "unavailable"
}) {
  const s = course.stats
  const statsReady = reviewStatsState === "ready"
  const status = reviewStatsState === "loading" ? "Loading…" : "Unavailable"
  return (
    <article className="grid grid-cols-[100px_1fr_72px_72px_72px_88px] items-baseline gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted/60 dark:hover:bg-leaf">
      <span className="text-xs tracking-wide text-muted-foreground">
        {course.code}
      </span>
      <div className="min-w-0">
        <Link
          href={`/courses/${course.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {course.title}
        </Link>
        <span className="ml-2 text-xs text-muted-foreground">
          {course.tags.slice(0, 2).join(" · ")}
        </span>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          <span className="sr-only">Official overview excerpt: </span>
          {course.description}
        </p>
        <CourseFacts course={course} compact />
      </div>
      <span className="tabular text-right text-sm text-foreground">
        {statsReady
          ? s.avgDifficulty !== null
            ? s.avgDifficulty.toFixed(1)
            : "Unknown"
          : status}
      </span>
      <span className="tabular text-right text-sm text-foreground">
        {statsReady
          ? s.avgWorkload !== null
            ? s.avgWorkload.toFixed(0)
            : "Unknown"
          : status}
      </span>
      <span className="tabular text-right text-sm text-foreground">
        {statsReady
          ? s.avgRating !== null
            ? s.avgRating.toFixed(1)
            : "Unknown"
          : status}
      </span>
      <span className="tabular text-right text-xs text-muted-foreground">
        {statsReady ? `${s.numReviews} reviews` : status}
      </span>
    </article>
  )
}
