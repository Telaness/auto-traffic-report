import { NextResponse } from "next/server";

const isSet = (key: string): boolean => !!process.env[key] && process.env[key] !== `your-${key.toLowerCase().replace(/_/g, "-")}`;

export const GET = () => {
  return NextResponse.json({
    smtp:
      isSet("SMTP_HOST") &&
      isSet("SMTP_USER") &&
      isSet("SMTP_PASS") &&
      isSet("SMTP_FROM"),
    line: isSet("LINE_CHANNEL_ACCESS_TOKEN"),
    lineSecret: isSet("LINE_CHANNEL_SECRET"),
    ga4: isSet("GOOGLE_SERVICE_ACCOUNT_KEY"),
    anthropic: isSet("ANTHROPIC_API_KEY"),
  });
};
