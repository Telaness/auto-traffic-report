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
    lineUserId: "",
    deliveryChannel: "email" as "email" | "line" | "both",
  });
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        contactEmail: formData.contactEmail || null,
        lineUserId: formData.lineUserId || null,
        deliveryChannel: formData.deliveryChannel,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({ name: "", contactEmail: "", lineUserId: "", deliveryChannel: "email" });
      fetchClients(pagination.page, search);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">クライアント一覧</h2>
        <button
          onClick={() => setShowForm(!showForm)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LINE ユーザーID</label>
                <input
                  type="text"
                  value={formData.lineUserId}
                  onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent outline-none"
                />
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
            <div className="overflow-x-auto">
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
