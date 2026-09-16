import { describe, it, expect } from "vitest";
import { formatRate } from "@/src/lib/format";

describe("formatRate", () => {
  it("符号を付けて返す（0 は + 扱い）", () => {
    expect(formatRate(21.3)).toBe("+21.3%");
    expect(formatRate(0)).toBe("+0.0%");
    expect(formatRate(-10.1)).toBe("-10.1%");
  });

  it("小数桁を指定できる", () => {
    expect(formatRate(21.34, 0)).toBe("+21%");
    expect(formatRate(21.34, 2)).toBe("+21.34%");
  });
});
