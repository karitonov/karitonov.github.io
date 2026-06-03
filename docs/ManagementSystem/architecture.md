# 技術仕様書 (Architecture Design Document)

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| Node.js | v24.11.0 | LTS版。2026年以降も長期サポート保証。非同期I/Oに優れ、Next.jsのサーバーサイド処理・PDF生成に適する |
| TypeScript | 5.x | 静的型付けにより、金額計算・税計算など数値が複雑なビジネスロジックの誤りをコンパイル時に検出できる。IDEの補完によりスタッフがPRを書く際の生産性も向上 |
| npm | 11.x | Node.js v24.11.0 に同梱。package-lock.json による依存関係の厳密な固定管理が可能 |

### フレームワーク・ライブラリ（本番依存）

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Next.js | 15.x | フルスタックフレームワーク | App Router によりページ・API Routes・Server Components を単一プロジェクトに統合。デプロイを単一プロセスに集約できるため単店舗向け運用に最適 |
| React | 19.x | UIライブラリ | Next.js と統合。Server Components によるサーバーサイドレンダリングで初期表示を高速化 |
| Tailwind CSS | 3.x | CSSフレームワーク | ユーティリティファーストで高速にUIを構築。カスタムCSSを最小化しメンテナンス性を向上 |
| shadcn/ui | latest | UIコンポーネント | アクセシブルで高品質なコンポーネント群をコードベースに取り込むスタイル。Tailwind との統合が容易 |
| TanStack Table | 8.x | データグリッド | 注文一覧のインライン編集・ソート・フィルタ対応。ヘッドレスなので Tailwind でスタイル自由度が高い |
| Prisma | 5.x | ORM | 型安全なDB操作とマイグレーション管理。Prisma Client から TypeScript 型を自動生成するため、データモデル変更時の型不整合を防止 |
| @prisma/client | 5.x | Prismaクライアント | Prisma スキーマから自動生成。SQLite との接続管理 |
| @react-pdf/renderer | 3.x | PDF生成 | React コンポーネントで帳票レイアウトを宣言的に定義できる。HTML→PDF変換と異なり Headless Chrome 不要 |
| Zod | 3.x | バリデーション | APIリクエストとフォームの両方を同一スキーマで検証。Next.js API Routes の入力検証に使用 |
| Zustand | 4.x | 状態管理 | 選択日付・注文リストなどのグローバル状態を軽量に管理。Redux より設定が少なくシンプル |
| date-fns | 3.x | 日付処理 | 締め日計算・請求対象期間算出などの日付操作に使用。Tree-shaking 対応で軽量 |
| Auth.js | 5.x (beta) | 認証 | Next.js 15 App Router に対応した最新版。CredentialsProvider によるユーザー名/パスワード認証を使用。セッションに role（STAFF/OWNER）を含めてロール制御を実現 |

### 開発ツール

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| ESLint | 9.x | 静的解析 | Next.js 標準設定を使用。TypeScript ルールを追加して型不整合を早期検出 |
| Prettier | 3.x | コードフォーマット | チーム内のコードスタイルを統一。ESLint と統合 |
| Vitest | 2.x | ユニットテスト | Next.js 環境で動作。Jest 互換 API で移行コストが低い。ビジネスロジック（価格計算・税計算）のテストに使用 |
| Playwright | 1.x | E2Eテスト | ブラウザ操作の自動化。電話注文フロー・PDF出力フローのE2Eテストに使用 |

---

## アーキテクチャパターン

### レイヤードアーキテクチャ（Next.js App Router）

```
┌────────────────────────────────────────────────────────┐
│   プレゼンテーション層（React Components）               │
│   app/(pages)/ + components/                          │
│   - Server Components（一覧表示・初期レンダリング）       │
│   - Client Components（注文入力・インライン編集）         │
├────────────────────────────────────────────────────────┤
│   APIレイヤー（Next.js API Routes）                     │
│   app/api/                                             │
│   - リクエストバリデーション（Zod）                      │
│   - サービス呼び出し                                    │
│   - HTTPレスポンス整形                                  │
├────────────────────────────────────────────────────────┤
│   サービスレイヤー（ビジネスロジック）                    │
│   lib/services/                                        │
│   - PriceCalculationService                           │
│   - InvoiceGenerationService                          │
│   - PaymentService                                    │
│   - PdfGenerationService                              │
├────────────────────────────────────────────────────────┤
│   データレイヤー（Prisma ORM）                           │
│   lib/db/                                              │
│   - Prismaクライアントのシングルトン管理                  │
│   - データアクセスの抽象化                              │
└────────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────────┐
│   SQLite（prisma/bentosales.db）                       │
└────────────────────────────────────────────────────────┘
```

