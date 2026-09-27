import { canonicalCourseId } from "@/lib/data";
import confirmed from "./confirmed-offerings.json";
import history from "./offering-history.json";
import type { Term } from "@/lib/types";
import { parsePlanningTermKey } from "./planning-terms";

export type OfferingEvidence =
  | { state: "confirmed"; sourceUrl: string; lastChecked: string; scheduleDate: string; section: string }
  | { state: "historical"; sourceUrl: string; lastChecked: string }
  | { state: "unverified" };

export function offeringEvidence(courseId: string, termKey: string): OfferingEvidence {
  const id = canonicalCourseId(courseId);
  const exact = confirmed.offerings.find(
    (offering) => offering.courseId === id && offering.termKey === termKey,
  );
  if (exact) {
    return {
      state: "confirmed",
      sourceUrl: exact.sourceUrl,
      lastChecked: confirmed.lastChecked,
      scheduleDate: exact.scheduleDate,
      section: exact.section,
    };
  }

  const term = parsePlanningTermKey(termKey)?.term;
  const patterns = history.patterns as Record<string, Term[]>;
  if (term && patterns[id]?.includes(term)) {
    return {
      state: "historical",
      sourceUrl: history.sourceUrl,
      lastChecked: history.lastChecked,
    };
  }
  return { state: "unverified" };
}
