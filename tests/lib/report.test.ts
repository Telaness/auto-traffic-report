import { describe, it, expect, vi } from "vitest";

// Prisma clientをモック
vi.mock("@/src/lib/db", () => ({
  prisma: {},
}));

// 外部依存をモック
vi.mock("@/src/lib/ga4", () => ({
  fetchGA4Data: vi.fn(),
  fetchGA4DetailedData: vi.fn(),
  fetchSearchConsoleData: vi.fn(),
  getLastMonthRange: vi.fn(),
}));

vi.mock("@/src/lib/ai-analysis", () => ({
  generateAIAnalysis: vi.fn(),
}));

vi.mock("@/src/lib/email", () => ({
  sendReportEmail: vi.fn(),
  sendAlertEmail: vi.fn(),
}));

vi.mock("@/src/lib/line", () => ({
  sendReportLineMessage: vi.fn(),
}));

import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";

describe("generateReportHtml", () => {
  const mockReportData: ReportData = {
    currentMonth: {
      sessions: 1200,
      totalUsers: 980,
      screenPageViews: 3400,
      bounceRate: 0.42,
      averageSessionDuration: 185.3,
    },
    previousMonth: {
      sessions: 1000,
      totalUsers: 850,
      screenPageViews: 3000,
      bounceRate: 0.45,
      averageSessionDuration: 170.0,
    },
    comparison: {
      sessions: { diff: 200, rate: 20 },
      totalUsers: { diff: 130, rate: 15.29 },
      screenPageViews: { diff: 400, rate: 13.33 },
      bounceRate: { diff: -0.03, rate: -6.67 },
      averageSessionDuration: { diff: 15.3, rate: 9.0 },
    },
    regions: [
      { region: "Tokyo", sessions: 400 },
      { region: "Osaka", sessions: 300 },
    ],
    sources: [
      { source: "(direct)", sessions: 500 },
      { source: "google", sessions: 400 },
    ],
    devices: [
      { deviceCategory: "mobile", sessions: 700 },
      { deviceCategory: "desktop", sessions: 500 },
    ],
    browsers: [
      { browser: "Chrome", sessions: 600 },
      { browser: "Safari", sessions: 400 },
    ],
    searchConsole: {
      totalClicks: 349,
      totalImpressions: 1022,
      averageCtr: 0.3415,
      averagePosition: 2.3,
      keywords: [
        { keyword: "テストサイト", clicks: 142, impressions: 236, ctr: 0.6017, position: 1.182 },
        { keyword: "test site", clicks: 33, impressions: 64, ctr: 0.5156, position: 1.375 },
      ],
    },
    searchConsolePrevious: null,
    aiAnalysis: null,
    period: { startDate: "2024-03-01", endDate: "2024-03-31" },
  };

  it("HTMLを正しく生成する", () => {
    const html = generateReportHtml(
      "テストサイト",
      "https://example.com",
      "2024-03-01",
      mockReportData
    );

    expect(html).toContain("Webサイトトラフィック分析レポート");
    expect(html).toContain("テストサイト");
    expect(html).not.toContain("https://example.com");
    expect(html).toContain("エグゼクティブサマリー");
    expect(html).toContain("トラフィック概要と推移");
    expect(html).toContain("ユーザー属性・地域分析");
    expect(html).toContain("流入経路・デバイス分析");
    expect(html).toContain("Telaness .Inc");
    expect(html).toContain("検索パフォーマンス");
    expect(html).toContain("テストサイト");
  });

  it("前月データがない場合でもHTMLを生成する", () => {
    const dataWithoutPrev: ReportData = {
      currentMonth: mockReportData.currentMonth,
      previousMonth: null,
      comparison: null,
      regions: [],
      sources: [],
      devices: [],
      browsers: [],
      searchConsole: null,
      searchConsolePrevious: null,
      aiAnalysis: null,
      period: { startDate: "2024-03-01", endDate: "2024-03-31" },
    };

    const html = generateReportHtml(
      "テストサイト",
      "https://example.com",
      "2024-03-01",
      dataWithoutPrev
    );

    expect(html).toContain("テストサイト");
    expect(html).toContain("1,200");
  });

  it("生成されたHTMLが有効なHTMLドキュメントである", () => {
    const html = generateReportHtml(
      "テスト",
      "https://test.com",
      "2024-01-01",
      mockReportData
    );

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("地域データが含まれる", () => {
    const html = generateReportHtml(
      "テスト",
      "https://test.com",
      "2024-03-01",
      mockReportData
    );

    expect(html).toContain("Tokyo");
    expect(html).toContain("Osaka");
  });

  it("流入経路データが含まれる", () => {
    const html = generateReportHtml(
      "テスト",
      "https://test.com",
      "2024-03-01",
      mockReportData
    );

    expect(html).toContain("(direct)");
    expect(html).toContain("google");
  });
});
