import type { Review } from "@/lib/types"
import { z } from "zod"

export const reviewInputSchema = z.object({
  semester: z.string().trim().min(1).max(64, "Semester must be 64 characters or fewer."),
  difficulty: z.number().int().min(1).max(5),
  workload: z.number().min(0).max(80),
  rating: z.number().int().min(1).max(5),
  recommend: z.boolean(),
  programStage: z.enum(["First", "Mid", "Late"]),
  body: z.string().trim().min(20, "Review must be at least 20 characters.").max(8000),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>

type ApiReview = Omit<Review, "createdAt"> & {
  createdAt: string
}

const reviewResponseSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      courseId: z.string(),
      source: z.enum(["omscentral", "app"]),
      semester: z.string(),
      difficulty: z.number().nullable(),
      workload: z.number().nullable(),
      rating: z.number().nullable(),
      recommend: z.boolean().nullable(),
      programStage: z.enum(["First", "Mid", "Late"]).nullable(),
      body: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      createdAt: z.string(),
      updatedAt: z.string(),
      deletedAt: z.string().nullable(),
      metadata: z
        .object({
          sourceUrl: z
            .string()
            .url()
            .regex(/^https?:\/\//)
            .nullable()
            .optional(),
          pseudonym: z.string().nullable().optional(),
        })
        .optional(),
    })
  ),
})

const catalogStatsSchema = z.object({
  courses: z.array(
    z.object({
      courseId: z.string(),
      numReviews: z.number().int().nonnegative(),
      avgDifficulty: z.number().nullable(),
      avgWorkload: z.number().nullable(),
      avgRating: z.number().nullable(),
    })
  ),
})

const reviewWriteResponseSchema = z.object({ reviewId: z.string().uuid() })
const reviewDeleteResponseSchema = reviewWriteResponseSchema.extend({ deletedAt: z.string().datetime() })

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL)
}

export async function fetchCatalogStats() {
  const data = await request<unknown>("/reviews/catalog-stats", {
    unavailableMessage: "Review statistics unavailable. Try again.",
  })
  return catalogStatsSchema.parse(data).courses
}

export async function fetchCourseReviews(courseId: string) {
  const data = await request<unknown>(
    `/courses/${encodeURIComponent(courseId)}/reviews?source=all`,
    {
      unavailableMessage: "Reviews unavailable. Try again.",
    }
  )
  return reviewResponseSchema.parse(data).reviews satisfies ApiReview[]
}

export async function createReview(
  courseId: string,
  input: ReviewInput,
  token: string
) {
  const data = await request<unknown>(
    `/courses/${encodeURIComponent(courseId)}/reviews`,
    {
      method: "POST",
      token,
      body: reviewInputSchema.parse(input),
      unavailableMessage:
        "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
    }
  )
  return reviewWriteResponseSchema.parse(data)
}

export async function fetchMyReviewId(courseId: string, token: string) {
  const data = await request<unknown>(
    `/courses/${encodeURIComponent(courseId)}/reviews/me`,
    { token, unavailableMessage: "Unable to check your review. Try again." }
  )
  return z.object({ reviewId: z.string().nullable() }).parse(data).reviewId
}

export async function updateMyReview(
  courseId: string,
  input: ReviewInput,
  token: string
) {
  const data = await request<unknown>(
    `/courses/${encodeURIComponent(courseId)}/reviews/me`,
    {
      method: "PUT",
      token,
      body: reviewInputSchema.parse(input),
      unavailableMessage:
        "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
    }
  )
  return reviewWriteResponseSchema.parse(data)
}

export async function deleteMyReview(courseId: string, token: string) {
  const data = await request<unknown>(
    `/courses/${encodeURIComponent(courseId)}/reviews/me`,
    {
      method: "DELETE",
      token,
      unavailableMessage:
        "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
    }
  )
  return reviewDeleteResponseSchema.parse(data)
}

async function request<T>(
  path: string,
  options: {
    method?: string
    token?: string
    body?: unknown
    unavailableMessage?: string
  } = {}
) {
  if (!API_BASE_URL)
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.")

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(options.unavailableMessage ?? "Review API unavailable.")
    }
    throw error
  })

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: unknown
    issues?: { message?: string }[]
  }
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data
}

function apiErrorMessage(
  data: { error?: unknown; issues?: { message?: string }[] },
  status: number
) {
  const issueMessage = data.issues?.find((issue) => issue.message)?.message
  if (issueMessage) return issueMessage

  if (typeof data.error === "string") return data.error

  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = (data.error as { message?: unknown }).message
    if (typeof message === "string") return message
  }

  return `Request failed with ${status}`
}
