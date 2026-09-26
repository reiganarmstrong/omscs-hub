import { canonicalCourseId, COURSES_BY_ID } from "./index";
import type {
  CourseSpecialization,
  Specialization,
  SpecializationId,
  SpecRequirement,
} from "@/lib/types";

// Georgia Tech OMSCS specialization pages, checked 2026-09-26. Only courses
// listed as offered online and present in the current OMSCS Catalog are shown.
// On-campus options in the source pages are deliberately omitted.
export const SPECIALIZATION_LAST_CHECKED = "2026-09-26";
const NON_CS_CREDIT_LIMIT = 6;
const source = (slug: string) =>
  `https://omscs.gatech.edu/specialization-${slug}`;
const codes = (list: string) =>
  list.split(",").map((code) => code.trim().replace(/\s+/g, "-"));
const bucket = (
  id: string,
  label: string,
  pick: number,
  list: string,
  notes?: string,
): SpecRequirement => ({
  id,
  label,
  pick,
  poolCourseIds: codes(list),
  role: "elective",
  notes,
});
const core = (
  id: string,
  label: string,
  pick: number,
  list: string,
  notes?: string,
): SpecRequirement => ({
  ...bucket(id, label, pick, list, notes),
  role: "core",
});
const spec = (
  value: Omit<Specialization, "totalHours" | "totalCourses" | "lastChecked">,
): Specialization => ({
  ...value,
  totalHours: 30,
  totalCourses: 10,
  lastChecked: SPECIALIZATION_LAST_CHECKED,
});