### 依存関係のルール

```
UI Components → API Routes → Services → Prisma/DB  ✅
UI Components → Prisma/DB（直接）                   ❌
Services → UI Components                            ❌
```

### Server Components と Client Components の使い分け

| 種別 | 用途 | 理由 |
|------|------|------|
| Server Components | 注文一覧・顧客一覧・請求書一覧の初期レンダリング | DBデータを直接取得してHTMLを返すことで初期表示を高速化 |
| Client Components | 注文入力フォーム・インライン編集グリッド | ユーザーインタラクション（状態更新・リアルタイム計算）が必要 |

---

## ディレクトリ構造

```
bentosales/
├── app/                          # Next.js App Router
│   ├── (order)/                  # 注文メインページ（STAFF・OWNER共通）
│   │   └── page.tsx
│   ├── customers/                # 顧客管理（OWNERのみ）
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── products/                 # 商品管理（OWNERのみ）
│   │   └── page.tsx
│   ├── invoices/                 # 請求管理（OWNERのみ）
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── settings/                 # システム設定（OWNERのみ）
│   │   └── page.tsx
│   ├── users/                    # ユーザー管理（OWNERのみ）
│   │   └── page.tsx
│   ├── login/                    # ログイン画面（未認証アクセス可）
│   │   └── page.tsx
│   └── api/                      # API Routes
│       ├── auth/
│       │   └── [...nextauth]/route.ts  # Auth.js ハンドラ
│       ├── orders/
│       │   ├── route.ts                # GET・POST
│       │   └── [id]/
│       │       ├── route.ts            # PUT・DELETE
│       │       ├── previous/route.ts   # GET（前回注文）
│       │       └── delivery-note-pdf/route.ts  # GET（納品書PDF）
│       ├── customers/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── prices/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── cancel/route.ts     # POST（キャンセル）
│       │       ├── pdf/route.ts        # GET（請求書PDF）
│       │       └── receipt-pdf/route.ts # GET（領収書PDF）
│       ├── payments/route.ts
│       ├── production-summary/
│       │   ├── route.ts               # GET（JSON集計データ）
│       │   └── pdf/route.ts           # GET（製造一覧PDF）
│       ├── settings/route.ts          # GET・PUT（システム設定）
│       └── users/
│           ├── route.ts               # GET（一覧）・POST（作成）
│           ├── [id]/route.ts          # PUT（有効/無効切替）
│           └── me/password/route.ts   # PUT（パスワード変更）
├── auth.ts                        # Auth.js 設定
├── middleware.ts                  # ルート保護・ロールチェック
├── components/                   # 共通UIコンポーネント
│   ├── ui/                       # shadcn/ui コンポーネント
│   ├── order/                    # 注文関連
│   ├── customer/                 # 顧客関連
│   ├── invoice/                  # 請求関連
│   ├── product/                  # 商品関連
│   ├── user/                     # ユーザー管理関連
│   └── layout/
│       ├── app-shell.tsx         # ルートレイアウト（ヘッダー・サイドバー統合）
│       ├── nav.tsx               # サイドバーナビゲーション
│       └── user-menu.tsx         # 右上ユーザーメニュー（パスワード変更・ログアウト）
├── lib/
│   ├── auth/
│   │   └── require-role.ts       # ロール制御ユーティリティ
│   ├── db/
│   │   └── prisma.ts             # Prismaクライアントのシングルトン
│   ├── services/
│   │   ├── price-calculation.ts
│   │   ├── invoice-generation.ts # cancelInvoice 含む
│   │   ├── payment.ts
│   │   └── pdf-generation.ts
│   └── validations/              # Zodスキーマ
│       ├── order.ts
│       ├── customer.ts
│       ├── product.ts
│       ├── invoice.ts
│       ├── payment.ts
│       ├── settings.ts
│       └── user.ts               # ユーザー作成・更新・パスワード変更スキーマ
├── prisma/
│   ├── schema.prisma             # DBスキーマ定義
│   ├── seed.ts                   # 開発用初期データ
│   ├── migrations/               # マイグレーションファイル
│   └── bentosales.db             # SQLiteデータベースファイル（gitignore）
├── private/
│   └── pdfs/                     # 生成PDFの永続保存（認証API経由で配信）
└── public/                       # 静的ファイル（PDFは置かない）
```

