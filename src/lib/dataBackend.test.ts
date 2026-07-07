import { describe, expect, it, vi } from "vitest";
import { isDemoLoginsEnabled, resolveDataBackend } from "./dataBackend";

describe("dataBackend", () => {
  it("defaults to mock in dev when env unset", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "");
    vi.stubEnv("PROD", "");
    expect(resolveDataBackend()).toBe("mock");
    vi.unstubAllEnvs();
  });

  it("defaults to mock in prod when env unset (full demo parity)", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "");
    vi.stubEnv("PROD", "1");
    expect(resolveDataBackend()).toBe("mock");
    vi.unstubAllEnvs();
  });

  it("honours explicit VITE_DATA_BACKEND", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "mock");
    vi.stubEnv("PROD", "1");
    expect(resolveDataBackend()).toBe("mock");
    vi.unstubAllEnvs();
  });

  it("enables demo logins unless VITE_DEMO_LOGINS=off", () => {
    vi.stubEnv("VITE_DEMO_LOGINS", "");
    expect(isDemoLoginsEnabled()).toBe(true);
    vi.stubEnv("VITE_DEMO_LOGINS", "off");
    expect(isDemoLoginsEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
