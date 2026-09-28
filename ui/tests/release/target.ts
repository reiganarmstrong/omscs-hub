// One release journey suite, two targets: the local UI+API harness or a deployed beta.
import { readFileSync } from "node:fs"
import { expect, type Page, type TestInfo } from "@playwright/test"

const deployedUi = process.env.SMOKE_BASE_URL
export const deployed = Boolean(deployedUi)

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required when SMOKE_BASE_URL is set.`)
  return value
}

export const apiUrl = deployed
  ? required("SMOKE_API_URL").replace(/\/$/, "")
  : "http://127.0.0.1:8799"

// Deployed signed-in journeys need a real verified @gatech.edu Clerk account.
// SMOKE_ANONYMOUS_ONLY=1 skips them explicitly; missing credentials never pass silently.
export const signedInSkipReason =
  deployed && process.env.SMOKE_ANONYMOUS_ONLY === "1"
    ? "SMOKE_ANONYMOUS_ONLY=1 skips signed-in journeys."
    : null
const credentials = () =>
  deployed
    ? { email: required("SMOKE_EMAIL"), code: required("SMOKE_EMAIL_CODE") }
    : { email: "student@gatech.edu", code: "123456" }

export const accountEmail = () => credentials().email

export const currentCourseCount = (
  JSON.parse(
    readFileSync(new URL("../../lib/data/catalog.json", import.meta.url), "utf8")
  ) as { courses: unknown[] }
).courses.length

// Local runs share one API database, so each layout signs in as its own fixture user.
export const fixtureUser = (info: TestInfo) => `release-${info.project.name}`

export async function signIn(page: Page, info: TestInfo) {
  const { email, code } = credentials()
  await page.goto(deployed ? "/sign-in" : `/sign-in?clerk=${fixtureUser(info)}`)
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByLabel("Email code").fill(code)
  await page.getByRole("button", { name: "Verify code" }).click()
  await page.waitForURL((url) => url.pathname === "/")
}

export const accountPlanSaved = "Study Plan saved to your private account."

// Full page loads refetch the account plan; in-app navigation keeps the loaded plan.
export async function navigate(page: Page, name: "Catalog" | "Specializations" | "Planner") {
  await page.getByRole("link", { name, exact: true }).filter({ visible: true }).first().click()
}

// Leave the smoke account's private plan empty before and after each run.
export async function resetStudyPlan(page: Page) {
  await page.goto("/planner")
  await expect(page.getByText(accountPlanSaved)).toBeVisible()
  await page.getByRole("button", { name: "None", exact: true }).click()
  const completed = page.getByRole("region", { name: "Completed Courses" })
  const removeAttempt = completed.getByRole("button", { name: /^Remove attempt/ })
  while ((await removeAttempt.count()) > 0) {
    const before = await removeAttempt.count()
    await removeAttempt.first().click()
    await expect(removeAttempt).toHaveCount(before - 1)
  }
  await page.getByRole("button", { name: "Clear plan" }).click()
  await expect(async () => {
    await page.goto("/planner")
    await expect(page.getByText(accountPlanSaved)).toBeVisible({ timeout: 5_000 })
    await expect(removeAttempt).toHaveCount(0, { timeout: 1_000 })
    await expect(page.getByRole("button", { name: /^Remove from (plan|term)$/ })).toHaveCount(0, { timeout: 1_000 })
    await expect(page.getByRole("region", { name: "Planned and earned progress" })).toContainText(
      "Current-catalog credit guidance",
      { timeout: 1_000 }
    )
  }).toPass({ timeout: 30_000 })
}

export async function expectNoReviewData(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: "Reviews unavailable" })).toContainText(
    "Course facts remain available."
  )
  await expect(page.getByText("Review summary unavailable.")).toBeVisible()
  await expect(page.getByText(/^Reviews \(\d+\)$/)).toHaveCount(0)
  await expect(page.getByText("OMSCentral Imported Review")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Read original review" })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Distributions" })).toHaveCount(0)
  await expect(page.getByText("No reviews yet.")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Write a review" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Sign in to review" })).toHaveCount(0)
}
