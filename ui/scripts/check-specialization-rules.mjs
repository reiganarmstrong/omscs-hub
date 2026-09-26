import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const temp = await mkdtemp(join(tmpdir(), "omscs-rules-"))
try {
  const outfile = join(temp, "rules.mjs")
  await build({
    entryPoints: ["lib/data/specializations.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    tsconfig: "tsconfig.json",
    logLevel: "silent",
  })
  const { SPECIALIZATIONS, bucketProgress } = await import(
    pathToFileURL(outfile).href
  )
  const expected = new Map([
    ["Artificial Intelligence", [5, 5]],
    ["Computer Graphics", [5, 5]],
    ["Computing Systems", [4, 6]],
    ["Computational Perception and Robotics", [5, 5]],
    ["Human-Computer Interaction", [5, 5]],
    ["Machine Learning", [5, 5]],
  ])
  assert.equal(SPECIALIZATIONS.length, expected.size)
  for (const spec of SPECIALIZATIONS) {
    const [free, slots] = expected.get(spec.name) ?? []
    assert.equal(spec.freeElectiveCount, free, spec.name)
    assert.equal(
      spec.requirements.reduce((sum, bucket) => sum + bucket.pick, 0),
      slots,
      spec.name
    )
    assert.equal(spec.lastChecked, "2026-09-26")
    assert.match(
      spec.sourceUrl,
      /^https:\/\/omscs\.gatech\.edu\/specialization-/
    )
    for (const bucket of spec.requirements) {
      assert.ok(
        bucket.poolCourseIds.length >= bucket.pick,
        `${spec.name}: ${bucket.id}`
      )
    }
  }
  const ai = SPECIALIZATIONS.find(
    (spec) => spec.name === "Artificial Intelligence"
  )
  assert.deepEqual(ai.requirements[0].poolCourseIds, ["CS-6300", "CS-6515"])
  const examples = [
    ["Computer Graphics", "cg-graphics", "CS-7496"],
    ["Computing Systems", "cs-electives", "CS-6422"],
    ["Computational Perception and Robotics", "cpr-robotics", "CS-7638"],
    ["Human-Computer Interaction", "hci-design", "CS-6435"],
    ["Machine Learning", "ml-electives", "ISYE-6420"],
  ]
  for (const [name, bucketId, courseId] of examples) {
    const spec = SPECIALIZATIONS.find((entry) => entry.name === name)
    assert.ok(
      spec.requirements
        .find((bucket) => bucket.id === bucketId)
        .poolCourseIds.includes(courseId),
      `${name}: ${courseId}`
    )
  }
  const graphics = SPECIALIZATIONS.find(
    (spec) => spec.name === "Computer Graphics"
  )
  const matched = bucketProgress(
    graphics,
    new Set(["CS-6457", "CS-6491", "CS-6515"])
  )
  assert.equal(matched.matchedFulfilled, 3)
  assert.equal(matched.byBucket["cg-graphics"].count, 1)
  assert.equal(matched.byBucket["cg-algorithms"].count, 1)
  assert.equal(matched.byBucket["cg-electives"].count, 1)
  assert.equal(matched.freeElectivesUsed, 0)
  const one = bucketProgress(graphics, new Set(["CS-6457"]))
  assert.equal(one.matchedFulfilled, 1)
  assert.equal(one.freeElectivesUsed, 0)
  const ml = SPECIALIZATIONS.find((spec) => spec.name === "Machine Learning")
  const capped = bucketProgress(
    ml,
    new Set(["CS-6515", "CS-7641", "CSE-6242", "CSE-6250", "ISYE-6420"])
  )
  assert.equal(capped.nonCsPlannedHours, 3)
  assert.equal(capped.byBucket["ml-electives"].count, 3)
  assert.equal(capped.freeElectivesUsed, 0)
  const freeCapped = bucketProgress(
    ai,
    new Set(["ISYE-6402", "ISYE-6414", "ISYE-6420"])
  )
  assert.equal(freeCapped.freeElectivesUsed, 2)
  console.log(
    "All six sourced rule tables and overlapping-course assignment passed."
  )
} finally {
  await rm(temp, { recursive: true, force: true })
}
