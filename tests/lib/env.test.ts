import { describe, it, expect, afterEach, vi } from "vitest";
import { getBaseUrl } from "@/src/lib/env";

describe("getBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("NEXTAUTH_URL が設定されていればそれを返す", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://otorepo.example.com");
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("NEXTAUTH_URL の末尾スラッシュを除去する", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://otorepo.example.com/");
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("NEXTAUTH_URL が無ければ VERCEL_URL に https を付与して返す", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "otorepo.vercel.app");
    expect(getBaseUrl()).toBe("https://otorepo.vercel.app");
  });

  it("NEXTAUTH_URL を VERCEL_URL より優先する", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://otorepo.example.com");
    vi.stubEnv("VERCEL_URL", "otorepo.vercel.app");
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("いずれも未設定なら localhost を返す", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});
