import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";
import { convertHtmlsToPdfs } from "@/src/lib/pdf";
import archiver from "archiver";
import { PassThrough } from "stream";

export const GET = async () => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const reports = await prisma.report.findMany({
      where: {
        reportMonth: lastMonth,
        reportData: { not: null },
      },
      include: {
        site: {
          include: { client: true },
        },
      },
    });

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "前月のレポートが見つかりません" },
        { status: 404 }
      );
    }

    const htmlItems = reports
      .filter((report) => report.reportData)
      .map((report) => {
        const reportData = (typeof report.reportData === "string"
          ? JSON.parse(report.reportData)
          : report.reportData) as ReportData;

        const reportMonthStr = new Date(report.reportMonth).toISOString().slice(0, 10);
        const month = new Date(report.reportMonth);
        const monthLabel = `${month.getFullYear()}年${String(month.getMonth() + 1).padStart(2, "0")}月`;

        const html = generateReportHtml(
          report.site.siteName,
          report.site.siteUrl,
          reportMonthStr,
          reportData
        );

        const fileName = `${report.site.client.name}_${report.site.siteName}_${monthLabel}.pdf`;
        return { html, fileName };
      });

    const pdfResults = await convertHtmlsToPdfs(htmlItems);

    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(passThrough);

    for (const { pdf, fileName } of pdfResults) {
      archive.append(pdf, { name: fileName });
    }

    await archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of passThrough) {
      chunks.push(Buffer.from(chunk as ArrayBuffer));
    }
    const zipBuffer = Buffer.concat(chunks);

    const zipFileName = `トラフィックレポート_${lastMonth.getFullYear()}年${String(lastMonth.getMonth() + 1).padStart(2, "0")}月.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "一括ダウンロードに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
