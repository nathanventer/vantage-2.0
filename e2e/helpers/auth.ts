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
  await expect(page.getByRole("button", { name: /account menu/i })).toBeVisible();
  await page.getByRole("button", { name: /account menu/i }).click();
  await page.getByRole("tab", { name: ROLE_TAB[role] }).click();
  await page.keyboard.press("Escape");
}

/** Sign in via demo quick-login or the landing page form. */
export async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const quick = page.getByRole("button", { name: ROLE_TAB.demand, exact: true });
  if (await quick.isVisible().catch(() => false)) {
    const roleEntry = Object.entries(DEMO).find(([, c]) => c.email === email);
    const role = (roleEntry?.[0] ?? "demand") as keyof typeof DEMO;
    await page.getByRole("button", { name: ROLE_TAB[role], exact: true }).click();
    return;
  }

  await page.getByLabel("Work email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in to vantage/i }).click();
}

export async function signInAs(page: Page, role: keyof typeof DEMO) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const quick = page.getByRole("button", { name: ROLE_TAB[role], exact: true });
  if (await quick.isVisible().catch(() => false)) {
    await quick.click();
  } else {
    const creds = DEMO[role];
    await page.getByLabel("Work email").fill(creds.email);
    await page.locator("#password").fill(creds.password);
    await page.getByRole("button", { name: /sign in to vantage/i }).click();
  }

  await expect(page).toHaveURL(/\/(dashboard|register)/, { timeout: 25_000 });
}
