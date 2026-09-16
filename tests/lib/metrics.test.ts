import { describe, it, expect } from "vitest";
import {
  TRAFFIC_METRICS,
  getMetricDirection,
  formatComparison,
  formatMetricValue,
  lowerIsBetterLabels,
} from "@/src/lib/metrics";

describe("getMetricDirection", () => {
  it("直帰率は低いほど良い指標として扱う", () => {
    expect(getMetricDirection("bounceRate")).toBe("lower-is-better");
  });

  it("直帰率以外は高いほど良い指標として扱う", () => {
    const others = TRAFFIC_METRICS.filter((metric) => metric.key !== "bounceRate");
    expect(others.map((metric) => getMetricDirection(metric.key))).toEqual(
      others.map(() => "higher-is-better")
    );
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

describe("lowerIsBetterLabels", () => {
  it("低いほど良い指標のラベルだけを返す", () => {
    expect(lowerIsBetterLabels()).toEqual(["直帰率"]);
  });
});
