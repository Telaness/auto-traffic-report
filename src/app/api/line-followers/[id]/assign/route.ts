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

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "クライアントが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.lineTarget.update({
      where: { id },
      data: { clientId },
    });

    return NextResponse.json({
      message: `${client.name}にLINE送信先を紐づけました`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "紐づけに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;

    await prisma.lineTarget.update({
      where: { id },
      data: { clientId: null },
    });

    return NextResponse.json({ message: "LINE送信先の紐づけを解除しました" });
  } catch {
    return NextResponse.json(
      { error: "紐づけ解除に失敗しました" },
      { status: 500 }
    );
  }
};
