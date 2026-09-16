import { formatRate } from "@/src/lib/format";
import type { MetricDirection } from "@/src/lib/metrics";

// 前期比の増減表示。
// 矢印は数値が増えたか減ったかを示し、色は「その指標にとって良い変化か」を示す。
// 直帰率のように低いほど良い指標があるため両者は一致しない。悪化のみ赤で強調する。
// direction は必須にしてあり、渡し忘れで暗黙に「高いほど良い」扱いになることはない。
export const ComparisonRate = ({
  rate,
  direction,
  className = "",
}: {
  rate: number;
  direction: MetricDirection;
  className?: string;
}) => {
  const isUp = rate >= 0;
  // 増減なし(0)はどちらの向きでも悪化として扱わない
  const isImproved = direction === "lower-is-better" ? rate <= 0 : rate >= 0;
  return (
    <span className={`${isImproved ? "text-gray-900" : "text-red-600"} ${className}`}>
      {isUp ? "↑" : "↓"} {formatRate(rate)}
    </span>
  );
};
