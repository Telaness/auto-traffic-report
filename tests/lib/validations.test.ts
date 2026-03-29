import { describe, it, expect } from "vitest";
import {
  clientCreateSchema,
  siteCreateSchema,
} from "@/src/lib/validations";

describe("clientCreateSchema", () => {
  it("有効なデータでバリデーション成功", () => {
    const result = clientCreateSchema.safeParse({
      name: "株式会社テスト",
      contactEmail: "test@example.com",
      lineUserId: "U1234567890",
      deliveryChannel: "both",
    });
    expect(result.success).toBe(true);
  });

  it("会社名が空の場合にバリデーション失敗", () => {
    const result = clientCreateSchema.safeParse({
      name: "",
      deliveryChannel: "email",
    });
    expect(result.success).toBe(false);
  });

  it("不正な配信チャネルの場合にバリデーション失敗", () => {
    const result = clientCreateSchema.safeParse({
      name: "テスト",
      deliveryChannel: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("メールとLINE IDがnullでもバリデーション成功", () => {
    const result = clientCreateSchema.safeParse({
      name: "テスト会社",
      contactEmail: null,
      lineUserId: null,
      deliveryChannel: "email",
    });
    expect(result.success).toBe(true);
  });
});

describe("siteCreateSchema", () => {
  it("有効なデータでバリデーション成功", () => {
    const result = siteCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      siteName: "テストサイト",
      siteUrl: "https://example.com",
      ga4PropertyId: "properties/123456789",
      reportStartDate: "2024-04-01",
    });
    expect(result.success).toBe(true);
  });

  it("不正なURLの場合にバリデーション失敗", () => {
    const result = siteCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      siteName: "テスト",
      siteUrl: "not-a-url",
      ga4PropertyId: "properties/123",
      reportStartDate: "2024-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("不正なUUIDの場合にバリデーション失敗", () => {
    const result = siteCreateSchema.safeParse({
      clientId: "not-a-uuid",
      siteName: "テスト",
      siteUrl: "https://example.com",
      ga4PropertyId: "properties/123",
      reportStartDate: "2024-04-01",
    });
    expect(result.success).toBe(false);
  });
});
