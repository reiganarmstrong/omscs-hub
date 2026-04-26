import type { Course, Review } from "@/lib/types";
import { WORKLOAD_BUCKETS } from "@/lib/types";
import { COURSE_SEEDS, buildBaseCourse } from "./courses.seed";
import { COURSE_PROFILE, generateReviewsForCourse } from "./reviews.seed";

function workloadBucketIndex(hours: number) {
  for (let i = 0; i < WORKLOAD_BUCKETS.length; i++) {
    const b = WORKLOAD_BUCKETS[i];
    if (hours >= b.min && hours <= b.max) return i;
  }
  return WORKLOAD_BUCKETS.length - 1;
}

export function aggregateStats(reviews: Review[]) {
  const distDifficulty = [0, 0, 0, 0, 0];
  const distRating = [0, 0, 0, 0, 0];
  const distWorkload = new Array(WORKLOAD_BUCKETS.length).fill(0);
  let sumD = 0,
    sumW = 0,
    sumR = 0;
  for (const r of reviews) {
    sumD += r.difficulty;
    sumW += r.workload;
    sumR += r.rating;
    distDifficulty[Math.max(0, Math.min(4, r.difficulty - 1))]++;
    distRating[Math.max(0, Math.min(4, r.rating - 1))]++;
    distWorkload[workloadBucketIndex(r.workload)]++;
  }
  const n = reviews.length || 1;
  return {
    avgDifficulty: +(sumD / n).toFixed(2),
    avgWorkload: +(sumW / n).toFixed(1),
    avgRating: +(sumR / n).toFixed(2),
    numReviews: reviews.length,
    distDifficulty,
    distRating,
    distWorkload,
  };
}

const seededReviewsByCourse: Record<string, Review[]> = {};
const courses: Course[] = COURSE_SEEDS.map(buildBaseCourse).map((c) => {
  const profile = COURSE_PROFILE[c.id];
  if (!profile) return c;
  const rs = generateReviewsForCourse(
    c.id,
    profile.diff,
    profile.wl,
    profile.rating,
    profile.n,
    profile.seed,
  );
  seededReviewsByCourse[c.id] = rs;
  return { ...c, stats: aggregateStats(rs) };
});

export const COURSES: Course[] = courses;
export const COURSES_BY_ID: Record<string, Course> = Object.fromEntries(
  courses.map((c) => [c.id, c]),
);
export const SEEDED_REVIEWS: Record<string, Review[]> = seededReviewsByCourse;

export function listCourses() {
  return COURSES;
}
