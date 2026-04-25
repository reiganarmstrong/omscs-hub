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
      className="group fade-up block border border-ink/15 bg-card p-5 transition hover:border-ink hover:shadow-[3px_3px_0_var(--ink)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          {course.code}
        </div>
        <div className="flex items-center gap-1">
          <Stars value={s.avgRating} />
          <span className="font-mono text-[11px] tabular text-muted-foreground">
            {s.avgRating.toFixed(1)}
          </span>
        </div>
      </div>
      <h3 className="mt-1 font-display text-2xl leading-[1.05] tracking-tight group-hover:underline">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {course.description}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ink/15 pt-3">
        <Mini label="Difficulty" value={s.avgDifficulty.toFixed(1)} suffix="/5" />
        <Mini label="Workload" value={s.avgWorkload.toFixed(0)} suffix="hr/wk" />
        <Mini label="Reviews" value={s.numReviews.toString()} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {tagSpecs.map((sp) => (
          <Tag key={sp.id} variant={sp.role === "core" ? "gold" : "outline"}>
            {SPECIALIZATIONS_BY_ID[sp.id]?.name?.split(" ")[0]}
            {" · "}
            {sp.role}
          </Tag>
        ))}
        {course.termsOffered.length === 3 && <Tag variant="default">All terms</Tag>}
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
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-display tabular text-lg">
        {value}
        {suffix && (
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
