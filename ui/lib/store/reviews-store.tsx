"use client";

import * as React from "react";
import type { Review } from "@/lib/types";
import { aggregateStats, SEEDED_REVIEWS } from "@/lib/data";
import { readStorage, subscribeStorage, writeStorage } from "./storage";

type AddReviewInput = Omit<Review, "id" | "createdAt">;

type Ctx = {
  reviewsFor: (courseId: string) => Review[];
  statsFor: (courseId: string) => ReturnType<typeof aggregateStats>;
  addReview: (input: AddReviewInput) => Review;
  resetUserReviews: () => void;
};

const ReviewsCtx = React.createContext<Ctx | null>(null);
const STORAGE_KEY = "omscs-hub:user-reviews:v1";
const EMPTY: Review[] = [];

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const userReviews = React.useSyncExternalStore(
    (cb) => subscribeStorage(STORAGE_KEY, cb),
    () => readStorage<Review[]>(STORAGE_KEY, EMPTY),
    () => EMPTY,
  );

  const value: Ctx = React.useMemo(() => {
    const byCourse = new Map<string, Review[]>();
    for (const r of userReviews) {
      const arr = byCourse.get(r.courseId) ?? [];
      arr.push(r);
      byCourse.set(r.courseId, arr);
    }
    return {
      reviewsFor(courseId) {
        const seeded = SEEDED_REVIEWS[courseId] ?? [];
        const user = byCourse.get(courseId) ?? [];
        return [...user, ...seeded];
      },
      statsFor(courseId) {
        const seeded = SEEDED_REVIEWS[courseId] ?? [];
        const user = byCourse.get(courseId) ?? [];
        return aggregateStats([...user, ...seeded]);
      },
      addReview(input) {
        const review: Review = {
          ...input,
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        };
        const next = [review, ...userReviews];
        writeStorage(STORAGE_KEY, next);
        return review;
      },
      resetUserReviews() {
        writeStorage(STORAGE_KEY, EMPTY);
      },
    };
  }, [userReviews]);

  return <ReviewsCtx.Provider value={value}>{children}</ReviewsCtx.Provider>;
}

export function useReviews() {
  const ctx = React.useContext(ReviewsCtx);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}
