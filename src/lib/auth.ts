import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        try {
          const adminUser = process.env.ADMIN_USERNAME;
          const adminPass = process.env.ADMIN_PASSWORD;

          console.log("[Auth] ENV check:", {
            hasAdminUser: !!adminUser,
            hasAdminPass: !!adminPass,
            inputUser: String(credentials?.username ?? ""),
            match:
              String(credentials?.username ?? "") === adminUser &&
              String(credentials?.password ?? "") === adminPass,
          });

          if (!adminUser || !adminPass) {
            return null;
          }

          if (
            String(credentials?.username ?? "") === adminUser &&
            String(credentials?.password ?? "") === adminPass
          ) {
            return {
              id: "admin",
              name: "管理者",
            };
          }

          return null;
        } catch (e) {
          console.error("[Auth] authorize error:", e);
          return null;
        }
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

      // Webhook は認証不要（LINE署名検証で保護）
      if (pathname.startsWith("/api/webhook/")) {
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
