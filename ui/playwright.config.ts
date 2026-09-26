import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3101", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/api-server.mjs",
      url: "http://127.0.0.1:8799/health",
      reuseExistingServer: false,
    },
    {
      command: "node tests/next-server.mjs",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        OMSCS_BROWSER_TEST: "1",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8799",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Zml4dHVyZS5leGFtcGxlJA",
      },
    },
  ],
})
