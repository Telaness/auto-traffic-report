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
      console.error("バッチ登録一覧���取得に���敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableClients = useCallback(async () => {
    // 全クライアントを取得
    const res = await fetch("/api/clients?limit=1000");
    const data = await res.json();
    // 既にバッチ登録済みのクライアントIDを除外
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

  const handleDelete = async (id: string) => {
    if (!confirm("このバッチ登録を解除しますか？")) return;

    const res = await fetch(`/api/batch/subscriptions/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchSubscriptions(pagination.page);
    }
  };

  const handleBatchRun = async () => {
    if (!confirm("月次バッチを手動実行しますか？")) return;
    setIsBatchRunning(true);
    try {
      const res = await fetch("/api/batch/run", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(
          `バッチ完了: 全${data.results.total}件, 成功${data.results.success}件, 失敗${data.results.failed}件`
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">月次バッチ管理</h2>
        <div className="flex gap-2">
          <button
            onClick={handleBatchRun}
            disabled={isBatchRunning}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isBatchRunning ? "実行中..." : "バッチ実行"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors"
          >
            {showForm ? "キャンセル" : "新規登録"}
          </button>
        </div>
      </div>

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
