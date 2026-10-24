import { expect, test } from "@playwright/test";

// Core journeys in demo-fixture mode. Real API, wallet, camera and two-device Meet are manual.

test("settings: Back discards the draft and Save persists it", async ({ page }) => {
  await page.goto("/profile");
  const toggle = page.getByRole("switch", { name: "Save my Meets onchain" });
  await expect(toggle).toBeEnabled();
  const initial = await toggle.getAttribute("aria-checked");
  await page.getByRole("link", { name: "Details", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/settings$/);
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(toggle).toHaveAttribute("aria-checked", initial!);
  await page.getByRole("link", { name: "Details", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/settings$/);
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(toggle).toHaveAttribute("aria-checked", initial === "true" ? "false" : "true");
});

test("map: select a moment, open the sheet, close it", async ({ page }) => {
  await page.goto("/map");
  await page.getByRole("button", { name: "Moment by Demo friend A" }).click();
  await expect(page).toHaveURL(/moment=00000000-0000-4000-8000-00000000000a/);
  await expect(page.getByRole("region", { name: "Moment by Demo friend A" })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(page).not.toHaveURL(/moment=/);
  await expect(page.getByRole("button", { name: "Post moment" })).toBeVisible();
});

test("map/feed switch keeps the filter", async ({ page }) => {
  await page.goto("/feed");
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByRole("radio", { name: /Events/ }).click();
  await expect(page).toHaveURL(/filter=events/);
  await page.keyboard.press("Escape");
  await expect(page.getByText("Faaid (you)")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/map\?filter=events/);
});

test("meet: scanner approves a demo preview and gets a Dot", async ({ page }) => {
  await page.goto("/meet/accept");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("You and your friend were here")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Saved onchain")).toBeVisible({ timeout: 10_000 });
});

test("meet: decline creates nothing", async ({ page }) => {
  await page.goto("/meet/accept");
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText(/No Dot|declined/i).first()).toBeVisible();
});

test("comments: post a comment", async ({ page }) => {
  await page.goto("/moments/00000000-0000-4000-8000-00000000000a/comments");
  const box = page.getByRole("textbox").first();
  await box.fill("See you at the workshop");
  await page.getByRole("button", { name: /^Send/ }).click();
  await expect(page.getByText("See you at the workshop")).toBeVisible();
});

test("dots: hide asks for confirmation and can be restored", async ({ page }) => {
  await page.goto("/dots/00000000-0000-4000-8000-0000000000d1");
  await page.getByRole("button", { name: "Hide from map" }).click();
  await expect(page.getByText("Hide this Dot?")).toBeVisible();
  await page.getByRole("button", { name: "Hide from map" }).last().click();
  await expect(page.getByRole("button", { name: "Show on map" })).toBeVisible();
});

test("events: check in with the demo code and claim the collectible", async ({ page }) => {
  await page.goto("/events/00000000-0000-4000-8000-0000000000e1/check-in");
  await page.getByRole("textbox").first().fill("DEMO-A");
  await page.getByRole("button", { name: /check/i }).last().click();
  // Demo state lives in memory, so move on with client-side navigation, not a reload.
  await page.getByRole("link", { name: /collectible|collection/i }).first().click();
  await page.getByRole("button", { name: "Claim event collectible" }).click();
  await expect(page.getByText(/Ownership is not confirmed|pending/i).first()).toBeVisible();
  await expect(page.getByText(/13 of 50/)).toBeVisible({ timeout: 10_000 });
});
