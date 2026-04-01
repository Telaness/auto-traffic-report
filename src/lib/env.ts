const requiredEnvVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
] as const;

const optionalEnvVars = [
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