const published: Specialization[] = [
  spec({
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    blurb: "Algorithms, intelligent systems, and human-centered AI.",
    description:
      "The current name for the path formerly called Interactive Intelligence.",
    sourceUrl: source(
      "artificial-intelligence-formerly-interactive-intelligence",
    ),
    freeElectiveCount: 5,
    requirements: [
      core(
        "ai-algorithms",
        "Algorithms and design · pick 1",
        1,
        "CS 6300, CS 6515",
        "Graduate Algorithms is one option, not a universal requirement.",
      ),
      core(
        "ai-core",
        "AI core · pick 2",
        2,
        "CS 6476, CS 6601, CS 7637, CS 7641, CS 7643, CS 7650",
      ),
      bucket(
        "ai-electives",
        "AI electives · pick 2",
        2,
        "CS 6476, CS 6601, CS 7637, CS 7641, CS 7643, CS 7650, CS 7632, CS 6440, CS 6460, CS 6603, CS 6750, CS 6795",
        "Unused AI core courses may fill elective slots.",
      ),
    ],
  }),
  spec({
    id: "computer-graphics",
    name: "Computer Graphics",
    blurb: "Graphics foundations, games, animation, and vision.",
    description:
      "A 15-credit specialization with two core choices and three electives.",
    sourceUrl: source("computer-graphics"),
    freeElectiveCount: 5,
    requirements: [
      core(
        "cg-graphics",
        "Graphics core · pick 1",
        1,
        "CS 6457, CS 6491, CS 7496",
      ),
      core("cg-algorithms", "Algorithms core · pick 1", 1, "CS 6515"),
      bucket(
        "cg-electives",
        "Graphics electives · pick 3",
        3,
        "CS 6457, CS 6475, CS 6476, CS 6491, CS 7496",
        "A core course can count here only if it was not used in a core slot.",
      ),
    ],
  }),
  spec({
    id: "computing-systems",
    name: "Computing Systems",
    blurb: "Systems, networks, architecture, and security.",
    description: "An 18-credit specialization with four free electives.",
    sourceUrl: source("computing-systems"),
    freeElectiveCount: 4,
    requirements: [
      core("cs-algorithms", "Algorithms core · pick 1", 1, "CS 6515"),
      core(
        "cs-core",
        "Systems core · pick 2",
        2,
        "CS 6210, CS 6250, CS 6290, CS 6300, CS 6400",
      ),
      bucket(
        "cs-electives",
        "Systems electives · pick 3",
        3,
        "CS 6210, CS 6250, CS 6290, CS 6300, CS 6400, CS 6035, CS 6200, CS 6211, CS 6238, CS 6260, CS 6261, CS 6262, CS 6263, CS 6264, CS 6291, CS 6310, CS 6340, CS 6422, CS 6675, CS 6747, CS 7210, CS 7280, CS 7295, CS 7400, CSE 6220, CS 8803 O08",
        "Unused systems core courses may fill elective slots. Special-topics eligibility depends on School of Computer Science faculty; check the source.",
      ),
    ],
  }),
  spec({
    id: "computational-perception",
    name: "Computational Perception and Robotics",
    blurb: "Perception, robotics, vision, and sensing.",
    description: "Choose electives from both perception and robotics.",
    sourceUrl: source("computational-perception-and-robotics"),
    freeElectiveCount: 5,
    requirements: [
      core("cpr-algorithms", "Algorithms core · pick 1", 1, "CS 6515"),
      core(
        "cpr-ai",
        "AI or Machine Learning core · pick 1",
        1,
        "CS 6601, CS 7641",
      ),
      bucket(
        "cpr-perception",
        "Perception elective · at least 1",
        1,
        "CS 6475, CS 6476, CS 7639, CS 7650, CS 7711",
      ),
      bucket("cpr-robotics", "Robotics elective · at least 1", 1, "CS 7638"),
      bucket(
        "cpr-extra",
        "Additional perception or robotics elective · pick 1",
        1,
        "CS 6475, CS 6476, CS 7639, CS 7650, CS 7711, CS 7638",
      ),
    ],
  }),
  spec({
    id: "human-computer-interaction",
    name: "Human-Computer Interaction",
    blurb: "User research, design, and interactive technology.",
    description:
      "Electives include at least one course from each of two sub-areas.",
    sourceUrl: source("human-computer-interaction"),
    freeElectiveCount: 5,
    requirements: [
      core("hci-ui", "Interface core · pick 1", 1, "CS 7470"),
      core("hci-hci", "HCI core · pick 1", 1, "CS 6750"),
      bucket(
        "hci-design",
        "Design and evaluation · at least 1",
        1,
        "CS 6435, CS 6457, CS 6460, CS 6795",
      ),
      bucket(
        "hci-technology",
        "Interactive technology · at least 1",
        1,
        "CS 6440, CS 7470, CS 7632, CS 7711",
      ),
      bucket(
        "hci-extra",
        "Additional HCI elective · pick 1",
        1,
        "CS 6435, CS 6457, CS 6460, CS 6795, CS 6440, CS 7470, CS 7632, CS 7711",
      ),
    ],
  }),
  spec({
    id: "machine-learning",
    name: "Machine Learning",
    blurb: "Machine learning methods and applications.",
    description:
      "The source requires at least one third of each elective's graded content to be based on machine learning.",
    sourceUrl: source("machine-learning"),
    freeElectiveCount: 5,
    requirements: [
      core("ml-algorithms", "Algorithms core · pick 1", 1, "CS 6515"),
      core("ml-core", "Machine Learning core · pick 1", 1, "CS 7641"),
      bucket(
        "ml-electives",
        "Machine Learning electives · pick 3",
        3,
        "CS 6476, CS 6601, CS 6603, CS 7280, CS 7632, CS 7637, CS 7642, CS 7643, CS 7646, CS 7650, CSE 6242, CSE 6250, ISYE 6420",
        "Electives must satisfy Georgia Tech's one-third graded-content rule.",
      ),
    ],
  }),
];

export const SPECIALIZATIONS: Specialization[] = published.map((entry) => ({
  ...entry,
  requirements: entry.requirements.map((requirement) => ({
    ...requirement,
    poolCourseIds: [
      ...new Set(requirement.poolCourseIds.map(canonicalCourseId)),
    ].filter((id) => Boolean(COURSES_BY_ID[id])),
  })),
}));

