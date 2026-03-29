import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clientId } = body as { clientId: string };

    if (!clientId) {
      return NextResponse.json(
        { error: "clientIdは必須です" },
        { status: 400 }
      );
    }

    const target = await prisma.lineTarget.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json(
        { error: "LINE送信先が見つかりません" },
        { status: 404 }
      );
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: { lineUserId: target.lineId },
    });

    return NextResponse.json({
      message: `${client.name}にLINE送信先を紐づけました`,
      client,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "紐づけに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
