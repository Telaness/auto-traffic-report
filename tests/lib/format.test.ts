import { describe, it, expect } from "vitest";
import { formatRate } from "@/src/lib/format";

describe("formatRate", () => {
  it("増加には + を付ける", () => {
    expect(formatRate(21.3)).toBe("+21.3%");
  });

  it("減少はマイナス符号をそのまま出す", () => {
    expect(formatRate(-10.1)).toBe("-10.1%");
  });

  it("0 は + 付きで返す", () => {
    expect(formatRate(0)).toBe("+0.0%");
  });

  it("小数桁を指定できる", () => {
    expect(formatRate(21.34, 0)).toBe("+21%");
    expect(formatRate(21.34, 2)).toBe("+21.34%");
  });
});
