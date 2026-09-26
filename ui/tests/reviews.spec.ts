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
