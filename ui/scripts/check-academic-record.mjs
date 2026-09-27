import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const temp = await mkdtemp(join(tmpdir(), "omscs-academic-record-"))
try {
  const outfile = join(temp, "record.mjs")
  await build({
    stdin: {
      contents: 'export { estimatedGpa, exportAcademicRecord } from "./lib/data/academic-record.ts"; export { COURSES_BY_ID } from "./lib/data/index.ts";',
      resolveDir: process.cwd(),
      sourcefile: "academic-record-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    tsconfig: "tsconfig.json",
    logLevel: "silent",
  })
  const { estimatedGpa, exportAcademicRecord, COURSES_BY_ID } = await import(pathToFileURL(outfile).href)
  const originalCredits = COURSES_BY_ID["CS-6200"].credits
  COURSES_BY_ID["CS-6200"].credits = 2
  const attempt = (id, courseId, outcome) => ({ id, courseId, term: "Fall-2025", outcome })
  const attempts = [
    attempt("first", "CS-6200", "F"),
    attempt("repeat", "CS-6200", "A"),
    attempt("other", "CS-6210", "B"),
    attempt("withdrawn", "CS-6210", "W"),
    attempt("unresolved", "CS-6210", "I"),
    attempt("withdrawal-only", "CS-6250", "W"),
  ]
  const result = estimatedGpa(attempts)
  assert.equal(result.gradedHours, 7)
  assert.equal(result.gradedAttempts, 3)
  assert.equal(result.omittedOutcomes, 3)
  assert.equal(result.value, 17 / 7, "F and repeat A both count at actual credits")
  assert.equal(estimatedGpa(attempts.slice(3)).value, null)
  COURSES_BY_ID["CS-6200"].credits = originalCredits

  const data = { plan: { unassigned: ["CS-6200"], "Fall-2027": ["CS-6210"] }, selectedSpec: "computing-systems", attempts, revision: 2 }
  const exported = exportAcademicRecord(data, "2026-09-27T00:00:00.000Z")
  assert.deepEqual(exported.intendedCourses, [{ courseId: "CS-6200", term: "unassigned" }, { courseId: "CS-6210", term: "Fall-2027" }])
  assert.equal(exported.selectedSpecialization, "computing-systems")
  assert.deepEqual(exported.completedCourses, [{ courseId: "CS-6200" }, { courseId: "CS-6210" }])
  assert.deepEqual(exported.courseAttempts, attempts)
  assert.equal(exported.version, 1)
  assert.equal("revision" in exported, false)
  console.log("Academic record weighted GPA, repeats, exclusions, and export checks passed.")
} finally {
  await rm(temp, { recursive: true, force: true })
}
