import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { siteCreateSchema } from "@/src/lib/validations";

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");

  const where = clientId ? { clientId } : {};

  const sites = await prisma.site.findMany({
    where,
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sites);
};

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const parsed = siteCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // クライアント存在確認
  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });

  if (!client) {
    return NextResponse.json({ error: "クライアントが見つかりません" }, { status: 404 });
  }

  const site = await prisma.site.create({
    data: {
      clientId: parsed.data.clientId,
      siteName: parsed.data.siteName,
      siteUrl: parsed.data.siteUrl,
      ga4PropertyId: parsed.data.ga4PropertyId,
      reportStartDate: new Date(parsed.data.reportStartDate),
    },
  });

  return NextResponse.json(site, { status: 201 });
};
