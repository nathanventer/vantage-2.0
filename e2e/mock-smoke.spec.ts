import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

/** Runs in CI against mock; also passes on supabase with seeded demo users. */
test.describe("Demo login smoke", () => {
  test("demand user reaches dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/(dashboard|register|$)/, { timeout: 20_000 });

    if (!page.url().includes("/dashboard")) {
      await signInAs(page, "demand");
    }

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /demand workspace/i })).toBeVisible();
  });
});
