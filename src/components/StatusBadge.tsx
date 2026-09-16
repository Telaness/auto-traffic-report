export type StatusType = "generated" | "delivered" | "failed" | "success";
export type DeliveryChannelType = "email" | "line";
export type LineTargetType = "user" | "group";
export type DeliveryLogStatus = "success" | "failed";

// バッジの配色。UIはニュートラルグレーに統一しているが、
// 失敗のみ識別性を優先して赤を残している。
const tone = {
  solid: "bg-gray-200 text-gray-800",
  outline: "bg-gray-100 text-gray-600 border border-gray-300",
  danger: "bg-red-100 text-red-800",
} as const;

const BADGE_BASE = "inline-flex items-center text-xs font-medium";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  generated: { label: "生成済み", className: tone.outline },
  delivered: { label: "配信完了", className: tone.solid },
  failed: { label: "失敗", className: tone.danger },
  success: { label: "成功", className: tone.solid },
};

export const StatusBadge = ({ status }: { status: StatusType }) => {
  const config = statusConfig[status];
  return (
    <span className={`${BADGE_BASE} px-2.5 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

const channelConfig: Record<DeliveryChannelType, { label: string; className: string }> = {
  email: { label: "メール", className: tone.solid },
  line: { label: "LINE", className: tone.outline },
};

// DB上は String カラムのため、値を受け取ってから配信チャネルに解決する。
export const ChannelBadge = ({ channel }: { channel: string }) => {
  const config = channelConfig[channel === "email" ? "email" : "line"];
  return (
    <span className={`${BADGE_BASE} px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

// 配信ログのチップ。配色は配信の成否を、ラベルはチャネルを表す。
export const DeliveryLogBadge = ({
  status,
  channel,
}: {
  status: DeliveryLogStatus;
  channel: string;
}) => (
  <span
    className={`text-xs px-1.5 py-0.5 rounded ${status === "success" ? tone.solid : tone.danger}`}
  >
    {channel === "email" ? "Mail" : "LINE"}
  </span>
);

const lineTargetConfig: Record<LineTargetType, { label: string; className: string }> = {
  group: { label: "グループ", className: tone.solid },
  user: { label: "個人", className: tone.outline },
};

export const LineTargetTypeBadge = ({
  type,
  className = "",
}: {
  type: LineTargetType;
  className?: string;
}) => {
  const config = lineTargetConfig[type];
  return (
    <span className={`${BADGE_BASE} px-1.5 py-0.5 rounded ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};
