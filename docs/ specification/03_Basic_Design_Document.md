# 基本設計書

| 項目 | 内容 |
|------|------|
| プロジェクト名 | auto-reportsHP（オトレポ） |
| ドキュメント種別 | 基本設計書 |
| バージョン | 1.0 |
| 作成日 | 2026-03-20 |
| ステータス | ドラフト |

---

## 1. システムアーキテクチャ

### 1.1 アーキテクチャ概要

auto-reportsHPは標準的な3層Webアプリケーション構成を採用します。

```
[管理者ブラウザ]
      ↓ HTTPS
[フロントエンド（Next.js）]
      ↓
[バックエンドAPIサーバー（Next.js API Routes）]
  ├─ GA4 API クライアント
  ├─ メール送信モジュール（Nodemailer）
  ├─ LINE Messaging API クライアント
  ├─ PDF生成モジュール（Puppeteer）
  └─ cronジョブスケジューラー
      ↓
[データベース（PostgreSQL）]
```

- **プレゼンテーション層**：管理Web UI（Next.js / React）
- **アプリケーション層**：ビジネスロジック・スケジューリング・外部連携を担うバックエンド
- **データ層**：構造化データの永続化（PostgreSQL）

---

### 1.2 技術スタック

| レイヤー | 採用技術 | 採用理由 |
|---|---|---|
| フロントエンド | Next.js（React） | モダンなSSR/SPA対応フレームワーク |
| バックエンド | Next.js API Routes（Node.js） | フルスタックJavaScript、エコシステムが豊富 |
| データベース | PostgreSQL | 信頼性の高いリレーショナルDB |
| ORM | Prisma | 型安全なDB操作、マイグレーション管理 |
| ジョブスケジューラー | node-cron（またはVercel / Railway Cron） | 月次自動処理 |
| GA4連携 | Google Analytics Data API v1 | GA4公式REST API |
| メール配信 | Nodemailer + SMTP | 柔軟なメール送信 |
| LINE配信 | LINE Messaging API SDK | LINE公式連携 |
| PDF生成 | Puppeteer / PDFKit | HTMLテンプレートからPDFを生成 |
| 認証 | NextAuth.js | セキュアな管理者認証 |
| ホスティング | Vercel / Railway / Render | クラウドPaaS、デプロイが容易 |

---

## 2. データベース設計

### 2.1 エンティティ関係概要

```
admin_users
clients ─── sites ─── reports ─── delivery_logs
```

- **clients**：登録クライアント企業
- **sites**：レポート対象のクライアントWebサイト
- **reports**：生成済み月次レポート
- **delivery_logs**：レポート配信の試行・結果ログ
- **admin_users**：システム管理者

---

### 2.2 テーブル定義

#### clients（クライアント）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | 主キー |
| name | VARCHAR(255) | NOT NULL | クライアント会社名 |
| contact_email | VARCHAR(255) | | 連絡先メールアドレス |
| line_user_id | VARCHAR(255) | | LINEユーザーID / グループID |
| delivery_channel | ENUM | NOT NULL | `email` / `line` / `both` |
| is_active | BOOLEAN | DEFAULT true | 有効 / 無効フラグ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 最終更新日時 |

#### sites（サイト）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | 主キー |
| client_id | UUID | FK → clients | 紐付くクライアント |
| site_name | VARCHAR(255) | NOT NULL | サイト表示名 |
| site_url | VARCHAR(500) | NOT NULL | サイトURL |
| ga4_property_id | VARCHAR(100) | NOT NULL | GA4プロパティID |
| report_start_date | DATE | NOT NULL | レポート開始日（初回取得日） |
| is_active | BOOLEAN | DEFAULT true | 有効 / 無効フラグ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

