"use client";

import * as React from "react";
import type { Review } from "@/lib/types";
import { aggregateStats, SEEDED_REVIEWS } from "@/lib/data";
import { fetchCourseReviews, hasApiBaseUrl } from "@/lib/api/reviews";

type Ctx = {
  reviewsFor: (courseId: string) => Review[];
  statsFor: (courseId: string) => ReturnType<typeof aggregateStats>;
  loadCourseReviews: (courseId: string) => Promise<void>;
  replaceCourseReviews: (courseId: string, reviews: Review[]) => void;
  loadingCourseIds: Set<string>;
  reviewErrors: Record<string, string | undefined>;
};

const ReviewsCtx = React.createContext<Ctx | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [remoteReviews, setRemoteReviews] = React.useState<Record<string, Review[]>>({});
  const [loadingCourseIds, setLoadingCourseIds] = React.useState<Set<string>>(new Set());
  const [reviewErrors, setReviewErrors] = React.useState<Record<string, string | undefined>>({});

  const loadCourseReviews = React.useCallback(async (courseId: string) => {
    if (!hasApiBaseUrl()) return;
    setLoadingCourseIds((current) => new Set(current).add(courseId));
    setReviewErrors((current) => ({ ...current, [courseId]: undefined }));
    try {
      const reviews = await fetchCourseReviews(courseId);
      setRemoteReviews((current) => ({ ...current, [courseId]: reviews }));
    } catch (error) {
      setReviewErrors((current) => ({
        ...current,
        [courseId]: error instanceof Error ? error.message : "Unable to load reviews.",
      }));
    } finally {
      setLoadingCourseIds((current) => {
        const next = new Set(current);
        next.delete(courseId);
        return next;
      });
    }
  }, []);

  const replaceCourseReviews = React.useCallback((courseId: string, reviews: Review[]) => {
    setRemoteReviews((current) => ({ ...current, [courseId]: reviews }));
  }, []);

  const value: Ctx = React.useMemo(() => {
    return {
      reviewsFor(courseId) {
        return remoteReviews[courseId] ?? SEEDED_REVIEWS[courseId] ?? [];
      },
      statsFor(courseId) {
        return aggregateStats(remoteReviews[courseId] ?? SEEDED_REVIEWS[courseId] ?? []);
      },
      loadCourseReviews,
      replaceCourseReviews,
      loadingCourseIds,
      reviewErrors,
    };
  }, [loadCourseReviews, loadingCourseIds, remoteReviews, replaceCourseReviews, reviewErrors]);

  return <ReviewsCtx.Provider value={value}>{children}</ReviewsCtx.Provider>;
}

export function useReviews() {
  const ctx = React.useContext(ReviewsCtx);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}
