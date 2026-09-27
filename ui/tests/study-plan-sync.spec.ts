import { expect, test, type Page } from "@playwright/test"

const api = "http://127.0.0.1:8799/study-plan"
const account = (
  plan: Record<string, string[]>,
  selectedSpec: string | null,
  revision = 0
) => ({ plan, selectedSpec, revision })

async function seed(
  page: Page,
  user: string,
  plan: Record<string, string[]>,
  spec: string | null
) {
  const response = await page.request.put(api, {
    headers: { authorization: `Bearer fixture:${user}` },
    data: account(plan, spec),
  })
  expect(response.status()).toBe(200)
}

async function signIn(
  page: Page,
  scenario: string,
  plan: Record<string, string[]>,
  spec: string | null
) {
  await page.addInitScript(
    ({ plan, spec }) => {
      localStorage.setItem("omscs-hub:planner:v1", JSON.stringify(plan))
      localStorage.setItem(
        "omscs-hub:prefs:v1",
        JSON.stringify({ selectedSpec: spec })
      )
    },
    { plan, spec }
  )
  await page.goto(`/sign-in?clerk=${scenario}`)
  await page.getByLabel("Email", { exact: true }).fill("student@gatech.edu")
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByLabel("Email code").fill("123456")
  await page.getByRole("button", { name: "Verify code" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
  await page.getByRole("link", { name: "Review plans" }).click()
  await expect(
    page.getByRole("region", { name: "Choose Study Plan sync" })
  ).toBeVisible()
}

test("merge previews differences, requires conflict choices, and reloads across devices", async ({
  page,
  browser,
}) => {
  await seed(
    page,
    "merge",
    { "Summer-2027": ["CS-6200"], "Fall-2027": ["CS-6210", "CS-6250"] },
    "machine-learning"
  )
  await signIn(
    page,
    "merge",
    {
      "Fall-2026": ["CS-6200"],
      "Spring-2027": ["CS-6035"],
      "Fall-2027": ["CS-6210"],
    },
    "computing-systems"
  )
  const panel = page.getByRole("region", { name: "Choose Study Plan sync" })
  await expect(panel).toContainText("Only on this device: CS-6035")
  await expect(panel).toContainText("Only in your account: CS-6250")
  await expect(panel).toContainText("Same term in both: CS-6210")
  await expect(
    panel.getByRole("button", { name: "Merge plans" })
  ).toBeDisabled()
  await panel.getByLabel("Term for CS-6200").selectOption("account")
  await panel.getByLabel("Specialization to merge").selectOption("local")
  await panel.getByRole("button", { name: "Merge plans" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:merge" },
    })
  ).json()
  expect(saved.selectedSpec).toBe("computing-systems")
  expect(saved.plan["Summer-2027"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6035"])
  expect(saved.plan["Fall-2027"]).toEqual(["CS-6210", "CS-6250"])
  expect(
    Object.values(saved.plan)
      .flat()
      .filter((id) => id === "CS-6200")
  ).toHaveLength(1)
  await page.reload()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const device = await browser.newContext()
  const otherPage = await device.newPage()
  await otherPage.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "merge")
  })
  await otherPage.goto("/planner")
  await expect(
    otherPage.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  await expect(
    otherPage.getByRole("listitem").filter({ hasText: "CS 6200" })
  ).toHaveCount(1)
  await expect(
    otherPage.getByRole("listitem").filter({ hasText: "CS 6035" })
  ).toHaveCount(1)
  await device.close()
})

test("replace account with local saves only local placements", async ({
  page,
}) => {
  await seed(page, "replace", { "Fall-2027": ["CS-6210"] }, "machine-learning")
  await signIn(
    page,
    "replace",
    { "Fall-2026": ["CS-6200"] },
    "computing-systems"
  )
  await page.getByRole("button", { name: "Replace account with local" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:replace" },
    })
  ).json()
  expect(saved.plan).toEqual({ "Fall-2026": ["CS-6200"] })
  expect(saved.selectedSpec).toBe("computing-systems")
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("omscs-hub:planner:v1") ?? "{}")
      )
    )
    .toEqual({ "Fall-2026": ["CS-6200"] })
})

test("keep account leaves server and local draft unchanged", async ({
  page,
}) => {
  await seed(page, "keep", { "Fall-2027": ["CS-6210"] }, "machine-learning")
  await signIn(page, "keep", { "Fall-2026": ["CS-6200"] }, "computing-systems")
  await page.getByRole("button", { name: "Keep account plan" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:keep" },
    })
  ).json()
  expect(saved).toEqual(
    account({ "Fall-2027": ["CS-6210"] }, "machine-learning", 1)
  )
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("omscs-hub:planner:v1") ?? "{}")
    )
  ).toEqual({ "Fall-2026": ["CS-6200"] })
  await page.reload()
  await expect(
    page.getByRole("region", { name: "Choose Study Plan sync" })
  ).toHaveCount(0)
})

