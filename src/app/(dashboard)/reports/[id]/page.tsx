"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/src/components/Card";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { ReportData } from "@/src/lib/report";

interface DeliveryLog {
  id: string;
  channel: "email" | "line";
  status: "success" | "failed";
  errorMessage: string | null;
  sentAt: string | null;
  retryCount: number;
}

interface ReportDetail {
  id: string;
  reportMonth: string;
  status: "generated" | "delivered" | "failed";
  reportData: ReportData | null;
  generatedAt: string | null;
  site: {
    siteName: string;
    siteUrl: string;
    client: {
      name: string;
      deliveryChannel: string;
    };
  };
  deliveryLogs: DeliveryLog[];
}

const channelLabels: Record<string, string> = {
  email: "メール",
  line: "LINE",
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);

  const fetchReport = useCallback(async () => {
    const res = await fetch(`/api/reports/${params.id}`);
    if (!res.ok) {
      router.push("/reports");
      return;
    }
    const data = await res.json();
    setReport(data);
  }, [params.id, router]);

  useEffect(() => {
    const load = async () => {
      await fetchReport();
    };
    void load();

  }, [fetchReport]);

  if (!report) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  const reportData = report.reportData;
  const formatRate = (rate: number) => {
    const sign = rate >= 0 ? "+" : "";
    return `${sign}${rate.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-500 hover:text-gray-700">
            &larr; 戻る
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">レポート詳細</h2>
          <StatusBadge status={report.status} />
        </div>
        {report.reportData && (
          <button
            onClick={() => window.open(`/api/reports/${report.id}/html`, "_blank")}
            className="sm:ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            PDFダウンロード
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="基本情報">
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">クライアント</dt>
              <dd>{report.site.client.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">サイト</dt>
              <dd>{report.site.siteName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">対象月</dt>
              <dd>
                {new Date(report.reportMonth).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">生成日時</dt>
              <dd>
                {report.generatedAt
                  ? new Date(report.generatedAt).toLocaleString("ja-JP")
                  : "-"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="配信ログ">
          {report.deliveryLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">配信ログはありません</p>
          ) : (
            <div className="space-y-3">
              {report.deliveryLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.status === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{channelLabels[log.channel]}</span>
                    <StatusBadge status={log.status} />
                  </div>
                  {log.sentAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      送信日時: {new Date(log.sentAt).toLocaleString("ja-JP")}
                    </p>
                  )}
                  {log.retryCount > 0 && (
                    <p className="text-xs text-gray-500">リトライ回数: {log.retryCount}</p>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">エラー: {log.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {reportData && (
        <>
          <Card title="トラフィックデータ">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">指標</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">当期間</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">前期間</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">増減率</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "セッション数", key: "sessions" as const },
                    { label: "ユーザー数", key: "totalUsers" as const },
                    { label: "ページビュー数", key: "screenPageViews" as const },
                    { label: "直帰率", key: "bounceRate" as const, isPercent: true },
                    { label: "平均セッション時間(秒)", key: "averageSessionDuration" as const },
                  ].map((metric) => {
                    const current = reportData.currentMonth[metric.key];
                    const previous = reportData.previousMonth?.[metric.key];
                    const comp = reportData.comparison?.[metric.key];
                    const displayCurrent = metric.isPercent
                      ? `${(current * 100).toFixed(1)}%`
                      : Math.round(current).toLocaleString();
                    const displayPrevious =
                      previous !== undefined && previous !== null
                        ? metric.isPercent
                          ? `${(previous * 100).toFixed(1)}%`
                          : Math.round(previous).toLocaleString()
                        : "-";

                    return (
                      <tr key={metric.key} className="border-b border-gray-50">
                        <td className="py-3 px-4">{metric.label}</td>
                        <td className="py-3 px-4 text-right font-medium">{displayCurrent}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{displayPrevious}</td>
                        <td className="py-3 px-4 text-right">
                          {comp ? (
                            <span className={comp.rate >= 0 ? "text-green-600" : "text-red-600"}>
                              {comp.rate >= 0 ? "↑" : "↓"} {formatRate(comp.rate)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportData.regions && reportData.regions.length > 0 && (
              <Card title="地域別アクセス">
                <div className="space-y-2">
                  {reportData.regions.filter((r: { region: string }) => r.region !== "(not set)").slice(0, 5).map((r: { region: string; sessions: number }, i: number) => (
                    <div key={r.region} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-sm">{i + 1}. {r.region}</span>
                      <span className="text-sm font-medium">{r.sessions.toLocaleString()} 訪問</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {reportData.sources && reportData.sources.length > 0 && (
              <Card title="流入経路">
                <div className="space-y-2">
                  {reportData.sources.filter((s: { source: string }) => s.source !== "(not set)").slice(0, 5).map((s: { source: string; sessions: number }, i: number) => (
                    <div key={s.source} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-sm">{i + 1}. {s.source}</span>
                      <span className="text-sm font-medium">{s.sessions.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {reportData.devices && reportData.devices.length > 0 && (
              <Card title="デバイス">
                <div className="space-y-2">
                  {reportData.devices.map((d: { deviceCategory: string; sessions: number }) => {
                    const label = d.deviceCategory === "mobile" ? "モバイル" : d.deviceCategory === "desktop" ? "デスクトップ" : d.deviceCategory === "tablet" ? "タブレット" : d.deviceCategory;
                    return (
                      <div key={d.deviceCategory} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <span className="text-sm">{label}</span>
                        <span className="text-sm font-medium">{d.sessions.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {reportData.browsers && reportData.browsers.length > 0 && (
              <Card title="ブラウザ">
                <div className="space-y-2">
                  {reportData.browsers.slice(0, 5).map((b: { browser: string; sessions: number }) => (
                    <div key={b.browser} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-sm">{b.browser}</span>
                      <span className="text-sm font-medium">{b.sessions.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {reportData.searchConsole && (
            <Card title="検索パフォーマンス (SEO)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">クリック数</div>
                  <div className="text-lg font-bold">{reportData.searchConsole.totalClicks.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">インプレッション</div>
                  <div className="text-lg font-bold">{reportData.searchConsole.totalImpressions.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">平均順位</div>
                  <div className="text-lg font-bold">{reportData.searchConsole.averagePosition.toFixed(1)}</div>
                </div>
              </div>
              {reportData.searchConsole.keywords.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">キーワード</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">クリック</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">CTR</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">順位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.searchConsole.keywords.map((kw: { keyword: string; clicks: number; ctr: number; position: number }) => (
                        <tr key={kw.keyword} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium">{kw.keyword}</td>
                          <td className="py-2 px-3 text-right">{kw.clicks.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{(kw.ctr * 100).toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right">{kw.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
