import { PlannerClient } from "@/components/planner/planner-client";

export default function Page() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-6 pb-16">
      <header className="border-b border-ink/15 pb-3">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Planner
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop courses into semesters. Pick a track to track requirement
          progress alongside aggregate workload and difficulty. Your plan and
          track persist between visits.
        </p>
      </header>
      <PlannerClient />
    </div>
  );
}
