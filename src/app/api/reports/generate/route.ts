import { NextRequest, NextResponse } from "next/server";
import { generateReportForSite } from "@/src/lib/report";
import { z } from "zod/v4";

const generateSchema = z.object({
  siteId: z.uuid("有効なサイトIDを指定してください"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で指定してください").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で指定してください").optional(),
});

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { siteId, startDate, endDate } = parsed.data;
  const customRange = startDate && endDate ? { startDate, endDate } : undefined;

  try {
    const reportId = await generateReportForSite(siteId, undefined, customRange);
    return NextResponse.json({ reportId, message: "レポートを生成しました" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "レポート生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
