import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unassignedOnly = searchParams.get("unassigned") === "true";
    const type = searchParams.get("type"); // "user" | "group" | null(both)

    // 既にクライアントに紐づいているlineUserIdを取得
    const assignedIds = unassignedOnly
      ? (
          await prisma.client.findMany({
            where: { lineUserId: { not: null } },
            select: { lineUserId: true },
          })
        ).map((c) => c.lineUserId as string)
      : [];

    const followers = await prisma.lineTarget.findMany({
      where: {
        isActive: true,
        ...(type ? { type } : {}),
        ...(unassignedOnly && assignedIds.length > 0
          ? { lineId: { notIn: assignedIds } }
          : {}),
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({ followers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
