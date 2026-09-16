export { auth as middleware } from "@/src/lib/auth";

export const config = {
  // matcher は静的解析されるため、必ずリテラルで書く（変数展開は無視される）。
  // 除外するのは _next/ 配下と、未ログイン状態やSNSクローラーからも参照される静的アセットのみ。
  // 拡張子での一括除外（例: .*\.png$）は /api/xxx.png のような経路で
  // 認証を迂回できてしまうため使わない。
  matcher: [
    "/((?!_next/|favicon\\.ico|favcon\\.jpeg|icon\\.png|apple-icon\\.png|opengraph-image\\.jpg|twitter-image\\.jpg|robots\\.txt).*)",
  ],
};
