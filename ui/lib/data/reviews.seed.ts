import type { Review } from "@/lib/types";

// Deterministic PRNG so seed output is stable.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, xs: T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function gauss(rng: () => number, mean: number, sd: number) {
  // Box-Muller
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const SEMESTERS = [
  "Fall 2022",
  "Spring 2023",
  "Summer 2023",
  "Fall 2023",
  "Spring 2024",
  "Summer 2024",
  "Fall 2024",
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
];

const PROS_POOL = [
  "Lectures are well-produced",
  "Office hours actually helpful",
  "Projects feel real-world",
  "Slack community is active",
  "Pacing is reasonable",
  "Great auto-grader feedback",
  "Solid foundation for follow-on courses",
  "Instructors engage in forums",
  "Assignments build on each other",
  "Reasonable tooling, no setup hell",
];

const CONS_POOL = [
  "Steep ramp-up week one",
  "Vague rubrics on writeups",
  "Heavy reading load",
  "Tooling can be finicky",
  "Exam format feels punishing",
  "Group dynamics are hit or miss",
  "Late policy is strict",
  "Limited TA availability near deadlines",
  "Lectures feel dated in spots",
  "Project scope creep mid-semester",
];

const BODY_TEMPLATES = [
  "Took this in {sem}. Workload averaged ~{wl} hrs/wk. Difficulty felt {diffWord}. {extra}",
  "{diffWord} pace, {wlWord} hours weekly. Coming in I had {bg}. Glad I stuck with it.",
  "Honest review: {diffWord} class, {wlWord} workload. Loved {pro}. Hated {con}.",
  "If you have {bg}, this is approachable. Otherwise plan for ~{wl} hrs/wk and a few late nights.",
  "Project-driven course. Most of the {wl} hrs/wk go to assignments rather than lectures.",
  "Would I take it again? {recWord}. The course rewards consistent weekly effort.",
];

const BG_POOL = [
  "industry experience in backend",
  "an undergrad CS background",
  "limited Python exposure",
  "a math-heavy background",
  "two prior OMSCS courses",
  "no recent academic study",
];

function diffWord(d: number) {
  return d >= 4.5 ? "brutal" : d >= 3.5 ? "hard" : d >= 2.5 ? "fair" : "manageable";
}
function wlWord(w: number) {
  return w >= 25 ? "heavy" : w >= 15 ? "moderate" : "light";
}

export function generateReviewsForCourse(
  courseId: string,
  difficultyMean: number,
  workloadMean: number,
  ratingMean: number,
  count: number,
  baseSeed: number,
): Review[] {
  const rng = mulberry32(baseSeed);
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const diff = clamp(Math.round(gauss(rng, difficultyMean, 0.85)), 1, 5);
    const wl = clamp(Math.round(gauss(rng, workloadMean, 6)), 1, 50);
    const rating = clamp(Math.round(gauss(rng, ratingMean, 0.8)), 1, 5);
    const sem = pick(rng, SEMESTERS);
    const pros = [pick(rng, PROS_POOL), pick(rng, PROS_POOL)].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const cons = [pick(rng, CONS_POOL), pick(rng, CONS_POOL)].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const tmpl = pick(rng, BODY_TEMPLATES);
    const body = tmpl
      .replace("{sem}", sem)
      .replace("{wl}", String(wl))
      .replace("{diffWord}", diffWord(diff))
      .replace("{wlWord}", wlWord(wl))
      .replace("{bg}", pick(rng, BG_POOL))
      .replace("{pro}", pros[0].toLowerCase())
      .replace("{con}", cons[0].toLowerCase())
      .replace("{recWord}", rating >= 3 ? "Yes" : "Probably not")
      .replace("{extra}", pros[0] + ".");
    const stage = pick(rng, ["First", "Mid", "Late"] as const);
    const date = new Date(2022, 0, 1);
    date.setDate(date.getDate() + Math.floor(rng() * 1200));
    out.push({
      id: `${courseId}-seed-${i}`,
      courseId,
      semester: sem,
      difficulty: diff,
      workload: wl,
      rating,
      programStage: stage,
      body,
      pros,
      cons,
      recommend: rating >= 3,
      createdAt: date.toISOString(),
    });
  }
  return out;
}

// Per-course tuning: realistic averages distilled from common community sentiment.
export const COURSE_PROFILE: Record<
  string,
  { diff: number; wl: number; rating: number; n: number; seed: number }
