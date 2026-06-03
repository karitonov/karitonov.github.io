# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト全体構造

```
bentosales/
├── app/                          # Next.js App Router（ページ・API）
│   ├── (order)/                  # 注文メインページ（STAFF・OWNER共通）
│   ├── customers/                # 顧客管理ページ（OWNERのみ）
│   ├── products/                 # 商品管理ページ（OWNERのみ）
│   ├── invoices/                 # 請求管理ページ（OWNERのみ）
│   ├── settings/                 # システム設定ページ（OWNERのみ）
│   ├── users/                    # ユーザー管理ページ（OWNERのみ）
│   ├── login/                    # ログインページ（未認証アクセス可）
│   ├── api/                      # API Routes（バックエンドAPI）
│   ├── layout.tsx                # ルートレイアウト
│   └── globals.css               # グローバルCSS
├── auth.ts                       # Auth.js v5 設定・auth()エクスポート
├── middleware.ts                  # ルート保護・ロールチェック（Next.js特殊ファイル）
├── components/                   # 共通UIコンポーネント
│   ├── ui/                       # shadcn/uiコンポーネント
│   └── [feature]/                # 機能別コンポーネント
├── lib/                          # サーバーサイドロジック
│   ├── auth/                     # 認証・認可ユーティリティ
│   ├── db/                       # データベースクライアント
│   ├── services/                 # ビジネスロジック（サービスレイヤー）
│   └── validations/              # Zodバリデーションスキーマ
├── types/                        # 共有型定義
├── prisma/                       # Prisma ORM設定
│   ├── schema.prisma             # DBスキーマ定義
│   ├── migrations/               # マイグレーションファイル
│   ├── seed.ts                   # 開発用初期データ
│   └── bentosales.db             # SQLiteデータベース（gitignore対象）
├── tests/                        # テストコード
│   ├── unit/                     # ユニットテスト
│   ├── integration/              # 統合テスト
│   └── e2e/                      # E2Eテスト（Playwright）
├── docs/                         # プロジェクトドキュメント
├── private/
│   └── pdfs/                     # 生成PDFの永続保存（認証API経由で配信・gitignore対象）
├── public/                       # 静的ファイル（PDFは置かない）
├── .steering/                    # 作業単位のステアリングファイル
├── .claude/                      # Claude Code設定
├── .env.local                    # 環境変数（gitignore対象）
├── .env.example                  # 環境変数サンプル
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## ディレクトリ詳細

### app/ (Next.js App Router)

**役割**: Next.js の App Router によるページルーティングとAPI Routesを定義する

#### app/(order)/

**役割**: 注文メインページ（電話注文受付・注文一覧・製造一覧の1画面完結UI）

**配置ファイル**:
- `page.tsx`: 注文メインページ（Server Component）

**命名規則**:
- ルートグループ `(order)` はURLに影響しない（`/` でアクセス）

```
app/(order)/
└── page.tsx
```

---

#### app/customers/

**役割**: 顧客管理ページ（顧客一覧・顧客詳細・顧客別単価設定）

**配置ファイル**:
- `page.tsx`: 顧客一覧ページ
- `[id]/page.tsx`: 顧客詳細・編集ページ
- `new/page.tsx`: 顧客新規作成ページ

```
app/customers/
├── page.tsx
├── new/
│   └── page.tsx
└── [id]/
    └── page.tsx
