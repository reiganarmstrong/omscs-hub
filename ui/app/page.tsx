import { COURSES } from "@/lib/data";
import { CatalogClient } from "@/components/catalog/catalog-client";

export default function Page() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-6 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">
              OMSCS course catalog
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {COURSES.length} courses indexed. Filter, sort, and open any
              course for distributions and reviews.
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Anonymous reviews · Anyone can post
          </span>
        </div>
      </div>
      <CatalogClient courses={COURSES} />
    </section>
  );
}
