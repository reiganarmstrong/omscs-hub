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
    "9 combined 4000-level/non-CS/CSE hours planned"
  )
})

test("browser keeps intended and earned progress separate after a lower repeat grade", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "omscs-hub:planner:v1",
      JSON.stringify({ unassigned: ["CS-6457", "CS-6515"] })
    )
    localStorage.setItem(
      "omscs-hub:prefs:v1",
      JSON.stringify({ selectedSpec: "computer-graphics" })
    )
    localStorage.setItem(
      "omscs-hub:attempts:v1",
      JSON.stringify([
        {
          id: "00000000-0000-4000-8000-000000000191",
          courseId: "CS-6457",
          term: "Fall-2023",
          outcome: "B",
        },
        {
          id: "00000000-0000-4000-8000-000000000192",
          courseId: "CS-6457",
          term: "Spring-2024",
          outcome: "C",
        },
      ])
    )
  })
  await page.goto("/planner")
  const progress = page.getByRole("region", {
    name: "Planned and earned progress",
  })
  await expect(progress).toContainText("Intended")
  await expect(progress).toContainText("6/30 credit hours")
  await expect(progress).toContainText("Earned from latest attempts")
  await expect(progress).toContainText(
    "3/30 credit hours · 0/5 specialization slots · 1/5 free electives"
  )
  await expect(
    progress.getByRole("link", { name: "Official degree requirements" })
  ).toHaveAttribute("href", "https://omscs.gatech.edu/degree-requirements")
  await page.goto("/specializations")
  await page.getByRole("button", { name: /^Computer Graphics\b/ }).click()
  await expect(page.getByLabel("Earned progress")).toContainText(
    "3/30 credit hours · 0/5 specialization slots · 1/5 free electives"
  )
})

test("browser applies latest grades and never uses one course in two buckets", async ({
  page,
}) => {
  await page.goto("/planner")
  const progress = page.getByRole("region", {
    name: "Planned and earned progress",
  })
  const rows = [
    {
      name: "C then B",
      grades: [
        ["CS-6457", "Fall-2023", "C"],
        ["CS-6457", "Spring-2024", "B"],
      ],
      expected:
        "3/30 credit hours · 1/5 specialization slots · 0/5 free electives",
    },
    {
      name: "C then F",
      grades: [
        ["CS-6457", "Fall-2023", "C"],
        ["CS-6457", "Spring-2024", "F"],
      ],
      expected:
        "0/30 credit hours · 0/5 specialization slots · 0/5 free electives",
    },
    {
      name: "two C attempts",
      grades: [
        ["CS-6457", "Fall-2023", "C"],
        ["CS-6457", "Spring-2024", "C"],
      ],
      expected:
        "3/30 credit hours · 0/5 specialization slots · 1/5 free electives",
    },
    {
      name: "overlapping buckets",
      grades: [
        ["CS-6457", "Fall-2023", "A"],
        ["CS-6491", "Fall-2023", "B"],
        ["CS-6515", "Fall-2023", "A"],
      ],
      expected:
        "9/30 credit hours · 3/5 specialization slots · 0/5 free electives",
    },
  ]
  for (const row of rows) {
    await page.evaluate((grades) => {
      localStorage.setItem(
        "omscs-hub:prefs:v1",
        JSON.stringify({ selectedSpec: "computer-graphics" })
      )
      localStorage.setItem(
        "omscs-hub:attempts:v1",
        JSON.stringify(
          grades.map(([courseId, term, outcome], index) => ({
            id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            courseId,
            term,
            outcome,
          }))
        )
      )
    }, row.grades)
    await page.reload()
    await expect(progress.getByText(row.expected).last()).toBeVisible()
  }
})