export const SPECIALIZATIONS_BY_ID: Record<SpecializationId, Specialization> =
  Object.fromEntries(
    SPECIALIZATIONS.map((entry) => [entry.id, entry]),
  ) as Record<SpecializationId, Specialization>;

export function courseSpecializations(
  courseId: string,
): CourseSpecialization[] {
  return SPECIALIZATIONS.flatMap((entry) => {
    const buckets = entry.requirements.filter((requirement) =>
      requirement.poolCourseIds.includes(courseId),
    );
    if (!buckets.length) return [];
    const role = buckets.some((requirement) => requirement.role === "core")
      ? "core"
      : "elective";
    return [{ id: entry.id, role }];
  });
}

export function bucketProgress(entry: Specialization, plannedIds: Set<string>) {
  const slots = entry.requirements.flatMap((requirement) =>
    Array.from({ length: requirement.pick }, () => requirement),
  );
  const planned = [...plannedIds].filter((id) => Boolean(COURSES_BY_ID[id]));
  const isCS = (id: string) => /^(CS|CSE)-/.test(id);
  const csCourses = planned.filter(isCS);
  const otherCourses = planned.filter((id) => !isCS(id));
  const otherHours = otherCourses.reduce(
    (sum, id) => sum + COURSES_BY_ID[id].credits,
    0,
  );

  const match = (eligible: Set<string>) => {
    // Each course can occupy one slot; an augmenting path can move a course
    // between overlapping buckets to maximize filled specialization slots.
    const owner = new Map<string, number>();
    const assign = (slot: number, visited: Set<string>): boolean => {
      for (const id of slots[slot].poolCourseIds) {
        if (!eligible.has(id) || visited.has(id)) continue;
        visited.add(id);
        const previous = owner.get(id);
        if (previous === undefined || assign(previous, visited)) {
          owner.set(id, slot);
          return true;
        }
      }
      return false;
    };
    slots.forEach((_, slot) => assign(slot, new Set()));
    const byBucket = Object.fromEntries(
      entry.requirements.map((requirement) => {
        const matched = [...owner]
          .filter(([, slot]) => slots[slot].id === requirement.id)
          .map(([id]) => id);
        return [
          requirement.id,
          { bucketId: requirement.id, count: matched.length, matched },
        ];
      }),
    );
    return {
      byBucket,
      matchedFulfilled: owner.size,
      freeElectivesUsed: Math.min(
        entry.freeElectiveCount,
        Math.max(0, eligible.size - owner.size),
      ),
      specializationCourseIds: new Set(owner.keys()),
    };
  };

  // The current Catalog has 3-credit courses. Enumerating allowed non-CS/CSE
  // subsets also respects actual credit hours if a smaller course is added.
  let best = match(new Set(csCourses));
  const consider = (index: number, selected: string[], hours: number) => {
    if (index === otherCourses.length) {
      const candidate = match(new Set([...csCourses, ...selected]));
      if (
        candidate.matchedFulfilled > best.matchedFulfilled ||
        (candidate.matchedFulfilled === best.matchedFulfilled &&
          candidate.freeElectivesUsed > best.freeElectivesUsed)
      )
        best = candidate;
      return;
    }
    consider(index + 1, selected, hours);
    const id = otherCourses[index];
    const nextHours = hours + COURSES_BY_ID[id].credits;
    if (nextHours <= NON_CS_CREDIT_LIMIT)
      consider(index + 1, [...selected, id], nextHours);
  };
  consider(0, [], 0);

  return {
    ...best,
    requiredFulfilled: slots.length,
    plannedTotal: planned.length,
    totalCourses: entry.totalCourses,
    nonCsPlannedHours: otherHours,
    nonCsCreditLimit: NON_CS_CREDIT_LIMIT,
  };
}
