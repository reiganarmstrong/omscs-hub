import { expect, test } from "@playwright/test";

test("planner rolls 18 terms at a season boundary and preserves earlier recorded terms", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-08-07T12:00:00Z"));
  await page.addInitScript(() =>
    localStorage.setItem("omscs-hub:planner:v1", JSON.stringify({ "Fall-2024": ["CS-6035"], unassigned: ["CS-6271"] })),
  );
  await page.goto("/planner");
  await expect(page.getByText("Summer 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Spring 2032", { exact: true })).toBeVisible();
  await expect(page.getByText("Fall 2024", { exact: true })).toBeVisible();
  await expect(page.getByText("Summer 2032", { exact: true })).toHaveCount(0);

  await page.clock.setFixedTime(new Date("2026-08-08T12:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Summer 2032", { exact: true })).toBeVisible();
  await expect(page.getByText("Fall 2024", { exact: true })).toBeVisible();
  await expect(page.getByText("Summer 2026", { exact: true })).toHaveCount(0);
  const unassigned = page.getByRole("listitem").filter({ hasText: "CS 6271" });
  await expect(unassigned.getByRole("combobox", { name: "Year" })).toHaveValue("2027");
  await unassigned.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByText("Summer 2027", { exact: true }).locator("../..").getByRole("listitem").filter({ hasText: "CS 6271" })).toBeVisible();
});

test("planner shows confirmed, typical, and unverified evidence and keeps unverified choice", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-26T12:00:00Z"));
  await page.goto("/planner");

  const fall = page.getByText("Fall 2026", { exact: true }).locator("../..");
  await fall.getByRole("button", { name: "Add course" }).click();
  await fall.getByPlaceholder("Find a Fall course…").fill("6035");
  const confirmed = fall.getByRole("button", { name: /CS 6035 Introduction to Information Security/ });
  await expect(confirmed).toContainText("Confirmed Fall 2026 online section O01");
  await confirmed.click();
  await expect(fall.getByRole("link", { name: "Official schedule", exact: true })).toHaveAttribute("href", /oscar\.gatech\.edu/);

  const spring = page.getByText("Spring 2027", { exact: true }).locator("../..");
  await spring.getByRole("button", { name: "Add course" }).click();
  await spring.getByPlaceholder("Find a Spring course…").fill("6210");
  await expect(spring.getByRole("button", { name: /CS 6210 Advanced Operating Systems/ })).toContainText("Typically offered in Spring");
  await spring.getByPlaceholder("Find a Spring course…").fill("6271");
  const unverified = spring.getByRole("button", { name: /CS 6271 Cybersecurity of Drones/ });
  await expect(unverified).toContainText("Unverified for Spring 2027");
  await unverified.click();
  await expect(spring.getByRole("listitem").filter({ hasText: "CS 6271" })).toContainText("Unverified for Spring 2027");
  await page.reload();
  await expect(spring.getByRole("listitem").filter({ hasText: "CS 6271" })).toContainText("Unverified for Spring 2027");
});
