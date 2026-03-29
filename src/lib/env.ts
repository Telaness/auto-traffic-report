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

export const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `必須環境変数が未設定です: ${missing.join(", ")}`
    );
  }

  const unsetOptional = optionalEnvVars.filter((key) => !process.env[key]);
  if (unsetOptional.length > 0) {
    console.warn(
      `[ENV] 任意の環境変数が未設定です（該当機能は動作しません）: ${unsetOptional.join(", ")}`
    );
  }
};
