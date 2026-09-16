import type { GA4Metrics } from "@/src/lib/ga4";
import { formatRate } from "@/src/lib/format";

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

/**
 * 平均掲載順位（Search Console）。GA4指標ではないためカタログには入らないが、
 * 同じ方向情報を持つのでここで一元管理する。
 */
export const SEARCH_POSITION_METRIC: { label: string; direction: MetricDirection } = {
  label: "平均掲載順位",
  direction: "lower-is-better",
};

/** 「低いほど良い」指標のラベル一覧。AIプロンプトへの注意書き生成に使う。 */
export const LOWER_IS_BETTER_LABELS: readonly string[] = [
  ...TRAFFIC_METRICS.filter((metric) => metric.direction === "lower-is-better").map(
    (metric) => metric.label
  ),
  SEARCH_POSITION_METRIC.label,
];

export const getMetricDirection = (key: MetricKey): MetricDirection =>
  TRAFFIC_METRICS.find((metric) => metric.key === key)?.direction ?? "higher-is-better";

/** 前期比の変化率(%)。前期が0のときは比較不能として0を返す。 */
export const changeRate = (current: number, previous: number): number =>
  previous === 0 ? 0 : ((current - previous) / previous) * 100;

/**
 * 前期比に「改善 / 悪化」を添える。
 * 直帰率や検索順位のように低いほど良い指標は符号だけでは良し悪しが伝わらないため、
 * 画面のように色で示せない出力（PDF・AIプロンプト）では語として補う。
 */
export const formatComparison = (
  rate: number,
  direction: MetricDirection,
  fractionDigits = 1
): string => {
  const base = formatRate(rate, fractionDigits);
  // 高いほど良い指標は符号だけで自明
  if (direction === "higher-is-better") return base;
  // 増減なしは改善でも悪化でもない
  if (rate === 0) return base;
  return `${base}、${rate < 0 ? "改善" : "悪化"}`;
};
