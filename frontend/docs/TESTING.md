# フロントエンドテストガイド

このドキュメントでは、フロントエンドプロジェクトのテストに関する情報を提供します。

## 目次

- [テスト環境](#テスト環境)
- [テスト実行方法](#テスト実行方法)
- [テストの書き方](#テストの書き方)
- [モック方法](#モック方法)
- [既存テストの参考例](#既存テストの参考例)
- [カバレッジ目標](#カバレッジ目標)

---

## テスト環境

### 使用ツール

- **テストランナー**: [Vitest](https://vitest.dev/) v3.2.4
- **テストライブラリ**: なし（DOM環境なし）
- **カバレッジ**: @vitest/coverage-v8

### 制約事項

**DOM環境の制約**

現在の環境（WSL2 + Docker）では、jsdomやhappy-domを使用したDOM環境でテストがハングする問題があります。そのため、**ロジックテストのみ**に焦点を当てています。

✅ **テスト可能**:

- ユーティリティ関数（dateFormat, todoFilters）
- バリデーション（todoValidation）
- APIクライアント（todos API）
- 純粋関数・ヘルパー関数

❌ **テスト困難**:

- Reactコンポーネント
- カスタムフック（useEffect, useState使用）
- DOM操作を伴うコード

---

## テスト実行方法

### 基本コマンド

```bash
# 全テスト実行
pnpm test

# カバレッジ付きで実行（推奨）
pnpm test:coverage

# ウォッチモード（開発時）
pnpm test:watch
```

### カバレッジレポート

カバレッジレポートは以下の形式で出力されます：

- **コンソール**: テスト実行時に表示
- **HTML**: `coverage/index.html`（ブラウザで詳細確認）
- **JSON**: `coverage/coverage-final.json`（CI/CD用）

```bash
# HTML レポートを開く
open coverage/index.html
```

---

## テストの書き方

### テストファイルの配置

テストファイルはテスト対象と**同じディレクトリ**に配置します。

```
src/
  lib/
    utils/
      dateFormat.ts          # 実装
      dateFormat.test.ts     # テスト
    api/
      todos.ts               # 実装
      todos.test.ts          # テスト
```

### ファイル命名規則

- `*.test.ts` - ロジックテスト
- `*.test.tsx` - コンポーネントテスト（将来対応）

### 基本的なテスト構造

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myModule', () => {
  describe('myFunction', () => {
    it('正常系の説明', () => {
      const result = myFunction(input)
      expect(result).toBe(expected)
    })

    it('異常系の説明', () => {
      expect(() => myFunction(invalidInput)).toThrow()
    })
  })
})
```

### テストの構造化

- **describe**: モジュール・関数単位でグループ化
- **it**: 各テストケース（1つの振る舞い）
- **expect**: アサーション（期待値の検証）

---

## モック方法

### 1. 日付のモック

時間に依存するテストは `vi.setSystemTime()` を使用します。

```typescript
import { beforeEach, afterEach, vi } from 'vitest'

describe('dateRelatedFunction', () => {
  beforeEach(() => {
    // 固定の日時にセット
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('過去日をチェックする', () => {
    // 2024-06-15が今日として扱われる
    expect(isPastDate('2024-06-14')).toBe(true)
    expect(isPastDate('2024-06-15')).toBe(false)
  })
})
```

### 2. fetch API のモック

APIクライアントのテストでは `global.fetch` をモックします。

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('API Client', () => {
  let originalFetch: typeof global.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('データを取得する', async () => {
    // レスポンスをモック
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: 'test' }),
    })

    const result = await fetchData()

    // fetch が正しく呼ばれたか検証
    expect(mockFetch).toHaveBeenCalledWith('/api/endpoint', {
      headers: { Accept: 'application/json' },
    })
    expect(result).toEqual({ data: 'test' })
  })

  it('エラーを処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: 'Server error' } }),
    })

    await expect(fetchData()).rejects.toThrow('Server error')
  })
})
```

### 3. カスタム関数のモック

```typescript
import { vi } from 'vitest'

// モック関数を作成
const mockCallback = vi.fn()

// 返り値を設定
mockCallback.mockReturnValue(42)
mockCallback.mockReturnValueOnce(1) // 1回だけ

// 非同期の返り値
mockCallback.mockResolvedValue({ data: 'test' })

// 呼び出しを検証
expect(mockCallback).toHaveBeenCalled()
expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockCallback).toHaveBeenCalledTimes(1)
```

---

## 既存テストの参考例

プロジェクト内の既存テストを参考にしてください。

### 1. 日付関連テスト

**ファイル**: `src/lib/utils/dateFormat.test.ts`

- `formatDate()` - 日付フォーマット
- `isValidDate()` - 日付バリデーション
- `isPastDate()` - 過去日チェック（日付モック使用）

**学べること**:

- 日付モックの使い方
- エッジケースの処理
- beforeEach/afterEach の使用

### 2. 配列操作テスト

**ファイル**: `src/lib/utils/todoFilters.test.ts`

- `filterByStatus()` - 配列フィルタリング
- `sortTodos()` - 複雑なソート処理

**学べること**:

- 配列操作のテスト
- 複雑なロジックの分割
- 不変性の検証（元配列が変更されないか）

### 3. バリデーションテスト

**ファイル**: `src/lib/validation/todoValidation.test.ts`

- `validateTodoForm()` - フォームバリデーション

**学べること**:

- 複数フィールドのバリデーション
- エラーメッセージの検証
- 複数エラーの同時検証

### 4. API クライアントテスト

**ファイル**: `src/lib/api/todos.test.ts`

- CRUD 操作（getTodos, createTodo, updateTodo, deleteTodo）
- エラーハンドリング（ApiError）
- データマッピング（snake_case ⇔ camelCase）

**学べること**:

- fetch モックの使い方
- HTTP エラーのテスト
- データ変換のテスト

---

## カバレッジ目標

### 現在の状況

| ファイル分類         | カバレッジ | 状態       |
| -------------------- | ---------- | ---------- |
| lib/api/todos.ts     | 98.31%     | ✅         |
| lib/utils/\*.ts      | 100%       | ✅         |
| lib/validation/\*.ts | 100%       | ✅         |
| constants/\*.ts      | 100%       | ✅         |
| components/\*.tsx    | 0%         | ❌ DOM制約 |
| hooks/\*.ts          | 0%         | ❌ DOM制約 |
| pages/\*.tsx         | 0%         | ❌ DOM制約 |

### 目標

- **ロジック層**: 90%以上（現在達成済み）
- **全体**: DOM環境の問題解決後、60%以上を目標

---

## トラブルシューティング

### テストがハングする

**症状**: テストが終了せず、タイムアウトする

**原因**: DOM環境（jsdom/happy-dom）の初期化問題

**対処法**:

1. `vitest.config.ts` で `test.environment` を設定しない（Node環境）
2. DOM操作が必要なコードはテスト対象から除外
3. ロジックを純粋関数として切り出してテスト

### モックが効かない

**症状**: `mockResolvedValueOnce` が期待通りに動作しない

**対処法**:

- 複数回呼び出す場合は `mockResolvedValue` を使用
- `beforeEach` でモックをリセット（`vi.restoreAllMocks()`）
- `afterEach` で元の状態に戻す

### カバレッジレポートが生成されない

**確認事項**:

```bash
# @vitest/coverage-v8 がインストールされているか確認
pnpm list @vitest/coverage-v8

# なければインストール
pnpm add -D @vitest/coverage-v8
```

---

## 参考リンク

- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Vitest API リファレンス](https://vitest.dev/api/)
- [Vitest モック機能](https://vitest.dev/guide/mocking.html)

---

## 今後の課題

1. **E2Eテスト環境の構築** - Playwright MCPの活用
2. **DOM環境問題の解決** - jsdom/happy-dom のハング対策
3. **CI/CD統合** - GitHub Actions での自動テスト
4. **カスタムフックテスト** - React Testing Library の導入検討
