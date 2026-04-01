import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

const LINE_API_BASE = "https://api.line.me/v2/bot";

const fetchDisplayName = async (
  type: "user" | "group",
  lineId: string
): Promise<string | null> => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url =
      type === "group"
        ? `${LINE_API_BASE}/group/${lineId}/summary`
        : `${LINE_API_BASE}/profile/${lineId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      displayName?: string;
      groupName?: string;
    };
    return type === "group" ? (data.groupName ?? null) : (data.displayName ?? null);
  } catch {
    return null;
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unassignedOnly = searchParams.get("unassigned") === "true";
    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type"); // "user" | "group" | null(both)

    const where: Record<string, unknown> = {
      isActive: true,
      ...(type ? { type } : {}),
    };

    if (clientId) {
      where.clientId = clientId;
    } else if (unassignedOnly) {
      where.clientId = null;
    }

    const followers = await prisma.lineTarget.findMany({
      where,
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({ followers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { lineId, type, clientId, displayName } = body as {
      lineId: string;
      type: "user" | "group";
      clientId?: string;
      displayName?: string;
    };

    if (!lineId || !type) {
      return NextResponse.json(
        { error: "lineIdとtypeは必須です" },
        { status: 400 }
      );
    }

    if (!["user", "group"].includes(type)) {
      return NextResponse.json(
        { error: "typeは 'user' または 'group' を指定してください" },
        { status: 400 }
      );
    }

    // 既に存在する場合はclientIdを更新して返す
    const existing = await prisma.lineTarget.findUnique({
      where: { lineId },
    });

    if (existing) {
      const updated = await prisma.lineTarget.update({
        where: { lineId },
        data: {
          isActive: true,
          ...(clientId ? { clientId } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    // LINE APIから名前を取得（displayNameが指定されていない場合）
    const resolvedName = displayName ?? await fetchDisplayName(type, lineId);

    const target = await prisma.lineTarget.create({
      data: {
        lineId,
        type,
        displayName: resolvedName,
        isActive: true,
        ...(clientId ? { clientId } : {}),
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
