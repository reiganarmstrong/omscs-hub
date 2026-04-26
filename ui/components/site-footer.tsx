import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
        <div>
          OMSCS Hub — an unofficial catalog and planner for Georgia Tech&apos;s
          Online MS in CS.
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <a
            href="https://www.omscentral.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            OMSCentral
          </a>
          <a
            href="https://omscscourseplanner.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Course Planner
          </a>
          <a
            href="https://omscs.gatech.edu/specializations"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Official catalog
          </a>
        </div>
      </div>
    </footer>
  );
}
