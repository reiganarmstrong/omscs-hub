import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, scenario = "verified") {
  await page.goto(`/sign-in?clerk=${scenario}`)
  await page.getByLabel("Email", { exact: true }).fill("student@gatech.edu")
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByLabel("Email code").fill("123456")
  await page.getByRole("button", { name: "Verify code" }).click()
}

test("guest browses Catalog and adds, assigns, reloads, and removes a local Study Plan course", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "OMSCS course catalog" })
  ).toBeVisible()
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6200")
  await page
    .getByRole("link", { name: /Introduction to Operating Systems/ })
    .first()
    .click()
  await page.getByRole("button", { name: "Add unscheduled" }).click()
  await page.goto("/planner")
  const course = page.getByRole("listitem").filter({ hasText: "CS 6200" })
  await expect(course).toBeVisible()
  await course.getByLabel("Term", { exact: true }).selectOption("Fall")
  await course.getByLabel("Year").selectOption("2026")
  await course.getByRole("button", { name: "Assign" }).click()
  await page.reload()
  await expect(
    page.getByRole("listitem").filter({ hasText: "CS 6200" })
  ).toBeVisible()
  await page
    .getByRole("listitem")
    .filter({ hasText: "CS 6200" })
    .getByRole("button", { name: "Remove from term" })
    .click()
  await page.reload()
  await expect(
    page.getByRole("listitem").filter({ hasText: "CS 6200" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true })
  ).toBeVisible()
})

test("verified primary Georgia Tech user signs in and gains review controls", async ({
  page,
}) => {
  await signIn(page)
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
  await page
    .getByPlaceholder("Search by code, title, tag, keyword…")
    .fill("6200")
  await page
    .getByRole("link", { name: /Introduction to Operating Systems/ })
    .first()
    .click()
  await expect(
    page.getByRole("button", { name: "Write a review" })
  ).toBeVisible()
})

for (const scenario of ["unverified", "non-gatech", "missing-primary"]) {
  test(`rejects ${scenario} primary despite verified Georgia Tech secondary`, async ({
    page,
  }) => {
    await signIn(page, scenario)
    await expect(
      page
        .getByRole("alert")
        .filter({
          hasText: "Sign-in requires a verified primary @gatech.edu email.",
        })
        .first()
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
    await expect(page.locator("body")).not.toContainText("private@example.com")
    await page
      .getByRole("link", { name: "Continue with a local Study Plan" })
      .click()
    await expect(
      page.getByRole("heading", { name: "Planner", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Add course" }).first()
    ).toBeVisible()
  })
}

test("restored ineligible session stays guest and is signed out", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "unverified")
  })
  await page.goto("/")
  await expect(
    page.getByRole("alert").filter({ hasText: "verified primary" })
  ).toContainText("verified primary @gatech.edu")
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "OMSCS course catalog" })
  ).toBeVisible()
})

test("non-Georgia-Tech email is rejected before requesting a code", async ({
  page,
}) => {
  await page.goto("/sign-in")
  await page.getByLabel("Email", { exact: true }).fill("prospect@example.com")
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Use your @gatech.edu email address."
  )
  await expect(page.getByLabel("Email code")).toHaveCount(0)
})

test("Clerk failure explains retry without revealing account details", async ({
  page,
}) => {
  await page.goto("/sign-in?clerk=account-error")
  await page.getByLabel("Email", { exact: true }).fill("student@gatech.edu")
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Unable to sign in. Check your email and code, or try again later."
  )
  await expect(page.locator("body")).not.toContainText("private@example.com")
  await expect(page.locator("body")).not.toContainText("user_private")
})

test("eligibility service failure keeps account controls locked and guest planning usable", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:8799/auth/session", (route) =>
    route.abort()
  )
  await signIn(page)
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Unable to verify sign-in|Unable to sign in/ })
      .first()
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
  await page
    .getByRole("link", { name: "Continue with a local Study Plan" })
    .click()
  await expect(
    page.getByRole("button", { name: "Add course" }).first()
  ).toBeVisible()
})

test("verified Georgia Tech email-code signup gains account controls", async ({
  page,
}) => {
  await page.goto("/sign-up?clerk=verified")
  await page.getByLabel("Email", { exact: true }).fill("student@gatech.edu")
  await page.getByRole("button", { name: "Create account" }).click()
  await page.getByLabel("Email code").fill("123456")
  await page.getByRole("button", { name: "Verify code" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
})