test("failed sync reports unsaved plan and retry persists it", async ({
  page,
}) => {
  await seed(page, "failure", { "Fall-2027": ["CS-6210"] }, null)
  await signIn(page, "failure", { "Fall-2026": ["CS-6200"] }, null)
  await page.route(api, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue()
  )
  await page.getByRole("button", { name: "Replace account with local" }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "Study Plan sync failed" })
  ).toBeVisible()
  expect(
    (
      await (
        await page.request.get(api, {
          headers: { authorization: "Bearer fixture:failure" },
        })
      ).json()
    ).plan
  ).toEqual({ "Fall-2027": ["CS-6210"] })
  await page.close()
  const reopened = await page.context().newPage()
  await reopened.goto("/planner")
  await expect(
    reopened
      .getByRole("alert")
      .filter({ hasText: "Unsaved Study Plan changes remain" })
  ).toBeVisible()
  await expect(
    reopened.getByRole("listitem").filter({ hasText: "CS 6200" })
  ).toHaveCount(1)
  await reopened.getByRole("button", { name: "Retry sync" }).click()
  await expect(
    reopened.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  expect(
    (
      await (
        await page.request.get(api, {
          headers: { authorization: "Bearer fixture:failure" },
        })
      ).json()
    ).plan
  ).toEqual({ "Fall-2026": ["CS-6200"] })
})

test("revision conflict fetches account changes and requires a new choice", async ({
  page,
}) => {
  await seed(page, "conflict", { "Fall-2027": ["CS-6210"] }, null)
  await signIn(page, "conflict", { "Fall-2026": ["CS-6200"] }, null)
  const changed = await page.request.put(api, {
    headers: { authorization: "Bearer fixture:conflict" },
    data: account({ "Spring-2027": ["CS-6035"] }, null, 1),
  })
  expect(changed.status()).toBe(200)
  await page.getByRole("button", { name: "Replace account with local" }).click()
  const panel = page.getByRole("region", { name: "Choose Study Plan sync" })
  await expect(panel.getByRole("alert")).toContainText(
    "Account changed in another session"
  )
  await expect(panel).toContainText("CS-6200")
  await expect(panel).toContainText("CS-6035")
  await panel.getByRole("button", { name: "Merge plans" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:conflict" },
    })
  ).json()
  expect(saved.plan["Fall-2026"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6035"])
})

test("edit made during conflict reload remains in the recovery draft", async ({
  page,
}) => {
  await seed(page, "conflict-edit", { "Fall-2027": ["CS-6210"] }, null)
  await signIn(page, "conflict-edit", { "Fall-2026": ["CS-6200"] }, null)
  const changed = await page.request.put(api, {
    headers: { authorization: "Bearer fixture:conflict-edit" },
    data: account({ "Spring-2027": ["CS-6250"] }, null, 1),
  })
  expect(changed.status()).toBe(200)
  let releaseReload!: () => void
  const heldReload = new Promise<void>((resolve) => {
    releaseReload = resolve
  })
  let reloadRequested = false
  await page.route(api, async (route) => {
    if (route.request().method() === "GET") {
      reloadRequested = true
      await heldReload
    }
    await route.continue()
  })
  await page.getByRole("button", { name: "Replace account with local" }).click()
  await expect.poll(() => reloadRequested).toBe(true)
  const spring = page.getByText("Spring 2027", { exact: true }).locator("../..")
  await spring.getByRole("button", { name: "Add course" }).click()
  await spring.getByPlaceholder("Find a Spring course…").fill("6035")
  await spring
    .getByRole("button", {
      name: /CS 6035 Introduction to Information Security/,
    })
    .click()
  releaseReload()
  const panel = page.getByRole("region", { name: "Choose Study Plan sync" })
  await expect(panel).toContainText("CS-6200")
  await expect(panel).toContainText("CS-6035")
  await expect(panel).toContainText("CS-6250")
  await panel.getByRole("button", { name: "Merge plans" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:conflict-edit" },
    })
  ).json()
  expect(saved.plan["Fall-2026"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6250", "CS-6035"])
})

test("one tab saving cannot erase another tab's failed draft", async ({
  page,
}) => {
  await seed(page, "two-tabs", {}, null)
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "two-tabs")
  })
  await page.goto("/planner")
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const popup = page.waitForEvent("popup")
  await page.evaluate(() => window.open("/planner", "_blank"))
  const other = await popup
  await expect(
    other.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  await other.route(api, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue()
  )
  const fall = other.getByText("Fall 2026", { exact: true }).locator("../..")
  await fall.getByRole("button", { name: "Add course" }).click()
  await fall.getByPlaceholder("Find a Fall course…").fill("6200")
  await fall
    .getByRole("button", { name: /CS 6200 Introduction to Operating Systems/ })
    .click()
  await expect(other.getByRole("button", { name: "Retry sync" })).toBeVisible()
  const spring = page.getByText("Spring 2027", { exact: true }).locator("../..")
  await spring.getByRole("button", { name: "Add course" }).click()
  await spring.getByPlaceholder("Find a Spring course…").fill("6035")
  await spring
    .getByRole("button", {
      name: /CS 6035 Introduction to Information Security/,
    })
    .click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  await other.close()
  const reopened = await page.context().newPage()
  await reopened.goto("/planner")
  const panel = reopened.getByRole("region", { name: "Choose Study Plan sync" })
  await expect(panel).toContainText("CS-6200")
  await expect(panel).toContainText("CS-6035")
  await panel.getByRole("button", { name: "Merge plans" }).click()
  await expect(
    reopened.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:two-tabs" },
    })
  ).json()
  expect(saved.plan["Fall-2026"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6035"])
})

