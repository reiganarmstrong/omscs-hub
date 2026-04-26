import { COURSES } from "@/lib/data";
import { CatalogClient } from "@/components/catalog/catalog-client";

export default function Page() {
  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">
              OMSCS course catalog
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {COURSES.length} courses indexed. Filter, sort, and open any
              course for distributions and reviews.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Anonymous reviews — anyone can post
          </span>
        </div>
      </div>
      <CatalogClient courses={COURSES} />
    </section>
  );
}
