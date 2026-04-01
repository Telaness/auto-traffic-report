import { prisma } from "@/src/lib/db";
import { fetchGA4DetailedData, fetchSearchConsoleData, getLastMonthRange } from "@/src/lib/ga4";
import type { GA4Metrics, GA4DetailedData, GA4RegionData, GA4SourceData, GA4DeviceData, GA4BrowserData, SearchConsoleData } from "@/src/lib/ga4";
import { generateAIAnalysis } from "@/src/lib/ai-analysis";
import type { AIAnalysis } from "@/src/lib/ai-analysis";

interface ReportData {
  currentMonth: GA4Metrics;
  previousMonth: GA4Metrics | null;
  comparison: {
    sessions: { diff: number; rate: number };
    totalUsers: { diff: number; rate: number };
    screenPageViews: { diff: number; rate: number };
    bounceRate: { diff: number; rate: number };
    averageSessionDuration: { diff: number; rate: number };
  } | null;
  regions: GA4RegionData[];
  sources: GA4SourceData[];
  devices: GA4DeviceData[];
  browsers: GA4BrowserData[];
  searchConsole: SearchConsoleData | null;
  searchConsolePrevious: SearchConsoleData | null;
  aiAnalysis: AIAnalysis | null;
  period: { startDate: string; endDate: string };
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "モバイル",
  desktop: "デスクトップ",
  tablet: "タブレット",
};

const calculateComparison = (current: GA4Metrics, previous: GA4Metrics) => {
  const calcRate = (cur: number, prev: number) =>
    prev === 0 ? 0 : ((cur - prev) / prev) * 100;

  return {
    sessions: {
      diff: current.sessions - previous.sessions,
      rate: calcRate(current.sessions, previous.sessions),
    },
    totalUsers: {
      diff: current.totalUsers - previous.totalUsers,
      rate: calcRate(current.totalUsers, previous.totalUsers),
    },
    screenPageViews: {
      diff: current.screenPageViews - previous.screenPageViews,
      rate: calcRate(current.screenPageViews, previous.screenPageViews),
    },
    bounceRate: {
      diff: current.bounceRate - previous.bounceRate,
      rate: calcRate(current.bounceRate, previous.bounceRate),
    },
    averageSessionDuration: {
      diff: current.averageSessionDuration - previous.averageSessionDuration,
      rate: calcRate(current.averageSessionDuration, previous.averageSessionDuration),
    },
  };
};

