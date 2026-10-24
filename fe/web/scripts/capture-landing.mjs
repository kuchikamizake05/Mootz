import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../../", import.meta.url);
const assets = new URL("landing/assets/", root);
const baseURL = process.env.LANDING_CAPTURE_URL ?? "http://localhost:3102";
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error("Capture only a local demo instance.");
const rear = await readFile(new URL("mootz-friends-rear-v1.png", assets));
const front = await readFile(new URL("mootz-friends-front-v1.png", assets));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  if (process.env.LANDING_CAPTURE_DEBUG) {
    page.on("requestfailed", (request) => { if (request.url().includes("openfreemap")) console.log("Map request failed:", new URL(request.url()).hostname, request.failure()?.errorText); });
    page.on("response", (response) => { if (response.url().includes("openfreemap") && response.status() >= 400) console.log("Map HTTP:", response.status()); });
  }
  // Never ship the original private design fixtures inside public screenshots.
  await page.route("**/demo/**", async (route) => {
    const name = new URL(route.request().url()).pathname;
    await route.fulfill({ contentType: "image/png", body: /generated-(?:2|4|5)\.jpg$/.test(name) ? front : rear });
  });
  await mkdir(assets, { recursive: true });
  const shots = [
    ["feed", "/feed", "Swap front and back photos by You"],
    ["map", "/map", "Locate me"],
    ["meet", "/meet/accept", "Meet preview"],
    ["event", "/events/00000000-0000-4000-8000-0000000000e1", "View moments"],
    ["profile", "/profile", "Friends"],
  ];
  for (const [name, route, control] of shots) {
    if (process.env.LANDING_CAPTURE_ONLY && !process.env.LANDING_CAPTURE_ONLY.split(",").includes(name)) continue;
    await page.goto(baseURL + route, { waitUntil: "domcontentloaded" });
    if (name === "meet") await page.getByRole("button", { name: "Approve", exact: true }).waitFor({ timeout: 60_000 });
    else await page.getByRole(/Locate me|Swap/.test(control) ? "button" : "link", { name: control, exact: true }).waitFor({ timeout: 60_000 });
    if (name === "map" || name === "event") {
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    if (name === "map") {
      await page.getByText("Loading the map…", { exact: true }).waitFor({ state: "hidden", timeout: 45_000 });
      if (await page.getByText("The map couldn’t load.", { exact: true }).isVisible()) throw new Error("Map is unavailable; do not publish a loading/error capture.");
    }
    const text = await page.locator("body").textContent();
    if (!/Demo fixtures|Demo profile|Demo|demo/.test(text ?? "")) throw new Error(`Unlabelled demo: ${route}`);
    await page.locator("nextjs-portal").evaluateAll((portals) => {
      for (const portal of portals) portal.style.setProperty("display", "none", "important");
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    });
    if (name === "profile") await page.locator('a[href="/dots"]').scrollIntoViewIfNeeded();
    await page.locator("nextjs-portal").evaluateAll((portals) => {
      for (const portal of portals) portal.style.setProperty("display", "none", "important");
    });
    const pixels = await page.screenshot({ animations: "disabled", timeout: 20_000 });
    await sharp(pixels).webp({ quality: 88 }).toFile(fileURLToPath(new URL(`app-${name}.webp`, assets)));
    if (name === "feed") {
      await page.getByRole("button", { name: "Show selfie by You", exact: true }).click();
      await sharp(await page.screenshot({ animations: "disabled" })).webp({ quality: 88 })
        .toFile(fileURLToPath(new URL("app-feed-swapped.webp", assets)));
    }
    console.log(`Captured ${name}: actual UI with approved fictional photos.`);
  }
} finally { await browser.close(); }
