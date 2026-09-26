import manifest from "./historical-courses.json"
import { aggregateStats } from "./index"
import type { Course } from "@/lib/types"

type HistoricalEntry = {
  id: string
  code: string
  title: string
  aliases: string[]
  description: string
  sourceUrl: string
}
export const HISTORICAL_COURSES: Course[] = (manifest as HistoricalEntry[]).map(
  (course) => ({
    ...course,
    historical: true,
    credits: 0,
    creditsSourceUrl: "",
    lastChecked: "",
    descriptionStatus: "unverified",
    prerequisitesStatus: "unverified",
    foundational: false,
    prereqs: [],
    termsOffered: [],
    specializations: [],
    tags: [],
    stats: aggregateStats([]),
  })
)
export const HISTORICAL_BY_ID = Object.fromEntries(
  HISTORICAL_COURSES.map((course) => [course.id, course])
)
