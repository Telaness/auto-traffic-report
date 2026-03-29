import cron from "node-cron";
import { prisma } from "@/src/lib/db";
import { generateReportForSite } from "@/src/lib/report";

export const runMonthlyBatch = async (): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: Array<{ siteId: string; error: string }>;
}> => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // バッチ登録済み（isActive: true）のクライアントに紐づくアクティブサイトのみ取得
  const activeSites = await prisma.site.findMany({
    where: {
      isActive: true,
      reportStartDate: { lte: currentMonthStart },
      client: {
        isActive: true,
        monthlyBatchSubscription: { isActive: true },
      },
    },
    include: {
      client: {
        include: { monthlyBatchSubscription: true },
      },
    },
  });

  const results = {
    total: activeSites.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ siteId: string; error: string }>,
  };

  for (const site of activeSites) {
    try {
      await generateReportForSite(site.id, now);
      results.success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.failed++;
      results.errors.push({ siteId: site.id, error: errorMessage });
    }
  }

  return results;
};

// 毎月1日 08:00 JST で実行
export const startScheduler = () => {
  cron.schedule(
    "0 8 1 * *",
    async () => {
      console.log("[Scheduler] 月次バッチ処理を開始します...");
      try {
        const results = await runMonthlyBatch();
        console.log(
          `[Scheduler] バッチ完了: 全${results.total}件, 成功${results.success}件, 失敗${results.failed}件`
        );
      } catch (error) {
        console.error("[Scheduler] バッチ処理でエラーが発生:", error);
      }
    },
    {
      timezone: "Asia/Tokyo",
    }
  );
  console.log("[Scheduler] 月次バッチスケジューラーを起動しました（毎月1日 08:00 JST）");
};
