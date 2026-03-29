import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      site: {
        include: { client: true },
      },
      deliveryLogs: {
        orderBy: { sentAt: "desc" },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "レポートが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    ...report,
    reportData: report.reportData ? JSON.parse(report.reportData) : null,
  });
};
