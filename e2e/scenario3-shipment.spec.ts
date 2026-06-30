import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const isSupabase = process.env.VITE_DATA_BACKEND === "supabase";

test.describe("Scenario 3 — shipment request → score → select provider", () => {
  test.skip(!isSupabase, "Set VITE_DATA_BACKEND=supabase for live E2E");

  test("demand user creates shipment and confirms a quote", async ({ page }) => {
    await signInAs(page, "demand");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto("/transactions/new");
    await expect(page.getByRole("heading", { name: /new shipment request/i })).toBeVisible();

    await page.getByRole("button", { name: /match providers/i }).click();
    await expect(page.getByText(/matched providers/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /confirm selection/i }).click();
    await expect(page.getByRole("heading", { name: /shipment created/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /view transactions/i }).click();
    await expect(page).toHaveURL(/\/transactions/);
  });
});