---

## データ永続化戦略

### ストレージ方式

| データ種別 | ストレージ | フォーマット | 理由 |
|-----------|----------|-------------|------|
| 全業務データ（顧客・商品・注文・請求・ユーザー等） | ローカル: SQLite（ファイルベース） / Vercel: Turso（libSQL） | Prisma 管理のRDB | ローカルは外部DBサーバー不要。Vercel環境では `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` を設定してTursoに接続し、インスタンス間でデータを共有 |
| 生成PDF | ファイルシステム（`private/pdfs/`） | PDF | 再発行対応のため永続保存。**`public/` には置かない**（認証なしアクセスを防ぐ）。ファイル名は帳票番号（INV-202605-0001.pdf 等）。API Route 経由で認証済みユーザーのみ取得可能 |
| セッション | Auth.js セッション（Cookie + DB） | JWT / DB Session | ロール情報を含むセッション。Cookie は HttpOnly・Secure フラグ設定 |

### SystemSettings の管理方針

`SystemSettings` テーブルは常に `id = 'default'` の1レコードのみ存在するシングルトン。
アプリ起動時に未存在の場合は `prisma/seed.ts` で初期レコードを作成する。

```typescript
// prisma/seed.ts（抜粋）
await prisma.systemSettings.upsert({
  where: { id: 'default' },
  create: { id: 'default', storeName: '店舗名を設定してください' },
  update: {},
});
```

適格請求書発行事業者登録番号（`qualifiedInvoiceNumber`）は `SystemSettings` で管理し、
請求書発行時に `Invoice.qualifiedInvoiceNumber` へスナップショット保存する。
これにより登録番号を後から変更しても発行済み請求書の番号は変わらない。

### SequenceNumber の採番競合対策

帳票番号採番は複数ユーザーが同時操作しても重複しないよう、
**必ず Prisma トランザクション内で排他的に実行する**。

SQLite は `BEGIN IMMEDIATE` トランザクション（書き込みロック）を使用することで
同時採番の競合を防止する。Prisma の `$transaction` はデフォルトで `SERIALIZABLE` 相当。

```typescript
// 採番の安全な実装例
async function generateDocumentNumber(type: DocumentType, issueDate: Date): Promise<string> {
  const yearMonth = format(issueDate, 'yyyyMM');

  return prisma.$transaction(async (tx) => {
    const seq = await tx.sequenceNumber.upsert({
      where: { type_yearMonth: { type, yearMonth } },
      create: { type, yearMonth, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const prefix = { INVOICE: 'INV', RECEIPT: 'REC', DELIVERY_NOTE: 'DEL' }[type];
    return `${prefix}-${yearMonth}-${String(seq.lastNumber).padStart(4, '0')}`;
  });
}
```

### Prismaシングルトンパターン

開発環境での接続数増加を防ぐため、Prismaクライアントをシングルトンで管理する。
`TURSO_DATABASE_URL` 環境変数の有無で接続先（Turso or SQLite）を切り替える。

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### バックアップ戦略

- **方式**: SQLite DBファイル（`prisma/bentosales.db`）をファイルコピーでバックアップ
- **推奨頻度**: 1日1回（夜間）、OS のスケジューラ（タスクスケジューラ）で自動化
- **保存先**: pCloud Sync 等のクラウドストレージと同期されたフォルダへコピー
- **世代管理**: `bentosales-YYYYMMDD.db` 形式で30日分を保持
- **復元方法**: バックアップファイルを `prisma/bentosales.db` に上書きコピーして再起動
- **PDFバックアップ**: `private/pdfs/` ディレクトリも同様に定期バックアップ対象とする
- **環境変数のバックアップ**: `NEXTAUTH_SECRET` 等の `.env.local` はDBファイルとは別に安全な場所（パスワードマネージャーなど）に保管すること。これがないとセッション復号ができなくなる

---

## パフォーマンス要件

### レスポンスタイム目標

| 操作 | 目標時間 | 測定環境 |
|------|---------|---------|
| 注文保存（POST /api/orders） | 500ms以内 | Core i5相当、メモリ8GB、SSD、SQLite |
| 注文一覧表示（当日100件） | 1秒以内 | 同上 |
| 製造一覧リアルタイム更新 | 200ms以内 | 同上（インメモリ計算） |
| PDF生成（請求書・領収書） | 3秒以内 | 同上 |
| 顧客一覧表示（200社） | 500ms以内 | 同上 |

### SQLiteインデックス設計

