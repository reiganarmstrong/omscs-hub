import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const temp = await mkdtemp(join(tmpdir(), "omscs-earned-"))
try {
  const outfile = join(temp, "rules.mjs")
  await build({
    stdin: {
      contents:
        'export { SPECIALIZATIONS, bucketProgress, earnedBucketProgress, latestAttemptEligibility, eligibleCreditHours } from "./lib/data/specializations.ts"; export { COURSES_BY_ID } from "./lib/data/index.ts";',
      resolveDir: process.cwd(),
      sourcefile: "earned-progress-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    tsconfig: "tsconfig.json",
    logLevel: "silent",
  })
  const {
    SPECIALIZATIONS,
    bucketProgress,
    earnedBucketProgress,
    latestAttemptEligibility,
    eligibleCreditHours,
    COURSES_BY_ID,
  } = await import(pathToFileURL(outfile).href)
  const graphics = SPECIALIZATIONS.find(
    (entry) => entry.id === "computer-graphics"
  )
  const ai = SPECIALIZATIONS.find(
    (entry) => entry.id === "artificial-intelligence"
  )
  let nextId = 0
  const attempt = (courseId, term, outcome) => ({
    id: `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
    courseId,
    term,
    outcome,
  })
  const first = attempt("CS-6457", "Fall-2023", "C")
  const later = attempt("CS-6457", "Spring-2024", "B")

  const cThenB = earnedBucketProgress(graphics, [later, first])
  assert.equal(
    cThenB.matchedFulfilled,
    1,
    "later B fills specialization even when entered first"
  )
  assert.equal(
    cThenB.freeElectivesUsed,
    0,
    "one course cannot fill both buckets"
  )
  assert.equal(cThenB.degreeHours, 3, "repeat credit counts once")

  const bThenC = earnedBucketProgress(graphics, [
    attempt("CS-6457", "Fall-2023", "B"),
    attempt("CS-6457", "Spring-2024", "C"),
  ])
  assert.equal(bThenC.matchedFulfilled, 0)
  assert.equal(bThenC.freeElectivesUsed, 1)
  assert.equal(bThenC.degreeHours, 3)

  const cThenF = earnedBucketProgress(graphics, [
    attempt("CS-6457", "Fall-2023", "C"),
    attempt("CS-6457", "Spring-2024", "F"),
  ])
  assert.equal(cThenF.matchedFulfilled, 0)
  assert.equal(cThenF.freeElectivesUsed, 0)
  assert.equal(cThenF.degreeHours, 0)
  assert.equal(
    latestAttemptEligibility([first, attempt("CS-6457", "Spring-2024", "D")])
      .degreeIds.size,
    0
  )

  const overlapping = earnedBucketProgress(graphics, [
    attempt("CS-6457", "Fall-2023", "A"),
    attempt("CS-6491", "Fall-2023", "B"),
    attempt("CS-6515", "Fall-2023", "A"),
  ])
  assert.equal(overlapping.matchedFulfilled, 3)
  assert.equal(overlapping.freeElectivesUsed, 0)
  assert.equal(overlapping.degreeCourseIds.size, 3)

  const planned = bucketProgress(ai, new Set(["CS-6300", "CS-6601", "CS-7637"]))
  const earned = earnedBucketProgress(ai, [
    attempt("CS-6300", "Fall-2023", "B"),
  ])
  assert.equal(planned.degreeHours, 9)
  assert.equal(earned.degreeHours, 3)
  assert.equal(planned.matchedFulfilled, 3)
  assert.equal(earned.matchedFulfilled, 1)

  const cap = earnedBucketProgress(ai, [
    attempt("ISYE-6402", "Fall-2023", "A"),
    attempt("ISYE-6414", "Spring-2024", "B"),
    attempt("ISYE-6420", "Fall-2024", "C"),
  ])
  assert.equal(cap.nonCsPlannedHours, 9)
  assert.equal(cap.degreeHours, 6)
  assert.equal(cap.freeElectivesUsed, 2)

  const originalCredits = COURSES_BY_ID["CS-6457"].credits
  COURSES_BY_ID["CS-6457"].credits = 1
  assert.equal(bucketProgress(graphics, new Set(["CS-6457"])).degreeHours, 1)
  assert.equal(
    earnedBucketProgress(graphics, [attempt("CS-6457", "Fall-2023", "A")])
      .degreeHours,
    1
  )
  COURSES_BY_ID["CS-6457"].credits = originalCredits

  COURSES_BY_ID["CS-4496"] = {
    ...COURSES_BY_ID["CS-6457"],
    id: "CS-4496",
    code: "CS 4496",
    credits: 3,
  }
  assert.equal(
    eligibleCreditHours(new Set(["CS-4496", "ISYE-6402", "ISYE-6414"])),
    6,
    "4000-level and non-CS/CSE courses share one six-hour limit"
  )
  delete COURSES_BY_ID["CS-4496"]

  console.log(
    "Earned progress repeat, grade, overlap, cap, and planned separation checks passed."
  )
} finally {
  await rm(temp, { recursive: true, force: true })
}
