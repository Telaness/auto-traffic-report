import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockGenerateReportForSite = vi.fn();
const mockReportFindUnique = vi.fn();
const mockDeliveryLogCreate = vi.fn();

vi.mock("@/src/lib/db", () => ({
  prisma: {
    monthlyBatchSubscription: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    report: {
      findUnique: (...args: unknown[]) => mockReportFindUnique(...args),
    },
    deliveryLog: {
      create: (...args: unknown[]) => mockDeliveryLogCreate(...args),
    },
  },
}));

vi.mock("@/src/lib/report", () => ({
  generateReportForSite: (...args: unknown[]) => mockGenerateReportForSite(...args),
  generateReportHtml: vi.fn(),
}));

vi.mock("@/src/lib/line", () => ({
  sendReportLineMessage: vi.fn(),
}));

vi.mock("@/src/lib/email", () => ({
  sendReportEmail: vi.fn(),
}));

vi.mock("@/src/lib/report-token", () => ({
  generateReportDownloadToken: vi.fn(() => "token"),
}));

import { runSingleBatch } from "@/src/lib/scheduler";

describe("runSingleBatch", () => {
  const baseSubscription = {
    id: "sub-1",
    clientId: "client-1",
    deliveryChannel: "email",
    isActive: true,
    excludeFromBatch: false,
    client: {
      id: "client-1",
      sites: [
        { id: "site-A", isActive: true },
        { id: "site-B", isActive: true },
        { id: "site-C", isActive: true },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(baseSubscription);
    // deliverReportはreportDataがなければ即returnで終わる
    mockReportFindUnique.mockResolvedValue(null);
    mockGenerateReportForSite.mockImplementation((siteId: string) =>
      Promise.resolve(`report-${siteId}`)
    );
  });

  it("siteIds未指定時は全サイトを処理する", async () => {
    const result = await runSingleBatch("sub-1");
    expect(result.total).toBe(3);
    expect(mockGenerateReportForSite).toHaveBeenCalledTimes(3);
    expect(mockGenerateReportForSite).toHaveBeenCalledWith("site-A", expect.any(Date), undefined);
    expect(mockGenerateReportForSite).toHaveBeenCalledWith("site-B", expect.any(Date), undefined);
    expect(mockGenerateReportForSite).toHaveBeenCalledWith("site-C", expect.any(Date), undefined);
  });

  it("siteIds指定時は対象サイトのみ処理する", async () => {
    const result = await runSingleBatch("sub-1", undefined, ["site-A", "site-C"]);
    expect(result.total).toBe(2);
    expect(mockGenerateReportForSite).toHaveBeenCalledTimes(2);
    const calledSiteIds = mockGenerateReportForSite.mock.calls.map((call) => call[0]);
    expect(calledSiteIds).toEqual(["site-A", "site-C"]);
  });

  it("siteIdsが空配列なら全サイト扱い（後方互換）", async () => {
    const result = await runSingleBatch("sub-1", undefined, []);
    expect(result.total).toBe(3);
    expect(mockGenerateReportForSite).toHaveBeenCalledTimes(3);
  });

  it("subscription未存在ならエラー", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(runSingleBatch("sub-x")).rejects.toThrow("バッチ登録が見つかりません");
  });

  it("siteIdsに存在しないIDが含まれていても無視される", async () => {
    const result = await runSingleBatch("sub-1", undefined, ["site-A", "site-NONEXISTENT"]);
    expect(result.total).toBe(1);
    expect(mockGenerateReportForSite).toHaveBeenCalledTimes(1);
    expect(mockGenerateReportForSite).toHaveBeenCalledWith("site-A", expect.any(Date), undefined);
  });

  it("customRangeがgenerateReportForSiteに渡る", async () => {
    const customRange = { startDate: "2026-01-01", endDate: "2026-01-31" };
    await runSingleBatch("sub-1", customRange, ["site-A"]);
    expect(mockGenerateReportForSite).toHaveBeenCalledWith("site-A", expect.any(Date), customRange);
  });
});
