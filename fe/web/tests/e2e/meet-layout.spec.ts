import { expect, test } from "@playwright/test";

const offer = "/meet/offer?moment=00000000-0000-4000-8000-0000000000f1";

test("Meet QR fits its white panel and scan continues to the result", async ({ page }) => {
  await page.goto(offer);
  const qr = page.getByRole("img", { name: "Demo QR, not scannable", exact: true });
  await expect(qr).toBeVisible();
  const panel = await page.getByRole("figure", { name: "Meet QR code" }).boundingBox();
  const image = await qr.boundingBox();
  expect(panel).not.toBeNull(); expect(image).not.toBeNull();
  expect(image!.x).toBeGreaterThanOrEqual(panel!.x);
  expect(image!.y).toBeGreaterThanOrEqual(panel!.y);
  expect(image!.x + image!.width).toBeLessThanOrEqual(panel!.x + panel!.width + 1);
  expect(image!.y + image!.height).toBeLessThanOrEqual(panel!.y + panel!.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Simulate scan" }).click();
  await expect(page.getByRole("heading", { name: /You and .* were here/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
});

test("Meet onboarding preserves the destination and allows reviewing the privacy details", async ({ page }) => {
  await page.goto("/meet/onboarding?next=" + encodeURIComponent(offer));
  const choice = page.getByRole("switch", { name: /Save my Meets onchain/ });
  await expect(choice).toHaveAttribute("aria-checked", "true");
  await choice.click();
  await expect(choice).toHaveAttribute("aria-checked", "false");
  await page.getByRole("link", { name: "Learn more" }).click();
  await expect(page.getByRole("heading", { name: "What's recorded?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/meet\/offer\?moment=/);
  await expect(page.getByRole("figure", { name: "Meet QR code" })).toBeVisible();
});

test("expired Meet QR keeps regeneration beside the code", async ({ page }) => {
  await page.clock.install();
  await page.goto(offer);
  await expect(page.getByRole("img", { name: "Demo QR, not scannable", exact: true })).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole("figure", { name: "Meet QR code" })).toContainText("Expired");
  await page.getByRole("button", { name: "New QR", exact: true }).click();
  await expect(page.getByRole("img", { name: "Demo QR, not scannable", exact: true })).toBeVisible();
});

test("desktop Meet dialog keeps keyboard focus inside and Escape closes it", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "Desktop dialog behavior");
  await page.goto(offer);
  await expect(page.getByRole("dialog", { name: "Show this to your friend" })).toBeVisible();
  const close = page.getByRole("button", { name: "Close", exact: true });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Simulate scan" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/map$/);
});
