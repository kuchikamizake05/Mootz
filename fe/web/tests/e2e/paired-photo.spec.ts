import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/demo/generated*.jpg", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#6D28D9"/></svg>',
  }));
});

test("Feed photo switches both ways with tap and keyboard", async ({ page }) => {
  await page.goto("/feed");
  const swap = page.getByRole("button", { name: /Swap front and back photos/ }).first();
  await expect(swap).toBeEnabled();
  const original = await swap.locator("img").getAttribute("src");
  const pair = swap.locator("..");
  const inset = pair.getByRole("button", { name: /Show selfie/ });
  const selfie = await inset.locator("img").getAttribute("src");
  await inset.click();
  await expect(swap.locator("img")).toHaveAttribute("src", selfie!);
  await expect(swap).toHaveAttribute("aria-pressed", "true");
  await swap.focus();
  await page.keyboard.press("Enter");
  await expect(swap.locator("img")).toHaveAttribute("src", original!);
  await expect(swap).toHaveAttribute("aria-pressed", "false");
  await expect(swap.locator("img")).toHaveJSProperty("naturalWidth", 1200);
});

test("Map preview swaps photos without leaving Map", async ({ page }) => {
  await page.goto("/map");
  await page.getByRole("button", { name: "Moment by Demo friend A" }).click();
  const sheet = page.getByRole("region", { name: "Moment by Demo friend A" });
  const swap = sheet.getByRole("button", { name: /Swap front and back photos/ });
  await swap.click();
  await expect(swap).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/map\?/);
  await expect(sheet.locator("button button")).toHaveCount(0);
  await sheet.getByRole("button", { name: "Open Demo friend A's moment in Feed" }).click();
  await expect(page).toHaveURL(/\/feed\?/);
});
