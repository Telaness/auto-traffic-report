interface FlexMessage {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
});

export const sendLineMessage = async (
  userId: string,
  messages: Array<FlexMessage | { type: "text"; text: string }>
): Promise<void> => {
  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      to: userId,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE API error: ${response.status} - ${errorBody}`);
  }
};

export const sendReportLineMessage = async (
  userId: string,
  siteName: string,
  reportMonth: string,
  metrics: {
    sessions: number;
    totalUsers: number;
    screenPageViews: number;
    bounceRate: number;
  },
  reportUrl?: string
): Promise<void> => {
  const flexMessage: FlexMessage = {
    type: "flex",
    altText: `月次トラフィックレポート - ${siteName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `月次トラフィックレポート`,
            weight: "bold",
            size: "md",
            color: "#1DB446",
          },
          {
            type: "text",
            text: siteName,
            weight: "bold",
            size: "xl",
            margin: "md",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `対象期間：${reportMonth}`,
            size: "sm",
            color: "#999999",
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: [
              createMetricRow("セッション数", metrics.sessions.toLocaleString()),
              createMetricRow("ユーザー数", metrics.totalUsers.toLocaleString()),
              createMetricRow("PV数", metrics.screenPageViews.toLocaleString()),
              createMetricRow("直帰率", `${(metrics.bounceRate * 100).toFixed(1)}%`),
            ],
          },
        ],
      },
      ...(reportUrl
        ? {
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  action: {
                    type: "uri",
                    label: "レポートを確認する",
                    uri: reportUrl,
                  },
                  style: "primary",
                  color: "#1DB446",
                },
              ],
            },
          }
        : {}),
    },
  };

  await sendLineMessage(userId, [flexMessage]);
};

const createMetricRow = (label: string, value: string) => ({
  type: "box",
  layout: "horizontal",
  margin: "sm",
  contents: [
    { type: "text", text: label, size: "sm", color: "#555555", flex: 0 },
    { type: "text", text: value, size: "sm", color: "#111111", align: "end" },
  ],
});
