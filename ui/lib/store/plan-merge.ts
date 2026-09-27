import { canonicalCourseId } from "@/lib/data"
import type { StudyPlan, StudyPlanData } from "@/lib/api/study-plan"
import type { SpecializationId } from "@/lib/types"

export function placements(plan: StudyPlan) {
  const result = new Map<string, string>()
  for (const [term, ids] of Object.entries(plan))
    for (const rawId of ids) {
      const id = canonicalCourseId(rawId)
      if (!result.has(id)) result.set(id, term)
    }
  return result
}

export function planDifferences(local: StudyPlanData, account: StudyPlanData) {
  const localPlaces = placements(local.plan)
  const accountPlaces = placements(account.plan)
  const accountAttempts = new Map(account.attempts.map((attempt) => [attempt.id, attempt]))
  return {
    localOnly: [...localPlaces.keys()].filter((id) => !accountPlaces.has(id)),
    accountOnly: [...accountPlaces.keys()].filter((id) => !localPlaces.has(id)),
    shared: [...localPlaces]
      .filter(([id, term]) => accountPlaces.get(id) === term)
      .map(([id]) => id),
    conflicts: [...localPlaces]
      .filter(
        ([id, term]) => accountPlaces.has(id) && accountPlaces.get(id) !== term
      )
      .map(([id, localTerm]) => ({
        id,
        localTerm,
        accountTerm: accountPlaces.get(id)!,
      })),
    specConflict: Boolean(
      local.selectedSpec &&
      account.selectedSpec &&
      local.selectedSpec !== account.selectedSpec
    ),
    localAttempts: local.attempts.filter((attempt) => !accountAttempts.has(attempt.id)),
    accountAttempts: account.attempts.filter((attempt) => !local.attempts.some((localAttempt) => localAttempt.id === attempt.id)),
    attemptConflicts: local.attempts.filter((attempt) => {
      const other = accountAttempts.get(attempt.id)
      return other && JSON.stringify(attempt) !== JSON.stringify(other)
    }),
  }
}

export function mergePlans(
  local: StudyPlanData,
  account: StudyPlanData,
  choices: Record<string, "local" | "account">,
  specChoice: "local" | "account" | null
) {
  const differences = planDifferences(local, account)
  if (differences.conflicts.some(({ id }) => !choices[id])) return null
  if (differences.attemptConflicts.some(({ id }) => !choices[`attempt:${id}`])) return null
  if (differences.specConflict && !specChoice) return null
  const resolved = placements(account.plan)
  for (const [id, term] of placements(local.plan)) {
    if (!resolved.has(id) || choices[id] === "local") resolved.set(id, term)
  }
  const plan: StudyPlan = {}
  for (const [id, term] of resolved) (plan[term] ??= []).push(id)
  const selectedSpec: SpecializationId | null = differences.specConflict
    ? specChoice === "local"
      ? local.selectedSpec
      : account.selectedSpec
    : (local.selectedSpec ?? account.selectedSpec)
  const attempts = new Map(account.attempts.map((attempt) => [attempt.id, attempt]))
  for (const attempt of local.attempts) {
    if (!attempts.has(attempt.id) || choices[`attempt:${attempt.id}`] === "local") attempts.set(attempt.id, attempt)
  }
  return { plan, selectedSpec, attempts: [...attempts.values()], revision: account.revision }
}
