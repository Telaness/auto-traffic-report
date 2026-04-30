"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/src/components/Card";
import { Pagination } from "@/src/components/Pagination";

interface Client {
  id: string;
  name: string;
  contactEmail: string | null;
  lineUserId: string | null;
  deliveryChannel: "email" | "line" | "both";
  isActive: boolean;
  sites: Array<{ id: string; siteName: string }>;
}

interface PaginationData {
  page: number;
  totalPages: number;
  total: number;
}

interface LineTarget {
  id: string;
  lineId: string;
  type: "user" | "group";
  displayName: string | null;
}

type PendingLineTarget =
  | { kind: "existing"; id: string; lineId: string; type: "user" | "group"; displayName: string | null }
  | { kind: "manual"; lineId: string; type: "user" | "group" };

const channelLabels: Record<string, string> = {
  email: "メール",
  line: "LINE",
  both: "メール + LINE",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    deliveryChannel: "email" as "email" | "line" | "both",
  });
  const [isLoading, setIsLoading] = useState(true);

  // LINE関連state
  const [pendingLineTargets, setPendingLineTargets] = useState<PendingLineTarget[]>([]);
  const [showLineLink, setShowLineLink] = useState(false);
  const [showManualRegister, setShowManualRegister] = useState(false);
  const [lineTargets, setLineTargets] = useState<LineTarget[]>([]);
  const [lineTypeFilter, setLineTypeFilter] = useState<"" | "user" | "group">("");
  const [manualLineId, setManualLineId] = useState("");
  const [manualLineType, setManualLineType] = useState<"user" | "group">("group");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClients = useCallback(async (page = 1, searchQuery = "") => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/clients?${params}`);
    const data = await res.json();
    setClients(data.clients);
    setPagination(data.pagination);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchClients();
    };
    void load();

  }, [fetchClients]);

  const handleSearch = () => {
    fetchClients(1, search);
  };

  const fetchUnassignedLineTargets = useCallback(
    async (type?: "user" | "group") => {
      try {
        const params = new URLSearchParams({ unassigned: "true" });
        if (type) params.set("type", type);
        const res = await fetch(`/api/line-followers?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const pendingExistingIds = new Set(
          pendingLineTargets
            .filter((p): p is Extract<PendingLineTarget, { kind: "existing" }> => p.kind === "existing")
            .map((p) => p.id)
        );
        const filtered = (data.followers as LineTarget[]).filter((f) => !pendingExistingIds.has(f.id));
        setLineTargets(filtered);
      } catch {
        console.error("LINE送信先の取得に失敗");
      }
    },
    [pendingLineTargets]
  );

  const handleAddPendingExisting = (target: LineTarget) => {
    setPendingLineTargets((prev) => [
      ...prev,
      {
        kind: "existing",
        id: target.id,
        lineId: target.lineId,
        type: target.type,
        displayName: target.displayName,
      },
    ]);
    setLineTargets((prev) => prev.filter((t) => t.id !== target.id));
  };

  const handleAddPendingManual = () => {
    const lineId = manualLineId.trim();
    if (!lineId) return;
    if (pendingLineTargets.some((p) => p.lineId === lineId)) {
      alert("既に追加済みのLINE IDです");
      return;
    }
    setPendingLineTargets((prev) => [
      ...prev,
      { kind: "manual", lineId, type: manualLineType },
    ]);
    setManualLineId("");
    setShowManualRegister(false);
  };

  const handleRemovePending = (index: number) => {
    setPendingLineTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ name: "", contactEmail: "", deliveryChannel: "email" });
    setPendingLineTargets([]);
    setShowLineLink(false);
    setShowManualRegister(false);
    setLineTargets([]);
    setLineTypeFilter("");
    setManualLineId("");
    setManualLineType("group");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          contactEmail: formData.contactEmail || null,
          deliveryChannel: formData.deliveryChannel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`クライアント作成に失敗しました${data.error ? `: ${data.error}` : ""}`);
        return;
      }

      const created = (await res.json()) as { id: string };

      // LINE紐付け処理
      const failures: string[] = [];
      for (const pending of pendingLineTargets) {
        try {
          if (pending.kind === "existing") {
            const linkRes = await fetch(`/api/line-followers/${pending.id}/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clientId: created.id }),
            });
            if (!linkRes.ok) {
              const data = await linkRes.json().catch(() => ({}));
              failures.push(`${pending.lineId}: ${data.error ?? "紐付け失敗"}`);
            }
          } else {
            const regRes = await fetch("/api/line-followers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lineId: pending.lineId,
                type: pending.type,
                clientId: created.id,
              }),
            });
            if (!regRes.ok) {
              const data = await regRes.json().catch(() => ({}));
              failures.push(`${pending.lineId}: ${data.error ?? "登録失敗"}`);
            }
          }
        } catch {
          failures.push(`${pending.lineId}: 通信エラー`);
        }
      }

      if (failures.length > 0) {
        alert(`クライアントは作成されましたが、一部のLINE紐付けに失敗しました:\n${failures.join("\n")}`);
      }

      resetForm();
      fetchClients(pagination.page, search);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">クライアント一覧</h2>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors"
        >
          {showForm ? "キャンセル" : "新規登録"}
        </button>
      </div>

      {showForm && (
        <Card title="新規クライアント登録">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配信チャネル *</label>
                <select
                  value={formData.deliveryChannel}
                  onChange={(e) => setFormData({ ...formData, deliveryChannel: e.target.value as "email" | "line" | "both" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                >
                  <option value="email">メール</option>
                  <option value="line">LINE</option>
                  <option value="both">メール + LINE</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LINE送信先
                <button
                  type="button"
                  onClick={() => {
                    setShowLineLink(true);
                    setShowManualRegister(false);
                    void fetchUnassignedLineTargets(lineTypeFilter || undefined);
                  }}
                  className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualRegister((prev) => !prev);
                    setShowLineLink(false);
                  }}
                  className="ml-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  {showManualRegister ? "閉じる" : "手動登録"}
                </button>
              </label>

              {showManualRegister && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">
                    LINE IDを直接入力して登録します。登録時にLINE APIから名前を自動取得します。
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">LINE ID</label>
                      <input
                        type="text"
                        value={manualLineId}
                        onChange={(e) => setManualLineId(e.target.value)}
                        placeholder="C1234abcd..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">種別</label>
                      <select
                        value={manualLineType}
                        onChange={(e) => setManualLineType(e.target.value as "user" | "group")}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="group">グループ</option>
                        <option value="user">個人</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPendingManual}
                      disabled={!manualLineId.trim()}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      追加
                    </button>
                  </div>
                </div>
              )}

              {pendingLineTargets.length === 0 ? (
                <p className="text-sm text-gray-400">未設定</p>
              ) : (
                <div className="space-y-2">
                  {pendingLineTargets.map((p, idx) => (
                    <div
                      key={`${p.kind}-${p.lineId}-${idx}`}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                            p.type === "group"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {p.type === "group" ? "グループ" : "個人"}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {p.kind === "existing" ? (p.displayName ?? "名前未取得") : "新規登録"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate">{p.lineId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(idx)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 shrink-0"
                      >
                        解除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showLineLink && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">LINE送信先一覧（未紐づけ）</h4>
                    <div className="flex gap-1">
                      {(["", "user", "group"] as const).map((t) => {
                        const label = t === "" ? "すべて" : t === "user" ? "個人" : "グループ";
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setLineTypeFilter(t);
                              void fetchUnassignedLineTargets(t || undefined);
                            }}
                            className={`px-3 py-1 text-xs rounded ${
                              lineTypeFilter === t
                                ? "bg-[#1a1a2e] text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {lineTargets.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      紐づけ可能な送信先がありません。公式アカウントを友だち追加、またはグループに招待してもらってください。
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lineTargets.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                                t.type === "group"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {t.type === "group" ? "グループ" : "個人"}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {t.displayName ?? "名前未取得"}
                            </span>
                            <span className="text-xs text-gray-400 font-mono truncate">{t.lineId}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddPendingExisting(t)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 shrink-0"
                          >
                            紐づける
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "登録中..." : "登録"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="クライアント名で検索..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            検索
          </button>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-gray-500">読み込み中...</p>
        ) : clients.length === 0 ? (
          <p className="text-center py-8 text-gray-500">クライアントが登録されていません</p>
        ) : (
          <>
            {/* モバイル: カード表示 */}
            <div className="space-y-3 md:hidden">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm truncate mr-2">{client.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {client.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{channelLabels[client.deliveryChannel]}</span>
                    <span>サイト数: {client.sites.length}</span>
                  </div>
                </Link>
              ))}
            </div>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">会社名</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">配信チャネル</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">サイト数</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ステータス</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{client.name}</td>
                      <td className="py-3 px-4">{channelLabels[client.deliveryChannel]}</td>
                      <td className="py-3 px-4">{client.sites.length}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {client.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/clients/${client.id}`}
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
              onPageChange={(p) => fetchClients(p, search)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
