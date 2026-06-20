import type { Review } from "@/lib/types";

export type ReviewInput = {
  semester: string;
  difficulty: number;
  workload: number;
  rating: number;
  recommend: boolean;
  programStage: "First" | "Mid" | "Late";
  body: string;
};

type ApiReview = Omit<Review, "createdAt"> & {
  createdAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL);
}

export async function fetchCourseReviews(courseId: string) {
  const data = await request<{ reviews: ApiReview[] }>(
    `/courses/${encodeURIComponent(courseId)}/reviews?source=all`,
    {
      unavailableMessage: "Review API unavailable. Showing seeded review data.",
    },
  );
  return data.reviews;
}

export async function createReview(courseId: string, input: ReviewInput, token: string) {
  return request<{ reviewId: string }>(`/courses/${encodeURIComponent(courseId)}/reviews`, {
    method: "POST",
    token,
    body: input,
    unavailableMessage:
      "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
  });
}

export async function updateMyReview(courseId: string, input: ReviewInput, token: string) {
  return request<{ reviewId: string }>(`/courses/${encodeURIComponent(courseId)}/reviews/me`, {
    method: "PUT",
    token,
    body: input,
    unavailableMessage:
      "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
  });
}

export async function deleteMyReview(courseId: string, token: string) {
  return request<{ reviewId: string; deletedAt: string }>(
    `/courses/${encodeURIComponent(courseId)}/reviews/me`,
    {
      method: "DELETE",
      token,
      unavailableMessage:
        "Review API unavailable. Check NEXT_PUBLIC_API_BASE_URL or CORS settings before submitting.",
    },
  );
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown; unavailableMessage?: string } = {},
) {
  if (!API_BASE_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(options.unavailableMessage ?? "Review API unavailable.");
    }
    throw error;
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: unknown;
    issues?: { message?: string }[];
  };
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status));
  return data;
}

function apiErrorMessage(data: { error?: unknown; issues?: { message?: string }[] }, status: number) {
  if (typeof data.error === "string") return data.error;

  const issueMessage = data.issues?.find((issue) => issue.message)?.message;
  if (issueMessage) return issueMessage;

  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = (data.error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return `Request failed with ${status}`;
}
