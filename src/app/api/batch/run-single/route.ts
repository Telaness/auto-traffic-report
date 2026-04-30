import { NextRequest, NextResponse } from "next/server";
import { runSingleBatch } from "@/src/lib/scheduler";
import { apiServerError } from "@/src/lib/api-response";

export const maxDuration = 60;

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { subscriptionId, startDate, endDate, siteIds } = body as {
      subscriptionId: string;
      startDate?: string;
      endDate?: string;
      siteIds?: string[];
    };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionIdは必須です" },
        { status: 400 }
      );
    }

    const customRange = startDate && endDate ? { startDate, endDate } : undefined;
    const results = await runSingleBatch(subscriptionId, customRange, siteIds);
    return NextResponse.json({
      message: "個別バッチ処理が完了しました",
      results,
    });
  } catch (error) {
    return apiServerError(error, "個別バッチ処理に失敗しました");
  }
};
