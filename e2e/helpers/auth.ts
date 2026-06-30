import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEMO = {
  demand: { email: "buyer@ubuntuimports.com", password: "Demo@123" },
  source: { email: "provider@sclogistics.com", password: "Demo@123" },
  admin: { email: "admin@tradehub.com", password: "Demo@123" },
} as const;

const ROLE_TAB: Record<keyof typeof DEMO, string> = {
  demand: "Demand",
  source: "Source",
  admin: "Admin",
};

/** Mock backend: switch role via the in-app demo role picker (no real session). */
export async function asMockRole(page: Page, role: keyof typeof DEMO) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /account menu/i }).click();
  await page.getByRole("tab", { name: ROLE_TAB[role] }).click();
  await page.keyboard.press("Escape");
}

/** Sign in via the landing page form (supabase or mock form path). */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Work email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in to vantage/i }).click();
}

export async function signInAs(page: Page, role: keyof typeof DEMO) {
  const creds = DEMO[role];
  await signIn(page, creds.email, creds.password);
  await expect(page).toHaveURL(/\/(dashboard|register)/, { timeout: 20_000 });
}
