import { NextRequest, NextResponse } from "next/server";
import { runMonthlyBatchWithRange } from "@/src/lib/scheduler";
import { apiServerError } from "@/src/lib/api-response";

export const maxDuration = 120;

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { startDate, endDate } = body as {
      startDate?: string;
      endDate?: string;
    };

    const customRange = startDate && endDate ? { startDate, endDate } : undefined;
    const results = await runMonthlyBatchWithRange(customRange);
    return NextResponse.json({
      message: "バッチ処理が完了しました",
      results,
    });
  } catch (error) {
    return apiServerError(error, "バッチ処理に失敗しました");
  }
};
