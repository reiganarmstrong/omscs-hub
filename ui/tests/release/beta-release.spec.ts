import { expect, test } from "@playwright/test"
import {
  accountEmail,
  apiUrl,
  currentCourseCount,
  expectNoReviewData,
  navigate,
  resetStudyPlan,
  accountPlanSaved,
  signedInSkipReason,
  signIn,
} from "./target"

const reviewCourse = process.env.SMOKE_REVIEW_COURSE ?? "CS-6300"
const search = "Search by code, title, tag, keyword…"
const reviewRequest = (url: URL) =>
  url.href.startsWith(apiUrl) && url.pathname.includes("/reviews")

test("deployment serves the API with verified-only access and CORS for the public UI", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin
  const health = await page.request.get(`${apiUrl}/health`)
  expect(health.ok()).toBe(true)
  expect(await health.json()).toMatchObject({ ok: true, service: "omscs-hub-review-api" })

  const stats = await page.request.get(`${apiUrl}/reviews/catalog-stats`, {
    headers: { origin },
  })
  expect(stats.headers()["access-control-allow-origin"]).toBe(origin)
  const { courses } = (await stats.json()) as {
    courses: { courseId: string; numReviews: number }[]
  }
  // Imported Reviews exist in the deployed database.
  expect(courses.find((course) => course.courseId === "CS-6515")?.numReviews).toBeGreaterThan(0)

  for (const path of ["/auth/session", "/study-plan"]) {
    expect((await page.request.get(`${apiUrl}${path}`)).status()).toBe(401)
    expect(
      (
        await page.request.get(`${apiUrl}${path}`, {
          headers: { authorization: "Bearer not-a-clerk-token" },
        })
      ).status()
    ).toBe(401)
  }
})