```

---

#### app/products/

**役割**: 商品管理ページ

**配置ファイル**:
- `page.tsx`: 商品一覧ページ（新規登録・編集をモーダルで処理）

```
app/products/
└── page.tsx
```

---

#### app/login/

**役割**: ログインページ。未認証ユーザーがアクセス可能な唯一のページ

**アクセス制御**: 認証不要（`middleware.ts` で `/login` を保護対象から除外）

**配置ファイル**:
- `page.tsx`: ログインフォーム（ユーザー名・パスワード入力、Auth.js `signIn()` 呼び出し）

```
app/login/
└── page.tsx
```

---

#### app/settings/

**役割**: システム設定ページ（店舗名・適格請求書発行事業者登録番号の設定）

**アクセス制御**: OWNER ロールのみ（`middleware.ts` でロールチェック）

**配置ファイル**:
- `page.tsx`: システム設定フォーム

```
app/settings/
└── page.tsx
```

---

#### app/invoices/

**役割**: 請求管理ページ（請求書一覧・請求書詳細・入金登録）

**配置ファイル**:
- `page.tsx`: 請求書一覧ページ
- `new/page.tsx`: 請求書生成ページ
- `[id]/page.tsx`: 請求書詳細・入金登録ページ

```
app/invoices/
├── page.tsx
├── new/
│   └── page.tsx
└── [id]/
    └── page.tsx
```

---

#### app/api/

**役割**: REST API エンドポイント（Next.js API Routes）

**命名規則**:
- リソース名は複数形、kebab-case
- `route.ts` が各エンドポイントの実装ファイル

**依存関係**:
- 依存可能: `lib/services/`、`lib/validations/`、`lib/db/`
- 依存禁止: `components/`（UI コンポーネントへの依存）

```
app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts              # Auth.js ハンドラ（GET / POST）
├── orders/
│   ├── route.ts                  # GET（一覧・未請求フィルタ対応）/ POST（作成）
│   └── [id]/
│       ├── route.ts              # PUT / DELETE
│       ├── previous/
│       │   └── route.ts          # GET（前回注文取得）
│       └── delivery-note-pdf/
│           └── route.ts          # GET（納品書PDF）
├── customers/
│   ├── route.ts                  # GET / POST
│   └── [id]/
│       ├── route.ts              # GET / PUT（有効/無効切替含む）
│       └── prices/
│           └── route.ts          # GET / PUT（顧客別単価）
├── products/
│   ├── route.ts                  # GET / POST
│   └── [id]/
│       └── route.ts              # GET / PUT（有効/無効切替含む）
├── invoices/
│   ├── route.ts                  # GET / POST
│   └── [id]/
│       ├── route.ts              # GET / PUT
│       ├── cancel/
│       │   └── route.ts          # POST（キャンセル・対象注文を未請求に戻す）
│       ├── pdf/
│       │   └── route.ts          # GET（請求書PDF）
│       └── receipt-pdf/
│           └── route.ts          # GET（領収書PDF）
├── payments/
│   └── route.ts                  # GET / POST
├── production-summary/
│   ├── route.ts                  # GET（製造一覧 JSONデータ）
│   └── pdf/
│       └── route.ts              # GET（製造一覧 PDF）
├── settings/
│   └── route.ts                  # GET / PUT（システム設定）
└── users/
    ├── route.ts                  # GET（一覧）/ POST（作成）
    ├── [id]/
    │   └── route.ts              # PUT（有効/無効切替）
    └── me/
        └── password/
            └── route.ts          # PUT（パスワード変更）
