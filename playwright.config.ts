import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5180",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    // Software WebGL so the 3D viewport renders identically on machines without a GPU.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
