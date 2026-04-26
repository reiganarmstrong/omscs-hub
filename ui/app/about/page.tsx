import Link from "next/link";

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-8 pb-16">
      <header className="pb-3">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          About OMSCS Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What this is, where the data comes from, and what&apos;s next.
        </p>
      </header>

      <div className="mt-6 space-y-6 reading text-[15px]">
        <p>
          OMSCS Hub is an unofficial catalog and degree planner for Georgia
          Tech&apos;s Online Master of Science in Computer Science. It exists to
          fold the two best community resources for the program — the{" "}
          <a
            className="underline decoration-dotted underline-offset-4"
            href="https://omscscourseplanner.com/"
            target="_blank"
            rel="noreferrer"
          >
            OMSCS Course Planner
          </a>{" "}
          and{" "}
          <a
            className="underline decoration-dotted underline-offset-4"
            href="https://www.omscentral.com/"
            target="_blank"
            rel="noreferrer"
          >
            OMSCentral
          </a>{" "}
          — into a single, more navigable surface.
        </p>

        <section>
          <h2 className="font-display text-xl tracking-tight">What it does</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>One catalog with reviews, distributions, and term offerings per course.</li>
            <li>Filtering and sorting that scale from novice to power user.</li>
            <li>A planner that knows when each course actually runs.</li>
            <li>A submission flow that does not require an account.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl tracking-tight">Status</h2>
          <p className="mt-2 text-muted-foreground">
            This is the front-end prototype. Reviews you submit are stored in
            your browser only. The seed data (courses and reviews) is
            synthetic — realistic in shape, but not pulled from real students.
            A back-end and an anonymous submission API are next.
          </p>
        </section>

        <p className="text-muted-foreground">
          <Link href="/" className="underline decoration-dotted underline-offset-4">
            ← Back to the catalog
          </Link>
        </p>
      </div>
    </div>
  );
}
