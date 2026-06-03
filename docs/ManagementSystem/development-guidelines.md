# 開発ガイドライン (Development Guidelines)

---

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | v24.11.0 | ランタイム |
| npm | 11.x | パッケージマネージャー |
| Docker | 最新 | devcontainer 実行 |
| VS Code | 最新 | 推奨エディタ |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <URL>
cd bentosales

# 2. devcontainer で開発環境を起動（推奨）
# VS Code: "Reopen in Container"

# 3. 依存関係のインストール
npm install

# 4. 環境変数の設定
cp .env.example .env.local
# .env.local を編集（以下の変数を設定）
# DATABASE_URL="file:./prisma/bentosales.db"
# AUTH_SECRET="$(openssl rand -base64 32)"   # Auth.js v5 の秘密鍵
# AUTH_URL="http://localhost:3000"            # 本番では本番URLを設定
# ※ NEXTAUTH_SECRET / NEXTAUTH_URL は v4 の旧名称。v5 では AUTH_* を使用

# 5. データベースのセットアップ
npx prisma migrate dev

# 6. 開発用初期データの投入（任意）
npx prisma db seed

# 7. 開発サーバーの起動
npm run dev
```

### よく使うコマンド

```bash
npm run dev            # 開発サーバー起動（localhost:3000）
npm run build          # 本番ビルド
npm run lint           # ESLint 実行
npm run type-check     # TypeScript 型チェック
npm run test           # Vitest ユニット・統合テスト
npm run test:e2e       # Playwright E2Eテスト
npx prisma studio      # DB GUI（開発用）
npx prisma migrate dev # マイグレーション実行
npx prisma generate    # Prisma Client 再生成
```

---

## コーディング規約

### TypeScript 規約

#### 型定義の原則

```typescript
// ✅ 良い例: 明示的な型注釈
function resolveUnitPrice(
  productId: string,
  customerId: string
): { price: number; source: PriceSource } {
  // 実装
}

// ❌ 悪い例: any型・型注釈なし
function resolveUnitPrice(productId, customerId) {
  // any型になる
}
```

```typescript
// ✅ ユニオン型はtype aliasで定義
type TaxType = 'EXCLUSIVE' | 'INCLUSIVE';
type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL_PAID' | 'PAID' | 'CANCELLED';

// ✅ オブジェクト型はinterfaceで定義（拡張性のため）
interface CreateOrderRequest {
  customerId: string;
  deliveryDate: string;
  items: OrderItemInput[];
}
```

#### `any` 型の禁止

`any` 型は使用禁止。不明な型は `unknown` を使い、型ガードで絞り込む。

```typescript
// ✅ 良い例
function handleApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
}

// ❌ 悪い例
function handleApiError(error: any): string {
  return error.message;
}
```

---

### 命名規則

| 種別 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `resolveUnitPrice`, `totalAmount` |
| 定数（モジュールスコープ） | UPPER_SNAKE_CASE | `MAX_INVOICE_ITEMS` |
| Boolean変数 | `is` / `has` / `should` で始める | `isActive`, `hasCustomerPrice` |
| Reactコンポーネント | PascalCase | `OrderEntryPanel` |
| 型・インターフェース | PascalCase | `TaxType`, `CreateOrderRequest` |
| Zodスキーマ | PascalCase + `Schema` | `CreateOrderSchema` |
| ファイル名（コンポーネント以外） | kebab-case | `price-calculation.ts` |

---

### 関数設計

**関数の長さの目安**: 目標20行以内、上限50行。50行超えたら分割を検討。

**パラメータは3個まで。それ以上はオブジェクトにまとめる**:

```typescript
// ✅ 良い例
interface RegisterPaymentInput {
  invoiceId: string;
  amount: number;
  paidAt: Date;
  paymentMethod: PaymentMethod;
  notes?: string;
}

async function registerPayment(input: RegisterPaymentInput): Promise<Payment> { }

