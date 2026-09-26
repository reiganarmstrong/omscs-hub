import type { Course } from "@/lib/types"

export function CourseFacts({
  course,
  compact = false,
}: {
  course: Course
  compact?: boolean
}) {
  return (
    <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <p>{course.credits} credit hours · Current OMSCS course</p>
      <p className={compact ? "mt-1 line-clamp-2" : "mt-1"}>
        Prerequisites and suggested preparation:{" "}
        {course.prereqs.join(" ") ||
          "Unverified. Check the official course page."}
      </p>
      <p className="mt-1">
        Last checked{" "}
        <time dateTime={course.lastChecked}>{course.lastChecked}</time>
      </p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <a
          className="underline underline-offset-2"
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Official course
        </a>
        <a
          className="underline underline-offset-2"
          href={course.creditsSourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Credit source
        </a>
      </div>
    </div>
  )
}