#### reports（レポート）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | 主キー |
| site_id | UUID | FK → sites | 紐付くサイト |
| report_month | DATE | NOT NULL | レポート対象月（YYYY-MM-01） |
| status | ENUM | NOT NULL | `generated` / `delivered` / `failed` |
| report_data | JSONB | | GA4取得メトリクス（JSON） |
| report_file_path | VARCHAR(500) | | 生成済みPDF / HTMLファイルパス |
| generated_at | TIMESTAMP | | 生成日時 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

#### delivery_logs（配信ログ）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | 主キー |
| report_id | UUID | FK → reports | 紐付くレポート |
| channel | ENUM | NOT NULL | `email` / `line` |
| status | ENUM | NOT NULL | `success` / `failed` |
| error_message | TEXT | | 失敗時のエラー詳細 |
| sent_at | TIMESTAMP | | 配信日時 |
| retry_count | INT | DEFAULT 0 | リトライ回数 |

#### admin_users（管理者）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | 主キー |
| email | VARCHAR(255) | NOT NULL, UNIQUE | ログインメール |
| password_hash | VARCHAR(255) | NOT NULL | bcryptハッシュ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

---

## 3. 画面設計

### 3.1 画面一覧

| 画面ID | 画面名 | 説明 |
|---|---|---|
| SCR-001 | ログイン画面 | 管理者ログイン |
| SCR-002 | ダッシュボード | クライアント数・直近レポート・配信状況の概要 |
| SCR-003 | クライアント一覧 | クライアントの一覧・検索・追加・編集・削除 |
| SCR-004 | クライアント詳細 | クライアント情報と紐付くサイト一覧 |
| SCR-005 | サイト登録・編集 | GA4 IDとレポート開始日を含むサイト情報の登録・編集 |
| SCR-006 | レポート一覧 | 生成済みレポートと配信ログの一覧 |
| SCR-007 | レポート詳細 | レポート内容のプレビューと配信ステータス確認 |
| SCR-008 | 設定画面 | SMTP / LINE API認証情報の設定 |

### 3.2 画面遷移

```
ログイン
  └─ ダッシュボード
       ├─ クライアント一覧
       │    └─ クライアント詳細
       │         └─ サイト登録・編集
       ├─ レポート一覧
       │    └─ レポート詳細
       └─ 設定画面
```

---

## 4. 外部連携設計

### 4.1 Google Analytics 4（GA4）

- **API**：Google Analytics Data API v1
- **認証方式**：サービスアカウント（JSONキーファイル、環境変数で管理）
- **取得指標**：`sessions` / `totalUsers` / `screenPageViews` / `bounceRate` / `averageSessionDuration`
- **取得期間**：前月の初日〜末日

### 4.2 メール（SMTP）

- **ライブラリ**：Nodemailer
- **差出人**：設定画面で構成可能な送信者アドレス
- **添付**：PDF形式のレポートファイル
- **件名フォーマット**：`【月次レポート】{サイト名} - {YYYY年MM月}`

### 4.3 LINE Messaging API

- **メッセージ種別**：プッシュメッセージ（LINE UserID または GroupID宛）
- **コンテンツ**：テキストサマリー + Flex Messageによる指標表示
- **認証情報**：チャネルアクセストークンを環境変数で管理

---

## 5. バッチ処理設計

### 5.1 月次レポートジョブ

| 項目 | 内容 |
|---|---|
| 実行スケジュール | 毎月1日 08:00（JST） |
| トリガー | cronジョブ（node-cron またはプラットフォームcron） |
| 処理フロー | 1. `report_start_date` が当月以前の全アクティブサイトを取得 |
| | 2. 各サイトについてGA4 APIで前月のメトリクスを取得 |
| | 3. HTMLテンプレートをレンダリングし、PDFを生成 |
| | 4. クライアントの配信設定に従いメール / LINE で送信 |
| | 5. 配信結果を `delivery_logs` に記録 |
| リトライ | 失敗時は5分間隔で最大3回リトライ |
| 失敗通知 | 最終失敗時に管理者メールアドレスへアラート送信 |
