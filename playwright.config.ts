import { defineConfig } from "@playwright/test";
import { LOCAL_ORIGIN, LOCAL_PORT } from "./src/local-dev.js";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  use: {
    baseURL: LOCAL_ORIGIN,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm start",
    url: `${LOCAL_ORIGIN}/api/health`,
    env: { ...process.env, PORT: String(LOCAL_PORT), APP_ORIGIN: LOCAL_ORIGIN },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
