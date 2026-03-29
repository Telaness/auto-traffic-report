import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { batchSubscriptionUpdateSchema } from "@/src/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const body = await request.json();
  const parsed = batchSubscriptionUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const subscription = await prisma.monthlyBatchSubscription.update({
      where: { id },
      data: parsed.data,
      include: {
        client: {
          select: { id: true, name: true, contactEmail: true, lineUserId: true },
        },
      },
    });
    return NextResponse.json(subscription);
  } catch {
    return NextResponse.json(
      { error: "バッチ登録が見つかりません" },
      { status: 404 }
    );
  }
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  try {
    await prisma.monthlyBatchSubscription.delete({
      where: { id },
    });
    return NextResponse.json({ message: "バッチ登録を解除しました" });
  } catch {
    return NextResponse.json(
      { error: "バッチ登録が見つかりません" },
      { status: 404 }
    );
  }
};
