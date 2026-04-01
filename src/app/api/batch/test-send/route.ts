import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendEmail } from "@/src/lib/email";
import { sendLineMessage } from "@/src/lib/line";
import { apiServerError } from "@/src/lib/api-response";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { subscriptionId } = body as { subscriptionId: string };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionIdは必須です" },
        { status: 400 }
      );
    }

    const subscription = await prisma.monthlyBatchSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: {
          include: {
            lineTargets: { where: { isActive: true } },
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "バッチ登録が見つかりません" },
        { status: 404 }
      );
    }

    const { client, deliveryChannel } = subscription;
    const results: Array<{ channel: string; target?: string; status: "success" | "failed"; error?: string }> = [];

    // メール送信テスト
    if (deliveryChannel === "email" || deliveryChannel === "both") {
      if (!client.contactEmail) {
        results.push({
          channel: "email",
          status: "failed",
          error: "クライアントにメールアドレスが設定されていません",
        });
      } else {
        try {
          await sendEmail({
            to: client.contactEmail,
            subject: `【テスト送信】月次トラフィックレポート - ${client.name}`,
            html: `
              <h2>テスト送信</h2>
              <p>これはテスト送信です。</p>
              <p>このメールが届いていれば、${client.name}様への月次レポートのメール配信は正常に動作しています。</p>
              <hr>
              <p style="color: #999; font-size: 12px;">※ このメールはテスト送信です。実際のレポートは含まれていません。</p>
            `,
          });
          results.push({ channel: "email", status: "success" });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({ channel: "email", status: "failed", error: message });
        }
      }
    }

    // LINE送信テスト（全紐付け先に送信）
    if (deliveryChannel === "line" || deliveryChannel === "both") {
      const lineTargets = client.lineTargets;
      // lineTargetsが未設定の場合、後方互換でlineUserIdを使用
      if (lineTargets.length === 0 && client.lineUserId) {
        lineTargets.push({
          id: "",
          lineId: client.lineUserId,
          type: "user",
          displayName: null,
          clientId: client.id,
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
        });
      }

      if (lineTargets.length === 0) {
        results.push({
          channel: "line",
          status: "failed",
          error: "クライアントにLINE送信先が紐づけられていません",
        });
      } else {
        for (const target of lineTargets) {
          const label = target.displayName ?? target.lineId;
          try {
            await sendLineMessage(target.lineId, [
              {
                type: "text",
                text: `【テスト送信】\nこれはテスト送信です。\nこのメッセージが届いていれば、${client.name}様へのLINE配信は正常に動作しています。\n\n送信先: ${label}`,
              },
            ]);
            results.push({ channel: "line", target: label, status: "success" });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({ channel: "line", target: label, status: "failed", error: message });
          }
        }
      }
    }

    const allSuccess = results.every((r) => r.status === "success");

    return NextResponse.json({
      message: allSuccess ? "テスト送信が完了しました" : "一部のテスト送信に失敗しました",
      results,
    });
  } catch (error) {
    return apiServerError(error, "テスト送信に失敗しました");
  }
};
