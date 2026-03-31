import { NextRequest, NextResponse } from "next/server";
import { runSingleBatch } from "@/src/lib/scheduler";
import { apiServerError } from "@/src/lib/api-response";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { subscriptionId } = body as { subscriptionId: string };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionIdは必須です" },
        { status: 400 }
      );
    }

    const results = await runSingleBatch(subscriptionId);
    return NextResponse.json({
      message: "個別バッチ処理が完了しました",
      results,
    });
  } catch (error) {
    return apiServerError(error, "個別バッチ処理に失敗しました");
  }
};
