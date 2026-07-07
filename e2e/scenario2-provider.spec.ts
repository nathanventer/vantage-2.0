import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const isSupabase = process.env.VITE_DATA_BACKEND === "supabase";

test.describe("Scenario 2 — provider registers and is visible", () => {
  test.skip(!isSupabase, "Set VITE_DATA_BACKEND=supabase for live E2E");

  test("source provider reaches operations dashboard", async ({ page }) => {
    await signInAs(page, "source");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /source operations/i })).toBeVisible();
  });

  test("admin sees provider company in registrations", async ({ page }) => {
    await signInAs(page, "admin");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto("/admin/registrations");
    await expect(page.getByRole("heading", { name: /registration/i })).toBeVisible();
    await expect(page.getByText(/Southern Cross/i)).toBeVisible({ timeout: 15_000 });
  });
});
