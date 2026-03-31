import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";
import { convertHtmlToPdf } from "@/src/lib/pdf";
import { verifyReportToken } from "@/src/lib/report-token";

type RouteParams = { params: Promise<{ id: string }> };

export const maxDuration = 60;

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !verifyReportToken(id, token)) {
    return NextResponse.json({ error: "無効なトークンです" }, { status: 403 });
  }

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      site: {
        include: { client: true },
      },
    },
  });

  if (!report || !report.reportData) {
    return NextResponse.json({ error: "レポートが見つかりません" }, { status: 404 });
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

  const pdfBuffer = await convertHtmlToPdf(html);

  const date = new Date(report.reportMonth);
  const fileName = `${report.site.siteName}_${date.getFullYear()}年${date.getMonth() + 1}月_レポート.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
};
