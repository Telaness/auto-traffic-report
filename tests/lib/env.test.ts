import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBaseUrl } from "@/src/lib/env";

const originalEnv = { ...process.env };

describe("getBaseUrl", () => {
  beforeEach(() => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("NEXTAUTH_URL が設定されていればそれを返す", () => {
    process.env.NEXTAUTH_URL = "https://otorepo.example.com";
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("NEXTAUTH_URL の末尾スラッシュを除去する", () => {
    process.env.NEXTAUTH_URL = "https://otorepo.example.com/";
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("NEXTAUTH_URL が無ければ VERCEL_URL に https を付与して返す", () => {
    process.env.VERCEL_URL = "otorepo.vercel.app";
    expect(getBaseUrl()).toBe("https://otorepo.vercel.app");
  });

  it("NEXTAUTH_URL を VERCEL_URL より優先する", () => {
    process.env.NEXTAUTH_URL = "https://otorepo.example.com";
    process.env.VERCEL_URL = "otorepo.vercel.app";
    expect(getBaseUrl()).toBe("https://otorepo.example.com");
  });

  it("いずれも未設定なら localhost を返す", () => {
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  it("返り値は URL として解釈できる", () => {
    process.env.NEXTAUTH_URL = "https://otorepo.example.com";
    expect(new URL(getBaseUrl()).origin).toBe("https://otorepo.example.com");
  });
});
