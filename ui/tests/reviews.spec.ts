import { expect, test } from "@playwright/test"

test("verified author publishes, edits, deletes, and reposts under one pseudonym", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "review-lifecycle")
  })
  const api = "http://127.0.0.1:8799/courses/CS-6200/reviews"
  await page.goto("/courses/CS-6200")
  await page.getByRole("button", { name: "Write a review" }).click()
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Publish review" }) })
  await form.locator("textarea").fill("Too short")
  await form.getByRole("button", { name: "Publish review" }).click()
  await expect(form.getByRole("alert")).toHaveText("Review must be at least 20 characters.")
  await form.locator("textarea").fill("My first review describes the course and its assignments.")
  await form.getByPlaceholder("e.g. Fall 2025").fill("S".repeat(65))
  await form.getByRole("button", { name: "Publish review" }).click()
  await expect(form.getByRole("alert")).toHaveText("Semester must be 64 characters or fewer.")
  await form.getByPlaceholder("e.g. Fall 2025").fill("Fall 2025")
  await form.getByRole("button", { name: "Publish review" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Review published." })).toBeVisible()
  await expect(page.getByText("My first review describes the course and its assignments.")).toBeVisible()
  const initial = await (await page.request.get(`${api}?source=app`)).json()
  expect(initial.reviews).toHaveLength(1)
  const first = initial.reviews[0]
  expect(first.metadata.pseudonym).toMatch(/^Reviewer-[0-9a-f]{16}$/)
  expect(JSON.stringify(initial)).not.toContain("student@gatech.edu")
  expect(JSON.stringify(initial)).not.toContain("userId")
  await expect(page.getByText(`By ${first.metadata.pseudonym}`)).toBeVisible()
  await expect(page.getByRole("button", { name: "Write a review" })).toHaveCount(0)

  const denied = await page.request.put(`${api}/me`, {
    headers: { authorization: "Bearer fixture:review-outsider" },
    data: { semester: "Fall 2025", difficulty: 3, workload: 12, rating: 5,
      recommend: true, programStage: "Mid", body: "Outsider attempted to change another review." },
  })
  expect(denied.status()).toBe(404)
  await page.getByRole("button", { name: "Edit your review" }).click()
  await page.locator("form").locator("textarea").fill("Edited review describes course projects in more detail.")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toBeVisible()
  await expect(page.getByText("Edited review describes course projects in more detail.")).toBeVisible()
  await page.getByRole("button", { name: "Delete your review" }).click()
  await page.getByRole("button", { name: "Confirm delete" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Review deleted." })).toBeVisible()
  await expect(page.getByText("Edited review describes course projects in more detail.")).toHaveCount(0)
  await page.getByRole("button", { name: "Write a review" }).click()
  await page.locator("form").locator("textarea").fill("Reposted review remains a separate public contribution.")
  await page.getByRole("button", { name: "Publish review" }).click()
  await expect(page.getByText("Reposted review remains a separate public contribution.")).toBeVisible()
  const after = await (await page.request.get(`${api}?source=app&includeDeleted=true`)).json()
  expect(after.reviews).toHaveLength(1)
  expect(after.reviews[0].id).not.toBe(first.id)
  expect(after.reviews[0].metadata.pseudonym).toBe(first.metadata.pseudonym)
  expect((await (await page.request.get("http://127.0.0.1:8799/courses/CS-6515/reviews?source=omscentral")).json()).reviews.length).toBeGreaterThan(0)
  expect((await page.request.delete(`${api}/me`, {
    headers: { authorization: "Bearer fixture:review-lifecycle" },
  })).status()).toBe(200)
})

test("review write failure keeps draft and shows service error", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "review-service-error")
  })
  await page.goto("/courses/CS-6200")
  await page.getByRole("button", { name: "Write a review" }).click()
  const draft = "This draft remains intact while the review service is unavailable."
  await page.locator("form").locator("textarea").fill(draft)
  await page.route("**/courses/CS-6200/reviews", (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({ status: 503, json: { error: "Review service unavailable. Try again." } })
    return route.continue()
  })
  await page.getByRole("button", { name: "Publish review" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Review service unavailable. Try again.")
  await expect(page.locator("form").locator("textarea")).toHaveValue(draft)
})

test("successful write stays acknowledged if review refresh fails", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "review-refresh-failure")
  })
  const api = "http://127.0.0.1:8799/courses/CS-6200/reviews"
  await page.goto("/courses/CS-6200")
  await page.getByRole("button", { name: "Write a review" }).click()
  await page.locator("form textarea").fill("Review saved while the following list refresh fails.")
  await page.route("**/courses/CS-6200/reviews?source=all", (route) => route.abort())
  await page.getByRole("button", { name: "Publish review" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Review published. Review list unavailable" })).toBeVisible()
  await expect(page.getByRole("status").filter({ hasText: "Reviews unavailable" })).toBeVisible()
  expect((await page.request.delete(`${api}/me`, {
    headers: { authorization: "Bearer fixture:review-refresh-failure" },
  })).status()).toBe(200)
})

