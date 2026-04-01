import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { generateReportHtml } from "@/src/lib/report";
import type { ReportData } from "@/src/lib/report";
import { convertHtmlsToPdfs, convertHtmlToPdf } from "@/src/lib/pdf";
import archiver from "archiver";
import { PassThrough } from "stream";

export const maxDuration = 120;

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { clientId, startDate, endDate } = body as {
      clientId: string;
      startDate?: string;
      endDate?: string;
    };

    if (!clientId) {
      return NextResponse.json(
        { error: "クライアントIDは必須です" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "クライアントが見つかりません" },
        { status: 404 }
      );
    }

    // 期間指定がある場合はcreatedAtで絞り込み、ない場合は前月
    const where: Record<string, unknown> = {
      reportData: { not: null },
      site: { clientId },
    };

    if (startDate && endDate) {
      where.reportMonth = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      where.reportMonth = lastMonth;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        site: {
          include: { client: true },
        },
      },
      orderBy: { reportMonth: "desc" },
    });

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "該当するレポートが見つかりません" },
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

    // 1件の場合は単体PDF、複数件の場合はZIP
    if (htmlItems.length === 1) {
      const pdfBuffer = await convertHtmlToPdf(htmlItems[0].html);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(htmlItems[0].fileName)}`,
        },
      });
    }

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

    const zipFileName = `${client.name}_トラフィックレポート.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ダウンロードに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
