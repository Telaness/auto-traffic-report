export type StatusType = "generated" | "delivered" | "failed" | "success";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  generated: { label: "生成済み", className: "bg-blue-100 text-blue-800" },
  delivered: { label: "配信完了", className: "bg-green-100 text-green-800" },
  failed: { label: "失敗", className: "bg-red-100 text-red-800" },
  success: { label: "成功", className: "bg-green-100 text-green-800" },
};

export const StatusBadge = ({ status }: { status: StatusType }) => {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
