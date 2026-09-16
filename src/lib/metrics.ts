import type { GA4Metrics } from "@/src/lib/ga4";

/**
 * 指標にとって「良い変化」がどちらの向きかを表す。
 * 直帰率や検索順位のように低いほど良い指標があるため、指標ごとに明示する。
 */
export type MetricDirection = "higher-is-better" | "lower-is-better";

export type MetricKey = keyof GA4Metrics;

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  /** モバイルの狭い幅で使う短縮ラベル */
  shortLabel?: string;
  /** 0〜1の割合として保持している指標 */
  isPercent?: boolean;
  direction: MetricDirection;
};

export const TRAFFIC_METRICS: readonly MetricDefinition[] = [
  { key: "sessions", label: "セッション数", direction: "higher-is-better" },
  { key: "totalUsers", label: "ユーザー数", direction: "higher-is-better" },
  {
    key: "screenPageViews",
    label: "ページビュー数",
    shortLabel: "PV数",
    direction: "higher-is-better",
  },
  { key: "bounceRate", label: "直帰率", isPercent: true, direction: "lower-is-better" },
  { key: "averageSessionDuration", label: "平均セッション時間(秒)", direction: "higher-is-better" },
];

export const formatMetricValue = (value: number | null | undefined, isPercent?: boolean): string => {
  if (value === undefined || value === null) return "-";
  return isPercent ? `${(value * 100).toFixed(1)}%` : Math.round(value).toLocaleString();
};
