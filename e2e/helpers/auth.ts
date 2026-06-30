import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEMO = {
  demand: { email: "buyer@ubuntuimports.com", password: "Demo@123" },
  source: { email: "provider@sclogistics.com", password: "Demo@123" },
  admin: { email: "admin@tradehub.com", password: "Demo@123" },
} as const;

async function signOutIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: /account menu/i });
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });
  }
}

/** Sign in via the landing page form (real input events for React controlled fields). */
export async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/");
  await signOutIfNeeded(page);

  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in to vantage/i }).click();
}

export async function signInAs(page: Page, role: keyof typeof DEMO) {
  const creds = DEMO[role];
  await signIn(page, creds.email, creds.password);
}
