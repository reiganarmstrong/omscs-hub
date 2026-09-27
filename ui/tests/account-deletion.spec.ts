import { expect, test } from "@playwright/test"

test.afterEach(async ({ request }) => {
  await request.delete("http://127.0.0.1:8799/courses/CS-6515/reviews/me", {
    headers: { authorization: "Bearer fixture:account-preserved" },
  })
})

test("deliberate account deletion removes private records and Hub Reviews while preserving imports and another user", async ({ page }) => {
  const base = "http://127.0.0.1:8799"
  const courseReviews = `${base}/courses/CS-6515/reviews`
  const deletedUser = "account-deletion"
  const otherUser = "account-preserved"
  const headers = (user: string) => ({ authorization: `Bearer fixture:${user}` })
  const record = (outcome: string) => ({
    revision: 0, plan: { "Fall-2026": ["CS-6200"] }, selectedSpec: "computing-systems",
    attempts: [{ id: crypto.randomUUID(), courseId: "CS-6200", term: "Fall-2026", outcome }],
  })
  const review = (body: string) => ({ semester: "Fall 2026", difficulty: 3, workload: 12, rating: 5, recommend: true, programStage: "Mid", body })

  expect((await page.request.put(`${base}/study-plan`, { headers: headers(deletedUser), data: record("A") })).status()).toBe(200)
  expect((await page.request.put(`${base}/study-plan`, { headers: headers(otherUser), data: record("B") })).status()).toBe(200)
  expect((await page.request.post(courseReviews, { headers: headers(deletedUser), data: review("Hub Review from the account to be deleted.") })).status()).toBe(201)
  expect((await page.request.post(courseReviews, { headers: headers(otherUser), data: review("Hub Review from the account to preserve.") })).status()).toBe(201)
  const before = await (await page.request.get(courseReviews)).json()
  const importedIds = before.reviews.filter((item: { source: string }) => item.source === "omscentral").map((item: { id: string }) => item.id)
  expect(importedIds.length).toBeGreaterThan(0)

  await page.addInitScript((scenario) => {
    if (sessionStorage.getItem("account-deletion-seeded")) return
    sessionStorage.setItem("account-deletion-seeded", "1")
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", scenario)
    localStorage.setItem("omscs-hub:planner:v1", JSON.stringify({ "Fall-2026": ["CS-6200"] }))
    localStorage.setItem("omscs-hub:pending-plan:user_account-deletion:other-tab", "unsaved academic data")
    localStorage.setItem("omscs-hub:plan-choice:user_account-deletion", "private academic fingerprint")
  }, deletedUser)
  await page.goto("/account")
  await expect(page.getByRole("heading", { name: "Delete your account" })).toBeVisible()
  const button = page.getByRole("button", { name: "Permanently delete account" })
  await expect(button).toBeDisabled()
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE")
  await expect(button).toBeDisabled()
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT")
  await button.click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("omscs-hub:planner:v1") ?? "null"))).toEqual({})
  expect(await page.evaluate(() => localStorage.getItem("omscs-hub:pending-plan:user_account-deletion:other-tab"))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem("omscs-hub:plan-choice:user_account-deletion"))).toBeNull()

  expect((await page.request.get(`${base}/study-plan`, { headers: headers(deletedUser) })).status()).toBe(401)
  expect((await page.request.get(`${courseReviews}/me`, { headers: headers(deletedUser) })).status()).toBe(401)
  const preserved = await (await page.request.get(`${base}/study-plan`, { headers: headers(otherUser) })).json()
  expect(preserved.plan).toEqual({ "Fall-2026": ["CS-6200"] })
  expect(preserved.attempts).toHaveLength(1)
  expect(preserved.attempts[0].outcome).toBe("B")
  const after = await (await page.request.get(courseReviews)).json()
  expect(after.reviews.some((item: { body: string }) => item.body.includes("account to be deleted"))).toBe(false)
  expect(after.reviews.some((item: { body: string }) => item.body.includes("account to preserve"))).toBe(true)
  expect(after.reviews.filter((item: { source: string }) => item.source === "omscentral").map((item: { id: string }) => item.id)).toEqual(importedIds)
  const summary = await (await page.request.get(`${courseReviews}/summary`)).json()
  expect(summary.summary.count).toBe(after.reviews.length)
})

test("pending Clerk deletion can be retried after reload without exposing account data", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("account-retry-seeded")) return
    sessionStorage.setItem("account-retry-seeded", "1")
    localStorage.setItem("clerk-fixture-session", "active")
    localStorage.setItem("clerk-fixture-scenario", "account-deletion-retry")
    localStorage.setItem("omscs-hub:planner:v1", JSON.stringify({ "Fall-2026": ["CS-6200"] }))
    localStorage.setItem("omscs-hub:attempts:v1", JSON.stringify([{ id: "attempt-private" }]))
    localStorage.setItem("omscs-hub:pending-plan:user_account-deletion-retry:tab", "private pending draft")
    localStorage.setItem("omscs-hub:plan-choice:user_account-deletion-retry", "private academic fingerprint")
  })
  await page.goto("/account")
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT")
  await page.getByRole("button", { name: "Permanently delete account" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "sign-in deletion is pending" })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("omscs-hub:planner:v1") ?? "null"))).toEqual({})
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("omscs-hub:attempts:v1") ?? "null"))).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem("omscs-hub:pending-plan:user_account-deletion-retry:tab"))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem("omscs-hub:plan-choice:user_account-deletion-retry"))).toBeNull()
  await page.reload()
  await expect(page.getByRole("status")).toContainText("Your Hub data was removed")
  await expect(page.getByRole("link", { name: "Finish account deletion" })).toBeVisible()
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT")
  await page.getByRole("button", { name: "Permanently delete account" }).click()
  await expect(page).toHaveURL("/")
  expect((await page.request.get("http://127.0.0.1:8799/study-plan", {
    headers: { authorization: "Bearer fixture:account-deletion-retry" },
  })).status()).toBe(401)
})
