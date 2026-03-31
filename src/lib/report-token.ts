import { createHmac } from "crypto";

export const generateReportDownloadToken = (reportId: string): string => {
  const secret = process.env.AUTH_SECRET ?? "fallback-secret";
  return createHmac("sha256", secret).update(reportId).digest("hex").slice(0, 16);
};

export const verifyReportToken = (reportId: string, token: string): boolean => {
  return generateReportDownloadToken(reportId) === token;
};
