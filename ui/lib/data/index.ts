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
  let countD = 0,
    countW = 0,
    countR = 0;
  for (const r of reviews) {
    if (r.difficulty !== null) {
      sumD += r.difficulty;
      countD++;
      distDifficulty[Math.max(0, Math.min(4, r.difficulty - 1))]++;
    }
    if (r.workload !== null) {
      sumW += r.workload;
      countW++;
      distWorkload[workloadBucketIndex(r.workload)]++;
    }
    if (r.rating !== null) {
      sumR += r.rating;
      countR++;
      distRating[Math.max(0, Math.min(4, r.rating - 1))]++;
    }
  }
  return {
    avgDifficulty: countD ? +(sumD / countD).toFixed(2) : 0,
    avgWorkload: countW ? +(sumW / countW).toFixed(1) : 0,
    avgRating: countR ? +(sumR / countR).toFixed(2) : 0,
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
