import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (siteId) where.siteId = siteId;
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        site: {
          include: { client: { select: { id: true, name: true } } },
        },
        deliveryLogs: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
