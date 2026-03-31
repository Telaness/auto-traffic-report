import cron from "node-cron";
import { prisma } from "@/src/lib/db";
import { generateReportForSite, generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";
import { sendReportLineMessage } from "@/src/lib/line";
import { sendReportEmail } from "@/src/lib/email";

interface BatchResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ siteId: string; error: string }>;
}

const deliverReport = async (
  reportId: string
): Promise<void> => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      site: {
        include: {
          client: {
            include: { monthlyBatchSubscription: true },
          },
        },
      },
    },
  });

  if (!report?.reportData || !report.site.client.monthlyBatchSubscription) return;

  const { client } = report.site;
  const subscription = client.monthlyBatchSubscription!;
  const channel = subscription.deliveryChannel;
  const reportData: ReportData = JSON.parse(report.reportData);

  const period = reportData.period;
  const startD = new Date(period.startDate);
  const endD = new Date(period.endDate);
  const reportMonth = `${startD.getFullYear()}年${startD.getMonth() + 1}月${startD.getDate()}日〜${endD.getFullYear()}年${endD.getMonth() + 1}月${endD.getDate()}日`;

  // LINE送信
  if ((channel === "line" || channel === "both") && client.lineUserId) {
    await sendReportLineMessage(
      client.lineUserId,
      report.site.siteName,
      reportMonth,
      {
        sessions: reportData.currentMonth.sessions,
        totalUsers: reportData.currentMonth.totalUsers,
        screenPageViews: reportData.currentMonth.screenPageViews,
        bounceRate: reportData.currentMonth.bounceRate,
      }
    );

    await prisma.deliveryLog.create({
      data: { reportId, channel: "line", status: "success", sentAt: new Date() },
    });
  }

  // メール送信
  if ((channel === "email" || channel === "both") && client.contactEmail) {
    const htmlContent = generateReportHtml(
      report.site.siteName,
      report.site.siteUrl,
      report.reportMonth.toISOString(),
      reportData
    );

    await sendReportEmail(client.contactEmail, report.site.siteName, reportMonth, htmlContent);

    await prisma.deliveryLog.create({
      data: { reportId, channel: "email", status: "success", sentAt: new Date() },
    });
  }
};

export const runMonthlyBatch = async (): Promise<BatchResult> => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

  const results: BatchResult = {
    total: activeSites.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const site of activeSites) {
    try {
      const reportId = await generateReportForSite(site.id, now);
      await deliverReport(reportId);
      results.success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.failed++;
      results.errors.push({ siteId: site.id, error: errorMessage });
    }
  }

  return results;
};

export const runSingleBatch = async (subscriptionId: string): Promise<BatchResult> => {
  const subscription = await prisma.monthlyBatchSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      client: {
        include: { sites: { where: { isActive: true } } },
      },
    },
  });

  if (!subscription) {
    throw new Error("バッチ登録が見つかりません");
  }

  const now = new Date();
  const results: BatchResult = {
    total: subscription.client.sites.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const site of subscription.client.sites) {
    try {
      const reportId = await generateReportForSite(site.id, now);
      await deliverReport(reportId);
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
