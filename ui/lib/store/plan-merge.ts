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
  return { plan, selectedSpec, revision: account.revision }
}
