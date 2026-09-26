import { expect, test } from "@playwright/test"

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
