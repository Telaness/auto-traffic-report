import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { clientCreateSchema } from "@/src/lib/validations";

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";

  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { sites: { select: { id: true, siteName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const parsed = clientCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "バリデーションエラー", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      contactEmail: parsed.data.contactEmail ?? null,
      lineUserId: parsed.data.lineUserId ?? null,
      deliveryChannel: parsed.data.deliveryChannel,
    },
  });

  return NextResponse.json(client, { status: 201 });
};
