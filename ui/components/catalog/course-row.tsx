import Link from "next/link";
import type { Course } from "@/lib/types";
import { Tag } from "@/components/badges";

export function CourseRow({ course }: { course: Course }) {
  const s = course.stats;
  return (
    <Link
      href={`/courses/${course.id}`}
      className="grid grid-cols-[100px_1fr_72px_72px_72px_120px] items-baseline gap-3 border-t border-ink/12 px-2 py-3 text-sm transition hover:bg-ink/5"
    >
      <span className="font-mono text-[11px] tracking-widest uppercase">
        {course.code}
      </span>
      <span className="truncate">
        <span className="font-display text-base">{course.title}</span>
        <span className="ml-2 font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          {course.tags.slice(0, 2).join(" · ")}
        </span>
      </span>
      <span className="text-right font-mono tabular text-sm">
        {s.avgDifficulty.toFixed(1)}
      </span>
      <span className="text-right font-mono tabular text-sm">
        {s.avgWorkload.toFixed(0)}
      </span>
      <span className="text-right font-mono tabular text-sm">
        {s.avgRating.toFixed(1)}
      </span>
      <span className="flex items-center justify-end gap-1">
        <Tag>{s.numReviews} reviews</Tag>
      </span>
    </Link>
  );
}
