import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ComparisonRate } from "@/src/components/ComparisonRate";

// vitest.config.ts が globals を有効にしていないため RTL の自動 cleanup は登録されない。
// cleanup しないと前のテストのDOMが残り、getRateElement が複数一致で失敗する。
afterEach(() => {
  cleanup();
});

const getRateElement = () => screen.getByText(/[↑↓]/);

describe("ComparisonRate", () => {
  describe("高いほど良い指標", () => {
    it("増加は上向き矢印とグレーで表示する", () => {
      render(<ComparisonRate rate={21.3} direction="higher-is-better" />);
      const el = getRateElement();
      expect(el.textContent).toContain("↑");
      expect(el.textContent).toContain("+21.3%");
      expect(el.className).toContain("text-gray-900");
    });

    it("減少は下向き矢印と赤で表示する", () => {
      render(<ComparisonRate rate={-10.1} direction="higher-is-better" />);
      const el = getRateElement();
      expect(el.textContent).toContain("↓");
      expect(el.textContent).toContain("-10.1%");
      expect(el.className).toContain("text-red-600");
    });
  });

  describe("低いほど良い指標（直帰率など）", () => {
    it("減少は改善なので下向き矢印だがグレーで表示する", () => {
      render(<ComparisonRate rate={-10.1} direction="lower-is-better" />);
      const el = getRateElement();
      expect(el.textContent).toContain("↓");
      expect(el.className).toContain("text-gray-900");
    });

    it("増加は悪化なので上向き矢印だが赤で表示する", () => {
      render(<ComparisonRate rate={8.4} direction="lower-is-better" />);
      const el = getRateElement();
      expect(el.textContent).toContain("↑");
      expect(el.className).toContain("text-red-600");
    });
  });

  it("増減なしは上向き矢印とグレーで表示する", () => {
    render(<ComparisonRate rate={0} direction="higher-is-better" />);
    const el = getRateElement();
    expect(el.textContent).toContain("↑");
    expect(el.textContent).toContain("+0.0%");
    expect(el.className).toContain("text-gray-900");
  });

  it("低いほど良い指標でも増減なしはグレーで表示する", () => {
    render(<ComparisonRate rate={0} direction="lower-is-better" />);
    expect(getRateElement().className).toContain("text-gray-900");
  });

  it("渡した className を追加する", () => {
    render(<ComparisonRate rate={5} direction="higher-is-better" className="text-sm font-medium" />);
    expect(getRateElement().className).toContain("text-sm font-medium");
  });
});
