import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4187", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --port 4187 --strictPort",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "touch", use: { ...devices["Pixel 7"] } },
  ],
});