test("anonymous visitor browses the full Catalog, course facts, real reviews, and current rules", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "OMSCS course catalog" })).toBeVisible()
  await expect(page.locator("article")).toHaveCount(currentCourseCount)
  await page.getByPlaceholder(search).fill("6515")
  const card = page.locator("article").filter({ hasText: "CS 6515" })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText(/Reviews\d+/)
  await card.getByRole("link", { name: "Intro to Graduate Algorithms", exact: true }).click()
  await expect(page).toHaveURL(/\/courses\/CS-6515\/?$/)
  await expect(page.getByRole("heading", { name: "Intro to Graduate Algorithms" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Official course" })).toBeVisible()
  await expect(page.getByText(/^Last checked \d{4}-\d{2}-\d{2}$/)).toBeVisible()

  await expect(page.getByText(/^Reviews \(\d+\)$/)).toBeVisible()
  await expect(page.getByText("OMSCentral Imported Review", { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Read original review" }).first()).toHaveAttribute(
    "href",
    /^https:\/\/www\.omscentral\.com\//
  )
  await expect(page.getByRole("link", { name: "Sign in to review" })).toBeVisible()

  await page.goto("/specializations")
  await expect(page.getByText("Current-catalog guidance", { exact: false }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Official specialization rules" })).toHaveAttribute(
    "href",
    /^https:\/\/omscs\.gatech\.edu\/specialization-/
  )
})

test("review service outage from first load keeps Catalog and course facts without review data", async ({
  page,
}) => {
  await page.route(reviewRequest, (route) => route.abort())
  await page.goto("/")
  await expect(page.getByRole("status")).toContainText(
    "Review statistics unavailable. Course facts remain available."
  )
  await expect(page.locator("article")).toHaveCount(currentCourseCount)
  await page.getByPlaceholder(search).fill("6515")
  const card = page.locator("article").filter({ hasText: "CS 6515" })
  await expect(card).toContainText("Unavailable")
  await expect(card).not.toContainText(/Reviews\d+/)
  await expect(card).not.toContainText("No reviews")

  await page.goto("/courses/CS-6515")
  await expect(page.getByRole("heading", { name: "Intro to Graduate Algorithms" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Official course" })).toBeVisible()
  await expect(page.getByText(/^Last checked \d{4}-\d{2}-\d{2}$/)).toBeVisible()
  await expectNoReviewData(page)
})

test("review service failure after course page load clears reviews and keeps course facts", async ({
  page,
}) => {
  await page.goto("/courses/CS-6515")
  await expect(page.getByRole("link", { name: "Read original review" }).first()).toBeVisible()
  await page.route(reviewRequest, (route) => route.abort())
  await page.getByRole("button", { name: "Refresh reviews" }).click()
  await expectNoReviewData(page)
  await expect(page.getByRole("heading", { name: "Intro to Graduate Algorithms" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Official course" })).toBeVisible()
  await page.unrouteAll()
  await page.getByRole("button", { name: "Retry reviews" }).click()
  await expect(page.getByRole("link", { name: "Read original review" }).first()).toBeVisible()
})

test.describe("verified Georgia Tech account", () => {
  test.skip(Boolean(signedInSkipReason), signedInSkipReason ?? "")

  test("private Study Plan and current-rule progress follow the account across devices", async ({
    page,
    browser,
  }, info) => {
    await signIn(page, info)
    await resetStudyPlan(page)

    await navigate(page, "Specializations")
    await page.getByRole("button", { name: /^Computer Graphics\b/ }).click()
    await page.getByRole("button", { name: "Pick this track" }).click()
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Graphics core · pick 1" }) })
      .getByRole("listitem")
      .filter({ hasText: "Video Game Design" })
      .getByRole("button", { name: "Add to plan" })
      .click()

    await navigate(page, "Planner")
    const completed = page.getByRole("region", { name: "Completed Courses" })
    await completed.getByLabel("Find Course for attempt").fill("6457")
    await completed.getByLabel("Course for attempt", { exact: true }).selectOption("CS-6457")
    await completed.getByLabel("Attempt season").selectOption("Fall")
    await completed.getByLabel("Attempt year").fill("2023")
    await completed.getByLabel("Attempt outcome").selectOption("B")
    await completed.getByRole("button", { name: "Record Course Attempt" }).click()
    const progress = page.getByRole("region", { name: "Planned and earned progress" })
    await expect(progress).toContainText("Current-catalog progress guidance")
    await expect(progress).toContainText("Earned from latest attempts")
    await expect(progress).toContainText(
      "3/30 credit hours · 1/5 specialization slots · 0/5 free electives"
    )
    await expect(progress).toContainText("not an official degree audit")

    const secondDevice = await browser.newContext(info.project.use)
    const other = await secondDevice.newPage()
    await signIn(other, info)
    try {
      await expect(async () => {
        await other.goto("/planner")
        await expect(other.getByText(accountPlanSaved)).toBeVisible({ timeout: 5_000 })
        await expect(
          other.getByRole("listitem").filter({ hasText: "CS 6457" }).first()
        ).toBeVisible({ timeout: 2_000 })
        await expect(
          other
            .getByRole("region", { name: "Completed Courses" })
            .getByRole("listitem", { name: "Attempt 1 for CS-6457" })
            .getByLabel("Outcome")
        ).toHaveValue("B", { timeout: 2_000 })
      }).toPass({ timeout: 30_000 })
      await navigate(other, "Specializations")
      await expect(other.getByText("Selected as your track")).toBeVisible()
      await expect(other.getByLabel("Earned progress")).toContainText(
        "3/30 credit hours · 1/5 specialization slots · 0/5 free electives"
      )
      // The private Study Plan API refuses requests without the owner's session.
      expect((await other.request.get(`${apiUrl}/study-plan`)).status()).toBe(401)
    } finally {
      await resetStudyPlan(other)
      await secondDevice.close()
    }
  })

  test("Hub Review author publishes, edits, and deletes under a pseudonym", async ({
    page,
  }, info) => {
    await signIn(page, info)
    await page.goto(`/courses/${reviewCourse}`)
    await expect(page.getByText(/^Reviews \(\d+\)$/)).toBeVisible()
    // Recover from an interrupted earlier run before starting the lifecycle.
    const leftover = page.getByRole("button", { name: "Delete your review" })
    const write = page.getByRole("button", { name: "Write a review" })
    await expect(leftover.or(write)).toBeVisible()
    if (await leftover.isVisible()) {
      await leftover.click()
      await page.getByRole("button", { name: "Confirm delete" }).click()
      await expect(page.getByRole("status").filter({ hasText: "Review deleted." })).toBeVisible()
    }

    const stamp = `${info.project.name} ${Date.now()}`
    const body = `Release smoke review ${stamp}; this check deletes it immediately.`
    const edited = `Edited release smoke review ${stamp}; this check deletes it immediately.`
    await write.click()
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Publish review" }) })
    await form.locator("textarea").fill(body)
    await form.getByPlaceholder("e.g. Fall 2025").fill("Fall 2025")
    await form.getByRole("button", { name: "Publish review" }).click()
    try {
      await expect(page.getByRole("status").filter({ hasText: "Review published." })).toBeVisible()
      const own = page.getByRole("listitem").filter({ hasText: body })
      await expect(own).toContainText("OMSCS Hub")
      await expect(own.getByText(/^By Reviewer-[0-9a-f]{16}$/)).toBeVisible()
      await expect(page.locator("body")).not.toContainText(accountEmail())

      await page.getByRole("button", { name: "Edit your review" }).click()
      await page.locator("form textarea").fill(edited)
      await page.getByRole("button", { name: "Save changes" }).click()
      await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toBeVisible()
      await expect(page.getByText(edited)).toBeVisible()
    } finally {
      if (await page.getByRole("button", { name: "Delete your review" }).isVisible()) {
        await page.getByRole("button", { name: "Delete your review" }).click()
        await page.getByRole("button", { name: "Confirm delete" }).click()
      }
    }
    await expect(page.getByRole("status").filter({ hasText: "Review deleted." })).toBeVisible()
    await expect(page.getByText(edited)).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Write a review" })).toBeVisible()
    const publicReviews = await page.request.get(
      `${apiUrl}/courses/${reviewCourse}/reviews?source=app`
    )
    expect(await publicReviews.text()).not.toContain(edited)
  })
})
