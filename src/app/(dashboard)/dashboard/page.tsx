import { prisma } from "@/src/lib/db";
import { Card } from "@/src/components/Card";
import { StatusBadge, type StatusType } from "@/src/components/StatusBadge";

export default async function DashboardPage() {
  const [clientCount, siteCount, recentReports, deliveryStats] =
    await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.site.count({ where: { isActive: true } }),
      prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          site: {
            include: { client: { select: { name: true } } },
          },
        },
      }),
      prisma.deliveryLog.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

  const successCount =
    deliveryStats.find((s) => s.status === "success")?._count ?? 0;
  const failedCount =
    deliveryStats.find((s) => s.status === "failed")?._count ?? 0;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">アクティブクライアント</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {clientCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">登録サイト数</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {siteCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">配信成功</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {successCount}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">配信失敗</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {failedCount}
            </p>
          </div>
        </Card>
      </div>

      <Card title="最近のレポート">
        {recentReports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            レポートはまだありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    クライアント
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    サイト
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    対象月
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    ステータス
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    生成日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      {report.site.client.name}
                    </td>
                    <td className="py-3 px-4">{report.site.siteName}</td>
                    <td className="py-3 px-4">
                      {new Date(report.reportMonth).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={report.status as StatusType} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {report.generatedAt
                        ? new Date(report.generatedAt).toLocaleString("ja-JP")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