```

---

### components/ (UIコンポーネント)

**役割**: 再利用可能なReactコンポーネントを配置する

**命名規則**:
- ファイル名: kebab-case（例: `order-entry-panel.tsx`）
- コンポーネント名: PascalCase（例: `export function OrderEntryPanel()`）
- Client Componentsには先頭に `'use client'` ディレクティブを明記

**依存関係**:
- 依存可能: `components/ui/`（shadcn/ui コンポーネント）、`lib/validations/`
- 依存禁止: `lib/services/`（ビジネスロジックへの直接依存）、`lib/db/`

```
components/
├── ui/                           # shadcn/ui（自動生成・手動修正禁止）
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   └── ...
├── order/
│   ├── order-entry-panel.tsx     # 注文入力パネル（Client Component）
│   ├── order-list-grid.tsx       # 注文一覧グリッド（Client Component）
│   ├── order-main-page.tsx       # 注文メインページラッパー（Client Component）
│   ├── production-summary.tsx    # 製造一覧パネル（Client Component）
│   └── date-navigator.tsx        # 日付切替ナビゲーター（Client Component）
├── customer/
│   ├── customer-form.tsx         # 顧客情報フォーム（Client Component）
│   └── customer-list.tsx         # 顧客一覧（Client Component）
├── invoice/
│   ├── invoice-create-form.tsx   # 請求書生成フォーム（Client Component）
│   ├── invoice-detail.tsx        # 請求書詳細（Client Component）
│   ├── invoice-list.tsx          # 請求書一覧（Client Component）
│   └── payment-form.tsx          # 入金登録フォーム（Client Component）
├── product/
│   └── product-form.tsx          # 商品情報フォーム（Client Component）
├── user/
│   ├── user-list.tsx             # ユーザー一覧テーブル（Client Component）
│   ├── user-form-dialog.tsx      # ユーザー作成ダイアログ（Client Component）
│   └── change-password-dialog.tsx # パスワード変更ダイアログ（Client Component）
└── layout/
    ├── app-shell.tsx             # ルートレイアウト（ヘッダー・サイドバー・メインを統合）
    ├── nav.tsx                   # サイドバーナビゲーション（ロール別表示）
    └── user-menu.tsx             # ユーザーメニュー（パスワード変更・ログアウト）
