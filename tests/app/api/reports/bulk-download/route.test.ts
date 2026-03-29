import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/src/lib/db", () => ({
  prisma: {
    report: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@/src/lib/report", () => ({
  generateReportHtml: vi.fn(
    (siteName: string) =>
      `<html><body>${siteName} report</body></html>`
  ),
}));

vi.mock("@/src/lib/pdf", () => ({
  convertHtmlsToPdfs: vi.fn(
    (items: Array<{ html: string; fileName: string }>) =>
      Promise.resolve(
        items.map((item) => ({
          pdf: Buffer.from(`fake-pdf-${item.fileName}`),
          fileName: item.fileName,
        }))
      )
  ),
}));

import { GET } from "@/src/app/api/reports/bulk-download/route";

describe("GET /api/reports/bulk-download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("前月のレポートがない場合は404を返す", async () => {
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("前月のレポートが見つかりません");
  });

  it("前月のレポートがある場合はPDF入りZIPファイルを返す", async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    mockFindMany.mockResolvedValue([
      {
        id: "report-1",
        reportMonth: lastMonth,
        reportData: JSON.stringify({
          currentMonth: { sessions: 100, totalUsers: 50, screenPageViews: 200, bounceRate: 0.5, averageSessionDuration: 120 },
          previousMonth: null,
          comparison: null,
          regions: [],
          sources: [],
          devices: [],
          browsers: [],
          searchConsole: null,
          searchConsolePrevious: null,
          aiAnalysis: null,
          period: { startDate: "2025-01-01", endDate: "2025-01-31" },
        }),
        site: {
          siteName: "テストサイト",
          siteUrl: "https://example.com",
          client: { name: "テスト会社" },
        },
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    const decoded = decodeURIComponent(disposition ?? "");
    expect(decoded).toContain("トラフィックレポート");
  });

  it("複数レポートのPDFを含むZIPを返す", async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const reportData = JSON.stringify({
      currentMonth: { sessions: 100, totalUsers: 50, screenPageViews: 200, bounceRate: 0.5, averageSessionDuration: 120 },
      previousMonth: null,
      comparison: null,
      regions: [],
      sources: [],
      devices: [],
      browsers: [],
      searchConsole: null,
      searchConsolePrevious: null,
      aiAnalysis: null,
      period: { startDate: "2025-01-01", endDate: "2025-01-31" },
    });

    mockFindMany.mockResolvedValue([
      {
        id: "report-1",
        reportMonth: lastMonth,
        reportData,
        site: { siteName: "サイトA", siteUrl: "https://a.com", client: { name: "会社A" } },
      },
      {
        id: "report-2",
        reportMonth: lastMonth,
        reportData,
        site: { siteName: "サイトB", siteUrl: "https://b.com", client: { name: "会社B" } },
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");

    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