test("two quick account edits both save while first write is in flight", async ({
  page,
}) => {
  await seed(page, "queued", {}, null)
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "queued")
  })
  await page.goto("/planner")
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  let writes = 0
  await page.route(api, async (route) => {
    if (route.request().method() === "PUT" && ++writes === 1)
      await new Promise((resolve) => setTimeout(resolve, 900))
    await route.continue()
  })
  const fall = page.getByText("Fall 2026", { exact: true }).locator("../..")
  await fall.getByRole("button", { name: "Add course" }).click()
  await fall.getByPlaceholder("Find a Fall course…").fill("6200")
  await fall
    .getByRole("button", { name: /CS 6200 Introduction to Operating Systems/ })
    .click()
  await expect(
    page.getByText("Saving Study Plan to your account…")
  ).toBeVisible()
  const spring = page.getByText("Spring 2027", { exact: true }).locator("../..")
  await spring.getByRole("button", { name: "Add course" }).click()
  await spring.getByPlaceholder("Find a Spring course…").fill("6035")
  await spring
    .getByRole("button", {
      name: /CS 6035 Introduction to Information Security/,
    })
    .click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  expect(writes).toBe(2)
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:queued" },
    })
  ).json()
  expect(saved.plan["Fall-2026"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6035"])
})

test("remote change after failed sync reopens explicit reconciliation", async ({
  page,
}) => {
  await seed(page, "stale", { "Fall-2027": ["CS-6210"] }, null)
  await signIn(page, "stale", { "Fall-2026": ["CS-6200"] }, null)
  await page.route(api, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue()
  )
  await page.getByRole("button", { name: "Replace account with local" }).click()
  await expect(page.getByRole("button", { name: "Retry sync" })).toBeVisible()
  const changed = await page.request.put(api, {
    headers: { authorization: "Bearer fixture:stale" },
    data: account({ "Spring-2027": ["CS-6035"] }, null, 1),
  })
  expect(changed.status()).toBe(200)
  await page.unroute(api)
  await page.reload()
  const panel = page.getByRole("region", { name: "Choose Study Plan sync" })
  await expect(panel.getByRole("alert")).toContainText(
    "Account changed while sync failed"
  )
  await expect(panel).toContainText("CS-6200")
  await expect(panel).toContainText("CS-6035")
  await panel.getByRole("button", { name: "Merge plans" }).click()
  await expect(
    page.getByText("Study Plan saved to your private account.")
  ).toBeVisible()
  const saved = await (
    await page.request.get(api, {
      headers: { authorization: "Bearer fixture:stale" },
    })
  ).json()
  expect(saved.plan["Fall-2026"]).toEqual(["CS-6200"])
  expect(saved.plan["Spring-2027"]).toEqual(["CS-6035"])
})

test("guest plan stays local and another owner cannot access account plan", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "omscs-hub:planner:v1",
      JSON.stringify({ "Fall-2026": ["CS-6200"] })
    )
  )
  await page.goto("/planner")
  await expect(
    page.getByRole("listitem").filter({ hasText: "CS 6200" })
  ).toHaveCount(1)
  expect(
    (
      await (
        await page.request.get(api, {
          headers: { authorization: "Bearer fixture:guest-owner" },
        })
      ).json()
    ).plan
  ).toEqual({})
  await seed(page, "owner-a", { "Fall-2027": ["CS-6210"] }, null)
  expect(
    (
      await (
        await page.request.get(api, {
          headers: { authorization: "Bearer fixture:owner-b" },
        })
      ).json()
    ).plan
  ).toEqual({})
  expect(
    (
      await page.request.put(api, {
        headers: { authorization: "Bearer fixture:owner-b" },
        data: account({ "Fall-2026": ["CS-6200"] }, null, 1),
      })
    ).status()
  ).toBe(409)
  expect(
    (
      await (
        await page.request.get(api, {
          headers: { authorization: "Bearer fixture:owner-a" },
        })
      ).json()
    ).plan
  ).toEqual({ "Fall-2027": ["CS-6210"] })
})
