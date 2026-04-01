"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Card } from "@/src/components/Card";
import { Pagination } from "@/src/components/Pagination";

type DeliveryChannel = "email" | "line" | "both";

interface Subscription {
  id: string;
  clientId: string;
  deliveryChannel: DeliveryChannel;
  isActive: boolean;
  excludeFromBatch: boolean;
  createdAt: string;
  client: {
    id: string;
    name: string;
    contactEmail: string | null;
    lineUserId: string | null;
  };
}

interface ClientOption {
  id: string;
  name: string;
  contactEmail: string | null;
  lineUserId: string | null;
}

interface PaginationData {
  page: number;
  totalPages: number;
  total: number;
}

interface BatchTarget {
  siteId: string;
  siteName: string;
  siteUrl: string;
  clientName: string;
  deliveryChannel: DeliveryChannel;
}

const channelLabels: Record<DeliveryChannel, string> = {
  email: "メール",
  line: "LINE",
  both: "メール + LINE",
};

export default function BatchPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [formData, setFormData] = useState({
    clientId: "",
    deliveryChannel: "email" as DeliveryChannel,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editChannel, setEditChannel] = useState<DeliveryChannel>("email");
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [testSendingId, setTestSendingId] = useState<string | null>(null);
  const [singleRunningId, setSingleRunningId] = useState<string | null>(null);

  // 一括バッチ確認ダイアログ
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchTargets, setBatchTargets] = useState<BatchTarget[]>([]);
  const [isFetchingTargets, setIsFetchingTargets] = useState(false);

  // 個別送信ダイアログ
  const [showSingleDialog, setShowSingleDialog] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("");

  // PDF取得ダイアログ
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfClientId, setPdfClientId] = useState("");
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  // 期間指定（一括・個別共通）
  type PeriodType = "lastMonth" | "month" | "custom";
  const [periodType, setPeriodType] = useState<PeriodType>("lastMonth");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const getDateRange = (): { startDate: string; endDate: string } | undefined => {
    if (periodType === "lastMonth") return undefined;
    if (periodType === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { startDate: start, endDate: end };
    }
    if (customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return undefined;
  };

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/batch/subscriptions?page=${page}`);
      if (!res.ok) {
        console.error("バッチ登録一覧の取得に失敗:", res.status);
        return;
      }
      const data = await res.json();
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
    } catch (error) {
      console.error("バッチ登録一覧の取得に失敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableClients = useCallback(async () => {
    const res = await fetch("/api/clients?limit=1000");
    const data = await res.json();
    const subscribedIds = new Set(subscriptions.map((s) => s.clientId));
    const filtered = (data.clients as ClientOption[]).filter(
      (c) => !subscribedIds.has(c.id)
    );
    setAvailableClients(filtered);
  }, [subscriptions]);

  useEffect(() => {
    const load = async () => {
      await fetchSubscriptions();
    };
    void load();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (showForm) {
      const load = async () => {
        await fetchAvailableClients();
      };
      void load();
    }
  }, [showForm, fetchAvailableClients]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return;

    const res = await fetch("/api/batch/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({ clientId: "", deliveryChannel: "email" });
      fetchSubscriptions(pagination.page);
    } else {
      const data = await res.json();
      alert(`エラー: ${data.error}`);
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/batch/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryChannel: editChannel }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchSubscriptions(pagination.page);
    }
  };

  const handleToggleActive = async (sub: Subscription) => {
    const res = await fetch(`/api/batch/subscriptions/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sub.isActive }),
    });

    if (res.ok) {
      fetchSubscriptions(pagination.page);
    }
  };

  const handleToggleExcludeFromBatch = async (sub: Subscription) => {
    const res = await fetch(`/api/batch/subscriptions/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludeFromBatch: !sub.excludeFromBatch }),
    });

    if (res.ok) {
      fetchSubscriptions(pagination.page);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このバッチ登録を解除しますか？")) return;

    const res = await fetch(`/api/batch/subscriptions/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchSubscriptions(pagination.page);
    }
  };

  // 一括バッチ: 対象一覧取得 → 確認ダイアログ表示
  const handleBatchConfirmOpen = async () => {
    resetPeriod();
    setIsFetchingTargets(true);
    try {
      const res = await fetch("/api/batch/targets");
      const data = await res.json();
      setBatchTargets(data.targets as BatchTarget[]);
      setShowBatchConfirm(true);
    } catch {
      alert("対象一覧の取得に失敗しました");
    } finally {
      setIsFetchingTargets(false);
    }
  };

  // 一括バッチ: 実行
  const handleBatchRun = async () => {
    setShowBatchConfirm(false);
    setIsBatchRunning(true);
    try {
      const dateRange = getDateRange();
      const res = await fetch("/api/batch/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dateRange ?? {}),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `一括バッチ完了\n\n全${data.results.total}件\n成功: ${data.results.success}件\n失敗: ${data.results.failed}件`
        );
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("バッチ実行に失敗しました");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // 個別送信: 実行
  const handleSingleRun = async () => {
    if (!selectedSubscriptionId) return;
    setShowSingleDialog(false);
    setSingleRunningId(selectedSubscriptionId);
    try {
      const dateRange = getDateRange();
      const res = await fetch("/api/batch/run-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: selectedSubscriptionId,
          ...dateRange,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `個別送信完了\n\n全${data.results.total}件\n成功: ${data.results.success}件\n失敗: ${data.results.failed}件`
        );
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("個別送信に失敗しました");
    } finally {
      setSingleRunningId(null);
      setSelectedSubscriptionId("");
    }
  };

  const handleTestSend = async (subscriptionId: string) => {
    setTestSendingId(subscriptionId);
    try {
      const res = await fetch("/api/batch/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await res.json();
      if (res.ok) {
        const details = (data.results as Array<{ channel: string; status: string; error?: string }>)
          .map((r) => `${r.channel}: ${r.status === "success" ? "成功" : `失敗 (${r.error})`}`)
          .join("\n");
        alert(`${data.message}\n\n${details}`);
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("テスト送信に失敗しました");
    } finally {
      setTestSendingId(null);
    }
  };

  // PDF取得: 実行
  const handlePdfDownload = async () => {
    if (!pdfClientId) return;
    setIsPdfDownloading(true);
    try {
      const dateRange = getDateRange();
      const res = await fetch("/api/reports/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pdfClientId,
          ...dateRange,
        }),
      });

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
      a.download = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : "レポート.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowPdfDialog(false);
    } catch {
      alert("ダウンロードに失敗しました");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);

  const resetPeriod = () => {
    setPeriodType("lastMonth");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const periodSelector = (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">レポート期間</label>
      <div className="flex gap-2">
        {(["lastMonth", "month", "custom"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setPeriodType(type)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              periodType === type
                ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {type === "lastMonth" ? "先月" : type === "month" ? "月指定" : "日付指定"}
          </button>
        ))}
      </div>
      {periodType === "month" && (
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
        />
      )}
      {periodType === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">レポート出力・送信</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPdfClientId("");
              resetPeriod();
              setShowPdfDialog(true);
            }}
            disabled={isPdfDownloading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isPdfDownloading ? "ダウンロード中..." : "PDF取得"}
          </button>
          <button
            onClick={handleBatchConfirmOpen}
            disabled={isBatchRunning || isFetchingTargets}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isBatchRunning ? "実行中..." : isFetchingTargets ? "読込中..." : "一括バッチ実行"}
          </button>
          <button
            onClick={() => {
              setSelectedSubscriptionId("");
              resetPeriod();
              setShowSingleDialog(true);
            }}
            disabled={!!singleRunningId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {singleRunningId ? "実行中..." : "個別送信"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors"
          >
            {showForm ? "キャンセル" : "新規登録"}
          </button>
        </div>
      </div>

      {/* 一括バッチ確認ダイアログ */}
      {showBatchConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">一括バッチ実行の確認</h3>
              <p className="text-sm text-gray-500 mt-1">
                以下の対象にレポートを生成・送信します。
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {periodSelector}
              {batchTargets.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  送信対象がありません
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">顧客名</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">サイト</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">送信方法</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchTargets.map((target) => (
                      <tr key={target.siteId} className="border-b border-gray-50">
                        <td className="py-2 px-3 font-medium">{target.clientName}</td>
                        <td className="py-2 px-3">
                          <div>{target.siteName}</div>
                          <div className="text-xs text-gray-400">{target.siteUrl}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {channelLabels[target.deliveryChannel]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBatchConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleBatchRun}
                disabled={batchTargets.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {batchTargets.length}件を実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 個別送信ダイアログ */}
      {showSingleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">個別送信</h3>
              <p className="text-sm text-gray-500 mt-1">
                レポートを生成・送信する顧客を選択してください。
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客</label>
                <select
                  value={selectedSubscriptionId}
                  onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">顧客を選択</option>
                  {activeSubscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.client.name}（{channelLabels[sub.deliveryChannel]}）
                    </option>
                  ))}
                </select>
              </div>
              {periodSelector}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSingleDialog(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSingleRun}
                disabled={!selectedSubscriptionId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF取得ダイアログ */}
      {showPdfDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">レポートPDF取得</h3>
              <p className="text-sm text-gray-500 mt-1">
                クライアントと期間を選択してPDFをダウンロードします。
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">クライアント</label>
                <select
                  value={pdfClientId}
                  onChange={(e) => setPdfClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">クライアントを選択</option>
                  {subscriptions.map((sub) => (
                    <option key={sub.id} value={sub.client.id}>
                      {sub.client.name}
                    </option>
                  ))}
                </select>
              </div>
              {periodSelector}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPdfDialog(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handlePdfDownload}
                disabled={!pdfClientId || isPdfDownloading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isPdfDownloading ? "ダウンロード中..." : "ダウンロード"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Card title="バッチ配信登録">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  クライアント *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                >
                  <option value="">選択してください</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配信チャネル *
                </label>
                <select
                  value={formData.deliveryChannel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryChannel: e.target.value as DeliveryChannel,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                >
                  <option value="email">メール</option>
                  <option value="line">LINE</option>
                  <option value="both">メール + LINE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors"
              >
                登録
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">読み込み中...</p>
        ) : subscriptions.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            バッチ登録されたクライアントがありません
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      クライアント名
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      配信チャネル
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      ステータス
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      一括除外
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      登録日
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium">
                        {sub.client.name}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === sub.id ? (
                          <select
                            value={editChannel}
                            onChange={(e) =>
                              setEditChannel(
                                e.target.value as DeliveryChannel
                              )
                            }
                            className="px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                          >
                            <option value="email">メール</option>
                            <option value="line">LINE</option>
                            <option value="both">メール + LINE</option>
                          </select>
                        ) : (
                          channelLabels[sub.deliveryChannel]
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            sub.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {sub.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleExcludeFromBatch(sub)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            sub.excludeFromBatch
                              ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {sub.excludeFromBatch ? "除外中" : "対象"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(sub.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {editingId === sub.id ? (
                            <>
                              <button
                                onClick={() => handleUpdate(sub.id)}
                                className="px-3 py-1 text-sm bg-[#1a1a2e] text-white rounded hover:bg-[#16213e]"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                戻す
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleTestSend(sub.id)}
                                disabled={testSendingId === sub.id}
                                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
                              >
                                {testSendingId === sub.id ? "送信中..." : "テスト送信"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(sub.id);
                                  setEditChannel(sub.deliveryChannel);
                                }}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleToggleActive(sub)}
                                className={`px-3 py-1 text-sm rounded ${
                                  sub.isActive
                                    ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                    : "bg-green-50 text-green-700 hover:bg-green-100"
                                }`}
                              >
                                {sub.isActive ? "停止" : "有効化"}
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id)}
                                className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                              >
                                解除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchSubscriptions(p)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
