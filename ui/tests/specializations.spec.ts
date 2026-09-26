import { expect, test } from "@playwright/test"

const expected = [
  {
    name: "Artificial Intelligence",
    free: 5,
    slug: "artificial-intelligence-formerly-interactive-intelligence",
  },
  { name: "Computer Graphics", free: 5, slug: "computer-graphics" },
  { name: "Computing Systems", free: 4, slug: "computing-systems" },
  {
    name: "Computational Perception and Robotics",
    free: 5,
    slug: "computational-perception-and-robotics",
  },
  {
    name: "Human-Computer Interaction",
    free: 5,
    slug: "human-computer-interaction",
  },
  { name: "Machine Learning", free: 5, slug: "machine-learning" },
]

test("browser shows sourced current-catalog guidance for all six specializations", async ({
  page,
}) => {
  await page.goto("/specializations")
  for (const item of expected) {
    await page
      .getByRole("button", { name: new RegExp(`^${item.name}\\b`) })
      .click()
    await expect(
      page.getByRole("heading", { name: item.name, exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Current-catalog guidance", { exact: false })
    ).toBeVisible()
    await expect(
      page.getByText("Last checked 2026-09-26", { exact: false })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Official specialization rules" })
    ).toHaveAttribute(
      "href",
      `https://omscs.gatech.edu/specialization-${item.slug}`
    )
    await expect(
      page.getByRole("heading", { name: `Pick ${item.free} free electives` })
    ).toBeVisible()
    await expect(
      page.getByText("two foundational courses with B or better", {
        exact: false,
      })
    ).toBeVisible()
  }
  await expect(
    page.getByText("degree completion", { exact: false })
  ).toBeVisible()
})

test("browser counts an overlapping graphics course only once", async ({
  page,
}) => {
  await page.goto("/specializations")
  await page.getByRole("button", { name: /^Computer Graphics\b/ }).click()
  const graphics = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Graphics core · pick 1" }),
  })
  await graphics
    .getByRole("listitem")
    .filter({ hasText: "Video Game Design" })
    .getByRole("button", { name: "Add to plan" })
    .click()
  await expect(graphics).toContainText("1 / 1")
  const electives = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Graphics electives · pick 3" }),
  })
  await expect(electives).toContainText("0 / 3")
  const free = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Pick 5 free electives" }),
  })
  await expect(free).toContainText("0 / 5")
})

test("browser flags planned non-CS/CSE hours above the catalog cap", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "omscs-hub:planner:v1",
      JSON.stringify({
        unassigned: ["ISYE-6402", "ISYE-6414", "ISYE-6420"],
      })
    )
  )
  await page.goto("/specializations")
  const free = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Pick 5 free electives" }),
  })
  await expect(free).toContainText("2 / 5")
  await expect(page.getByRole("status")).toContainText(
    "9 non-CS/CSE hours planned"
  )
})
