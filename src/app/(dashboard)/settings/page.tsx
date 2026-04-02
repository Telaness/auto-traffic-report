"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/src/components/Card";

interface EnvStatus {
  smtp: boolean;
  line: boolean;
  lineSecret: boolean;
  ga4: boolean;
  anthropic: boolean;
}

const StatusDot = ({ ok }: { ok: boolean }) => (
  <span
    className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
      ok ? "bg-green-500" : "bg-gray-300"
    }`}
  />
);

export default function SettingsPage() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/status");
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch {
      console.error("設定状況の取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchStatus();
    };
    void load();
  }, [fetchStatus]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">設定</h2>

      <Card title="環境変数の設定状況">
        <p className="text-sm text-gray-500 mb-4">
          各サービスの環境変数が正しく設定されているかを表示しています。変更は .env ファイルを編集し、サーバーを再起動してください。
        </p>

        {envStatus === null ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : (
          <div className="space-y-3">
            {[
              { ok: envStatus.smtp, label: "SMTP（メール配信）", msg: "SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM を設定してください" },
              { ok: envStatus.line, label: "LINE Messaging API", msg: "LINE_CHANNEL_ACCESS_TOKEN を設定してください" },
              { ok: envStatus.lineSecret, label: "LINE Webhook", msg: "LINE_CHANNEL_SECRET を設定してください" },
              { ok: envStatus.ga4, label: "Google Analytics 4", msg: "GOOGLE_SERVICE_ACCOUNT_KEY を設定してください" },
              { ok: envStatus.anthropic, label: "AI分析（Claude）", msg: "ANTHROPIC_API_KEY を設定してください" },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex flex-col sm:flex-row sm:items-center gap-1 py-2 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="flex items-center sm:w-56 shrink-0">
                  <StatusDot ok={item.ok} />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm text-gray-500 sm:ml-0 ml-4">
                  {item.ok ? "設定済み" : `未設定 - ${item.msg}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
