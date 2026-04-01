import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { apiServerError } from "@/src/lib/api-response";

export const GET = async () => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sites = await prisma.site.findMany({
      where: {
        isActive: true,
        reportStartDate: { lte: currentMonthStart },
        client: {
          isActive: true,
          monthlyBatchSubscription: { isActive: true, excludeFromBatch: false },
        },
      },
      include: {
        client: {
          include: { monthlyBatchSubscription: true },
        },
      },
      orderBy: { client: { name: "asc" } },
    });

    const targets = sites.map((site) => ({
      siteId: site.id,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      clientName: site.client.name,
      deliveryChannel: site.client.monthlyBatchSubscription?.deliveryChannel ?? "email",
    }));

    return NextResponse.json({ targets });
  } catch (error) {
    return apiServerError(error, "バッチ対象一覧の取得に失敗しました");
  }
};