```

---

### lib/ (サーバーサイドロジック)

**役割**: ビジネスロジック・データベースアクセス・バリデーションスキーマを配置する

#### lib/auth/

**役割**: 認証・認可ユーティリティ。API Route のロールガードを提供する

**配置ファイル**:
- `require-role.ts`: `requireRole('OWNER')` ガード関数。未認証なら 401、権限不足なら 403 を返す

**依存関係**:
- 依存可能: `auth.ts`（Auth.js の `auth()` 関数）
- 依存禁止: `components/`、`app/`（UIレイヤー）、`lib/services/`

```
lib/auth/
└── require-role.ts
```

---

#### lib/db/

**役割**: Prismaクライアントのシングルトン管理

**配置ファイル**:
- `prisma.ts`: Prismaクライアントのシングルトンインスタンスをエクスポート

**依存関係**:
- 依存可能: `@prisma/client`
- 依存禁止: 全ての上位レイヤー

```
lib/db/
└── prisma.ts
```

---

#### lib/services/

**役割**: ビジネスロジックの実装（サービスレイヤー）

**命名規則**:
- ファイル名: kebab-case（例: `price-calculation.ts`）
- エクスポート: クラスまたは関数でまとめてエクスポート

**依存関係**:
- 依存可能: `lib/db/`、`@prisma/client`
- 依存禁止: `components/`、`app/`（UIレイヤー）

**ファイルサイズの目安**: 300行以下。超えた場合はサービスを分割する

```
lib/services/
├── price-calculation.ts          # 価格優先順位・税額計算
├── invoice-generation.ts         # 請求書生成・採番・cancelInvoice（注文を未請求に戻す処理）
├── payment.ts                    # 入金登録・ステータス更新
└── pdf-generation.ts             # PDF生成（各帳票）
```

---

#### lib/validations/

**役割**: Zodバリデーションスキーマ（APIリクエスト・フォーム共用）

**命名規則**:
- ファイル名: リソース名（kebab-case）
- エクスポート: `[動詞][リソース名]Schema` 形式（例: `CreateOrderSchema`）

**依存関係**:
- 依存可能: `zod`
- 依存禁止: `lib/db/`、`lib/services/`

```
lib/validations/
├── order.ts                      # 注文バリデーションスキーマ
├── customer.ts                   # 顧客バリデーションスキーマ
├── product.ts                    # 商品バリデーションスキーマ
├── invoice.ts                    # 請求書バリデーションスキーマ
├── payment.ts                    # 入金バリデーションスキーマ
├── settings.ts                   # システム設定バリデーションスキーマ
└── user.ts                       # ユーザーバリデーションスキーマ（作成・更新・パスワード変更）
```

---

### types/ (共有型定義)

**役割**: 複数のレイヤーで共有する TypeScript 型定義を配置する

**配置基準**:
- 複数のレイヤー（APIレイヤー・サービスレイヤー・UIレイヤー）で使用する型のみ配置
- 単一のレイヤー内でしか使わない型はそのレイヤーのファイル内に定義する

**命名規則**:
- ファイル名: kebab-case（例: `api-types.ts`）
- 型名: PascalCase（例: `OrderWithItems`、`PriceSource`）

**依存関係**:
- 依存可能: `@prisma/client`（Prisma 生成型の再エクスポート）
- 依存禁止: `lib/services/`、`lib/db/`、`components/`、`app/`

```
types/
├── api-types.ts      # APIレスポンス型（OrderWithItems等）
└── domain-types.ts   # ドメイン共通型（PriceSource等）
```

---

### prisma/ (データベース設定)

**役割**: Prisma ORM のスキーマ定義・マイグレーション管理

**配置ファイル**:
- `schema.prisma`: データモデル定義（機能設計書の ER 図に対応）
- `migrations/`: 自動生成されるマイグレーションファイル（編集禁止）
- `bentosales.db`: SQLite データベース本体（`.gitignore` 対象）
- `seed.ts`: 開発用初期データ（マスタ商品・テスト顧客）

**マイグレーションの命名規則**:
- Prisma が自動生成するタイムスタンプ + 説明（例: `20260508000000_add_customer_table`）
- 手動でファイル名を変更しない

```
prisma/
├── schema.prisma
├── seed.ts
├── migrations/
│   ├── 20260508000000_init/
│   │   └── migration.sql
│   └── .../
└── bentosales.db                 # .gitignore対象
```

---

### tests/ (テストコード)

**役割**: 全テストコードを配置する

**構造の原則**:
- ユニットテスト・統合テストは `lib/services/` のディレクトリ構造をミラー
- E2Eテストはユーザーシナリオ単位で分割

#### tests/unit/

**命名規則**: `[テスト対象ファイル名].test.ts`

```
tests/unit/
├── services/
│   ├── price-calculation.test.ts
│   ├── invoice-generation.test.ts   # cancelInvoice のトランザクション整合性含む
│   ├── payment.test.ts              # CANCELLED ガード・ステータス全遷移含む
│   └── pdf-generation.test.ts
└── auth/
    └── require-role.test.ts         # 未認証→401・STAFF→403・OWNER→通過の検証