> = {
  "CS-6200":   { diff: 4.0, wl: 19, rating: 4.6, n: 28, seed: 1001 },
  "CS-6210":   { diff: 4.4, wl: 22, rating: 4.3, n: 16, seed: 1002 },
  "CS-6250":   { diff: 2.4, wl: 9,  rating: 3.7, n: 22, seed: 1003 },
  "CS-6260":   { diff: 4.2, wl: 14, rating: 3.6, n: 12, seed: 1004 },
  "CS-6262":   { diff: 3.5, wl: 16, rating: 4.1, n: 14, seed: 1005 },
  "CS-6263":   { diff: 3.0, wl: 12, rating: 3.4, n: 8,  seed: 1006 },
  "CS-6291":   { diff: 3.4, wl: 14, rating: 3.7, n: 7,  seed: 1007 },
  "CS-6300":   { diff: 1.9, wl: 8,  rating: 4.0, n: 30, seed: 1008 },
  "CS-6310":   { diff: 3.0, wl: 13, rating: 3.0, n: 14, seed: 1009 },
  "CS-6340":   { diff: 4.0, wl: 17, rating: 4.0, n: 11, seed: 1010 },
  "CS-6400":   { diff: 2.6, wl: 11, rating: 3.6, n: 18, seed: 1011 },
  "CS-6440":   { diff: 2.0, wl: 9,  rating: 3.4, n: 13, seed: 1012 },
  "CS-6457":   { diff: 3.4, wl: 18, rating: 4.5, n: 10, seed: 1013 },
  "CS-6460":   { diff: 2.4, wl: 12, rating: 4.3, n: 11, seed: 1014 },
  "CS-6465":   { diff: 2.8, wl: 11, rating: 3.6, n: 6,  seed: 1015 },
  "CS-6475":   { diff: 3.4, wl: 15, rating: 4.5, n: 14, seed: 1016 },
  "CS-6476":   { diff: 4.0, wl: 19, rating: 4.0, n: 13, seed: 1017 },
  "CS-6601":   { diff: 4.2, wl: 22, rating: 4.4, n: 26, seed: 1018 },
  "CS-6603":   { diff: 1.8, wl: 7,  rating: 3.4, n: 9,  seed: 1019 },
  "CS-6635":   { diff: 3.0, wl: 12, rating: 3.4, n: 6,  seed: 1020 },
  "CS-6750":   { diff: 2.6, wl: 13, rating: 4.2, n: 24, seed: 1021 },
  "CS-6755":   { diff: 2.4, wl: 11, rating: 3.8, n: 8,  seed: 1022 },
  "CS-7270":   { diff: 3.4, wl: 14, rating: 3.6, n: 7,  seed: 1023 },
  "CS-7280":   { diff: 3.4, wl: 14, rating: 4.0, n: 9,  seed: 1024 },
  "CS-7637":   { diff: 2.8, wl: 13, rating: 4.0, n: 21, seed: 1025 },
  "CS-7638":   { diff: 3.4, wl: 16, rating: 4.4, n: 20, seed: 1026 },
  "CS-7641":   { diff: 4.0, wl: 21, rating: 3.6, n: 30, seed: 1027 },
  "CS-7642":   { diff: 4.0, wl: 18, rating: 4.0, n: 14, seed: 1028 },
  "CS-7643":   { diff: 4.0, wl: 17, rating: 4.4, n: 16, seed: 1029 },
  "CS-7646":   { diff: 2.4, wl: 11, rating: 4.2, n: 22, seed: 1030 },
  "CS-7650":   { diff: 3.6, wl: 16, rating: 4.0, n: 11, seed: 1031 },
  "CSE-6220":  { diff: 4.2, wl: 17, rating: 4.4, n: 13, seed: 1032 },
  "CSE-6242":  { diff: 3.0, wl: 14, rating: 3.7, n: 24, seed: 1033 },
  "ISYE-6420": { diff: 3.8, wl: 16, rating: 3.8, n: 11, seed: 1034 },
  "CS-8803-O08": { diff: 4.2, wl: 19, rating: 4.4, n: 8, seed: 1035 },
  "CS-8803-GA":  { diff: 4.4, wl: 20, rating: 3.4, n: 35, seed: 1036 },
};