export const generateReportForSite = async (
  siteId: string,
  targetDate?: Date,
  customRange?: { startDate: string; endDate: string }
): Promise<string> => {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { client: true },
  });

  if (!site) {
    throw new Error(`Site not found: ${siteId}`);
  }

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const now = targetDate ?? new Date();

  const startDate = customRange?.startDate ?? getLastMonthRange(now).startDate;
  const endDate = customRange?.endDate ?? getLastMonthRange(now).endDate;

  // 指定期間の詳細データ取得
  const currentDetailed: GA4DetailedData = await fetchGA4DetailedData(site.ga4PropertyId, startDate, endDate);

  // 前期間データ取得（同じ日数分の直前期間）
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);

  const [previousDetailed, searchConsoleData, searchConsolePrevious] = await Promise.all([
    prevStart >= site.reportStartDate
      ? fetchGA4DetailedData(site.ga4PropertyId, formatDate(prevStart), formatDate(prevEnd))
      : Promise.resolve(null),
    fetchSearchConsoleData(site.siteUrl, startDate, endDate),
    fetchSearchConsoleData(site.siteUrl, formatDate(prevStart), formatDate(prevEnd)),
  ]);

  // AI分析用の仮データを先に組み立て
  const reportDataWithoutAI = {
    currentMonth: currentDetailed.metrics,
    previousMonth: previousDetailed?.metrics ?? null,
    comparison: previousDetailed ? calculateComparison(currentDetailed.metrics, previousDetailed.metrics) : null,
    regions: currentDetailed.regions,
    sources: currentDetailed.sources,
    devices: currentDetailed.devices,
    browsers: currentDetailed.browsers,
    searchConsole: searchConsoleData,
    searchConsolePrevious: searchConsolePrevious,
    aiAnalysis: null as AIAnalysis | null,
    period: { startDate, endDate },
  };

  // AI分析コメント生成
  const aiAnalysis = await generateAIAnalysis(site.siteName, site.siteUrl, reportDataWithoutAI);

  const reportData: ReportData = {
    ...reportDataWithoutAI,
    aiAnalysis,
  };

  const reportMonth = new Date(startDate);
  const reportMonthStr = `${reportMonth.getFullYear()}-${String(reportMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const report = await prisma.report.create({
    data: {
      siteId: site.id,
      reportMonth: new Date(reportMonthStr),
      status: "generated",
      reportData: JSON.stringify(reportData),
      generatedAt: new Date(),
    },
  });

  return report.id;
};

export const generateReportHtml = (
  siteName: string,
  siteUrl: string,
  reportMonth: string,
  data: ReportData
): string => {
  const { currentMonth, comparison, regions, sources, devices, browsers, searchConsole, searchConsolePrevious, aiAnalysis, period } = data;

  const periodStart = period?.startDate ?? reportMonth;
  const periodEnd = period?.endDate ?? reportMonth;
  const startD = new Date(periodStart);
  const endD = new Date(periodEnd);
  const periodLabel = `${startD.getFullYear()}年${startD.getMonth() + 1}月${startD.getDate()}日〜${endD.getFullYear()}年${endD.getMonth() + 1}月${endD.getDate()}日`;

  const date = new Date(reportMonth);
  const monthLabel = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月度`;
  const today = new Date();
  const createdDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const formatRate = (rate: number) => {
    const sign = rate >= 0 ? "+" : "";
    return `${sign}${rate.toFixed(0)}%`;
  };

  // デバイスサマリー
  const deviceSummary = devices.length > 0
    ? devices.map((d) => {
        const total = devices.reduce((sum, dev) => sum + dev.sessions, 0);
        const pct = total > 0 ? ((d.sessions / total) * 100).toFixed(1) : "0";
        const label = DEVICE_LABELS[d.deviceCategory] ?? d.deviceCategory;
        return `${label}: ${pct}%`;
      }).join("、")
    : "-";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
      margin: 0; padding: 40px 50px; color: #333; line-height: 1.8; font-size: 14px;
    }
    h1 { font-size: 28px; font-weight: bold; margin: 0 0 10px; line-height: 1.4; }
    h2 { font-size: 22px; font-weight: bold; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #333; }
    h3 { font-size: 16px; font-weight: bold; margin: 24px 0 8px; }
    .meta { color: #555; font-size: 13px; margin: 4px 0; }
    .section { margin-bottom: 32px; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 32px 0; }
    ul { padding-left: 24px; margin: 8px 0; }
    li { margin: 4px 0; }
    ol { padding-left: 24px; margin: 8px 0; }
    ol li { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 10px 14px; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .comment-box {
      background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px;
      padding: 16px; margin: 16px 0;
    }
    .comment-box-title { font-weight: bold; margin-bottom: 8px; }
    .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; }
    @media print {
      body { padding: 20px 30px; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>

  <h1>${monthLabel} Webサイトトラフィック分析レポート</h1>
  <p class="meta"><strong>対象期間:</strong> ${periodLabel}</p>
  <p class="meta"><strong>対象サイト:</strong> ${siteName}</p>
  <p class="meta"><strong>作成日:</strong> ${createdDate}</p>

  <div class="section">
    <h2>1. エグゼクティブサマリー（全体総括）</h2>
    <p>${aiAnalysis?.executiveSummary ?? `当期間のWebサイトトラフィックの概要です。訪問数は${comparison ? `前期比${formatRate(comparison.sessions.rate)}の` : ""}「${currentMonth.sessions.toLocaleString()}」セッションを記録しました。ユニーク訪問者数は${currentMonth.totalUsers.toLocaleString()}人、ページビュー数は${currentMonth.screenPageViews.toLocaleString()} PVです。`}</p>
  </div>

  <hr class="divider">

  <div class="section">
    <h2>2. トラフィック概要と推移</h2>
    <h3>主要指標 (KPI)</h3>
    <ul>
      <li><strong>訪問数:</strong> ${currentMonth.sessions.toLocaleString()} セッション${comparison ? ` (前期比 ${formatRate(comparison.sessions.rate)})` : ""}</li>
      <li><strong>ユニーク訪問者数:</strong> ${currentMonth.totalUsers.toLocaleString()} 人${comparison ? ` (前期比 ${formatRate(comparison.totalUsers.rate)})` : ""}</li>
      <li><strong>ページビュー数:</strong> ${currentMonth.screenPageViews.toLocaleString()} PV${comparison ? ` (前期比 ${formatRate(comparison.screenPageViews.rate)})` : ""}</li>
      <li><strong>直帰率:</strong> ${(currentMonth.bounceRate * 100).toFixed(1)}%${comparison ? ` (前期比 ${formatRate(comparison.bounceRate.rate)})` : ""}</li>
      <li><strong>平均セッション時間:</strong> ${Math.round(currentMonth.averageSessionDuration)}秒${comparison ? ` (前期比 ${formatRate(comparison.averageSessionDuration.rate)})` : ""}</li>
    </ul>
    ${aiAnalysis?.trafficComment ? `
    <div class="comment-box">
      <div class="comment-box-title">【分析コメント】</div>
      <p>${aiAnalysis.trafficComment}</p>
    </div>` : ""}
  </div>

  <hr class="divider">

  <div class="section">
    <h2>3. ユーザー属性・地域分析</h2>
    <h3>地域別アクセス（上位都道府県）</h3>
    ${regions.length > 0
      ? `<ol>${regions.filter((r) => r.region !== "(not set)").slice(0, 5).map((r) => `<li><strong>${r.region}:</strong> ${r.sessions.toLocaleString()} 訪問</li>`).join("")}</ol>`
      : "<p>地域データがありません</p>"}

    <div class="comment-box">
      <div class="comment-box-title">【分析コメント】</div>
      <p>${aiAnalysis?.regionComment ?? (regions.length >= 2
          ? `上位地域は${regions.filter((r) => r.region !== "(not set)").slice(0, 3).map((r) => r.region).join("、")}からのアクセスが多い傾向にあります。`
          : "地域別の詳細データは十分なトラフィックが蓄積されてから表示されます。")}</p>
    </div>
  </div>

  <hr class="divider">

  <div class="section">
    <h2>4. 流入経路・デバイス分析</h2>
    <h3>どのサイト・アプリ経由か（トラフィックソース）</h3>
    ${(() => {
      const filtered = sources.filter((s) => s.source !== "(not set)");
      if (filtered.length >= 2) {
        return `<p>${filtered[0].source}と${filtered[1].source}が流入の2大柱となっています。</p>`;
      }
      return "";
    })()}
    ${sources.length > 0
      ? `<ol>${sources.filter((s) => s.source !== "(not set)").slice(0, 5).map((s) => `<li><strong>${s.source}:</strong> ${s.sessions.toLocaleString()}</li>`).join("")}</ol>`
      : "<p>流入経路データがありません</p>"}

    <h3>デバイスとブラウザ環境</h3>
    <ul>
      <li><strong>デバイス:</strong> ${deviceSummary}</li>
      ${(() => {
        const total = devices.reduce((sum, d) => sum + d.sessions, 0);
        const mobile = devices.find((d) => d.deviceCategory === "mobile");
        if (mobile && total > 0 && (mobile.sessions / total) > 0.5) {
          return `<p>モバイル（スマホ）が圧倒的多数を占めています。</p>`;
        }
        return "";
      })()}
    </ul>
    <h4>ブラウザ</h4>
    ${browsers.length > 0
      ? `<ul>${browsers.slice(0, 5).map((b) => `<li>${b.browser}: ${b.sessions.toLocaleString()}</li>`).join("")}</ul>`
      : "<p>ブラウザデータがありません</p>"}
    ${aiAnalysis?.sourceComment ? `
    <div class="comment-box">
      <div class="comment-box-title">【分析コメント】</div>
      <p>${aiAnalysis.sourceComment}</p>
    </div>` : ""}
  </div>

  ${searchConsole ? `
  <hr class="divider">

  <div class="section">
    <h2>5. 検索パフォーマンス (SEO分析)</h2>
    <h3>Google検索経由でのパフォーマンス</h3>
    <ul>
      <li><strong>合計クリック数:</strong> ${searchConsole.totalClicks.toLocaleString()} 回${searchConsolePrevious ? ` (前期比 ${formatRate(searchConsolePrevious.totalClicks > 0 ? ((searchConsole.totalClicks - searchConsolePrevious.totalClicks) / searchConsolePrevious.totalClicks * 100) : 0)})` : ""}</li>
      <li><strong>合計インプレッション数:</strong> ${searchConsole.totalImpressions.toLocaleString()} 回${searchConsolePrevious ? ` (前期比 ${formatRate(searchConsolePrevious.totalImpressions > 0 ? ((searchConsole.totalImpressions - searchConsolePrevious.totalImpressions) / searchConsolePrevious.totalImpressions * 100) : 0)})` : ""}</li>
      <li><strong>平均掲載順位:</strong> ${searchConsole.averagePosition.toFixed(1)} 位${searchConsolePrevious ? ` (前期比 ${searchConsole.averagePosition <= searchConsolePrevious.averagePosition ? `${((1 - searchConsole.averagePosition / searchConsolePrevious.averagePosition) * 100).toFixed(0)}%向上` : `${((searchConsole.averagePosition / searchConsolePrevious.averagePosition - 1) * 100).toFixed(0)}%低下`})` : ""}</li>
    </ul>

    ${searchConsole.keywords.length > 0 ? `
    <h3>検索キーワード分析</h3>
    <p>ユーザーは以下のキーワードで検索して流入しています。</p>
    <table>
      <thead>
        <tr>
          <th>キーワード</th>
          <th>クリック数</th>
          <th>クリック率 (CTR)</th>
          <th>平均順位</th>
        </tr>
      </thead>
      <tbody>
        ${searchConsole.keywords.map((kw) => `
        <tr>
          <td><strong>${kw.keyword}</strong></td>
          <td>${kw.clicks.toLocaleString()} (${searchConsole.totalClicks > 0 ? ((kw.clicks / searchConsole.totalClicks) * 100).toFixed(1) : "0"}%)</td>
          <td>${(kw.ctr * 100).toFixed(2)}%</td>
          <td>${kw.position.toFixed(3)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ` : ""}

    <div class="comment-box">
      <div class="comment-box-title">【分析コメント】</div>
      <p>${aiAnalysis?.seoComment ?? (searchConsole.keywords.length > 0
          ? `主要な流入キーワードは「${searchConsole.keywords[0].keyword}」で、平均掲載順位は${searchConsole.keywords[0].position.toFixed(1)}位です。${searchConsole.averagePosition <= 3 ? "検索上位に安定して表示されており、非常に良好な状態です。" : searchConsole.averagePosition <= 10 ? "検索1ページ目に表示されています。" : "検索順位の改善が今後の課題です。"}`
          : "検索パフォーマンスデータが不足しています。")}</p>
    </div>
  </div>
  ` : ""}

  <div class="footer">
    &copy; Telaness .Inc
  </div>

</body>
</html>`;
};

export type { ReportData };