// ❌ 悪い例
async function registerPayment(
  invoiceId: string,
  amount: number,
  paidAt: Date,
  paymentMethod: PaymentMethod,
  notes?: string
): Promise<Payment> { }
```

---

### コメント規約

**コメントは「なぜ（WHY）」だけ書く。「何を（WHAT）」はコードで表現する**:

```typescript
// ✅ 良い例: なぜそうするかを説明
// 注文確定後は単価・税率を変更できないため、注文時点の値をスナップショット保存する
const snapshotPrice = unitPrice;

// ✅ 複雑なビジネスルールのみ説明
// 内税の場合: 税額 = 税込金額 - 税込金額 ÷ (1 + 税率)
// 小数点以下は切り捨て（消費税法の慣行に従う）
const taxAmount = Math.floor(lineTotal - lineTotal / (1 + taxRate));

// ❌ 悪い例: コードと同じことを言っている
// 税額を計算する
const taxAmount = Math.floor(lineTotal - lineTotal / (1 + taxRate));
```

**TSDoc は公開サービスメソッドにのみ記述**（パラメータが複雑な場合や副作用がある場合）:

```typescript
/**
 * 注文を作成し、単価・税額を確定保存する
 *
 * 単価は「手動入力 > 顧客別単価 > 商品標準単価」の優先順位で解決する。
 * 一度保存した OrderItem の price/taxRate は変更不可。
 *
 * @throws {ValidationError} 顧客または商品が存在しない場合
 */
async function createOrder(input: CreateOrderInput): Promise<Order> { }
```

---

### エラーハンドリング

#### カスタムエラークラス

```typescript
// lib/errors.ts

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource}が見つかりません: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}
```

#### API Routes でのエラー処理パターン

```typescript
// app/api/orders/route.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await createOrder(parsed.data);
    return Response.json(order, { status: 201 });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof BusinessError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error('注文作成エラー:', error);
    return Response.json({ error: '内部エラーが発生しました' }, { status: 500 });
  }
}
```

---

### Next.js 固有の規約

#### Server Components vs Client Components

```typescript
// ✅ Server Component（デフォルト）: データ取得のみ
// app/customers/page.tsx
import { prisma } from '@/lib/db/prisma';

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({ where: { isActive: true } });
  return <CustomerList customers={customers} />;
}
```

```typescript
// ✅ Client Component: インタラクションが必要な場合のみ
// components/order-entry-panel.tsx
'use client';

import { useState } from 'react';

export function OrderEntryPanel({ customers, products }: Props) {
  const [items, setItems] = useState<OrderItemForm[]>([]);
  // ...
}
```

**ルール**: `'use client'` は必要最小限に留める。データ取得はServer Componentsで行い、インタラクティブな部分だけをClient Componentsに分離する。

#### API Routes の命名規則

**状態変更アクション**はリソースサブルートに動詞を使った `POST` で定義する（`DELETE` や `PATCH` ではなく）:

```
POST /api/invoices/[id]/cancel   # 請求書キャンセル
POST /api/invoices/[id]/issue    # 請求書発行（将来用）
```

**対応するサービスメソッドの追加場所**: 既存サービスクラスに追加する。
例: `cancelInvoice` は `lib/services/invoice-generation.ts` の `InvoiceGenerationService` に追加する。

#### PDF ファイルの扱い

```typescript
// ✅ 良い例: private/ に保存し API Route 経由で返す
// app/api/invoices/[id]/pdf/route.ts
import { requireRole } from '@/lib/auth/require-role';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs'; // @react-pdf/renderer は Node.js ランタイム必須

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireRole('OWNER');
  if (denied) return denied;

  const filePath = path.join(process.cwd(), 'private/pdfs', `INV-${params.id}.pdf`);
  const buffer = await readFile(filePath);
  return new Response(buffer, { headers: { 'Content-Type': 'application/pdf' } });
}

