import { test, expect } from "@playwright/test";
import { asMockRole } from "./helpers/auth";

/** Mock-backend E2E for Phase 1 core flows (CI). */
test.describe("Mock backend — Phase 1", () => {
  test("Scenario 1 — demand demo login reaches dashboard", async ({ page }) => {
    await asMockRole(page, "demand");
    await expect(page.getByRole("heading", { name: /demand workspace/i })).toBeVisible();
  });

  test("Scenario 2 — source user reaches source operations", async ({ page }) => {
    await asMockRole(page, "source");
    await expect(page.getByRole("heading", { name: /source operations/i })).toBeVisible();
  });

  test("Scenario 3 — shipment request → score → select", async ({ page }) => {
    await asMockRole(page, "demand");
    await page.goto("/transactions/new");
    await expect(page.getByRole("heading", { name: /new shipment request/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /match providers/i }).click();
    await expect(page.getByText(/Vantage scored/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /confirm selection/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: /confirm selection/i }).click();
    await expect(page.getByRole("heading", { name: /shipment created/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("POPIA — data export page renders", async ({ page }) => {
    await asMockRole(page, "demand");
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /data & privacy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /download my data/i })).toBeVisible();
  });
});