```

#### tests/integration/

**命名規則**: `[機能名]-[操作].test.ts`

```
tests/integration/
├── order-crud.test.ts
├── invoice-generation.test.ts   # 請求書キャンセル・Order.invoiceId の復元含む
├── payment-status.test.ts
└── auth-role.test.ts            # STAFF→OWNER専用API呼び出し→403・未認証→401
```

#### tests/e2e/

**命名規則**: `[ユーザーシナリオ名].spec.ts`

```
tests/e2e/
├── auth.spec.ts                  # ログイン・ログアウト・STAFF/OWNERロール切り替え
├── phone-order-entry.spec.ts     # 電話注文入力フロー
├── invoice-generation.spec.ts    # 請求書生成・キャンセルフロー
└── payment-receipt.spec.ts       # 入金登録・領収書フロー
```

---

### docs/ (プロジェクトドキュメント)

**配置ドキュメント**:

| ファイル | 内容 |
|--------|------|
| `product-requirements.md` | プロダクト要求定義書（PRD） |
| `functional-design.md` | 機能設計書 |
| `architecture.md` | アーキテクチャ設計書 |
| `repository-structure.md` | リポジトリ構造定義書（本ドキュメント） |
| `development-guidelines.md` | 開発ガイドライン |
| `glossary.md` | 用語集（ユビキタス言語） |
| `ideas/` | 壁打ち・ブレインストーミング成果物 |
| `test-reports/` | PR動作確認レポート（Playwright MCP による手動確認の記録） |

---

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| ページコンポーネント | `app/[route]/page.tsx` | `page.tsx`（固定） | `app/customers/page.tsx` |
| APIエンドポイント | `app/api/[resource]/route.ts` | `route.ts`（固定） | `app/api/orders/route.ts` |
| UIコンポーネント | `components/` | kebab-case.tsx | `order-entry-panel.tsx` |
| shadcn/uiコンポーネント | `components/ui/` | kebab-case.tsx（自動生成） | `button.tsx` |
| サービスクラス | `lib/services/` | kebab-case.ts | `price-calculation.ts` |
| バリデーションスキーマ | `lib/validations/` | kebab-case.ts | `order.ts` |
| DBクライアント | `lib/db/` | `prisma.ts`（固定） | `prisma.ts` |
| 認証・認可ユーティリティ | `lib/auth/` | kebab-case.ts | `require-role.ts` |
| 型定義（共有） | `types/` | kebab-case.ts | `api-types.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | `tests/unit/services/` | `[対象].test.ts` | `price-calculation.test.ts` |
| 統合テスト | `tests/integration/` | `[機能]-[操作].test.ts` | `order-crud.test.ts` |
| E2Eテスト | `tests/e2e/` | `[シナリオ].spec.ts` | `phone-order-entry.spec.ts` |

### 設定ファイル（プロジェクトルート）

| ファイル | 用途 |
|--------|------|
| `next.config.ts` | Next.js設定 |
| `tailwind.config.ts` | Tailwind CSS設定 |
| `tsconfig.json` | TypeScript設定 |
| `vitest.config.ts` | Vitestテスト設定 |
| `playwright.config.ts` | Playwright E2E設定 |
| `auth.ts` | Auth.js v5 設定・`auth()` / `signIn()` / `signOut()` のエクスポート元 |
| `middleware.ts` | Next.js Middleware（ルート保護・ロールチェック）。プロジェクトルート必須 |
| `.env.local` | 環境変数（gitignore対象） |
| `.env.example` | 環境変数サンプル（git管理対象） |
| `package.json` | npm設定・スクリプト |

---

## 命名規則

### ディレクトリ名

| 種別 | 規則 | 例 |
|------|------|-----|
| Next.js App Routerページ | kebab-case（URLに対応） | `customers/`, `invoices/` |
| Next.js 動的ルート | `[id]` 形式 | `[id]/` |
| Next.js ルートグループ | `(name)` 形式 | `(order)/` |
| ライブラリディレクトリ | kebab-case | `lib/services/`, `lib/validations/` |

### ファイル名

| 種別 | 規則 | 例 |
|------|------|-----|
| ページ・APIルート | Next.js 規約に従う | `page.tsx`, `route.ts`, `layout.tsx` |
| UIコンポーネント | kebab-case.tsx | `order-entry-panel.tsx` |
| サービス・ロジック | kebab-case.ts | `price-calculation.ts` |
| バリデーション | kebab-case.ts | `order.ts` |
| テスト | `[対象].test.ts` または `.spec.ts` | `price-calculation.test.ts` |

### コンポーネント・クラス・関数名

| 種別 | 規則 | 例 |
|------|------|-----|
| React コンポーネント（関数） | PascalCase | `OrderEntryPanel` |
| サービスクラス | PascalCase + Service | `PriceCalculationService` |
| バリデーションスキーマ | PascalCase + Schema | `CreateOrderSchema` |
| 型・インターフェース | PascalCase | `OrderItem`, `TaxType` |
| 関数・メソッド | camelCase | `resolveUnitPrice` |
| 定数（モジュールスコープ） | UPPER_SNAKE_CASE | `MAX_ITEMS_PER_ORDER` |

