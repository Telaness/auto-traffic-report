# オトレポ - 自動トラフィックレポートシステム

クライアントサイトのトラフィックデータを Google Analytics 4 (GA4) から自動取得し、月次レポートを生成・配信する社内ツールです。

## 主な機能

- **GA4 データ自動取得** - セッション数、ユーザー数、PV数、直帰率、平均セッション時間を取得
- **月次レポート自動生成** - PDF/HTML 形式で前月比較付きレポートを作成
- **マルチチャネル配信** - メール（SMTP）・LINE Messaging API による自動配信
- **月次バッチ処理** - 毎月1日 8:00 (JST) に自動実行
- **管理画面** - クライアント管理、レポート閲覧、バッチ監視、設定管理
- **AI 分析** - Claude API によるトラフィック分析コメント生成

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS 4 |
| DB | SQLite (Prisma ORM) |
| 認証 | NextAuth.js v5 |
| GA4連携 | Google Analytics Data API v1 |
| メール | Nodemailer (SMTP) |
| LINE連携 | LINE Messaging API |
| AI | Anthropic Claude API |
| PDF生成 | Puppeteer / jsPDF |
| スケジューラ | node-cron |
| テスト | Vitest / Testing Library |
| リンター | ESLint 9 |

## セットアップ

### 前提条件

- Node.js 18 以上
- pnpm

### インストール

```bash
pnpm install
```

### 環境変数の設定

`.env.example` を `.env` にコピーして値を設定してください。

```bash
cp .env.example .env
```

主な環境変数:

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | SQLite データベースパス |
| `GOOGLE_APPLICATION_CREDENTIALS` | GA4 サービスアカウントキーのパス |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | GA4 サービスアカウントキー (JSON) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | メール送信設定 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API トークン |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | 認証シークレット |
| `ADMIN_EMAIL` | 管理者メールアドレス |

### データベースの初期化

```bash
pnpm prisma migrate dev
```

### 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 でアクセスできます。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm start` | プロダクションサーバー起動 |
| `pnpm lint` | ESLint チェック |
| `pnpm type-check` | TypeScript 型チェック |
| `pnpm test` | Vitest テスト実行 |

## プロジェクト構成

```
src/
├── app/
│   ├── (dashboard)/    # 管理画面ページ（認証必須）
│   ├── api/            # REST API エンドポイント
│   └── login/          # ログインページ
├── lib/                # コアロジック
│   ├── ga4.ts          # GA4 API 連携
│   ├── report.ts       # レポート生成
│   ├── email.ts        # メール配信
│   ├── line.ts         # LINE 配信
│   ├── scheduler.ts    # バッチスケジューラ
│   ├── pdf.ts          # PDF 生成
│   ├── ai-analysis.ts  # AI 分析
│   ├── auth.ts         # 認証設定
│   └── db.ts           # DB クライアント
├── components/         # 共通コンポーネント
└── types/              # 型定義
prisma/                 # DB スキーマ
docs/                   # 仕様書
tests/                  # テストファイル
```
