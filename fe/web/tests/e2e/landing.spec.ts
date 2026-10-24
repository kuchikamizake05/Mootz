import { expect, test } from "@playwright/test";
test("landing preserves animations and includes app previews", async ({ page }) => {
 await page.goto("/");
 await expect(page.locator("#hero")).toBeVisible();
 await expect(page.locator("#calls .app-screen")).toHaveCount(5);
 await expect(page.locator('script[data-8b-part="scene:calls"]')).toHaveCount(1);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("moment gallery switches front and rear previews without navigation", async ({ page }) => {
 await page.emulateMedia({ reducedMotion: "reduce" });
 await page.goto("/#rooms");
 const photo = page.locator(".rooms__photo").first();
 const original = await photo.locator(".rooms__rear").getAttribute("src");
 await photo.click();
 await expect(photo).toHaveAttribute("aria-pressed", "true");
 await expect(photo.locator(".rooms__rear")).not.toHaveAttribute("src", original!);
 await photo.press("Enter");
 await expect(photo).toHaveAttribute("aria-pressed", "false");
 await expect(photo.locator(".rooms__rear")).toHaveAttribute("src", original!);
 await expect(page).toHaveURL(/\/#rooms$/);
});
