import { z } from "zod"
import type { SpecializationId } from "@/lib/types"

export type StudyPlan = Record<string, string[]>
export type StudyPlanData = {
  plan: StudyPlan
  selectedSpec: SpecializationId | null
  revision: number
}

export class StudyPlanConflictError extends Error {}

const courseIdSchema = z.string().regex(/^[A-Z]{2,5}-\d{4}[A-Z]?$/)
const termSchema = z.union([
  z.literal("unassigned"),
  z.string().regex(/^(Spring|Summer|Fall)-\d{4}$/),
])
const planSchema = z
  .record(termSchema, z.array(courseIdSchema).max(200))
  .superRefine((plan, ctx) => {
    const placed = new Set<string>()
    for (const ids of Object.values(plan))
      for (const id of ids) {
        if (placed.has(id))
          ctx.addIssue({
            code: "custom",
            message: `${id} has duplicate placements.`,
          })
        placed.add(id)
      }
  })

const responseSchema = z.object({
  plan: planSchema,
  selectedSpec: z
    .enum([
      "computing-systems",
      "machine-learning",
      "artificial-intelligence",
      "computational-perception",
      "human-computer-interaction",
      "computer-graphics",
    ])
    .nullable(),
  revision: z.number().int().nonnegative(),
})

export function parseStudyPlanData(value: unknown): StudyPlanData | null {
  const parsed = responseSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

async function request(
  token: string,
  method: "GET" | "PUT",
  body?: StudyPlanData
) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
  if (!base) throw new Error("Study Plan service unavailable. Try again.")
  if (body && !parseStudyPlanData(body))
    throw new Error(
      "Study Plan has invalid courses or terms. Review it before syncing."
    )
  let response: Response
  try {
    response = await fetch(`${base}/study-plan`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    })
  } catch {
    throw new Error(
      "Study Plan sync failed. Your changes have not been saved to your account."
    )
  }
  if (response.status === 409)
    throw new StudyPlanConflictError(
      "Study Plan changed in another session. Reload before saving."
    )
  if (!response.ok)
    throw new Error(
      "Study Plan sync failed. Your changes have not been saved to your account."
    )
  return responseSchema.parse(await response.json())
}

export const fetchStudyPlan = (token: string) => request(token, "GET")
export const saveStudyPlan = (token: string, data: StudyPlanData) =>
  request(token, "PUT", data)
