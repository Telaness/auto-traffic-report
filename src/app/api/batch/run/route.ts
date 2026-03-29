import { NextResponse } from "next/server";
import { runMonthlyBatch } from "@/src/lib/scheduler";
import { apiServerError } from "@/src/lib/api-response";

export const POST = async () => {
  try {
    const results = await runMonthlyBatch();
    return NextResponse.json({
      message: "バッチ処理が完了しました",
      results,
    });
  } catch (error) {
    return apiServerError(error, "バッチ処理に失敗しました");
  }
};
