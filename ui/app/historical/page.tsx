import Link from "next/link"
import { HISTORICAL_COURSES } from "@/lib/data/historical"
export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl">Historical review archive</h1>
      <p className="mt-3 text-muted-foreground">
        Courses with Imported Reviews that are absent from the current OMSCS
        list. Their availability and academic facts are unverified. They are
        excluded from future Study Plan picks.
      </p>
      <ul className="mt-6 divide-y divide-border">
        {HISTORICAL_COURSES.map((course) => (
          <li key={course.id} className="py-3">
            <Link
              className="underline underline-offset-4"
              href={`/courses/${course.id}`}
            >
              {course.code} · {course.title}
            </Link>
          </li>
        ))}
      </ul>
      {!HISTORICAL_COURSES.length && (
        <p className="mt-6">
          No historical courses have been published in this archive.
        </p>
      )}
      <Link href="/" className="mt-6 inline-block underline">
        Current Catalog
      </Link>
    </main>
  )
}