クエリの頻度が高いカラムにインデックスを設定する:

```prisma
// prisma/schema.prisma 内
model Order {
  @@index([deliveryDate])       // 日付指定でフィルタ
  @@index([customerId])         // 顧客別フィルタ
}

model Invoice {
  @@index([customerId, status]) // 顧客別未払い一覧
  @@index([status])             // 状態別フィルタ
}

model OrderItem {
  @@index([orderId])            // 注文明細取得
}

model Order {
  @@index([invoiceId])          // 請求書ごとの注文取得・キャンセル時の一括更新
}

model DeliveryNote {
  @@index([orderId])            // 注文IDによる納品書検索
}
```

### リソース使用量

| リソース | 上限 | 理由 |
|---------|------|------|
| メモリ（Node.jsプロセス） | 512MB | 単店舗LAN内サーバーの想定スペック |
| SQLiteファイルサイズ | 1GB | 5年分のデータで約200MB程度の見積もり。十分に余裕あり |
| PDF保存領域 | 10GB | 月100枚×5年分でも余裕のある容量 |

---

## セキュリティアーキテクチャ

### 認証・アクセス制御

- **方式**: Auth.js v5（CredentialsProvider）によるセッション管理
- **ユーザー管理**: STAFF / OWNER の2ロール分離。User エンティティで管理
- **ロール権限**:
  - STAFF: 注文入力・注文一覧・製造一覧・納品書PDF出力のみ
  - OWNER: 全機能（顧客管理・商品管理・請求管理・入金管理・全帳票・設定）
- **セッション**: Cookie（HttpOnly, Secure フラグ設定）。セッションに `role` を含める
- **パスワード**: bcrypt でハッシュ化して DB 保存（User テーブル）

**ロール制御の実装方針**:

```typescript
// lib/auth/require-role.ts
import { auth } from '@/auth';
import type { UserRole } from '@prisma/client';

export async function requireRole(requiredRole: UserRole) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (requiredRole === 'OWNER' && session.user.role !== 'OWNER') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null; // OK
}

// 使用例（API Route）
export async function POST(request: Request) {
  const denied = await requireRole('OWNER');
  if (denied) return denied;
  // ... 以降は OWNER のみ実行
}
```

**Next.js Middleware でのルート保護**:
- `/login` 以外の全ルートはセッション必須（未認証は `/login` にリダイレクト）
- OWNER 専用ページ（`/customers`, `/products`, `/invoices`, `/settings`, `/users`）は Middleware で role チェック

### 入力検証（Zod スキーマ）

APIリクエストはすべて Zod スキーマで検証する。クライアントサイドとサーバーサイドで同一スキーマを共用する。

```typescript
// lib/validations/order.ts
export const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    productId: z.string().uuid(),
    unitPrice: z.number().int().min(0),
    quantity: z.number().int().min(1),
  })).min(1),
});
```

### SQLインジェクション対策

Prisma ORM が生成するプリペアドステートメントを使用するため、SQL インジェクションのリスクは構造的に排除される。Raw SQL を使用する場合は `prisma.$queryRaw` + テンプレートリテラルのみ使用する。

### XSS対策

- React の JSX はデフォルトでエスケープ処理を行う
- `dangerouslySetInnerHTML` は使用しない
- PDF生成で表示するユーザー入力テキストは react-pdf 側でレンダリングするため HTML インジェクションリスクなし

### 機密情報管理

```
.env.local（Gitignore対象）
├── DATABASE_URL="file:./prisma/bentosales.db"
├── NEXTAUTH_SECRET="..."
└── NEXTAUTH_URL="http://localhost:3000"
```

---

## スケーラビリティ設計

### データ増加への対応

- **想定データ量**: 顧客200社 × 1日100件 × 365日 × 5年 = 約180,000件の注文
- **SQLite の上限**: 140TB（理論値）。180,000件は全く問題なし
- **パフォーマンス対策**: deliveryDate・customerId・status へのインデックスで主要クエリを最適化
- **アーカイブ**: 3年以上前の注文データは別テーブル（`OrderArchive`）へ移行する機能を将来実装

### 機能拡張性

- **複数店舗対応**: 現在はスコープ外だが、将来的に `tenantId` カラムを追加するだけで対応可能な設計
- **外部連携**: Next.js API Routes を REST API として公開しているため、将来的に会計ソフト連携が可能

---

## テスト戦略

### ユニットテスト（Vitest）

