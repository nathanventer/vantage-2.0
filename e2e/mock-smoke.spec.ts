import { test, expect } from "@playwright/test";
import { asMockRole } from "./helpers/auth";

/** Fast mock-backend smoke tests for CI (GitHub Actions). */
test.describe("Mock smoke", () => {
  test("demand dashboard loads", async ({ page }) => {
    await asMockRole(page, "demand");
    await expect(page.getByRole("heading", { name: /demand workspace/i })).toBeVisible();
    await expect(page.getByText(/active shipments/i)).toBeVisible();
  });

  test("transactions list shows seeded TradeHub data", async ({ page }) => {
    await asMockRole(page, "demand");
    await page.goto("/transactions");
    await expect(page.getByRole("link", { name: /TXN-/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("documents page renders", async ({ page }) => {
    await asMockRole(page, "demand");
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: /document management/i })).toBeVisible();
  });
});