// ❌ 悪い例: public/ に保存（認証なしで直接アクセス可能になる）
// public/pdfs/INV-202605-0001.pdf → https://example.com/pdfs/INV-202605-0001.pdf
```

#### API Routesの Zod バリデーション

APIの入力は必ず Zod でバリデーションする:

```typescript
// lib/validations/order.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid('顧客IDの形式が不正です'),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    unitPrice: z.number().int().min(0, '単価は0以上の整数です'),
    quantity: z.number().int().min(1, '数量は1以上の整数です'),
  })).min(1, '商品を1つ以上追加してください'),
});
```

---

### Prisma 規約

**トランザクションが必要な処理は必ず `$transaction` を使う**:

```typescript
// ✅ 良い例: 請求書生成はトランザクションで一括
async function generateInvoice(input: GenerateInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({ data: invoiceData });
    await tx.invoiceItem.createMany({ data: itemsData });
    await tx.order.updateMany({
      where: { id: { in: input.orderIds } },
      data: { invoiceId: invoice.id },
    });
    return invoice;
  });
}

// ❌ 悪い例: トランザクションなしで複数テーブルを更新
// → 途中でエラーになるとデータが不整合になる
```

**クエリの型安全性**: `include` や `select` を使う場合は、返却型を明示的に定義する:

```typescript
// ✅ 良い例
const orderWithItems = await prisma.order.findUnique({
  where: { id },
  include: { items: { include: { product: true } }, customer: true },
});
type OrderWithItems = NonNullable<typeof orderWithItems>;
```

---

### 認証・認可規約

#### ファイル配置ルール

`auth.ts` と `middleware.ts` は **プロジェクトルート** に配置する（`lib/` ではない）。
これは Next.js と Auth.js v5 の規約によるもの。

```
bentosales/
├── auth.ts          # Auth.js 設定・auth() / signIn() / signOut() のエクスポート元
├── middleware.ts    # Next.js Middleware（プロジェクトルート必須）
└── lib/auth/
    └── require-role.ts   # API Route 用ロールガードユーティリティ
```

#### セッション取得パターン

**Server Component / API Route でのセッション取得**（`auth()` を使用）:

```typescript
// app/invoices/page.tsx（Server Component）
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function InvoicesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'OWNER') redirect('/');
  // ...
}
```

**API Route でのロールガード**（`requireRole` を使用）:

```typescript
// app/api/invoices/route.ts
import { requireRole } from '@/lib/auth/require-role';

