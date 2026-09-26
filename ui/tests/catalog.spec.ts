import { expect, test } from "@playwright/test"

test("current zero-review course remains discoverable with default filters and dated official facts", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6422")
  const card = page.locator("article").filter({ hasText: "CS 6422" })
  await expect(card).toBeVisible()
  await expect(card).toContainText("No reviews")
  await expect(card).toContainText("Reviews0")
  await expect(card).toContainText("3 credit hours")
  await expect(
    card.getByRole("link", { name: "Official course" })
  ).toHaveAttribute(
    "href",
    "https://omscs.gatech.edu/cs-6422-database-system-implementation"
  )
  await expect(card).toContainText("2026-09-26")
  await card
    .getByRole("link", { name: "Database System Implementation", exact: true })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Database System Implementation",
      exact: true,
    })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Official course" })
  ).toHaveAttribute(
    "href",
    "https://omscs.gatech.edu/cs-6422-database-system-implementation"
  )
  await expect(
    page.getByText("Last checked 2026-09-26", { exact: true })
  ).toBeVisible()
})

test("Catalog uses real imported aggregates and minimum-review filtering", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6515")
  const card = page.locator("article").filter({ hasText: "CS 6515" })
  await expect(card).toContainText("Reviews1")
  await expect(card).toContainText("4.0")
  await expect(card).toContainText("Difficulty3.0")
  await expect(card).toContainText("Workload12")
  await page.getByRole("spinbutton").fill("2")
  await expect(card).toHaveCount(0)
})

test("Catalog review outage stays distinct from zero and leaves courses visible", async ({
  page,
}) => {
  await page.route("**/reviews/catalog-stats", (route) => route.abort())
  await page.goto("/")
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6422")
  const card = page.locator("article").filter({ hasText: "CS 6422" })
  await expect(card).toBeVisible()
  await expect(page.getByRole("status")).toContainText(
    "Review statistics unavailable"
  )
  await expect(card).toContainText("Unavailable")
  await expect(card).not.toContainText("No reviews")
  await expect(card).not.toContainText("Reviews0")
  await page.unrouteAll()
  await page.getByRole("button", { name: "Retry statistics" }).click()
  await expect(card).toContainText("Reviews0")
})

test("Specializations and Study Plan omit seeded review statistics", async ({
  page,
}) => {
  await page.goto("/specializations")
  await expect(page.getByText("Diff", { exact: true })).toHaveCount(0)
  await expect(page.getByText("hr/wk", { exact: true })).toHaveCount(0)
  await page.goto("/planner")
  await expect(page.getByText("Avg difficulty", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Avg workload", { exact: true })).toHaveCount(0)
})

test("former course codes find one canonical course across detail, Specializations and Study Plan", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.locator("article")).toHaveCount(77)
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("CS-8803-GA")
  const course = page.locator("article")
  await expect(course).toHaveCount(1)
  await expect(course).toContainText("CS 6515")
  await course
    .getByRole("link", { name: "Intro to Graduate Algorithms", exact: true })
    .click()
  await expect(page).toHaveURL(/courses\/CS-6515$/)
  await page.goto("/courses/CS-8803-GA")
  await expect(page).toHaveURL(/courses\/CS-6515$/)
  await expect(
    page.getByText("Former codes: CS 8803 GA. These refer to this same Course.")
  ).toBeVisible()
  await page.getByRole("button", { name: "Add unscheduled" }).click()
  await page.goto("/specializations")
  await expect(
    page.getByRole("link", {
      name: "Intro to Graduate Algorithms",
      exact: true,
    })
  ).toHaveCount(1)
  await page.goto("/planner")
  const planned = page.getByRole("listitem").filter({ hasText: "CS 6515" })
  await expect(planned).toHaveCount(1)
  await expect(planned).toContainText("Intro to Graduate Algorithms")
  await expect(page.locator("body")).not.toContainText("CS 8803 GA")
})

test("unknown preparation stays explicit in table view and new current courses remain future plan choices", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6435")
  await page.getByRole("button", { name: "Table", exact: true }).click()
  const course = page.locator("article")
  await expect(course).toContainText("Digital Health Equity")
  await expect(course).toContainText(
    "Unverified. Check the official course page."
  )
  await expect(
    course.getByRole("link", { name: "Credit source" })
  ).toBeVisible()
  await course
    .getByRole("link", { name: "Digital Health Equity", exact: true })
    .click()
  await expect(
    page.getByText(
      "Unverified for future terms. Current-list inclusion does not guarantee a term offering."
    )
  ).toBeVisible()
  await page.goto("/planner")
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click()
  await page.getByPlaceholder(/Find a .* course/).fill("6435")
  await page
    .getByRole("button", { name: /CS 6435 Digital Health Equity/ })
    .click()
  await page.reload()
  await expect(
    page.getByRole("listitem").filter({ hasText: "CS 6435" })
  ).toBeVisible()
})

test("existing local alias placements deduplicate while preserving the planned Course", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "omscs-hub:planner:v1",
      JSON.stringify({
        unassigned: ["CS-8803-GA", "CS-6515"],
      })
    )
  )
  await page.goto("/planner")
  const course = page.getByRole("listitem").filter({ hasText: "CS 6515" })
  await expect(course).toHaveCount(1)
  await expect(course).toContainText("Intro to Graduate Algorithms")
  await page.reload()
  await expect(course).toHaveCount(1)
})

test("course detail schedules an unverified Summer choice", async ({
  page,
}) => {
  await page.goto("/courses/CS-6422")
  await page.getByRole("button", { name: "Schedule…" }).click()
  await page.locator("select").first().selectOption("Summer")
  await page.locator("select").nth(1).selectOption("2027")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(
    page.getByText("Planned · Summer 2027", { exact: true })
  ).toBeVisible()
})
