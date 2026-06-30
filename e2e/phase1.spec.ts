import { test, expect } from "@playwright/test";

test.describe("Phase 1 scenarios (mock backend)", () => {
  test("Scenario 3 — shipment request → score → select → active", async ({ page }) => {
    await page.goto("/transactions/new");
    await expect(page.getByRole("heading", { name: /New shipment request/i })).toBeVisible();

    await page.getByRole("button", { name: /Match providers/i }).click();
    await expect(page.getByText(/Vantage scored/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Confirm selection/i }).click();
    await expect(page.getByRole("heading", { name: /Shipment created/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Scenario 2 — provider sees transactions list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Source", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /VTG-TXN-/i }).first()).toBeVisible();
  });

  test("Scenario 1 — buyer sign-in reaches dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Demand", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });

  test("POPIA — data export page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /Data & privacy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Download my data/i })).toBeVisible();
  });
});
