import { defineConfig, devices } from "@playwright/test";

/**
 * UI e2e in demo-fixture mode (no backend, no wallet). Uses the locally installed
 * Chrome, so no browser download is needed. Real two-device Meet, camera and wallet
 * flows can't be automated here and stay manual (docs/verification.md).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "narrow-360", use: { viewport: { width: 360, height: 700 }, isMobile: true, hasTouch: true } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 900 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
  ],
  // A production build on its own port: no HMR socket, no on-demand compilation.
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/map",
    reuseExistingServer: true,
    timeout: 300_000,
    env: { NEXT_PUBLIC_DEMO_FIXTURES: "1" },
  },
});
