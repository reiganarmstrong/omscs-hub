import { expect, test } from "@playwright/test"

const api = "http://127.0.0.1:8799/study-plan"

test("guest sees limited estimate but no account export", async ({ page }) => {
  await page.goto("/planner")
  await expect(page.getByRole("region", { name: "Estimated GPA" })).toContainText("—")
  await expect(page.getByRole("button", { name: "Export private Study Plan (JSON)" })).toHaveCount(0)
})

test("owner sees all graded repeats in estimate and downloads full private record", async ({ page }) => {
  const attempts = [
    { id: "00000000-0000-4000-8000-000000000201", courseId: "CS-6200", term: "Fall-2021", outcome: "F" },
    { id: "00000000-0000-4000-8000-000000000202", courseId: "CS-6200", term: "Spring-2022", outcome: "A" },
    { id: "00000000-0000-4000-8000-000000000203", courseId: "CS-6210", term: "Fall-2022", outcome: "B" },
    { id: "00000000-0000-4000-8000-000000000204", courseId: "CS-6210", term: "Spring-2023", outcome: "W" },
    { id: "00000000-0000-4000-8000-000000000205", courseId: "CS-6210", term: "Fall-2023", outcome: "I" },
    { id: "00000000-0000-4000-8000-000000000206", courseId: "CS-6250", term: "Spring-2024", outcome: "W" },
  ]
  const plan = { unassigned: ["CS-6250"], "Fall-2027": ["CS-6200"] }
  expect((await page.request.put(api, { headers: { authorization: "Bearer fixture:academic-export" }, data: { plan, selectedSpec: "computing-systems", attempts, revision: 0 } })).status()).toBe(200)
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "academic-export")
  })
  await page.goto("/planner")
  await expect(page.getByText("Study Plan saved to your private account.")).toBeVisible()
  const estimate = page.getByRole("region", { name: "Estimated GPA" })
  await expect(estimate).toContainText("2.33")
  await expect(estimate).toContainText("3 graded attempts · 9 attempted credit hours")
  await expect(estimate).toContainText("Missing coursework and approved grade substitution")
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export private Study Plan (JSON)" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^omscs-hub-academic-record-account-\d{4}-\d{2}-\d{2}\.json$/)
  const content = await (await import("node:fs/promises")).readFile(await download.path(), "utf8")
  const record = JSON.parse(content)
  expect(record).toMatchObject({ format: "omscs-hub-academic-record", version: 1, selectedSpecialization: "computing-systems" })
  expect(record.intendedCourses).toEqual([{ courseId: "CS-6250", term: "unassigned" }, { courseId: "CS-6200", term: "Fall-2027" }])
  expect(record.completedCourses).toEqual([{ courseId: "CS-6200" }, { courseId: "CS-6210" }])
  expect(record.courseAttempts).toEqual(attempts)
  expect(record).not.toHaveProperty("revision")
  await expect(page.getByRole("link", { name: "Export format" })).toHaveAttribute("href", "/about#academic-record-export")

  await page.route(api, (route) => route.request().method() === "PUT" ? route.abort() : route.continue())
  await page.getByRole("listitem", { name: "Attempt 1 for CS-6200" }).getByLabel("Outcome").selectOption("D")
  await expect(page.getByRole("button", { name: "Retry sync" })).toBeVisible()
  const draftPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export account Study Plan draft (JSON)" }).click()
  const draft = await draftPromise
  const draftRecord = JSON.parse(await (await import("node:fs/promises")).readFile(await draft.path(), "utf8"))
  expect(draftRecord.courseAttempts[0].outcome).toBe("D")
  expect((await (await page.request.get(api, { headers: { authorization: "Bearer fixture:academic-export" } })).json()).attempts[0].outcome).toBe("F")
})
