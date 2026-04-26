import Link from "next/link";
import type { Course } from "@/lib/types";

export function CourseRow({ course }: { course: Course }) {
  const s = course.stats;
  return (
    <Link
      href={`/courses/${course.id}`}
      className="grid grid-cols-[100px_1fr_72px_72px_72px_88px] items-baseline gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted/60"
    >
      <span className="text-xs tracking-wide text-muted-foreground">
        {course.code}
      </span>
      <span className="truncate">
        <span className="font-medium text-foreground">{course.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {course.tags.slice(0, 2).join(" · ")}
        </span>
      </span>
      <span className="text-right tabular text-sm text-foreground">
        {s.avgDifficulty.toFixed(1)}
      </span>
      <span className="text-right tabular text-sm text-foreground">
        {s.avgWorkload.toFixed(0)}
      </span>
      <span className="text-right tabular text-sm text-foreground">
        {s.avgRating.toFixed(1)}
      </span>
      <span className="text-right tabular text-xs text-muted-foreground">
        {s.numReviews} reviews
      </span>
    </Link>
  );
}
