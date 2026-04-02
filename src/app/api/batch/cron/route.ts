import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { runMonthlyBatch } from "@/src/lib/scheduler";

export const maxDuration = 120;

export const GET = async (request: NextRequest) => {
  // Vercel Cron Jobsからの呼び出しを検証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 自動実行設定を確認
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "auto_batch_enabled" },
  });

  if (setting?.value !== "true") {
    console.log("[Cron] 自動バッチは無効のためスキップしました");
    return NextResponse.json({ message: "Auto batch is disabled", skipped: true });
  }

  console.log("[Cron] 自動バッチを開始します...");
  try {
    const results = await runMonthlyBatch();
    console.log(
      `[Cron] バッチ完了: 全${results.total}件, 成功${results.success}件, 失敗${results.failed}件`
    );
    return NextResponse.json({ message: "Batch completed", results });
  } catch (error) {
    console.error("[Cron] バッチ処理でエラーが発生:", error);
    return NextResponse.json({ error: "Batch failed" }, { status: 500 });
  }
};