test("old code opens canonical Course with complete Imported Review text and original link", async ({
  page,
}) => {
  await page.goto("/courses/CS-8803-GA")
  await expect(page).toHaveURL(/courses\/CS-6515$/)
  await expect(
    page.getByText(
      "Final paragraph stays intact, with details beyond any preview.",
      { exact: false }
    )
  ).toBeVisible()
  await expect(
    page.getByText("OMSCentral Imported Review", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Read original review" })
  ).toHaveAttribute(
    "href",
    "https://www.omscentral.com/courses/graduate-algorithms/reviews#fixture-review"
  )
})

test("historical real-review page stays discoverable and excluded from future picks", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Historical review archive" }).click()
  await page
    .getByRole("link", { name: "CS 9999 · Historical fixture course" })
    .click()
  await expect(
    page.getByText("Historical imported review remains discoverable.")
  ).toBeVisible()
  await expect(
    page.getByText(
      "Historical course. Absent from the current OMSCS list; excluded from future Study Plan picks.",
      { exact: false }
    )
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Add unscheduled" })
  ).toHaveCount(0)
  await page.goto("/planner")
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click()
  await page.getByPlaceholder(/Find a .* course/).fill("9999")
  await expect(page.getByRole("button", { name: /CS 9999/ })).toHaveCount(0)
})

test("failed review reload preserves published facts, clears stale reviews and summaries, and offers retry", async ({
  page,
}) => {
  await page.goto("/courses/CS-6515")
  await expect(
    page.getByRole("link", { name: "Read original review" })
  ).toBeVisible()
  await page.route("**/courses/CS-6515/reviews?source=all", (route) =>
    route.abort()
  )
  await page.getByRole("button", { name: "Refresh reviews" }).click()
  await expect(page.getByRole("status")).toContainText("Reviews unavailable")
  await expect(
    page.getByRole("heading", { name: "Intro to Graduate Algorithms" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Official course" })
  ).toBeVisible()
  await expect(
    page.getByText("Last checked 2026-09-26", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Read original review" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Distributions" })
  ).toHaveCount(0)
  await expect(page.getByText("No reviews match these filters.")).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Retry reviews" })
  ).toBeVisible()
  await page.unrouteAll()
  await page.getByRole("button", { name: "Retry reviews" }).click()
  await expect(
    page.getByRole("link", { name: "Read original review" })
  ).toBeVisible()
})

test("Course summary labels loading separately from zero and unavailable", async ({
  page,
}) => {
  let release: (() => void) | undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/courses/CS-6515/reviews?source=all", async (route) => {
    await held
    await route.continue()
  })
  await page.goto("/courses/CS-6515")
  await expect(page.getByText("Loading review summary…")).toBeVisible()
  await expect(page.getByRole("status")).toContainText("Loading reviews…")
  release?.()
  await expect(page.getByText("Loading review summary…")).toHaveCount(0)
  await expect(page.getByText("Reviews (1)")).toBeVisible()
})

test("distributions count same eligible reviews shown after filters", async ({
  page,
}) => {
  await page.route("**/courses/CS-6515/reviews?source=all", async (route) => {
    const response = await route.fetch()
    const data = await response.json()
    data.reviews.push({
      ...data.reviews[0],
      id: "second-fixture-review",
      semester: "Spring 2025",
      rating: 5,
      difficulty: 4,
      workload: 20,
      body: "Second imported review with distinct ratings and workload.",
    })
    await route.fulfill({ response, json: data })
  })
  await page.goto("/courses/CS-6515")
  await expect(page.getByText("2 of 2")).toBeVisible()
  await expect(
    page.getByText("2 displayed reviews.", { exact: false })
  ).toBeVisible()
  const distributions = page.getByRole("region", { name: "Distributions" })
  await expect(distributions.getByText("n = 2")).toHaveCount(3)
  await page.getByPlaceholder("Filter by semester").fill("Spring")
  await expect(page.getByText("1 of 2")).toBeVisible()
  await expect(distributions.getByText("n = 1")).toHaveCount(3)
  await expect(
    page.getByText("Second imported review with distinct ratings and workload.")
  ).toBeVisible()
  await expect(
    page.getByText("First paragraph of the imported review.", { exact: false })
  ).toHaveCount(0)
})
