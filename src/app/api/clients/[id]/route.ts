import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { clientUpdateSchema } from "@/src/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      sites: {
        include: {
          reports: {
            orderBy: { reportMonth: "desc" },
            take: 5,
          },
        },
      },
      monthlyBatchSubscription: true,
      lineTargets: {
        where: { isActive: true },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "クライアントが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(client);
};

export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const body = await request.json();
  const parsed = clientUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const client = await prisma.client.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(client);
  } catch {
    return NextResponse.json({ error: "クライアントが見つかりません" }, { status: 404 });
  }
};

export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const hard = request.nextUrl.searchParams.get("hard") === "true";

  if (hard) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { sites: true } } },
    });

    if (!client) {
      return NextResponse.json({ error: "クライアントが見つかりません" }, { status: 404 });
    }

    if (client._count.sites > 0) {
      return NextResponse.json(
        { error: "サイトが登録されているクライアントは削除できません。先にサイトを全て削除してください。" },
        { status: 400 }
      );
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ message: "クライアントを削除しました" });
  }

  try {
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "クライアントを無効化しました" });
  } catch {
    return NextResponse.json({ error: "クライアントが見つかりません" }, { status: 404 });
  }
};
