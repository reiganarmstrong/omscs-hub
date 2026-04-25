import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink/15">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm">
        <div className="text-muted-foreground">
          OMSCS Hub — an unofficial catalog and planner for Georgia Tech&apos;s
          Online MS in CS.
        </div>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <a
            href="https://www.omscentral.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            OMSCentral
          </a>
          <a
            href="https://omscscourseplanner.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            OMSCS Course Planner
          </a>
          <a
            href="https://omscs.gatech.edu/specializations"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            Official catalog
          </a>
        </div>
      </div>
    </footer>
  );
}
