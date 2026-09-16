// 前期比の増減表示。
// 矢印は数値が増えたか減ったかを示し、色は「その指標にとって良い変化か」を示す。
// 直帰率のように低いほど良い指標があるため両者は一致しない。悪化のみ赤で強調する。
export const ComparisonRate = ({
  rate,
  isLowerBetter = false,
  className = "",
}: {
  rate: number;
  isLowerBetter?: boolean;
  className?: string;
}) => {
  const isUp = rate >= 0;
  const isImproved = isLowerBetter ? rate <= 0 : rate >= 0;
  return (
    <span className={`${isImproved ? "text-gray-900" : "text-red-600"} ${className}`}>
      {isUp ? "↑" : "↓"} {isUp ? "+" : ""}
      {rate.toFixed(1)}%
    </span>
  );
};
