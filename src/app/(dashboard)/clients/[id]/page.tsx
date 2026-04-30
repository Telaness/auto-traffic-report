"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/src/components/Card";
import { StatusBadge } from "@/src/components/StatusBadge";

interface Site {
  id: string;
  siteName: string;
  siteUrl: string;
  ga4PropertyId: string;
  reportStartDate: string;
  isActive: boolean;
  reports: Array<{
    id: string;
    reportMonth: string;
    status: "generated" | "delivered" | "failed";
    generatedAt: string | null;
  }>;
}

interface LineTarget {
  id: string;
  lineId: string;
  type: "user" | "group";
  displayName: string | null;
  isActive: boolean;
  joinedAt: string;
}

interface ClientDetail {
  id: string;
  name: string;
  contactEmail: string | null;
  isActive: boolean;
  sites: Site[];
  lineTargets: LineTarget[];
}


export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [reportFormSiteId, setReportFormSiteId] = useState<string | null>(null);
  const [reportRange, setReportRange] = useState({ startDate: "", endDate: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    contactEmail: "",
  });
  const [siteFormData, setSiteFormData] = useState({
    siteName: "",
    siteUrl: "",
    ga4PropertyId: "",
    reportStartDate: "",
  });
  const [showLineLink, setShowLineLink] = useState(false);
  const [showManualRegister, setShowManualRegister] = useState(false);
  const [manualLineId, setManualLineId] = useState("");
  const [manualLineType, setManualLineType] = useState<"user" | "group">("group");
  const [isRegistering, setIsRegistering] = useState(false);
  const [lineTargets, setLineTargets] = useState<LineTarget[]>([]);
  const [lineTypeFilter, setLineTypeFilter] = useState<"" | "user" | "group">("");
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${params.id}`);
    if (!res.ok) {
      router.push("/clients");
      return;
    }
    const data = await res.json();
    setClient(data);
    setEditData({
      name: data.name,
      contactEmail: data.contactEmail ?? "",
    });
  }, [params.id, router]);

  useEffect(() => {
    const load = async () => {
      await fetchClient();
    };
    void load();

  }, [fetchClient]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/clients/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editData.name,
        contactEmail: editData.contactEmail || null,
      }),
    });
    if (res.ok) {
      setIsEditing(false);
      fetchClient();
    }
  };

  const handleDelete = async () => {
    if (!confirm("このクライアントを無効化しますか？")) return;
    const res = await fetch(`/api/clients/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
    }
  };

  const handleHardDelete = async () => {
    if (!client) return;
    if (client.sites.length > 0) {
      alert("サイトが登録されているため削除できません。先にサイトを全て削除してください。");
      return;
    }
    if (!confirm(`本当に「${client.name}」を完全に削除しますか？\n\nこの操作は取り消せません。`)) return;
    const res = await fetch(`/api/clients/${params.id}?hard=true`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`削除に失敗しました${data.error ? `: ${data.error}` : ""}`);
    }
  };

  const handleAddSite = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: params.id,
        ...siteFormData,
      }),
    });
    if (res.ok) {
      setShowSiteForm(false);
      setSiteFormData({ siteName: "", siteUrl: "", ga4PropertyId: "", reportStartDate: "" });
      fetchClient();
    }
  };

  const fetchLineTargets = useCallback(async (type?: "user" | "group") => {
    try {
      const params = new URLSearchParams({ unassigned: "true" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/line-followers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLineTargets(data.followers);
      }
    } catch {
      console.error("LINE送信先の取得に失敗");
    }
  }, []);

  const handleManualRegister = async () => {
    if (!manualLineId.trim()) return;
    setIsRegistering(true);
    try {
      const res = await fetch("/api/line-followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: manualLineId.trim(),
          type: manualLineType,
          clientId: params.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualLineId("");
        setShowManualRegister(false);
        fetchClient();
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("登録に失敗しました");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnassignLine = async (targetId: string) => {
    if (!confirm("このLINE送信先の紐づけを解除しますか？")) return;
    try {
      const res = await fetch(`/api/line-followers/${targetId}/assign`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClient();
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("紐づけ解除に失敗しました");
    }
  };

  const handleAssignLine = async (targetId: string) => {
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/line-followers/${targetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: params.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowLineLink(false);
        fetchClient();
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("LINE紐づけに失敗しました");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleGenerateReport = async (siteId: string) => {
    if (!reportRange.startDate || !reportRange.endDate) {
      alert("開始日と終了日を指定してください");
      return;
    }
    if (reportRange.startDate > reportRange.endDate) {
      alert("開始日は終了日より前にしてください");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          startDate: reportRange.startDate,
          endDate: reportRange.endDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReportFormSiteId(null);
        setReportRange({ startDate: "", endDate: "" });
        router.push(`/reports/${data.reportId}`);
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert("レポート生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!client) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/clients" className="text-gray-500 hover:text-gray-700 shrink-0">
            &larr; 戻る
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
            {client.isActive ? "有効" : "無効"}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {isEditing ? "キャンセル" : "編集"}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            無効化
          </button>
          <button
            onClick={handleHardDelete}
            disabled={client.sites.length > 0}
            title={client.sites.length > 0 ? "サイトを全て削除してから実行してください" : ""}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            削除
          </button>
        </div>
      </div>

      {isEditing ? (
        <Card title="クライアント情報編集">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={editData.contactEmail}
                  onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
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
                    fetchLineTargets();
                  }}
                  className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualRegister(!showManualRegister)}
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
                      onClick={handleManualRegister}
                      disabled={!manualLineId.trim() || isRegistering}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isRegistering ? "登録中..." : "登録"}
                    </button>
                  </div>
                </div>
              )}

              {client.lineTargets.length === 0 ? (
                <p className="text-sm text-gray-400">未設定</p>
              ) : (
                <div className="space-y-2">
                  {client.lineTargets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            t.type === "group"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {t.type === "group" ? "グループ" : "個人"}
                        </span>
                        <span className="text-sm font-medium">
                          {t.displayName ?? "名前未取得"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {t.lineId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnassignLine(t.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
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
                    <h4 className="text-sm font-medium text-gray-700">
                      LINE送信先一覧（未紐づけ）
                    </h4>
                    <div className="flex gap-1">
                      {(["", "user", "group"] as const).map((t) => {
                        const label = t === "" ? "すべて" : t === "user" ? "個人" : "グループ";
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setLineTypeFilter(t);
                              fetchLineTargets(t || undefined);
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
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                t.type === "group"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {t.type === "group" ? "グループ" : "個人"}
                            </span>
                            <span className="text-sm font-medium">
                              {t.displayName ?? "名前未取得"}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {t.lineId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignLine(t.id)}
                            disabled={isAssigning}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {isAssigning ? "紐づけ中..." : "紐づける"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLineLink(false)}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e]">
                更新
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card title="クライアント情報">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">会社名</dt>
              <dd className="mt-1 font-medium">{client.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">メールアドレス</dt>
              <dd className="mt-1">{client.contactEmail ?? "-"}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500">LINE送信先</dt>
              <dd className="mt-2">
                {client.lineTargets.length === 0 ? (
                  <span className="text-gray-400">未設定</span>
                ) : (
                  <div className="space-y-2">
                    {client.lineTargets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            t.type === "group"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {t.type === "group" ? "グループ" : "個人"}
                        </span>
                        <span className="text-sm font-medium">
                          {t.displayName ?? "名前未取得"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {t.lineId}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      <Card
        title="登録サイト"
        action={
          <button
            onClick={() => setShowSiteForm(!showSiteForm)}
            className="px-3 py-1.5 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e]"
          >
            {showSiteForm ? "キャンセル" : "サイト追加"}
          </button>
        }
      >
        {showSiteForm && (
          <form onSubmit={handleAddSite} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">サイト名 *</label>
                <input
                  type="text"
                  value={siteFormData.siteName}
                  onChange={(e) => setSiteFormData({ ...siteFormData, siteName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">サイトURL *</label>
                <input
                  type="url"
                  value={siteFormData.siteUrl}
                  onChange={(e) => setSiteFormData({ ...siteFormData, siteUrl: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GA4プロパティID *</label>
                <input
                  type="text"
                  value={siteFormData.ga4PropertyId}
                  onChange={(e) => setSiteFormData({ ...siteFormData, ga4PropertyId: e.target.value })}
                  required
                  placeholder="properties/123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">レポート開始日 *</label>
                <input
                  type="date"
                  value={siteFormData.reportStartDate}
                  onChange={(e) => setSiteFormData({ ...siteFormData, reportStartDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e]">
                登録
              </button>
            </div>
          </form>
        )}

        {client.sites.length === 0 ? (
          <p className="text-gray-500 text-center py-4">サイトが登録されていません</p>
        ) : (
          <>
            {/* モバイル: カード表示 */}
            <div className="space-y-3 lg:hidden">
              {client.sites.map((site) => {
                const latestReport = site.reports[0];
                return (
                  <div key={site.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate mr-2">{site.siteName}</span>
                      {latestReport ? (
                        <StatusBadge status={latestReport.status} />
                      ) : (
                        <span className="text-xs text-gray-400">レポートなし</span>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 truncate">{site.siteUrl}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-mono">{site.ga4PropertyId}</span>
                      <span>開始: {new Date(site.reportStartDate).toLocaleDateString("ja-JP")}</span>
                    </div>
                    {reportFormSiteId === site.id ? (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">開始日</label>
                            <input
                              type="date"
                              value={reportRange.startDate}
                              onChange={(e) => setReportRange({ ...reportRange, startDate: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">終了日</label>
                            <input
                              type="date"
                              value={reportRange.endDate}
                              onChange={(e) => setReportRange({ ...reportRange, endDate: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateReport(site.id)}
                            disabled={isGenerating}
                            className="px-3 py-1 text-sm bg-[#1a1a2e] text-white rounded hover:bg-[#16213e] disabled:opacity-50"
                          >
                            {isGenerating ? "生成中..." : "生成"}
                          </button>
                          <button
                            onClick={() => { setReportFormSiteId(null); setReportRange({ startDate: "", endDate: "" }); }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReportFormSiteId(site.id)}
                        className="w-full px-3 py-1.5 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e]"
                      >
                        レポート生成
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">サイト名</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">URL</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">GA4 ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">開始日</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">最新レポート</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {client.sites.map((site) => {
                    const latestReport = site.reports[0];
                    return (
                      <tr key={site.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                        <td className="py-3 px-4 font-medium">{site.siteName}</td>
                        <td className="py-3 px-4 text-blue-600">{site.siteUrl}</td>
                        <td className="py-3 px-4 font-mono text-xs">{site.ga4PropertyId}</td>
                        <td className="py-3 px-4">
                          {new Date(site.reportStartDate).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="py-3 px-4">
                          {latestReport ? (
                            <StatusBadge status={latestReport.status} />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {reportFormSiteId === site.id ? (
                            <div className="space-y-2 min-w-[240px]">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500">開始日</label>
                                <input
                                  type="date"
                                  value={reportRange.startDate}
                                  onChange={(e) => setReportRange({ ...reportRange, startDate: e.target.value })}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500">終了日</label>
                                <input
                                  type="date"
                                  value={reportRange.endDate}
                                  onChange={(e) => setReportRange({ ...reportRange, endDate: e.target.value })}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleGenerateReport(site.id)}
                                  disabled={isGenerating}
                                  className="px-3 py-1 text-sm bg-[#1a1a2e] text-white rounded hover:bg-[#16213e] disabled:opacity-50"
                                >
                                  {isGenerating ? "生成中..." : "生成"}
                                </button>
                                <button
                                  onClick={() => {
                                    setReportFormSiteId(null);
                                    setReportRange({ startDate: "", endDate: "" });
                                  }}
                                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  閉じる
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReportFormSiteId(site.id)}
                              className="px-3 py-1.5 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] whitespace-nowrap"
                            >
                              レポート生成
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
