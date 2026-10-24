import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Demo fixture IDs (src/features/*/demo.ts).
const momentA = "00000000-0000-4000-8000-00000000000a";
const ownMoment = "00000000-0000-4000-8000-0000000000f1";
const dot = "00000000-0000-4000-8000-0000000000d1";
const event = "00000000-0000-4000-8000-0000000000e1";

const routes: Array<[name: string, path: string, ready: string | RegExp]> = [
  ["map", "/map", "Demo fixtures · fictional people"],
  ["feed", "/feed", "@demo_a"],
  ["moment", `/moments/${momentA}`, "Coffee before the next session."],
  ["comments", `/moments/${momentA}/comments`, "Comments"],
  ["react", `/moments/${momentA}/react`, /reaction/i],
  // The test browser has no camera, so either the viewfinder or the camera-off state is fine.
  ["capture", "/capture", /back photo|Camera access is off/i],
  ["meet-offer", `/meet/offer?moment=${ownMoment}`, /Show this to your friend|Your friend scans this/],
  ["meet-accept", "/meet/accept", "Meet preview"],
  ["meet-onboarding", "/meet/onboarding", /onchain/i],
  ["meet-recorded", "/meet/whats-recorded", /recorded/i],
  ["dots", "/dots", "Your Dots"],
  ["dot", `/dots/${dot}`, "You and @demo_a were here"],
  ["profile", "/profile", /streak/i],
  ["profile-settings", "/profile/settings", /onchain/i],
  ["frames", "/frames", "Your frames"],
  ["friends", "/friends", "Friends"],
  ["event", `/events/${event}`, "Demo Workshop A"],
  ["event-collection", `/events/${event}/collection`, "Demo Workshop A frame"],
  ["organizer", "/organizer", /Demo Gathering B/i],
];

for (const [name, path, ready] of routes) {
  test(`${name} renders cleanly`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto(path);
    // Some labels exist twice with one copy hidden per breakpoint; wait for a visible one.
    await expect(page.getByText(ready).filter({ visible: true }).first()).toBeVisible();
    // Let images/fonts settle so overflow and contrast checks see the final layout.
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(1);

    await page.screenshot({ path: `.design-export/e2e/${info.project.name}/${name}.png`, fullPage: true });

    // MapLibre's own canvas/controls are third-party; audit our UI only.
    const results = await new AxeBuilder({ page }).exclude(".maplibregl-canvas").exclude(".maplibregl-ctrl").analyze();
    const serious = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")})`);
    expect(serious, "axe serious/critical violations").toEqual([]);

    // Ignore third-party noise: map tile hosts, and Privy's iframe refusing origins not
    // allow-listed in its dashboard (this suite runs on :3100). App errors must be zero.
    expect(errors.filter((e) => !/openfreemap|maptiler|Failed to load resource|auth\.privy\.io/i.test(e))).toEqual([]);
  });
}
