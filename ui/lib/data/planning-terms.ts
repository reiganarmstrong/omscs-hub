import type { Term } from "@/lib/types";

export type PlanningTerm = { term: Term; year: number; key: string };

export const TERM_ORDER: Term[] = ["Spring", "Summer", "Fall"];

export function parsePlanningTermKey(key: string): PlanningTerm | null {
  const match = /^(Spring|Summer|Fall)-(\d{4})$/.exec(key);
  if (!match) return null;
  return { term: match[1] as Term, year: Number(match[2]), key };
}

export function currentPlanningTerm(now = new Date()): PlanningTerm {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(dateParts.find((item) => item.type === type)?.value);
  const calendarYear = part("year");
  const monthDay = part("month") * 100 + part("day");
  // 2026 exam periods end May 8, August 7, and December 18. Other years use
  // these approximate seasonal cutoffs until a newer academic calendar is sourced.
  // https://registrar.gatech.edu/public/files/202602%20Final%20Exam%20Matrix_0.pdf
  // https://registrar.gatech.edu/public/files/Final%20Exam%20Matrix%20202605%20Summer%20Full.pdf
  // https://registrar.gatech.edu/public/files/Final%20Exam%20Matrix%20202608%20Fall_0.pdf
  const term = monthDay <= 508 ? "Spring" : monthDay <= 807 ? "Summer" : monthDay <= 1218 ? "Fall" : "Spring";
  const year = monthDay > 1218 ? calendarYear + 1 : calendarYear;
  return { term, year, key: `${term}-${year}` };
}

export function planningTerms(startKey = currentPlanningTerm().key): PlanningTerm[] {
  const start = parsePlanningTermKey(startKey);
  if (!start) throw new Error(`Invalid planning term: ${startKey}`);
  const first = start.year * 3 + TERM_ORDER.indexOf(start.term);
  return Array.from({ length: 18 }, (_, offset) => {
    const index = first + offset;
    const term = TERM_ORDER[index % 3];
    const year = Math.floor(index / 3);
    return { term, year, key: `${term}-${year}` };
  });
}

export function visiblePlanningTerms(
  planKeys: string[],
  earlierYear?: number,
  startKey = currentPlanningTerm().key,
): PlanningTerm[] {
  const terms = new Map(planningTerms(startKey).map((term) => [term.key, term]));
  if (earlierYear !== undefined) {
    for (const term of TERM_ORDER) {
      const key = `${term}-${earlierYear}`;
      terms.set(key, { term, year: earlierYear, key });
    }
  }
  for (const key of planKeys) {
    const parsed = parsePlanningTermKey(key);
    if (parsed) terms.set(key, parsed);
  }
  return [...terms.values()].sort(
    (a, b) => a.year * 3 + TERM_ORDER.indexOf(a.term) - (b.year * 3 + TERM_ORDER.indexOf(b.term)),
  );
}
