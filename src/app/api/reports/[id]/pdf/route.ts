import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";
import { verifyReportToken } from "@/src/lib/report-token";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !verifyReportToken(id, token)) {
    return new NextResponse(
      "<html><body><h1>アクセスが無効です</h1><p>このリンクは無効か期限切れです。</p></body></html>",
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
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
    return new NextResponse(
      "<html><body><h1>レポートが見つかりません</h1></body></html>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
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

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
