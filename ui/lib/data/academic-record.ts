import type { CourseAttempt, StudyPlanData } from "@/lib/api/study-plan"
import { COURSES_BY_ID } from "@/lib/data"

const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 } as const

export function estimatedGpa(attempts: CourseAttempt[]) {
  let qualityPoints = 0
  let gradedHours = 0
  let gradedAttempts = 0
  let unknownCreditAttempts = 0
  for (const attempt of attempts) {
    if (!(attempt.outcome in GRADE_POINTS)) continue
    const credits = COURSES_BY_ID[attempt.courseId]?.credits
    if (credits === undefined) {
      unknownCreditAttempts++
      continue
    }
    qualityPoints += GRADE_POINTS[attempt.outcome as keyof typeof GRADE_POINTS] * credits
    gradedHours += credits
    gradedAttempts++
  }
  return {
    value: gradedHours > 0 ? qualityPoints / gradedHours : null,
    gradedHours,
    gradedAttempts,
    omittedOutcomes: attempts.length - gradedAttempts - unknownCreditAttempts,
    unknownCreditAttempts,
  }
}

export function exportAcademicRecord(data: StudyPlanData, exportedAt: string) {
  return {
    format: "omscs-hub-academic-record",
    version: 1,
    exportedAt,
    intendedCourses: Object.entries(data.plan).flatMap(([term, courseIds]) =>
      courseIds.map((courseId) => ({ courseId, term })),
    ),
    selectedSpecialization: data.selectedSpec,
    completedCourses: [...new Set(data.attempts.filter(({ outcome }) => outcome in GRADE_POINTS).map(({ courseId }) => courseId))].map(
      (courseId) => ({ courseId }),
    ),
    courseAttempts: data.attempts.map(({ id, courseId, term, outcome }) => ({
      id,
      courseId,
      term,
      outcome,
    })),
  }
}
