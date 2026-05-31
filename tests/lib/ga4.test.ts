import { describe, it, expect, vi } from "vitest";
import { getLastMonthRange, withRetry } from "@/src/lib/ga4";

describe("getLastMonthRange", () => {
  it("2024年3月を基準とした場合、2月のレンジを返す", () => {
    const result = getLastMonthRange(new Date(2024, 2, 15)); // 2024-03-15
    expect(result.startDate).toBe("2024-02-01");
    expect(result.endDate).toBe("2024-02-29"); // 2024年はうるう年
  });

  it("2024年1月を基準とした場合、前年12月のレンジを返す", () => {
    const result = getLastMonthRange(new Date(2024, 0, 1)); // 2024-01-01
    expect(result.startDate).toBe("2023-12-01");
    expect(result.endDate).toBe("2023-12-31");
  });

  it("2025年5月を基準とした場合、4月のレンジを返す", () => {
    const result = getLastMonthRange(new Date(2025, 4, 10)); // 2025-05-10
    expect(result.startDate).toBe("2025-04-01");
    expect(result.endDate).toBe("2025-04-30");
  });
});

describe("withRetry", () => {
  it("初回成功時はそのまま結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("502エラーは最大試行回数までリトライする", async () => {
    const error = new Error("502 Bad Gateway") as Error & { code: number };
    error.code = 502;
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("recovered");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("リトライ不可エラー（404等）は即座にthrowする", async () => {
    const error = new Error("404 Not Found") as Error & { code: number };
    error.code = 404;
    const fn = vi.fn().mockRejectedValue(error);
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow(
      "404 Not Found"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("最大試行回数を超えた場合は最後のエラーをthrowする", async () => {
    const error = new Error("503 Service Unavailable") as Error & { code: number };
    error.code = 503;
    const fn = vi.fn().mockRejectedValue(error);
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow(
      "503 Service Unavailable"
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
