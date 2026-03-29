export { auth as middleware } from "@/src/lib/auth";

export const config = {
  matcher: [
    // 静的ファイルと_nextを除外
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
