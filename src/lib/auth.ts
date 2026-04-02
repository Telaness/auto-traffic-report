import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { checkRateLimit, recordFailedAttempt, resetAttempts } from "@/src/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials, request) {
        const forwarded = request?.headers?.get?.("x-forwarded-for");
        const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
        const username = String(credentials?.username ?? "");
        const identifier = `${ip}:${username}`;

        // レート制限チェック
        const rateLimit = checkRateLimit(identifier);
        if (!rateLimit.allowed) {
          console.warn(`[Auth] ロックアウト中: IP=${ip}`);
          throw new Error(`RATE_LIMITED:${rateLimit.retryAfterSeconds}`);
        }

        const adminUser = process.env.ADMIN_USERNAME;
        const adminPass = process.env.ADMIN_PASSWORD;

        if (!adminUser || !adminPass) {
          return null;
        }

        if (username === adminUser && String(credentials?.password ?? "") === adminPass) {
          resetAttempts(identifier);
          console.log("[Auth] ログイン成功");
          return {
            id: "admin",
            name: "管理者",
          };
        }

        recordFailedAttempt(identifier);
        const afterFail = checkRateLimit(identifier);
        console.warn(`[Auth] ログイン失敗: IP=${ip}, 残り試行回数=${afterFail.remainingAttempts}`);

        if (afterFail.remainingAttempts > 0) {
          throw new Error(`ATTEMPTS_REMAINING:${afterFail.remainingAttempts}`);
        }

        throw new Error(`RATE_LIMITED:${Math.ceil(15 * 60)}`);
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;

      // NextAuth APIは認証不要（認証処理自体のエンドポイント）
      if (pathname.startsWith("/api/auth/")) {
        return true;
      }

      // Webhook は認証不要（LINE署名検証で保護）
      if (pathname.startsWith("/api/webhook/")) {
        return true;
      }

      // Cron は認証不要（CRON_SECRETで保護）
      if (pathname === "/api/batch/cron") {
        return true;
      }

      // レポートPDFダウンロードは認証不要（トークンで保護）
      if (/^\/api\/reports\/[^/]+\/pdf$/.test(pathname)) {
        return true;
      }

      // ログインページは未認証でもアクセス可
      if (pathname === "/login") {
        return true;
      }

      return isLoggedIn;
    },
  },
});
