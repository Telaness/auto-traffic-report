import { describe, it, expect } from "vitest";
import {
  batchSubscriptionCreateSchema,
  batchSubscriptionUpdateSchema,
} from "@/src/lib/validations";

describe("batchSubscriptionCreateSchema", () => {
  it("有効なデータでバリデーション成功", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      deliveryChannel: "email",
    });
    expect(result.success).toBe(true);
  });

  it("配信チャネルがlineで成功", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      deliveryChannel: "line",
    });
    expect(result.success).toBe(true);
  });

  it("配信チャネルがbothで成功", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      deliveryChannel: "both",
    });
    expect(result.success).toBe(true);
  });

  it("不正なUUIDでバリデーション失敗", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "not-a-uuid",
      deliveryChannel: "email",
    });
    expect(result.success).toBe(false);
  });

  it("不正な配信チャネルでバリデーション失敗", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      deliveryChannel: "sms",
    });
    expect(result.success).toBe(false);
  });

  it("clientIdが未指定でバリデーション失敗", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      deliveryChannel: "email",
    });
    expect(result.success).toBe(false);
  });

  it("deliveryChannelが未指定でバリデーション失敗", () => {
    const result = batchSubscriptionCreateSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("batchSubscriptionUpdateSchema", () => {
  it("配信チャネルのみの更新で成功", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({
      deliveryChannel: "line",
    });
    expect(result.success).toBe(true);
  });

  it("isActiveのみの更新で成功", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("両フィールドの更新で成功", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({
      deliveryChannel: "both",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトで成功（部分更新）", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("不正な配信チャネルで失敗", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({
      deliveryChannel: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("isActiveが文字列で失敗", () => {
    const result = batchSubscriptionUpdateSchema.safeParse({
      isActive: "true",
    });
    expect(result.success).toBe(false);
  });
});
