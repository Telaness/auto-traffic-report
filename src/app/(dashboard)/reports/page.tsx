"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/src/components/Card";
import { StatusBadge } from "@/src/components/StatusBadge";
import { Pagination } from "@/src/components/Pagination";

interface Report {
  id: string;
  reportMonth: string;
  status: "generated" | "delivered" | "failed";
  generatedAt: string | null;
  site: {
    siteName: string;
    client: { id: string; name: string };
  };
  deliveryLogs: Array<{
    channel: string;
    status: "success" | "failed";
    sentAt: string | null;
  }>;
}

interface PaginationData {
  page: number;
  totalPages: number;
  total: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchReports = useCallback(async (page = 1, status = "") => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);

    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setReports(data.reports);
    setPagination(data.pagination);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchReports();
    };
    void load();

  }, [fetchReports]);

  const handleBatchRun = async () => {
    if (!confirm("月次バッチ処理を手動実行しますか？")) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/batch/run", { method: "POST" });
      const data = await res.json();
      alert(
        `バッチ完了: 全${data.results.total}件, 成功${data.results.success}件, 失敗${data.results.failed}件`
      );
      fetchReports(pagination.page, statusFilter);
    } catch {
      alert("バッチ処理に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch("/api/reports/bulk-download");
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "ダウンロードに失敗しました");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const fileNameMatch = disposition?.match(/filename\*=UTF-8''(.+)/);
      a.download = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : "レポート一括.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("ダウンロードに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">出力レポート履歴</h2>
        <div className="flex gap-2">
          <button
            onClick={handleBulkDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isDownloading ? "ダウンロード中..." : "前月レポート一括DL"}
          </button>
          <button
            onClick={handleBatchRun}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors disabled:opacity-50"
          >
            {isGenerating ? "実行中..." : "バッチ実行"}
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchReports(1, e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
          >
            <option value="">全てのステータス</option>
            <option value="generated">生成済み</option>
            <option value="delivered">配信完了</option>
            <option value="failed">失敗</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-gray-500">読み込み中...</p>
        ) : reports.length === 0 ? (
          <p className="text-center py-8 text-gray-500">レポートはまだありません</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">クライアント</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">サイト</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">対象月</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ステータス</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">配信</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">生成日時</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">{report.site.client.name}</td>
                      <td className="py-3 px-4">{report.site.siteName}</td>
                      <td className="py-3 px-4">
                        {new Date(report.reportMonth).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {report.deliveryLogs.map((log, i) => (
                            <span
                              key={i}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                log.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {log.channel === "email" ? "Mail" : "LINE"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {report.generatedAt
                          ? new Date(report.generatedAt).toLocaleString("ja-JP")
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/reports/${report.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchReports(p, statusFilter)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
