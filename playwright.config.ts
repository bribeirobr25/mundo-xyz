import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
