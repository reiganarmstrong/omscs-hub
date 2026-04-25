import type { Specialization } from "@/lib/types";

// Modeled after the public OMSCS specialization rules, shaped as buckets so
// progress can be tracked against a planned program.
//
// Every track is 10 courses (30 credit hours). Graduate Algorithms is required
// for all tracks (modeled as a one-course bucket).

export const SPECIALIZATIONS: Specialization[] = [
  {
    id: "computing-systems",
    name: "Computing Systems",
    blurb: "OS, networks, distributed systems, security, databases.",
    description:
      "The most flexible track for software-engineering-leaning students. Builds depth across the layers underneath modern software.",
    totalHours: 30,
    totalCourses: 10,
    freeElectiveCount: 4,
    requirements: [
      {
        id: "cs-required",
        label: "Required core",
        pick: 1,
        required: true,
        poolCourseIds: ["CS-8803-GA"],
        notes: "Graduate Algorithms is required for every specialization.",
      },
      {
        id: "cs-foundational",
        label: "Pick 2 foundational courses",
        pick: 2,
        poolCourseIds: [
          "CS-6200",
          "CS-6210",
          "CS-6250",
          "CS-6300",
          "CS-6310",
          "CS-6340",
          "CS-6400",
        ],
        notes: "From the Computing Systems foundational pool.",
      },
      {
        id: "cs-electives",
        label: "Pick 3 Computing Systems electives",
        pick: 3,
        poolCourseIds: [
          "CS-6260",
          "CS-6262",
          "CS-6263",
          "CS-6291",
          "CS-7270",
          "CS-8803-O08",
          "CSE-6220",
          "CSE-6242",
          "CS-7646",
          "CS-6440",
        ],
      },
    ],
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    blurb: "Stats, deep learning, RL, NLP, applied ML.",
    description:
      "For students aiming at applied or research roles in machine learning. Heavier on math, probability, and writing.",
    totalHours: 30,
    totalCourses: 10,
    freeElectiveCount: 4,
    requirements: [
      {
        id: "ml-required",
        label: "Required core",
        pick: 2,
        required: true,
        poolCourseIds: ["CS-8803-GA", "CS-7641"],
        notes: "Graduate Algorithms and Machine Learning.",
      },
      {
        id: "ml-foundational",
        label: "Pick 1 foundational course",
        pick: 1,
        poolCourseIds: ["CS-6601", "CSE-6242", "CS-7643"],
      },
      {
        id: "ml-electives",
        label: "Pick 3 ML electives",
        pick: 3,
        poolCourseIds: [
          "CS-7642",
          "CS-7643",
          "CS-7646",
          "CS-7650",
          "CS-6476",
          "CS-7280",
          "ISYE-6420",
          "CS-7638",
          "CS-6601",
          "CSE-6242",
        ],
      },
    ],
  },
  {
    id: "interactive-intelligence",
    name: "Interactive Intelligence",
    blurb: "Agents, NLP, knowledge representation, intelligent UX.",
    description:
      "Focuses on building intelligent, interactive systems: agent design, knowledge-based AI, NLP, and the human-facing aspects of AI.",
    totalHours: 30,
    totalCourses: 10,
    freeElectiveCount: 4,
    requirements: [
      {
        id: "ii-required",
        label: "Required core",
        pick: 1,
        required: true,
        poolCourseIds: ["CS-8803-GA"],
      },
      {
        id: "ii-foundational",
        label: "Pick 2 foundational courses",
        pick: 2,
        poolCourseIds: ["CS-7637", "CS-6601", "CS-7641", "CS-6300", "CS-7650"],
      },
      {
        id: "ii-electives",
        label: "Pick 3 II-approved electives",
        pick: 3,
        poolCourseIds: [
          "CS-6440",
          "CS-6457",
          "CS-6465",
          "CS-6603",
          "CS-7642",
          "CS-7643",
          "CS-6476",
          "CSE-6242",
          "CS-6750",
        ],
      },
    ],
  },
  {
    id: "computational-perception",
    name: "Computational Perception & Robotics",
    blurb: "Vision, perception, robotics, computational imaging.",
    description:
      "Targets perception-driven systems: computer vision, robotics, sensing, and computational imaging. Math-forward and project-driven.",
    totalHours: 30,
    totalCourses: 10,
    freeElectiveCount: 4,
    requirements: [
      {
        id: "cp-required",
        label: "Required core",
        pick: 1,
        required: true,
        poolCourseIds: ["CS-8803-GA"],
      },
      {
        id: "cp-foundational",
        label: "Pick 2 foundational courses",
        pick: 2,
        poolCourseIds: ["CS-6476", "CS-7638", "CS-6601", "CS-6475"],
      },
      {
        id: "cp-electives",
        label: "Pick 3 CP&R electives",
        pick: 3,
        poolCourseIds: [
          "CS-6635",
          "CS-7641",
          "CS-7643",
          "CS-6200",
          "CS-7650",
        ],
      },
    ],
  },
  {
    id: "human-computer-interaction",
    name: "Human-Computer Interaction",
    blurb: "User research, design, evaluation, applied HCI.",
    description:
      "For students drawn to the design and evaluation of interactive systems. Lighter on systems / heavier on writing and research methods.",
    totalHours: 30,
    totalCourses: 10,
    freeElectiveCount: 4,
    requirements: [
      {
        id: "hci-required",
        label: "Required core",
        pick: 3,
        required: true,
        poolCourseIds: ["CS-8803-GA", "CS-6750", "CS-6300"],
        notes: "GA, Human-Computer Interaction, and Software Dev Process.",
      },
      {
        id: "hci-electives",
        label: "Pick 3 HCI-approved electives",
        pick: 3,
        poolCourseIds: [
          "CS-6755",
          "CS-6460",
          "CS-6457",
          "CS-6310",
          "CS-6440",
          "CS-6465",
        ],
      },
    ],
  },
];

export const SPECIALIZATIONS_BY_ID = Object.fromEntries(
  SPECIALIZATIONS.map((s) => [s.id, s]),
);

export function bucketProgress(
  spec: Specialization,
  plannedIds: Set<string>,
) {
  const usedByBucket: { bucketId: string; count: number; matched: string[] }[] = [];
  const used = new Set<string>(); // ids already counted
  // Greedy: required buckets first.
  const order = [...spec.requirements].sort((a, b) =>
    Number(!!b.required) - Number(!!a.required),
  );
  for (const req of order) {
    const matched: string[] = [];
    for (const id of req.poolCourseIds) {
      if (used.has(id)) continue;
      if (plannedIds.has(id)) {
        matched.push(id);
        if (matched.length >= req.pick) break;
      }
    }
    matched.forEach((id) => used.add(id));
    usedByBucket.push({
      bucketId: req.id,
      count: matched.length,
      matched,
    });
  }
  const requiredFulfilled = spec.requirements.reduce(
    (a, r) => a + r.pick,
    0,
  );
  const matchedFulfilled = usedByBucket.reduce(
    (a, b) => a + Math.min(b.count, spec.requirements.find((r) => r.id === b.bucketId)?.pick ?? 0),
    0,
  );
  const totalFreeNeeded = spec.freeElectiveCount;
  const planned = plannedIds.size;
  const remainingPlanned = Math.max(0, planned - matchedFulfilled);
  const freeElectivesUsed = Math.min(totalFreeNeeded, remainingPlanned);
  return {
    byBucket: Object.fromEntries(usedByBucket.map((u) => [u.bucketId, u])),
    matchedFulfilled,
    requiredFulfilled,
    freeElectivesUsed,
    plannedTotal: planned,
    totalCourses: spec.totalCourses,
  };
}
