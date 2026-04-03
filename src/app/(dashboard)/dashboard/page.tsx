import { prisma } from "@/src/lib/db";
import { Card } from "@/src/components/Card";

export default async function DashboardPage() {
  const [clientCount, siteCount, deliveryStats, failedLogs] =
    await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.site.count({ where: { isActive: true } }),
      prisma.deliveryLog.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.deliveryLog.findMany({
        where: { status: "failed" },
        orderBy: { sentAt: "desc" },
        take: 30,
        include: {
          report: {
            include: {
              site: {
                include: { client: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

  const successCount =
    deliveryStats.find((s) => s.status === "success")?._count ?? 0;
  const failedCount =
    deliveryStats.find((s) => s.status === "failed")?._count ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ダッシュボード</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">アクティブサイト数</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
              {siteCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">クライアント数</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
              {clientCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">配信成功数</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">
              {successCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">配信失敗数</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">
              {failedCount}
            </p>
          </div>
        </Card>
      </div>

      <Card title="配信失敗ログ">
        {failedLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            配信失敗はありません
          </p>
        ) : (
          <>
            {/* モバイル: カード表示 */}
            <div className="space-y-3 md:hidden">
              {failedLogs.map((log) => (
                <div key={log.id} className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{log.report.site.client.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.channel === "email"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {log.channel === "email" ? "メール" : "LINE"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{log.report.site.siteName}</p>
                  <p className="text-xs text-gray-400">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString("ja-JP") : "-"}
                  </p>
                  <p className="text-xs text-red-600 break-all">{log.errorMessage ?? "-"}</p>
                </div>
              ))}
            </div>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">日時</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">クライアント</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">サイト</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">チャネル</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">エラー内容</th>
                  </tr>
                </thead>
                <tbody>
                  {failedLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString("ja-JP") : "-"}
                      </td>
                      <td className="py-3 px-4">{log.report.site.client.name}</td>
                      <td className="py-3 px-4">{log.report.site.siteName}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.channel === "email"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {log.channel === "email" ? "メール" : "LINE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-red-600 text-xs">{log.errorMessage ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
