/**
 * 前期比の符号付きパーセント表記。例: +21.3% / -10.1%
 * 画面・PDF・AIプロンプトで共通利用する。
 */
export const formatRate = (rate: number, fractionDigits = 1): string =>
  `${rate >= 0 ? "+" : ""}${rate.toFixed(fractionDigits)}%`;
