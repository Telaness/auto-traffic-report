const requiredEnvVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
] as const;

const optionalEnvVars = [
  "NEXTAUTH_URL",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "ANTHROPIC_API_KEY",
  "ADMIN_EMAIL",
] as const;

const validatePasswordStrength = (password: string): string[] => {
  const issues: string[] = [];

  if (password.length < 12) {
    issues.push("12文字以上にしてください");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("大文字を含めてください");
  }
  if (!/[a-z]/.test(password)) {
    issues.push("小文字を含めてください");
  }
  if (!/[0-9]/.test(password)) {
    issues.push("数字を含めてください");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    issues.push("記号を含めてください");
  }

  return issues;
};

export const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `必須環境変数が未設定です: ${missing.join(", ")}`
    );
  }

  // パスワード強度チェック
  const password = process.env.ADMIN_PASSWORD!;
  const passwordIssues = validatePasswordStrength(password);
  if (passwordIssues.length > 0) {
    console.warn(
      `[Security] ADMIN_PASSWORD の強度が不十分です:\n${passwordIssues.map((i) => `  - ${i}`).join("\n")}`
    );
  }

  const unsetOptional = optionalEnvVars.filter((key) => !process.env[key]);
  if (unsetOptional.length > 0) {
    console.warn(
      `[ENV] 任意の環境変数が未設定です（該当機能は動作しません）: ${unsetOptional.join(", ")}`
    );
  }
};

const LOCAL_BASE_URL = "http://localhost:3000";

/**
 * アプリの公開URL（オリジン）を返す。
 * OGP画像の絶対URL解決やLINE通知内のPDFリンク生成で共通利用する。
 * NEXTAUTH_URL > VERCEL_URL > localhost の優先順で解決する。
 *
 * 本番でどちらも未設定の場合、LINE通知に localhost のPDFリンクが
 * 送られてしまう（配信自体は成功するため気づきにくい）。
 * 挙動は変えずにログで検知できるようにしている。
 */
export const getBaseUrl = (): string => {
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : LOCAL_BASE_URL);

  if (baseUrl === LOCAL_BASE_URL && process.env.NODE_ENV === "production") {
    console.error(
      "[ENV] NEXTAUTH_URL / VERCEL_URL が未設定のため公開URLを解決できません。" +
        "LINE通知のPDFリンクとOGP画像URLが localhost になります。"
    );
  }

  return baseUrl;
};
