export type Term = "Fall" | "Spring" | "Summer"

export type SpecializationId =
  | "computing-systems"
  | "machine-learning"
  | "artificial-intelligence"
  | "computational-perception"
  | "human-computer-interaction"
  | "computer-graphics"

export type CourseRole =
  | "core" // eligible for a specialization core bucket
  | "elective"
  | "capstone"

export type CourseSpecialization = { id: SpecializationId; role: CourseRole }

export type Course = {
  historical?: boolean
  id: string // "CS-6200"
  code: string // "CS 6200"
  title: string
  shortTitle?: string
  aliases: string[]
  sourceUrl: string
  creditsSourceUrl: string
  lastChecked: string
  descriptionStatus: "official-excerpt" | "unverified"
  prerequisitesStatus: "published-guidance" | "unverified"
  foundational: boolean
  credits: number
  description: string
  prereqs: string[]
  programNotes?: string
  termsOffered: Term[]
  tags: string[]
  // populated from active review data when available
  stats: {
    avgDifficulty: number | null // 1-5 when reported
    avgWorkload: number | null // hours/week when reported
    avgRating: number | null // 1-5 when reported
    numReviews: number
    distDifficulty: number[] // length 5, count per [1..5]
    distRating: number[] // length 5, count per [1..5]
    distWorkload: number[] // length 8, buckets [<5, 5-9, 10-14, 15-19, 20-24, 25-29, 30-34, 35+]
  }
}

export type Review = {
  id: string
  courseId: string
  source?: "omscentral" | "app"
  semester: string // "Fall 2024"
  difficulty: number | null // 1-5
  workload: number | null // hours/week
  rating: number | null // 1-5
  programStage: "First" | "Mid" | "Late" | null
  body: string
  pros: string[]
  cons: string[]
  recommend: boolean | null
  createdAt: string // ISO
  metadata?: { sourceUrl?: string | null }
  updatedAt?: string
  deletedAt?: string | null
}

export type SpecRequirement = {
  id: string
  label: string // e.g. "Pick 2 of the following"
  pick: number // how many courses needed from this bucket
  poolCourseIds: string[] // candidates that fulfill this bucket
  role: "core" | "elective"
  notes?: string
}

export type Specialization = {
  id: SpecializationId
  name: string
  blurb: string
  description: string
  totalHours: number
  totalCourses: number
  requirements: SpecRequirement[]
  freeElectiveCount: number // current OMSCS courses not used in specialization slots
  sourceUrl: string
  lastChecked: string
}

export type ReviewSortKey =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest"
  | "hardest"
  | "easiest"
  | "longest"
  | "shortest"

export type ReviewFilter = {
  minRating?: number
  maxDifficulty?: number
  recommendOnly?: boolean
  semester?: string // contains
}

export type CatalogFilter = {
  q: string
  specs: SpecializationId[]
  terms: Term[]
  difficulty: [number, number] // 1-5
  workload: [number, number] // 0-50
  rating: [number, number] // 1-5
  minReviews: number
  role: CourseRole | "any"
}

export const WORKLOAD_BUCKETS = [
  { label: "<5", min: 0, max: 4.999 },
  { label: "5–9", min: 5, max: 9.999 },
  { label: "10–14", min: 10, max: 14.999 },
  { label: "15–19", min: 15, max: 19.999 },
  { label: "20–24", min: 20, max: 24.999 },
  { label: "25–29", min: 25, max: 29.999 },
  { label: "30–34", min: 30, max: 34.999 },
  { label: "35+", min: 35, max: Infinity },
]