---

## 依存関係のルール

### レイヤー間の依存

```
app/(pages)/ + components/     [プレゼンテーション層]
    ↓ 呼び出しOK
app/api/                       [APIレイヤー]
    ↓ 呼び出しOK
lib/services/                  [サービスレイヤー]
    ↓ 呼び出しOK
lib/db/ + prisma               [データレイヤー]
```

**禁止される依存**:
- `lib/services/` → `components/`（サービスがUIに依存 ❌）
- `lib/services/` → `app/api/`（サービスがAPIに依存 ❌）
- `components/` → `lib/db/`（UIがDBに直接アクセス ❌）
- `app/api/` → `components/`（APIがUIコンポーネントに依存 ❌）

### Client Components のルール

```typescript
// 'use client' ディレクティブが必要なもの
// - useState, useEffect を使うコンポーネント
// - イベントハンドラを持つコンポーネント
// - ブラウザAPIを使うコンポーネント

// 'use client' 不要なもの（Server Components のまま）
// - データ取得のみを行うページコンポーネント
// - 静的なレイアウトコンポーネント
```

### 循環依存の防止

- `lib/services/` 内のサービス間で相互依存が発生した場合は、共通ロジックを新しいサービスに抽出する
- `lib/validations/` のスキーマは他のスキーマへの依存を持たない（フラットに保つ）

---

## 特殊ディレクトリ

### .steering/ (ステアリングファイル)

**役割**: 特定の開発作業における「今回何をするか」を定義

**構造**:
```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md      # 今回の作業の要求内容
    ├── design.md            # 変更内容の設計
    └── tasklist.md          # タスクリスト
```

**命名規則**: `20260508-add-order-copy` 形式

---

### .claude/ (Claude Code設定)

**役割**: Claude Code の設定・スキル・エージェント定義

```
.claude/
├── settings.json
├── skills/                  # スキル定義
└── agents/                  # サブエージェント定義（将来用）
```

---

## 除外設定

### .gitignore

```
# 依存関係
node_modules/

# Next.js ビルド成果物
.next/
out/

# 環境変数
.env
.env.local
.env.*.local

# データベース本体（バックアップ別管理）
prisma/bentosales.db
prisma/bentosales.db-journal

# 生成PDF（認証API経由で配信するため public/ には置かない）
private/pdfs/

# Playwright MCP raw output（スナップショット・ログ・一時PNG）
.playwright-mcp/

# OS固有
.DS_Store
Thumbs.db

# エディタ
*.log
```

### .env.example（Git管理対象）

```
# データベース
DATABASE_URL="file:./prisma/bentosales.db"

# Auth.js v5（AUTH_SECRET / AUTH_URL を使用。NEXTAUTH_* は v4 互換で非推奨）
AUTH_SECRET="your-secret-here"
AUTH_URL="http://localhost:3000"
```

---

## スケーリング戦略

### 機能追加時の配置方針

| 規模 | 方針 | 例 |
|------|------|-----|
| 小規模（APIエンドポイント追加） | 既存ディレクトリに追加 | `app/api/orders/[id]/copy/route.ts` |
| 中規模（新ビジネスロジック） | `lib/services/` に新ファイル追加 | `lib/services/archive.ts` |
| 大規模（新機能モジュール） | 機能ディレクトリを作成して分割 | `app/reports/` |

### ファイルサイズの管理

- 1ファイル 300行以下を推奨
- 300-500行: リファクタリングを検討
- 500行以上: ファイル分割を実施

**サービスファイルの分割例**:
```
# Before: invoice-generation.ts (600行)
lib/services/
└── invoice-generation.ts

# After: 機能ごとに分割
lib/services/
├── invoice-generation.ts    # メインの生成ロジック
├── invoice-numbering.ts     # 採番ロジック
└── billing-period.ts        # 締め期間計算ロジック
```
