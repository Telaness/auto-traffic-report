import { describe, it, expect } from "vitest";
import { getLastMonthRange } from "@/src/lib/ga4";

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
