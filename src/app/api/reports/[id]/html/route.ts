import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      site: {
        include: { client: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "レポートが見つかりません" }, { status: 404 });
  }

  if (!report.reportData) {
    return NextResponse.json({ error: "レポートデータがありません" }, { status: 404 });
  }

  const reportData = (typeof report.reportData === "string"
    ? JSON.parse(report.reportData)
    : report.reportData) as ReportData;

  const reportMonthStr = new Date(report.reportMonth).toISOString().slice(0, 10);

  const html = generateReportHtml(
    report.site.siteName,
    report.site.siteUrl,
    reportMonthStr,
    reportData
  );

  // 印刷時にPDF保存ダイアログが出るようにprint用スクリプトを追加
  const printableHtml = html.replace(
    "</body>",
    `<script>window.onload = function() { window.print(); }</script></body>`
  );

  return new NextResponse(printableHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
};
