import { defineConfig, devices } from "@playwright/test"

// Release smoke against a deployed beta. See docs/deployment.md for required env.
const baseURL = process.env.SMOKE_BASE_URL
if (!baseURL) throw new Error("SMOKE_BASE_URL is required for deployed smoke checks.")

export default defineConfig({
  testDir: "./tests/release",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // Both layouts share one smoke account; run serially so they never race.
  workers: 1,
  retries: 1,
  outputDir: "test-results/deployed",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/deployed", open: "never" }]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
