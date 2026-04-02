import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";

interface LineEventSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

interface LineEvent {
  type: string;
  source: LineEventSource;
  timestamp: number;
}

interface LineWebhookBody {
  events: LineEvent[];
}

const LINE_API_BASE = "https://api.line.me/v2/bot";

const verifySignature = (body: string, signature: string): boolean => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error("[LINE Webhook] LINE_CHANNEL_SECRET が設定されていません");
    return false;
  }
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
};

const fetchProfile = async (
  type: "user" | "group",
  id: string
): Promise<{ displayName: string } | null> => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  try {
    // グループの場合はグループ名を取得
    const url =
      type === "group"
        ? `${LINE_API_BASE}/group/${id}/summary`
        : `${LINE_API_BASE}/profile/${id}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      displayName?: string;
      groupName?: string;
    };
    return {
      displayName:
        type === "group"
          ? (data.groupName ?? null)
          : (data.displayName ?? null),
    } as { displayName: string };
  } catch {
    return null;
  }
};

const upsertTarget = async (
  lineId: string,
  type: "user" | "group",
  isActive: boolean
) => {
  const { prisma } = await import("@/src/lib/db");
  const profile = isActive ? await fetchProfile(type, lineId) : null;

  await prisma.lineTarget.upsert({
    where: { lineId },
    update: {
      isActive,
      ...(profile ? { displayName: profile.displayName } : {}),
      ...(isActive ? { joinedAt: new Date() } : {}),
    },
    create: {
      lineId,
      type,
      displayName: profile?.displayName ?? null,
      isActive,
    },
  });

  const label = type === "group" ? "グループ" : "ユーザー";
  const action = isActive ? "追加" : "離脱";
  console.log(
    `[LINE Webhook] ${label}${action}: ${profile?.displayName ?? lineId}`
  );
};

export const POST = async (request: NextRequest) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    if (!verifySignature(rawBody, signature)) {
      console.error("[LINE Webhook] 署名検証に失敗しました");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody) as LineWebhookBody;

    // イベント処理をバックグラウンドで実行（LINEへのレスポンスを遅延させない）
    const processEvents = async () => {
      for (const event of body.events) {
        const { type: eventType, source } = event;

        // 友だち追加
        if (eventType === "follow" && source.userId) {
          await upsertTarget(source.userId, "user", true);
        }

        // ブロック（友だち解除）
        if (eventType === "unfollow" && source.userId) {
          await upsertTarget(source.userId, "user", false);
        }

        // グループ参加
        if (eventType === "join" && source.groupId) {
          await upsertTarget(source.groupId, "group", true);
        }

        // グループ退出
        if (eventType === "leave" && source.groupId) {
          await upsertTarget(source.groupId, "group", false);
        }
      }
    };

    // レスポンス送信後にイベント処理を実行（Vercelで関数が終了しないよう保証）
    after(processEvents);

    return NextResponse.json({ message: "ok" });
  } catch (error) {
    console.error("[LINE Webhook] エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
};