- **フレームワーク**: Vitest 2.x
- **対象**: サービスレイヤーのビジネスロジック
- **カバレッジ目標**: サービスレイヤー 90%以上
- **重点テスト対象**:
  - `PriceCalculationService`: 価格優先順位の3パターン・外税/内税・端数処理
  - `InvoiceGenerationService`: 都度/月締め/指定日締めの期間計算・採番ロジック・`cancelInvoice` のトランザクション整合性（Invoice が CANCELLED になり Order.invoiceId が null に戻ること）
  - `PaymentService`: 入金ステータスの全遷移パターン・CANCELLED 請求書への入金拒否（422）
  - 採番ロジック: 月またぎでのリセット・4桁ゼロ埋め・SequenceNumber 一意性

### 統合テスト（Vitest + Prisma テスト用DB）

- **方法**: テスト用 SQLite インメモリDBを使用
- **対象**: API Routes の入出力・DB書き込みの整合性・ロール制御
- **シナリオ**:
  - 注文作成 → 注文一覧に反映されること
  - 請求書生成 → InvoiceItem・Order.invoiceId が正しく設定されること
  - 入金登録 → Invoice.status が正しく更新されること
  - STAFF ロールで OWNER 専用 API（POST /api/invoices 等）を呼ぶ → 403 が返ること
  - 未認証で保護ルートを呼ぶ → 401 が返ること
  - 請求書キャンセル → Invoice.status が CANCELLED に・Order.invoiceId が null に戻ること

### E2Eテスト（Playwright）

- **ツール**: Playwright 1.x
- **シナリオ**:
  - ログイン（STAFF・OWNER 各ロール）〜ログアウトのフロー
  - 電話注文入力〜保存〜製造一覧反映のフルフロー
  - 前回注文コピー機能
  - 請求書生成〜PDF出力フロー
  - 入金登録〜領収書PDF出力フロー
  - 請求書キャンセル〜注文が未請求状態に戻ることの確認
  - STAFF ロールで顧客管理ページにアクセス → リダイレクトまたは 403 の確認

---

## 技術的制約

### 環境要件

- **OS**: Windows 10/11、macOS 12以降、Ubuntu 20.04以降（Docker 利用で統一）
- **最小メモリ**: 2GB（推奨: 4GB以上）
- **必要ディスク容量**: 初期 500MB（Node.js モジュール含む）
- **必要な外部依存**: Node.js v24.11.0、npm 11.x
- **ブラウザ**: Chrome 120以降、Edge 120以降（IE・旧Safariは非対応）

### 運用環境の前提

- **単店舗LAN内での運用**: Windows PC（またはLinuxサーバー）で `next start` を常駐起動
- **外部インターネット接続**: 不要（LAN内で完結）
- **同時接続ユーザー数**: 最大5名程度を想定

### パフォーマンス制約

- SQLite は同時書き込みが1プロセスに制限される。電話注文は順次処理が前提のため問題なし
- PDF生成は @react-pdf/renderer をサーバーサイドで実行するため、同時PDF生成は最大2件程度を想定
- **`@react-pdf/renderer` は Node.js ランタイム必須**。Edge Runtime では動作しない。PDFを生成するすべての API Route に `export const runtime = 'nodejs'` を明示的に設定すること
- Auth.js v5（beta）は Next.js 15 との組み合わせで動作確認済みだが、正式リリース版への追随が必要

---

## 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| next | フレームワーク | `^15.0.0`（マイナーまで自動） |
| next-auth | 認証（Auth.js v5） | `5.0.0-beta.*`（betaのため固定。正式版リリース時に更新評価） |
| react / react-dom | UIライブラリ | `^19.0.0` |
| @prisma/client | DBクライアント | 固定（`5.x.x`）。マイグレーションと同期が必要 |
| prisma | ORM CLI | 固定（`5.x.x`）。clientと同バージョンに保つ |
| @react-pdf/renderer | PDF生成 | `^3.0.0`（APIが安定したらマイナーまで自動） |
| zod | バリデーション | `^3.0.0` |
| tailwindcss | CSS | `^3.0.0` |
| vitest | テスト | `^2.0.0` |
| playwright | E2Eテスト | `^1.0.0` |

**方針**:
- Prisma は `prisma` と `@prisma/client` を必ず同バージョンに固定する（非同期だとマイグレーション不整合が発生）
- セキュリティパッチは `npm audit` で定期確認し、脆弱性が出た場合は即時対応
- メジャーバージョンアップは機能設計書・アーキテクチャ設計書を見直してから実施
