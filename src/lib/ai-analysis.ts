import Anthropic from "@anthropic-ai/sdk";
import type { ReportData } from "@/src/lib/report";

interface AIAnalysis {
  executiveSummary: string;
  trafficComment: string;
  regionComment: string;
  sourceComment: string;
  seoComment: string;
}

const getClient = (): Anthropic | null => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

const buildPrompt = (siteName: string, siteUrl: string, data: ReportData): string => {
  const { currentMonth, comparison, regions, sources, devices, browsers, searchConsole, period } = data;

  const formatRate = (rate: number) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%`;
  const totalSessions = devices.reduce((sum, d) => sum + d.sessions, 0);

  return `あなたはWebマーケティングの専門アナリストです。以下のWebサイトのトラフィックデータを基に、クライアントに提出する分析レポートのコメントを生成してください。

## 重要な指示
- 読者はWeb・マーケティングの専門知識がない経営者や担当者です
- 専門用語は避け、中学生でもわかるくらい平易な日本語で書くこと
- 例: 「セッション」→「訪問数」「アクセス数」、「直帰率」→「1ページだけ見て離脱した割合」、「CTR」→「クリック率」、「インプレッション」→「検索結果に表示された回数」、「トラフィック」→「アクセス」
- 専門用語をどうしても使う場合は必ずカッコ書きで簡単な説明を添えること
- 具体的な数値を引用しつつ、「つまり何がいいのか・悪いのか・どうすればいいか」を簡潔に伝えること
- 各コメントは3〜5文で、やさしく読みやすい文章にすること
- 「〜と考えられます」「〜がポイントです」のような柔らかい表現を使うこと

## サイト情報
- サイト名: ${siteName}
- URL: ${siteUrl}
- 対象期間: ${period.startDate} 〜 ${period.endDate}

## 主要指標（KPI）
- セッション数: ${currentMonth.sessions.toLocaleString()}${comparison ? ` (前期比 ${formatRate(comparison.sessions.rate)})` : ""}
- ユニーク訪問者数: ${currentMonth.totalUsers.toLocaleString()}${comparison ? ` (前期比 ${formatRate(comparison.totalUsers.rate)})` : ""}
- ページビュー数: ${currentMonth.screenPageViews.toLocaleString()}${comparison ? ` (前期比 ${formatRate(comparison.screenPageViews.rate)})` : ""}
- 直帰率: ${(currentMonth.bounceRate * 100).toFixed(2)}%${comparison ? ` (前期比 ${formatRate(comparison.bounceRate.rate)})` : ""}
- 平均セッション時間: ${Math.round(currentMonth.averageSessionDuration)}秒${comparison ? ` (前期比 ${formatRate(comparison.averageSessionDuration.rate)})` : ""}
- 1セッションあたりPV: ${totalSessions > 0 ? (currentMonth.screenPageViews / totalSessions).toFixed(1) : "-"}

## 地域別アクセス（上位）
${regions.filter((r) => r.region !== "(not set)").slice(0, 10).map((r, i) => `${i + 1}. ${r.region}: ${r.sessions}訪問`).join("\n")}

## 流入経路（トラフィックソース）
${sources.filter((s) => s.source !== "(not set)").slice(0, 10).map((s, i) => `${i + 1}. ${s.source}: ${s.sessions}セッション`).join("\n")}

## デバイス別
${devices.map((d) => {
    const pct = totalSessions > 0 ? ((d.sessions / totalSessions) * 100).toFixed(1) : "0";
    return `- ${d.deviceCategory}: ${d.sessions} (${pct}%)`;
  }).join("\n")}

## ブラウザ別
${browsers.slice(0, 5).map((b) => `- ${b.browser}: ${b.sessions}`).join("\n")}

${searchConsole ? `## 検索パフォーマンス（Google Search Console）
- 合計クリック数: ${searchConsole.totalClicks}回
- 合計インプレッション数: ${searchConsole.totalImpressions}回
- 平均CTR: ${(searchConsole.averageCtr * 100).toFixed(2)}%
- 平均掲載順位: ${searchConsole.averagePosition.toFixed(1)}位
- 流入キーワード:
${searchConsole.keywords.slice(0, 10).map((kw) => `  - 「${kw.keyword}」: クリック${kw.clicks}回, CTR ${(kw.ctr * 100).toFixed(2)}%, 平均順位${kw.position.toFixed(1)}位`).join("\n")}` : "検索パフォーマンスデータなし"}

## 出力形式
以下のJSON形式で5つの分析コメントを出力してください。すべて専門知識のない方にも伝わるやさしい日本語で書いてください。

{
  "executiveSummary": "【全体総括】2段落構成。第1段落: サイトへのアクセスが増えたか減ったかを伝え、どこからのアクセスが多かったかを具体的に書く（例: Instagramからの流入、直接アクセスなど）。第2段落: Google検索でどんなキーワードで見つけられているか、ユーザーがサイトをどれくらい見て回っているか（1ページだけ見て帰る人の割合）の課題と、今後やるべきことをわかりやすく書く。",
  "trafficComment": "【アクセス数の分析】前の期間と比べてアクセスがどう変わったかを伝える。特に大きく変わった数字を取り上げて『なぜ増えた（減った）のか』をわかりやすく考察する。1ページだけ見て離脱する人が多い場合は『サイト内で他のページも見てもらう工夫が必要です』のような具体的なアドバイスを書く。",
  "regionComment": "【どの地域から見られているか】アクセスが多い地域の特徴を伝える。例: 『東京と大阪からのアクセスがほぼ同数で、関東・関西どちらからも関心が高いことがわかります。兵庫県も多いことから、関西エリアでの知名度が特に高いようです。』のように、ビジネスにとってどういう意味があるかを添える。",
  "sourceComment": "【どこからサイトに来ているか】一番多いアクセス元を2〜3個挙げて『◯◯と△△からのアクセスが中心です』のようにまとめる。スマホからのアクセスが多い場合は『SNSのアプリから直接サイトに来ている方が多いです』のように伝える。どうすればもっとアクセスを増やせるかの提案も加える。",
  "seoComment": "【Google検索での見つかりやすさ】どんな言葉で検索されてサイトに来ているかを伝える。会社名やサービス名で検索されている場合は『名前を知っている人が検索して来ています』と説明する。検索順位が高い場合は『検索で上位に表示されており、見つけやすい状態です』、低い場合は改善方法を提案する。一般的なキーワード（例: 業種名など）でも見つかるようにする余地があるかも言及する。"
}

JSONのみを出力してください。マークダウンのコードブロックや説明文は不要です。`;
};

export const generateAIAnalysis = async (
  siteName: string,
  siteUrl: string,
  data: ReportData
): Promise<AIAnalysis | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildPrompt(siteName, siteUrl, data),
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as AIAnalysis;
    return parsed;
  } catch (error) {
    console.error("[AI分析] コメント生成エラー:", error instanceof Error ? error.message : error);
    return null;
  }
};

export type { AIAnalysis };