export async function POST(request: Request) {
  const denied = await requireRole('OWNER');
  if (denied) return denied; // 401 または 403 を返す

  // 以降は OWNER のみ実行される
}
```

#### middleware.ts の方針

- `/login` と `/api/auth/**` は保護対象外（未認証でもアクセス可）
- それ以外の全ルートは認証必須（未認証は `/login` にリダイレクト）
- OWNER 専用ページ（`/customers`・`/products`・`/invoices`・`/settings`）への STAFF アクセスはリダイレクトまたは 403

```typescript
// middleware.ts（概要）
import { auth } from '@/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && pathname !== '/login') {
    return Response.redirect(new URL('/login', req.url));
  }
  // OWNER 専用ページへの STAFF アクセスを拒否
  const ownerOnlyPaths = ['/customers', '/products', '/invoices', '/settings', '/users'];
  if (ownerOnlyPaths.some(p => pathname.startsWith(p)) && req.auth?.user.role !== 'OWNER') {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = { matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'] };
```

---

## Git 運用ルール

### ブランチ戦略

```
main
  └─ feature/[機能名]    # 新機能
  └─ fix/[修正内容]      # バグ修正
  └─ refactor/[対象]     # リファクタリング
  └─ docs/[対象]         # ドキュメント更新
```

**このプロジェクトは単独開発を想定しているため `develop` ブランチは使用しない。**
feature ブランチから直接 `main` にマージする。

### コミットメッセージ規約

**Conventional Commits 形式**:

```
<type>(<scope>): <subject>

<body>（任意）
```

**Type**:
| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント変更 |
| `style` | コードフォーマット（動作変更なし） |
| `refactor` | リファクタリング（動作変更なし） |
| `test` | テスト追加・修正 |
| `chore` | ビルド設定・依存関係更新 |
| `db` | DBスキーマ変更・マイグレーション |

**Scope（このプロジェクトの例）**:
`order`, `customer`, `product`, `invoice`, `payment`, `pdf`, `auth`, `delivery`, `settings`, `sequence`

**コミット例**:
```
feat(order): 前回注文コピー機能を追加

同顧客の直近注文から商品・数量・単価をコピーする。
コピー後は各行を個別に編集可能。

Closes #12
```

```
fix(invoice): 指定日締めの請求対象期間計算が月跨ぎで誤る問題を修正

締め日15日で前月16日〜当月15日の計算が
月の日数によって1日ずれる問題を修正した。
```

```
db(customer): 顧客テーブルに顧客コードカラムを追加
```

---

### プルリクエスト

**PRテンプレート** (`.github/pull_request_template.md`):

```markdown
## 概要
<!-- 変更内容を簡潔に説明 -->

## 変更の種類
- [ ] 新機能
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新
- [ ] DBスキーマ変更
- [ ] 認証・認可変更

## 変更内容
- 
- 

## テスト
- [ ] ユニットテスト追加・更新（`npm run test`）
- [ ] 型チェックパス（`npm run type-check`）
- [ ] Lintパス（`npm run lint`）
- [ ] 手動動作確認済み
- [ ] 認証・認可変更の場合: ロール制御の動作を手動確認済み（STAFF/OWNER両方で確認）

## 関連Issue
Closes #
```

---

## テスト戦略

### テストピラミッド

```
        ┌──────────┐
        │  E2E     │  ← 少数（主要フロー3〜5本）
        │(Playwright)│
       ┌┴──────────┴┐
       │  統合テスト  │  ← 中程度（機能ごと）
       │  (Vitest)  │
      ┌┴────────────┴┐
      │ ユニットテスト  │  ← 多数（サービスレイヤー中心）
      │   (Vitest)   │
      └──────────────┘
```

### ユニットテスト

**対象**: `lib/services/` のビジネスロジック
**カバレッジ目標**: サービスレイヤー 90%以上
**テスト命名**: 日本語で「〇〇のとき〇〇すること」スタイル

```typescript
// tests/unit/services/price-calculation.test.ts

describe('resolveUnitPrice', () => {
  it('手動入力価格がある場合は手動価格を返すこと', () => {
    const result = resolveUnitPrice(mockProduct, [], 500);
    expect(result).toEqual({ price: 500, source: 'MANUAL' });
  });

  it('顧客別単価が設定されている場合は顧客別単価を返すこと', () => {
    const customerPrices = [{ productId: mockProduct.id, price: 750 }];
    const result = resolveUnitPrice(mockProduct, customerPrices);
    expect(result).toEqual({ price: 750, source: 'CUSTOMER' });
  });

  it('顧客別単価も手動入力もない場合は商品標準単価を返すこと', () => {
    const result = resolveUnitPrice(mockProduct, []);
    expect(result).toEqual({ price: mockProduct.basePrice, source: 'BASE' });
  });
});

describe('calculateOrderItemTotals', () => {
  describe('外税（EXCLUSIVE）の場合', () => {
    it('税額が切り捨て計算されること', () => {
      // 800円 × 1個 × 10%: 端数なし
      const result = calculateOrderItemTotals(800, 1, 0.1, 'EXCLUSIVE');
      expect(result).toEqual({ subtotal: 800, taxAmount: 80, lineTotal: 880 });
    });

    it('税額の端数が切り捨てられること', () => {
      // 333円 × 1個 × 10% = 33.3 → 33（切り捨て）
      const result = calculateOrderItemTotals(333, 1, 0.1, 'EXCLUSIVE');
      expect(result).toEqual({ subtotal: 333, taxAmount: 33, lineTotal: 366 });
    });
  });

  describe('内税（INCLUSIVE）の場合', () => {
    it('税込金額から税額が正しく逆算されること', () => {
      // 税込1100円の場合、税抜1000円・税額100円
      const result = calculateOrderItemTotals(1100, 1, 0.1, 'INCLUSIVE');
      expect(result).toEqual({ subtotal: 1000, taxAmount: 100, lineTotal: 1100 });
    });
  });
});
```

### 統合テスト

**対象**: API Routes + DB 連携
**テスト用DB**: Vitest 起動時にインメモリ SQLite を使用

**認証モックパターン**（API Route のロールガードをモックする）:

```typescript
// tests/integration/auth-role.test.ts
import { vi } from 'vitest';

// auth() の戻り値をモックしてロールを制御
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('ロール制御', () => {
  it('STAFFがOWNER専用APIを呼ぶと403を返すこと', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'STAFF', name: 'スタッフ' },
    } as any);

    const res = await POST(new Request('http://localhost/api/invoices'));
    expect(res.status).toBe(403);
  });

  it('未認証で呼ぶと401を返すこと', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(new Request('http://localhost/api/invoices'));
    expect(res.status).toBe(401);
  });
});
```

```typescript
// tests/integration/order-crud.test.ts

describe('注文 CRUD', () => {
  beforeEach(async () => {
    // テスト用途でのみ $executeRaw による高速クリーンアップを許可
    await prisma.$executeRaw`DELETE FROM OrderItem`;
    await prisma.$executeRaw`DELETE FROM Order`;
  });

  it('注文を作成すると OrderItem も作成されること', async () => {
    const order = await createOrder({
      customerId: testCustomer.id,
      deliveryDate: new Date('2026-05-08'),
      items: [{ productId: testProduct.id, unitPrice: 800, quantity: 10 }],
    });

    expect(order.id).toBeDefined();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].unitPrice).toBe(800);
    // 注文確定時に税額が確定保存されること
    expect(order.items[0].taxAmount).toBe(800);
  });
});
```

### E2Eテスト（Playwright）

**対象**: ユーザーが日常使うフローのみ（重要3〜5フロー）

**認証済み状態の再現**（`storageState` でセッションを使い回す）:

```typescript
// tests/e2e/auth.setup.ts（グローバルセットアップ）
import { test as setup } from '@playwright/test';
import path from 'path';

const ownerAuthFile = path.join(__dirname, '../.auth/owner.json');

setup('OWNERとしてログイン', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('ユーザー名').fill('owner');
  await page.getByLabel('パスワード').fill(process.env.TEST_OWNER_PASSWORD!);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: ownerAuthFile });
});
```

```typescript
// playwright.config.ts（抜粋）
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'owner-tests',
      use: { storageState: 'tests/.auth/owner.json' },
      dependencies: ['setup'],
    },
  ],
});
```

```typescript
// tests/e2e/phone-order-entry.spec.ts

test('電話注文を入力して保存すると製造一覧に反映されること', async ({ page }) => {
  await page.goto('/');

  // 顧客を選択
  await page.getByRole('combobox', { name: '顧客' }).selectOption('山田商事');

  // 商品を追加
  await page.getByRole('button', { name: '商品追加' }).click();
  await page.getByRole('combobox', { name: '商品' }).last().selectOption('唐揚げ弁当');
  await page.getByRole('spinbutton', { name: '数量' }).last().fill('10');

  // 保存
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました')).toBeVisible();

  // 製造一覧に反映されること
  await expect(page.getByText('唐揚げ弁当: 10個')).toBeVisible();
});
```

### Playwright MCP による手動確認レポート

PR のチェックリストを Claude Code + Playwright MCP でブラウザ操作して確認する場合、以下の方針に従う。

#### スクリーンショットの取得方針

**各チェック項目ごとに必ず1枚スクリーンショットを取得する。**

```typescript
// 各チェック項目の確認後に実行
await browser_take_screenshot({ type: 'png' });
```

スナップショット（`.yml`）は自動保存されるが、視覚的な証跡として PNG を残す。

#### レポートの出力

確認完了後、`docs/test-reports/` に `pr[番号]-test-report.md` を作成し git 管理する。
スクリーンショット PNG も同ディレクトリに `pr[番号]-[説明].png` 形式で保存する。

**レポートの構成**:

```markdown
# PR #N 動作確認レポート

**対象PR**: リンク  
**確認日時**: YYYY-MM-DD  
**確認方法**: Playwright MCP  
**確認環境**: http://localhost:3000（ブランチ: `xxx`）
**保存場所**: `docs/test-reports/pr[N]-test-report.md`

## 総合結果

| # | チェック項目 | 結果 |
|---|------------|------|
| 1 | ... | ✅ PASS / ❌ FAIL |

## 詳細

### チェック1: 項目名

- 操作内容
- 確認した挙動
- **結果**: ✅ PASS

![スクリーンショット](page-XXXX.png)

---
```

#### .gitignore への追加

`.playwright-mcp/` はローカルの作業ファイルのため `.gitignore` に追加する。
レポート markdown と PNG は `docs/test-reports/` に移してから git 管理する。

```
# Playwright MCP raw output（スナップショット・ログ・一時PNG）
.playwright-mcp/
```

---

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] PRDの受け入れ条件を満たしているか
- [ ] エッジケース（空配列・null・境界値）が考慮されているか
- [ ] 税計算・価格計算に誤りがないか（金額ロジックは特に丁寧に確認）

**可読性**:
- [ ] 命名が `docs/glossary.md` の用語に従っているか
- [ ] コメントが「なぜ」を説明しているか

**保守性**:
- [ ] サービスレイヤーとUIレイヤーが分離されているか
- [ ] 重複コードがないか

**セキュリティ**:
- [ ] API入力に Zod バリデーションがあるか
- [ ] 機密情報がハードコードされていないか

**データ整合性**:
- [ ] 複数テーブルを更新する処理にトランザクションが使われているか
- [ ] 注文確定後に単価・税率が変更されない設計になっているか

### レビューコメントの書き方

**優先度を明示する**:
- `[必須]`: マージブロッカー。修正しないとマージ不可
- `[推奨]`: できれば直してほしい
- `[提案]`: アイデア。対応しなくてもOK
- `[質問]`: 理解のための確認

```markdown
[必須] 入金登録と Invoice.status 更新が別トランザクションになっています。
入金登録が成功して status 更新が失敗すると不整合になるため、
$transaction でまとめてください。

[推奨] resolveUnitPrice の第3引数 manualPrice は
undefined と 0 を区別する必要があります。
0円という単価も有効なため、`manualPrice !== undefined` で判定してください。
```

---

## 品質チェックリスト

実装完了前に確認:

### コード品質
- [ ] 型定義が適切で `any` を使っていない
- [ ] 関数が50行以内
- [ ] マジックナンバーがない
- [ ] コメントが「なぜ」を説明している

### ビジネスロジック
- [ ] 税計算に端数処理（切り捨て）が正しく実装されている
- [ ] 価格優先順位（手動 > 顧客別 > 標準）が正しく実装されている
- [ ] 注文確定時の価格スナップショットが保存されている
- [ ] 入金ステータスの自動計算が正しい

### セキュリティ
- [ ] API入力に Zod バリデーションがある
- [ ] 機密情報がハードコードされていない
- [ ] SQL は Prisma 経由（Raw SQL を使う場合はレビュー必須）
- [ ] OWNER 限定操作（請求書キャンセル・設定変更等）に `requireRole('OWNER')` がある
- [ ] 認証が必要なページ・APIに未認証アクセスへのリダイレクト/401が実装されている
- [ ] PDF ファイルは `private/pdfs/` に保存し `public/` に置いていない

### データ整合性
- [ ] 複数テーブル更新は `$transaction` を使用
- [ ] 採番ロジックが並列実行で重複しない（DB レベルの排他制御を確認）

### テスト
- [ ] サービスロジックのユニットテストがある
- [ ] `npm run test` がパスする
- [ ] `npm run type-check` がパスする
- [ ] `npm run lint` がパスする

---

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test

  e2e:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx prisma migrate deploy
      - run: npx prisma db seed
      - run: npm run test:e2e
    env:
      DATABASE_URL: "file:./prisma/bentosales-test.db"
      AUTH_SECRET: "ci-test-secret-do-not-use-in-production"
      AUTH_URL: "http://localhost:3000"
      TEST_OWNER_PASSWORD: ${{ secrets.TEST_OWNER_PASSWORD }}
```

### マージ条件

`main` へのマージ前に以下を全て通過すること:
1. `npm run type-check` パス
2. `npm run lint` パス
3. `npm run test` パス（カバレッジ90%以上）
4. `npm run test:e2e` パス（主要フロー）
