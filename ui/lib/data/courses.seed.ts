import type { Course, Term, SpecializationId, CourseRole } from "@/lib/types";

type Seed = {
  code: string;
  title: string;
  shortTitle?: string;
  credits?: number;
  description: string;
  prereqs?: string[];
  termsOffered: Term[];
  specs: { id: SpecializationId; role: CourseRole }[];
  tags: string[];
};

// Curated subset of the OMSCS catalog. Stats are seeded later from
// generated reviews so distributions and averages stay consistent.
export const COURSE_SEEDS: Seed[] = [
  {
    code: "CS 6200",
    title: "Graduate Introduction to Operating Systems",
    shortTitle: "GIOS",
    description:
      "Foundations of modern operating systems: processes, threads, synchronization, memory, IPC, scheduling, file systems, virtualization, and distributed services.",
    prereqs: ["Systems programming in C", "Undergrad OS"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computing-systems", role: "core" },
      { id: "machine-learning", role: "elective" },
      { id: "interactive-intelligence", role: "core" },
      { id: "computational-perception", role: "core" },
    ],
    tags: ["systems", "C", "concurrency", "foundational"],
  },
  {
    code: "CS 6210",
    title: "Advanced Operating Systems",
    shortTitle: "AOS",
    description:
      "Research-flavored survey of OS design: shared memory multiprocessors, distributed shared memory, virtualization internals, kernel structures, and modern data-center systems.",
    prereqs: ["GIOS or equivalent"],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "computing-systems", role: "core" }],
    tags: ["systems", "research papers", "C"],
  },
  {
    code: "CS 6250",
    title: "Computer Networks",
    shortTitle: "Networks",
    description:
      "End-to-end view of the internet: routing, transport, congestion control, software-defined networking, security, measurement, and content distribution.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computing-systems", role: "core" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["networking", "Python", "Mininet"],
  },
  {
    code: "CS 6260",
    title: "Applied Cryptography",
    shortTitle: "Crypto",
    description:
      "Modern cryptography: symmetric/asymmetric primitives, modes, MACs, signatures, key exchange, zero knowledge, and protocol analysis with proofs of security.",
    prereqs: ["Discrete math", "Probability"],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["security", "math-heavy", "proofs"],
  },
  {
    code: "CS 6262",
    title: "Network Security",
    description:
      "Threats, attacks, and defenses across network layers: malware, intrusion detection, web security, botnets, and machine-learning approaches to detection.",
    prereqs: ["Networks recommended"],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["security", "Python", "labs"],
  },
  {
    code: "CS 6263",
    title: "Intro to Cyber-Physical Systems Security",
    shortTitle: "CPS Security",
    description:
      "Security of industrial control systems, smart grids, and embedded controllers. Threat models, side channels, and formal protections.",
    prereqs: [],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["security", "control systems"],
  },
  {
    code: "CS 6291",
    title: "Embedded Software",
    description:
      "Design and verification of embedded software with real-time constraints, drivers, and hardware/software co-design.",
    prereqs: ["C programming"],
    termsOffered: ["Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["embedded", "C", "RTOS"],
  },
  {
    code: "CS 6300",
    title: "Software Development Process",
    shortTitle: "SDP",
    description:
      "Lifecycle of building software: requirements, version control, testing, code review, design, and team workflows. Includes a course-long Android project.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computing-systems", role: "core" },
      { id: "interactive-intelligence", role: "core" },
      { id: "human-computer-interaction", role: "core" },
      { id: "machine-learning", role: "elective" },
    ],
    tags: ["software engineering", "Java", "Android", "first course"],
  },
  {
    code: "CS 6310",
    title: "Software Architecture & Design",
    shortTitle: "SAD",
    description:
      "Architectural styles, design patterns, model-driven engineering, and trade-off analysis for large software systems.",
    prereqs: ["SDP recommended"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "computing-systems", role: "elective" },
      { id: "human-computer-interaction", role: "elective" },
    ],
    tags: ["architecture", "design", "Java"],
  },
  {
    code: "CS 6340",
    title: "Software Analysis & Testing",
    shortTitle: "SAT",
    description:
      "Static/dynamic program analysis, symbolic execution, fuzzing, and testing techniques. Heavy emphasis on tooling and theory.",
    prereqs: ["Compilers helpful"],
    termsOffered: ["Fall"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["analysis", "testing", "Datalog"],
  },
  {
    code: "CS 6400",
    title: "Database Systems Concepts & Design",
    shortTitle: "DB",
    description:
      "Relational design, normalization, ER modeling, query languages, transactions, and modern data-management systems.",
    prereqs: [],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "computing-systems", role: "core" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["databases", "SQL", "ER models"],
  },
  {
    code: "CS 6440",
    title: "Intro to Health Informatics",
    description:
      "Standards, data, and applications in healthcare IT. Project-driven introduction to FHIR, EHR, and population analytics.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computing-systems", role: "elective" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["health", "Python", "team project"],
  },
  {
    code: "CS 6457",
    title: "Video Game Design",
    description:
      "Real-time interactive systems, gameplay programming, and team-based production using Unity.",
    prereqs: [],
    termsOffered: ["Fall"],
    specs: [
      { id: "human-computer-interaction", role: "elective" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["Unity", "C#", "teams"],
  },
  {
    code: "CS 6460",
    title: "Educational Technology",
    description:
      "Theory and practice of building tools for learning. Self-directed individual project across the semester.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [{ id: "human-computer-interaction", role: "elective" }],
    tags: ["self-directed", "writing-heavy"],
  },
  {
    code: "CS 6465",
    title: "Computational Journalism",
    description:
      "Computing techniques for journalism and storytelling: web scraping, NLP, visualization, and ethics.",
    prereqs: [],
    termsOffered: ["Spring"],
    specs: [{ id: "interactive-intelligence", role: "elective" }],
    tags: ["NLP", "visualization", "Python"],
  },
  {
    code: "CS 6475",
    title: "Computational Photography",
    shortTitle: "CP",
    description:
      "Imaging beyond the camera: HDR, panoramas, light fields, gradient-domain editing, and modern computational imaging.",
    prereqs: ["Linear algebra", "Calculus"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [{ id: "computational-perception", role: "elective" }],
    tags: ["Python", "OpenCV", "creative"],
  },
  {
    code: "CS 6476",
    title: "Computer Vision",
    shortTitle: "CV",
    description:
      "Foundations of vision: filtering, features, geometry, tracking, recognition, and modern deep approaches.",
    prereqs: ["Linear algebra", "Calculus", "Probability"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "computational-perception", role: "core" },
      { id: "machine-learning", role: "elective" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["vision", "Python", "math-heavy"],
  },
  {
    code: "CS 6601",
    title: "Artificial Intelligence",
    shortTitle: "AI",
    description:
      "Classical AI: search, games, CSPs, planning, probabilistic reasoning, learning, and HMMs. Project-heavy and pacing-intensive.",
    prereqs: ["Probability", "Linear algebra"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "machine-learning", role: "core" },
      { id: "interactive-intelligence", role: "core" },
      { id: "computational-perception", role: "core" },
    ],
    tags: ["AI", "Python", "exams"],
  },
  {
    code: "CS 6603",
    title: "AI, Ethics, and Society",
    description:
      "Survey of fairness, accountability, and societal impacts of AI. Case studies and reflective writing.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [{ id: "interactive-intelligence", role: "elective" }],
    tags: ["ethics", "writing"],
  },
  {
    code: "CS 6635",
    title: "Scientific Visualization",
    description:
      "Methods to visualize scientific data sets: scalar/vector/tensor fields, isosurfaces, volume rendering, and large-data techniques.",
    prereqs: [],
    termsOffered: ["Spring"],
    specs: [{ id: "computational-perception", role: "elective" }],
    tags: ["visualization", "OpenGL"],
  },
  {
    code: "CS 6750",
    title: "Human-Computer Interaction",
    shortTitle: "HCI",
    description:
      "Principles, methods, and theories of HCI. Heavy reading and writing; design-driven assignments.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "human-computer-interaction", role: "core" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["HCI", "writing", "design"],
  },
  {
    code: "CS 6755",
    title: "Qualitative Methods in HCI",
    description:
      "Ethnography, interviews, contextual inquiry, and analysis techniques for understanding users in their context.",
    prereqs: [],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "human-computer-interaction", role: "elective" }],
    tags: ["research methods", "writing"],
  },
  {
    code: "CS 7270",
    title: "Networked Applications & Services",
    description:
      "Application-layer protocols and services on the modern internet: HTTP/3, QUIC, CDN architectures, and observability.",
    prereqs: ["Networks helpful"],
    termsOffered: ["Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["networking", "systems"],
  },
  {
    code: "CS 7280",
    title: "Network Science",
    description:
      "Mathematical and computational analysis of complex networks: structure, dynamics, and processes on networks.",
    prereqs: ["Probability"],
    termsOffered: ["Spring"],
    specs: [{ id: "machine-learning", role: "elective" }],
    tags: ["graphs", "math", "Python"],
  },
  {
    code: "CS 7637",
    title: "Knowledge-Based AI",
    shortTitle: "KBAI",
    description:
      "Cognitively-inspired AI: knowledge representation, frames, scripts, planning, learning, and metacognition. Build a Raven's-style agent.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "interactive-intelligence", role: "core" },
      { id: "machine-learning", role: "elective" },
    ],
    tags: ["AI", "Python", "agents", "first course"],
  },
  {
    code: "CS 7638",
    title: "AI for Robotics",
    shortTitle: "AI4R",
    description:
      "Probabilistic techniques for autonomous systems: localization, Kalman filters, particle filters, SLAM, and PID control.",
    prereqs: ["Probability", "Linear algebra"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computational-perception", role: "core" },
      { id: "machine-learning", role: "elective" },
    ],
    tags: ["robotics", "Python", "math"],
  },
  {
    code: "CS 7641",
    title: "Machine Learning",
    shortTitle: "ML",
    description:
      "Survey of classical ML: supervised, unsupervised, and reinforcement learning. Open-ended, write-up-heavy assignments.",
    prereqs: ["Probability", "Linear algebra"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "machine-learning", role: "core" },
      { id: "interactive-intelligence", role: "core" },
      { id: "computational-perception", role: "elective" },
    ],
    tags: ["ML", "Python", "writing"],
  },
  {
    code: "CS 7642",
    title: "Reinforcement Learning",
    shortTitle: "RL",
    description:
      "Foundations and modern methods in RL: MDPs, TD learning, policy gradients, function approximation, and deep RL.",
    prereqs: ["ML or equivalent", "Probability"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "machine-learning", role: "elective" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["RL", "Python", "papers"],
  },
  {
    code: "CS 7643",
    title: "Deep Learning",
    shortTitle: "DL",
    description:
      "Modern deep learning: architectures, optimization, regularization, attention, transformers, and generative models.",
    prereqs: ["ML or equivalent", "Linear algebra", "Calculus"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "machine-learning", role: "elective" },
      { id: "computational-perception", role: "elective" },
      { id: "interactive-intelligence", role: "elective" },
    ],
    tags: ["DL", "PyTorch", "papers"],
  },
  {
    code: "CS 7646",
    title: "Machine Learning for Trading",
    shortTitle: "ML4T",
    description:
      "Applied ML in financial markets: data, indicators, supervised/RL approaches, and portfolio strategies.",
    prereqs: ["Python"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "machine-learning", role: "elective" },
      { id: "computing-systems", role: "elective" },
    ],
    tags: ["ML", "Python", "first course"],
  },
  {
    code: "CS 7650",
    title: "Natural Language Processing",
    shortTitle: "NLP",
    description:
      "Statistical and neural NLP: language modeling, sequence labeling, parsing, semantics, and modern transformer architectures.",
    prereqs: ["ML helpful"],
    termsOffered: ["Fall", "Spring"],
    specs: [
      { id: "interactive-intelligence", role: "core" },
      { id: "machine-learning", role: "elective" },
    ],
    tags: ["NLP", "PyTorch", "papers"],
  },
  {
    code: "CSE 6220",
    title: "High-Performance Computing",
    shortTitle: "HPC",
    description:
      "Parallel algorithms and architectures: shared memory, distributed memory, GPUs, and analysis of scalability.",
    prereqs: ["C/C++", "Algorithms"],
    termsOffered: ["Fall", "Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["HPC", "C++", "MPI"],
  },
  {
    code: "CSE 6242",
    title: "Data & Visual Analytics",
    shortTitle: "DVA",
    description:
      "End-to-end data analytics pipeline: scraping, cleaning, modeling, scaling, and interactive D3 visualization.",
    prereqs: [],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "machine-learning", role: "core" },
      { id: "interactive-intelligence", role: "elective" },
      { id: "computing-systems", role: "elective" },
    ],
    tags: ["analytics", "D3", "Python", "team project"],
  },
  {
    code: "ISYE 6420",
    title: "Bayesian Statistics",
    description:
      "Bayesian inference, MCMC, hierarchical models, and applied case studies using PyMC/Stan.",
    prereqs: ["Probability", "Statistics"],
    termsOffered: ["Spring"],
    specs: [{ id: "machine-learning", role: "elective" }],
    tags: ["statistics", "Python", "math-heavy"],
  },
  {
    code: "CS 8803-O08",
    title: "Compilers: Theory & Practice",
    shortTitle: "Compilers",
    description:
      "Frontends, IRs, optimizations, and codegen. Build a working compiler over the semester.",
    prereqs: ["Discrete math", "C++"],
    termsOffered: ["Spring"],
    specs: [{ id: "computing-systems", role: "elective" }],
    tags: ["compilers", "C++", "LLVM"],
  },
  {
    code: "CS 8803-GA",
    title: "Graduate Algorithms",
    shortTitle: "GA",
    description:
      "Graduate-level algorithm design: dynamic programming, divide-and-conquer, graphs, NP-hardness, randomized and approximation algorithms.",
    prereqs: ["Undergrad algorithms"],
    termsOffered: ["Fall", "Spring", "Summer"],
    specs: [
      { id: "computing-systems", role: "core" },
      { id: "machine-learning", role: "core" },
      { id: "interactive-intelligence", role: "core" },
      { id: "computational-perception", role: "core" },
      { id: "human-computer-interaction", role: "core" },
    ],
    tags: ["algorithms", "proofs", "exams", "required"],
  },
];

export function buildBaseCourse(seed: Seed): Course {
  const id = seed.code.replace(/\s+/g, "-");
  return {
    id,
    code: seed.code,
    title: seed.title,
    shortTitle: seed.shortTitle,
    credits: seed.credits ?? 3,
    description: seed.description,
    prereqs: seed.prereqs ?? [],
    termsOffered: seed.termsOffered,
    specializations: seed.specs,
    tags: seed.tags,
    stats: {
      avgDifficulty: 0,
      avgWorkload: 0,
      avgRating: 0,
      numReviews: 0,
      distDifficulty: [0, 0, 0, 0, 0],
      distRating: [0, 0, 0, 0, 0],
      distWorkload: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  };
}
