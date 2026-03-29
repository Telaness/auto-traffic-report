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
            <div className="flex items-center py-2 border-b border-gray-100">
              <StatusDot ok={envStatus.smtp} />
              <span className="text-sm font-medium text-gray-700 w-48">
                SMTP（メール配信）
              </span>
              <span className="text-sm text-gray-500">
                {envStatus.smtp
                  ? "設定済み"
                  : "未設定 - SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM を設定してください"}
              </span>
            </div>
            <div className="flex items-center py-2 border-b border-gray-100">
              <StatusDot ok={envStatus.line} />
              <span className="text-sm font-medium text-gray-700 w-48">
                LINE Messaging API
              </span>
              <span className="text-sm text-gray-500">
                {envStatus.line
                  ? "設定済み"
                  : "未設定 - LINE_CHANNEL_ACCESS_TOKEN を設定してください"}
              </span>
            </div>
            <div className="flex items-center py-2 border-b border-gray-100">
              <StatusDot ok={envStatus.lineSecret} />
              <span className="text-sm font-medium text-gray-700 w-48">
                LINE Webhook
              </span>
              <span className="text-sm text-gray-500">
                {envStatus.lineSecret
                  ? "設定済み"
                  : "未設定 - LINE_CHANNEL_SECRET を設定してください"}
              </span>
            </div>
            <div className="flex items-center py-2 border-b border-gray-100">
              <StatusDot ok={envStatus.ga4} />
              <span className="text-sm font-medium text-gray-700 w-48">
                Google Analytics 4
              </span>
              <span className="text-sm text-gray-500">
                {envStatus.ga4
                  ? "設定済み"
                  : "未設定 - GOOGLE_SERVICE_ACCOUNT_KEY を設定してください"}
              </span>
            </div>
            <div className="flex items-center py-2">
              <StatusDot ok={envStatus.anthropic} />
              <span className="text-sm font-medium text-gray-700 w-48">
                AI分析（Claude）
              </span>
              <span className="text-sm text-gray-500">
                {envStatus.anthropic
                  ? "設定済み"
                  : "未設定 - ANTHROPIC_API_KEY を設定してください"}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
