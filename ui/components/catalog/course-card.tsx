import Link from "next/link";
import type { Course } from "@/lib/types";
import { Tag, Stars } from "@/components/badges";
import { SPECIALIZATIONS_BY_ID } from "@/lib/data/specializations";

export function CourseCard({ course }: { course: Course }) {
  const s = course.stats;
  const tagSpecs = course.specializations.slice(0, 3);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group fade-up block rounded-xl border border-border bg-card p-5 transition hover:border-foreground/30 hover:shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs tracking-wide text-muted-foreground">
          {course.code}
        </div>
        <div className="flex items-center gap-1.5">
          <Stars value={s.avgRating} />
          <span className="text-xs tabular text-muted-foreground">
            {s.avgRating.toFixed(1)}
          </span>
        </div>
      </div>
      <h3 className="mt-1 font-display text-xl leading-snug tracking-tight group-hover:text-foreground">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {course.description}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <Mini label="Difficulty" value={s.avgDifficulty.toFixed(1)} suffix="/5" />
        <Mini label="Workload" value={s.avgWorkload.toFixed(0)} suffix="hr/wk" />
        <Mini label="Reviews" value={s.numReviews.toString()} />
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
    </Link>
  );
}

function Mini({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="font-display tabular text-base text-foreground">
        {value}
        {suffix && (
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
