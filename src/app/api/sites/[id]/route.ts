import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { siteUpdateSchema } from "@/src/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      client: true,
      reports: {
        orderBy: { reportMonth: "desc" },
        include: { deliveryLogs: true },
      },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(site);
};

export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const body = await request.json();
  const parsed = siteUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const { reportStartDate, ...rest } = parsed.data;
    const site = await prisma.site.update({
      where: { id },
      data: {
        ...rest,
        ...(reportStartDate ? { reportStartDate: new Date(reportStartDate) } : {}),
      },
    });
    return NextResponse.json(site);
  } catch {
    return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
  }
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;

  try {
    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ message: "サイトを削除しました" });
  } catch {
    return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
  }
};
