import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { batchSubscriptionCreateSchema } from "@/src/lib/validations";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const [subscriptions, total] = await Promise.all([
      prisma.monthlyBatchSubscription.findMany({
        include: {
          client: {
            select: { id: true, name: true, contactEmail: true, lineUserId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.monthlyBatchSubscription.count(),
    ]);

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "バッチ登録一覧の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const parsed = batchSubscriptionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });

  if (!client) {
    return NextResponse.json(
      { error: "クライアントが見つかりません" },
      { status: 404 }
    );
  }

  const existing = await prisma.monthlyBatchSubscription.findUnique({
    where: { clientId: parsed.data.clientId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "このクライアントは既にバッチ登録されています" },
      { status: 409 }
    );
  }

  const subscription = await prisma.monthlyBatchSubscription.create({
    data: {
      clientId: parsed.data.clientId,
      deliveryChannel: parsed.data.deliveryChannel,
    },
    include: {
      client: {
        select: { id: true, name: true, contactEmail: true, lineUserId: true },
      },
    },
  });

  return NextResponse.json(subscription, { status: 201 });
};
