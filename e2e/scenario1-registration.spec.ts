import { test, expect } from "@playwright/test";
import { signIn, signInAs } from "./helpers/auth";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const isSupabase = process.env.VITE_DATA_BACKEND === "supabase";

const REQUIRED_DOCS = [
  "Company Registration",
  "Tax Clearance",
  "Banking Proof",
  "Director ID",
  "SARS Registration",
  "Insurance",
  "Operating Licence",
];

test.describe("Scenario 1 — buyer registers → admin approves → access unlocked", () => {
  test.skip(!isSupabase, "Set VITE_DATA_BACKEND=supabase for live E2E");

  test("new demand signup is gated then unlocked after admin approval", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const email = `e2e.demand.${stamp}@example.co.za`;
    const password = "Demo@123";
    const company = `E2E Imports ${stamp}`;

    await page.goto("/");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.getByLabel("Full name").fill("E2E Demand User");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /^create account$/i }).click();

    await expect(page).toHaveURL(/\/register/, { timeout: 30_000 });

    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByPlaceholder("Cape Imports (Pty) Ltd").fill(company);
    await page.getByRole("button", { name: /^continue$/i }).click();

    const tmp = path.join(os.tmpdir(), `vantage-compliance-${stamp}.pdf`);
    fs.writeFileSync(tmp, "%PDF-1.4 e2e fixture");

    for (const label of REQUIRED_DOCS) {
      const row = page.locator("div.rounded-xl.border", { hasText: label });
      await row.locator('input[type="file"]').setInputFiles(tmp);
      await expect(row.getByText(/verified|submitted/i)).toBeVisible({ timeout: 20_000 });
    }

    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText(/application under review/i)).toBeVisible({ timeout: 25_000 });

    await context.clearCookies();
    await signInAs(page, "admin");
    await page.goto("/admin/registrations");
    await page.getByPlaceholder(/search/i).fill(company);
    await page.getByRole("row", { name: new RegExp(company, "i") }).click();
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 20_000 });

    await context.clearCookies();
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /demand workspace/i })).toBeVisible();

    fs.unlinkSync(tmp);
  });
});
