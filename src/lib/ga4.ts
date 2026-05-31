import { google } from "googleapis";

interface GA4Metrics {
  sessions: number;
  totalUsers: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
}

interface GA4RegionData {
  region: string;
  sessions: number;
}

interface GA4SourceData {
  source: string;
  sessions: number;
}

interface GA4DeviceData {
  deviceCategory: string;
  sessions: number;
}

interface GA4BrowserData {
  browser: string;
  sessions: number;
}

interface GA4DetailedData {
  metrics: GA4Metrics;
  regions: GA4RegionData[];
  sources: GA4SourceData[];
  devices: GA4DeviceData[];
  browsers: GA4BrowserData[];
}

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const err = error as Error & {
    code?: number | string;
    status?: number;
    response?: { status?: number };
  };
  const statusFromResponse = err.response?.status;
  const statusFromCode = typeof err.code === "number" ? err.code : undefined;
  const status = statusFromResponse ?? err.status ?? statusFromCode;
  if (status && RETRYABLE_STATUSES.includes(status)) return true;
  return /\b(429|500|502|503|504)\b/.test(err.message);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> => {
  const { maxAttempts = 3, baseDelayMs = 500 } = options;

  const attempt = async (n: number): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (n >= maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      await sleep(baseDelayMs * Math.pow(2, n - 1));
      return attempt(n + 1);
    }
  };

  return attempt(1);
};

const getAnalyticsClient = async () => {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : undefined;

  const auth = new google.auth.GoogleAuth({
    ...(credentials ? { credentials } : { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  return google.analyticsdata({
    version: "v1beta",
    auth,
  });
};

const normalizePropertyId = (propertyId: string): string =>
  propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;

export const fetchGA4Data = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Metrics> => {
  const analyticsData = await getAnalyticsClient();
  const normalizedPropertyId = normalizePropertyId(propertyId);

  const response = await withRetry(() =>
    analyticsData.properties.runReport({
      property: normalizedPropertyId,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      },
    })
  );

  const row = response.data.rows?.[0];
  const metricValues = row?.metricValues ?? [];

  return {
    sessions: Number(metricValues[0]?.value ?? 0),
    totalUsers: Number(metricValues[1]?.value ?? 0),
    screenPageViews: Number(metricValues[2]?.value ?? 0),
    bounceRate: Number(metricValues[3]?.value ?? 0),
    averageSessionDuration: Number(metricValues[4]?.value ?? 0),
  };
};

export const fetchGA4DetailedData = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4DetailedData> => {
  const analyticsData = await getAnalyticsClient();
  const normalizedPropertyId = normalizePropertyId(propertyId);

  const [metricsResponse, regionResponse, sourceResponse, deviceResponse, browserResponse] = await Promise.all([
    // 基本メトリクス
    withRetry(() =>
      analyticsData.properties.runReport({
        property: normalizedPropertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        },
      })
    ),
    // 地域別
    withRetry(() =>
      analyticsData.properties.runReport({
        property: normalizedPropertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "region" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "10",
        },
      })
    ),
    // 流入経路
    withRetry(() =>
      analyticsData.properties.runReport({
        property: normalizedPropertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "10",
        },
      })
    ),
    // デバイスカテゴリ
    withRetry(() =>
      analyticsData.properties.runReport({
        property: normalizedPropertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      })
    ),
    // ブラウザ
    withRetry(() =>
      analyticsData.properties.runReport({
        property: normalizedPropertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "browser" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "5",
        },
      })
    ),
  ]);

  const metricsRow = metricsResponse.data.rows?.[0];
  const metricsValues = metricsRow?.metricValues ?? [];

  const metrics: GA4Metrics = {
    sessions: Number(metricsValues[0]?.value ?? 0),
    totalUsers: Number(metricsValues[1]?.value ?? 0),
    screenPageViews: Number(metricsValues[2]?.value ?? 0),
    bounceRate: Number(metricsValues[3]?.value ?? 0),
    averageSessionDuration: Number(metricsValues[4]?.value ?? 0),
  };

  const regions: GA4RegionData[] = (regionResponse.data.rows ?? []).map((row) => ({
    region: row.dimensionValues?.[0]?.value ?? "(unknown)",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  const sources: GA4SourceData[] = (sourceResponse.data.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? "(unknown)",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  const devices: GA4DeviceData[] = (deviceResponse.data.rows ?? []).map((row) => ({
    deviceCategory: row.dimensionValues?.[0]?.value ?? "(unknown)",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  const browsers: GA4BrowserData[] = (browserResponse.data.rows ?? []).map((row) => ({
    browser: row.dimensionValues?.[0]?.value ?? "(unknown)",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  return { metrics, regions, sources, devices, browsers };
};

// Search Console API

interface SearchConsoleKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchConsoleData {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  keywords: SearchConsoleKeyword[];
}

const getSearchConsoleClient = async () => {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : undefined;

  const auth = new google.auth.GoogleAuth({
    ...(credentials ? { credentials } : { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  return google.searchconsole({
    version: "v1",
    auth,
  });
};

const getSearchConsoleSiteUrlVariants = (siteUrl: string): string[] => {
  const variants: string[] = [siteUrl];
  const url = new URL(siteUrl);
  const domain = url.hostname;

  // www あり/なしのバリエーション
  if (domain.startsWith("www.")) {
    variants.push(siteUrl.replace("www.", ""));
  } else {
    variants.push(siteUrl.replace("://", "://www."));
  }

  // 末尾スラッシュあり/なし
  const withSlash = variants.map((v) => (v.endsWith("/") ? v : `${v}/`));
  const withoutSlash = variants.map((v) => (v.endsWith("/") ? v.slice(0, -1) : v));

  // ドメインプロパティ
  const domainVariant = `sc-domain:${domain.replace(/^www\./, "")}`;

  return [...new Set([...variants, ...withSlash, ...withoutSlash, domainVariant])];
};

export const fetchSearchConsoleData = async (
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleData | null> => {
  const searchConsole = await getSearchConsoleClient();
  const siteUrlVariants = getSearchConsoleSiteUrlVariants(siteUrl);

  for (const variant of siteUrlVariants) {
    try {
      const response = await withRetry(() =>
        searchConsole.searchanalytics.query({
          siteUrl: variant,
          requestBody: {
            startDate,
            endDate,
            dimensions: ["query"],
            rowLimit: 10,
            type: "web",
          },
        })
      );

    const rows = response.data.rows ?? [];

    const totalClicks = rows.reduce((sum, row) => sum + (row.clicks ?? 0), 0);
    const totalImpressions = rows.reduce((sum, row) => sum + (row.impressions ?? 0), 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const totalPosition = rows.reduce((sum, row) => sum + (row.position ?? 0), 0);
    const averagePosition = rows.length > 0 ? totalPosition / rows.length : 0;

    const keywords: SearchConsoleKeyword[] = rows.map((row) => ({
      keyword: row.keys?.[0] ?? "(unknown)",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

      return { totalClicks, totalImpressions, averageCtr, averagePosition, keywords };
    } catch {
      // このバリエーションでは失敗、次を試す
      continue;
    }
  }

  console.error("[SearchConsole] すべてのURL形式で取得に失敗しました:", siteUrl);
  return null;
};

export const getLastMonthRange = (date: Date = new Date()): { startDate: string; endDate: string } => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
  };
};

export type { GA4Metrics, GA4DetailedData, GA4RegionData, GA4SourceData, GA4DeviceData, GA4BrowserData, SearchConsoleData, SearchConsoleKeyword };
