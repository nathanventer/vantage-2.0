import { defineConfig, devices } from "@playwright/test";

const backend = process.env.VITE_DATA_BACKEND ?? "mock";
/** Lovable/TanStack dev server defaults to 8080, not Vite's 5173. */
const DEV_HOST = process.env.PLAYWRIGHT_DEV_HOST ?? "127.0.0.1";
const DEV_PORT = process.env.PLAYWRIGHT_DEV_PORT ?? "8080";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${DEV_HOST}:${DEV_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `bun run dev -- --host ${DEV_HOST} --port ${DEV_PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          VITE_DATA_BACKEND: backend,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "http://localhost:54321",
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "anon-placeholder",
        },
      },
});
