import { describe, it, expect } from "vitest";
import {
  getMetricDirection,
  changeRate,
  formatComparison,
  formatMetricValue,
  LOWER_IS_BETTER_LABELS,
} from "@/src/lib/metrics";

describe("getMetricDirection", () => {
  it("直帰率は低いほど良い指標として扱う", () => {
    expect(getMetricDirection("bounceRate")).toBe("lower-is-better");
  });

  it("直帰率以外は高いほど良い指標として扱う", () => {
    expect(getMetricDirection("sessions")).toBe("higher-is-better");
    expect(getMetricDirection("totalUsers")).toBe("higher-is-better");
    expect(getMetricDirection("screenPageViews")).toBe("higher-is-better");
    expect(getMetricDirection("averageSessionDuration")).toBe("higher-is-better");
  });
});

describe("formatComparison", () => {
  describe("高いほど良い指標", () => {
    it("符号だけで自明なので改善/悪化を付けない", () => {
      expect(formatComparison(21.3, "higher-is-better")).toBe("+21.3%");
      expect(formatComparison(-10.1, "higher-is-better")).toBe("-10.1%");
    });
  });

  describe("低いほど良い指標", () => {
    it("減少には改善を添える", () => {
      expect(formatComparison(-10.1, "lower-is-better")).toBe("-10.1%、改善");
    });

    it("増加には悪化を添える", () => {
      expect(formatComparison(8.4, "lower-is-better")).toBe("+8.4%、悪化");
    });
  });

  it("増減なしはどちらの向きでも注記を付けない", () => {
    expect(formatComparison(0, "lower-is-better")).toBe("+0.0%");
    expect(formatComparison(0, "higher-is-better")).toBe("+0.0%");
  });

  it("小数桁を指定できる（PDFは小数なし）", () => {
    expect(formatComparison(-47.2, "lower-is-better", 0)).toBe("-47%、改善");
  });
});

describe("formatMetricValue", () => {
  it("割合指標は100倍して小数1桁のパーセントにする", () => {
    expect(formatMetricValue(0.474, true)).toBe("47.4%");
  });

  it("通常の指標は四捨五入して桁区切りする", () => {
    expect(formatMetricValue(1234.6)).toBe("1,235");
  });

  it("値が無い場合はハイフンを返す", () => {
    expect(formatMetricValue(undefined)).toBe("-");
    expect(formatMetricValue(null)).toBe("-");
  });
});

describe("changeRate", () => {
  it("増加分を前期に対する割合で返す", () => {
    expect(changeRate(154, 127)).toBeCloseTo(21.26, 2);
  });

  it("減少はマイナスで返す", () => {
    expect(changeRate(4.7, 8.9)).toBeCloseTo(-47.19, 2);
  });

  it("前期が0なら比較不能として0を返す", () => {
    expect(changeRate(10, 0)).toBe(0);
  });
});

describe("LOWER_IS_BETTER_LABELS", () => {
  it("低いほど良い指標のラベルを列挙する", () => {
    expect(LOWER_IS_BETTER_LABELS).toEqual(["直帰率", "平均掲載順位"]);
  });
});
