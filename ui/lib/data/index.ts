import type { Course, Review } from "@/lib/types";
import { WORKLOAD_BUCKETS } from "@/lib/types";
import { COURSE_SEEDS } from "./courses.seed";
import catalog from "./catalog.json";

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

export const CATALOG_VERSION = catalog.version;
export const CATALOG_SOURCE_URL = catalog.sourceUrl;

export function canonicalCourseId(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-");
  return COURSE_ALIASES[normalized] ?? normalized;
}

export function courseMatchesSearch(course: Course, query: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[-\s]+/g, " ")
      .trim();
  const text = `${course.code} ${course.aliases.join(" ")} ${course.shortTitle ?? ""} ${course.title} ${course.description} ${course.tags.join(" ")}`;
  return normalize(text).includes(normalize(query));
}

export const COURSE_ALIASES: Record<string, string> = Object.fromEntries(
  catalog.courses.flatMap((course) =>
    course.aliases.map((alias) => [alias.replace(/\s+/g, "-"), course.id]),
  ),
);

export const COURSES: Course[] = catalog.courses.map((course) => {
  const annotation = COURSE_SEEDS.find(
    (seed) => seed.code === course.code || course.aliases.includes(seed.code),
  );
  return {
    ...course,
    descriptionStatus: course.descriptionStatus as Course["descriptionStatus"],
    prerequisitesStatus:
      course.prerequisitesStatus as Course["prerequisitesStatus"],
    shortTitle: annotation?.shortTitle,
    // The current-course list does not confirm offerings for any future term.
    termsOffered: [],
    specializations: annotation?.specs ?? [],
    tags: [
      course.foundational ? "foundational" : "non-foundational",
      ...(annotation?.tags.filter(
        (tag) => tag !== "required" && tag !== "foundational",
      ) ?? []),
    ],
    stats: aggregateStats([]),
  };
});
export const COURSES_BY_ID: Record<string, Course> = Object.fromEntries(
  COURSES.map((course) => [course.id, course]),
);
export function listCourses() {
  return COURSES;
}
