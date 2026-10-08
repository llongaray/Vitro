import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://demo.localhost:8080",
    ...devices["Desktop Chrome"],
  },
});
