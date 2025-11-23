# E2Eテスト一覧

**作成日:** 2025-10-30
**最終更新:** 2025-11-23
**バージョン:** 1.1
**対象システム:** フルスタックWebアプリケーション

---

## 1. はじめに

### 1.1 本ドキュメントの目的

本ドキュメントは、フルスタックWebアプリケーションのE2E（End-to-End）テストシナリオを一覧化します。ユーザーの実際の操作フローを再現し、アプリケーション全体の動作を検証するテストケースを定義します。

### 1.2 対象読者

- QAエンジニア
- 開発者全般（フロントエンド、バックエンド）
- テックリード、アーキテクト

**関連ドキュメント:**
- [テスト戦略書](./06_testing-strategy.md) - テストレベル、テストピラミッド
- [機能一覧](./03_feature-list.md) - テスト対象機能
- [システム構成設計書](./01_system-architecture.md) - システムアーキテクチャ

---

> ⚠️ **重要: このドキュメントは計画ドキュメントです**
>
> このドキュメントは、将来のE2Eテスト実装のための**計画・設計書**です。
> **現時点ではE2Eテストは実装されていません。**
>
> **現在の状態:**
> - ✅ ユニットテスト (Vitest, pytest) - 実装済み
> - ✅ 統合テスト (pytest for API routes) - 実装済み
> - ❌ E2Eテスト (Playwright) - **未実装**
>
> **未実装の詳細:**
> - Playwrightはインストールされていません
> - E2Eテストファイル (`frontend/e2e/`) は存在しません
> - `test:e2e` スクリプトは定義されていません
> - CI/CDパイプラインでE2Eテストは実行されていません
>
> **現在の手動テスト方法:**
> - MCP Playwrightツールを使用した手動ブラウザテスト ([CLAUDE.md - Manual Testing](../CLAUDE.md#manual-testing-and-browser-automation) を参照)
> - ローカル環境での手動動作確認

---

## 2. E2Eテスト概要

### 2.1 E2Eテストの目的

E2Eテストは、アプリケーション全体（フロントエンド + バックエンド + データベース）を統合的にテストし、実際のユーザー体験を検証します。

**主な目的:**
- ユーザーの実際の操作フローが正しく動作することを確認
- システム全体の統合動作を検証
- クリティカルなビジネスフローが壊れていないことを保証
- リグレッション検知（既存機能の破壊を防止）

### 2.2 テストツール

| ツール | 用途 | 実装状況 |
|-------|------|---------|
| **Playwright** | ブラウザ自動化 | 未実装 |
| **MCP Playwright** | Claude Code統合 | 利用可能 |

### 2.3 テスト実行タイミング

| タイミング | 説明 |
|-----------|------|
| **プルリクエスト作成時** | クリティカルパステストのみ実行 |
| **mainブランチマージ前** | 全E2Eテストを実行 |
| **リリース前** | 全E2Eテストを実行 + 手動スモークテスト |
| **ローカル開発** | 影響範囲のテストを手動実行 |

---

## 3. テスト環境

### 3.1 環境構成

**テスト実行環境:**
```
ブラウザ（Playwright）
    ↓ HTTP
フロントエンド（React + Vite）
    ↓ REST API
バックエンド（Flask）
    ↓ SQL
データベース（MySQL）
```

**前提条件:**
- Docker Composeでフルスタックが起動していること
- テスト用ユーザーが事前に作成されていること
- データベースが初期状態であること

### 3.2 テストデータ

**テストユーザー:**
| ユーザー | メールアドレス | パスワード | 用途 |
|---------|--------------|----------|------|
| User A | `e2e-user-a@example.com` | `TestPassword123` | 基本フローテスト |
| User B | `e2e-user-b@example.com` | `TestPassword123` | クロスユーザーセキュリティテスト |

**テストデータのクリーンアップ:**
- 各テストケース実行前にテストデータを全削除
- テスト実行後もデータベースをクリーンアップ

---

## 4. E2Eテストシナリオ一覧

### 4.1 認証フロー

#### E2E-001: ログイン成功フロー

**優先度:** ★★★（クリティカル）
**実装状況:** 未実装

**前提条件:**
- テストユーザー（User A）が登録済み

**テストステップ:**
1. ログイン画面（`/login`）にアクセス
2. メールアドレス: `e2e-user-a@example.com` を入力
3. パスワード: `TestPassword123` を入力
4. 「ログイン」ボタンをクリック

**期待結果:**
- ホーム画面（`/`）にリダイレクトされる
- ヘッダーにログアウトボタンが表示される
- 画面上部に「ようこそ！」または類似のメッセージが表示される

---

#### E2E-002: ログイン失敗（誤ったパスワード）

**優先度:** ★★☆（重要）
**実装状況:** 未実装

**前提条件:**
- テストユーザー（User A）が登録済み

**テストステップ:**
1. ログイン画面（`/login`）にアクセス
2. メールアドレス: `e2e-user-a@example.com` を入力
3. パスワード: `WrongPassword` を入力
4. 「ログイン」ボタンをクリック

**期待結果:**
- ログイン画面に留まる
- エラーメッセージ「メールアドレスまたはパスワードが正しくありません」が表示される
- 入力フィールドがクリアされない（再入力が容易）

---

#### E2E-003: ログイン失敗（存在しないユーザー）

**優先度:** ★★☆（重要）
**実装状況:** 未実装

**テストステップ:**
1. ログイン画面（`/login`）にアクセス
2. メールアドレス: `nonexistent@example.com` を入力
3. パスワード: `AnyPassword123` を入力
4. 「ログイン」ボタンをクリック

**期待結果:**
- ログイン画面に留まる
- エラーメッセージ「メールアドレスまたはパスワードが正しくありません」が表示される
- セキュリティ上、存在しないユーザーかどうかは明示しない

---

#### E2E-004: ログアウトフロー

**優先度:** ★★★（クリティカル）
**実装状況:** 未実装

**前提条件:**
- User Aでログイン済み

**テストステップ:**
1. ホーム画面（`/`）にアクセス
2. ヘッダーの「ログアウト」ボタンをクリック

**期待結果:**
- ログイン画面（`/login`）にリダイレクトされる
- 再度 `/` にアクセスしようとすると、ログイン画面にリダイレクトされる
- トークンがクリアされている（認証が無効化）

---

#### E2E-005: 未認証時のリダイレクト

**優先度:** ★★★（クリティカル）
**実装状況:** 未実装

**前提条件:**
- ログインしていない状態

**テストステップ:**
1. ブラウザを起動
2. 保護されたページ（`/settings`など）に直接アクセス

**期待結果:**
- ログイン画面（`/login`）にリダイレクトされる
- 保護されたコンテンツは表示されない

---

### 4.2 セキュリティ

#### E2E-020: トークン有効期限切れ後の動作

**優先度:** ★★☆（重要）
**実装状況:** 未実装

**前提条件:**
- User Aでログイン済み

**テストステップ:**
1. User Aでログイン
2. トークンの有効期限が切れるまで待機（または手動でトークンを無効化）
3. 保護されたAPIエンドポイントを呼び出す

**期待結果:**
- 自動的にトークンがリフレッシュされる、または
- ログイン画面にリダイレクトされる
- エラーメッセージが表示される

**注:** トークンリフレッシュの実装状況に応じて期待結果が異なる

---

### 4.3 エラーハンドリング

#### E2E-030: ネットワークエラー時の動作

**優先度:** ★☆☆（通常）
**実装状況:** 未実装

**前提条件:**
- User Aでログイン済み

**テストステップ:**
1. アプリケーションのページにアクセス
2. ネットワークをオフラインに設定（Playwrightの機能を使用）
3. APIを呼び出す操作を実行

**期待結果:**
- エラーメッセージ「ネットワークエラーが発生しました」が表示される
- ユーザーに再試行を促すメッセージが表示される

---

#### E2E-031: サーバーエラー時の動作

**優先度:** ★☆☆（通常）
**実装状況:** 未実装

**前提条件:**
- User Aでログイン済み

**テストステップ:**
1. アプリケーションのページにアクセス
2. バックエンドサーバーを停止（またはモックで500エラーを返す）
3. APIを呼び出す操作を実行

**期待結果:**
- エラーメッセージ「サーバーエラーが発生しました」が表示される
- アプリケーションがクラッシュしない

---

## 5. テスト優先度マトリクス

### 5.1 優先度別テストケース数

| 優先度 | テストケース数 | 説明 |
|-------|-------------|------|
| ★★★（クリティカル） | 5 | 必須実行、リリースブロッカー |
| ★★☆（重要） | 1 | 重要機能、プルリクエスト時に実行 |
| ★☆☆（通常） | 2 | 定期的に実行、リリース前に実行 |

### 5.2 機能別テストケース数

| 機能カテゴリ | テストケース数 |
|------------|-------------|
| 認証フロー | 5 |
| セキュリティ | 1 |
| エラーハンドリング | 2 |
| **合計** | **8** |

---

## 6. テスト実装ガイド

### 6.1 テストファイル構成（推奨）

```
frontend/
  e2e/
    tests/
      auth/
        login.spec.ts              # E2E-001 ~ E2E-005
      security/
        token-expiry.spec.ts       # E2E-020
      errors/
        error-handling.spec.ts     # E2E-030 ~ E2E-031
    fixtures/
      auth.ts                      # 認証ヘルパー関数
    playwright.config.ts
```

### 6.2 実装例（Playwright）

#### ログインヘルパー関数

```typescript
// e2e/fixtures/auth.ts
import { Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}
```

#### テストケース例

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { login } from '../../fixtures/auth';

test('E2E-001: ログイン成功フロー', async ({ page }) => {
  await login(page, 'e2e-user-a@example.com', 'TestPassword123');

  // ホーム画面にリダイレクト
  await expect(page).toHaveURL('/');

  // ログアウトボタンが表示される
  await expect(page.locator('button:has-text("ログアウト")')).toBeVisible();
});

test('E2E-002: ログイン失敗（誤ったパスワード）', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'e2e-user-a@example.com');
  await page.fill('input[type="password"]', 'WrongPassword');
  await page.click('button[type="submit"]');

  // エラーメッセージが表示される
  await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible();

  // ログイン画面に留まる
  await expect(page).toHaveURL('/login');
});
```

### 6.3 テスト実行コマンド

**すべてのE2Eテストを実行:**
```bash
pnpm --dir frontend run test:e2e
```

**特定のテストファイルを実行:**
```bash
pnpm --dir frontend run test:e2e -- auth/login.spec.ts
```

**ヘッドレスモードで実行:**
```bash
pnpm --dir frontend run test:e2e:headless
```

**デバッグモード（ブラウザを表示）:**
```bash
pnpm --dir frontend run test:e2e:debug
```

---

## 7. テストデータ管理

### 7.1 テストユーザーのセットアップ

**セットアップスクリプト:**
```bash
# テストユーザーを作成
make db-create-user EMAIL=e2e-user-a@example.com PASSWORD=TestPassword123
make db-create-user EMAIL=e2e-user-b@example.com PASSWORD=TestPassword123
```

### 7.2 テストデータのクリーンアップ

**各テスト実行前:**
- データベースをリセットするか、テストユーザーのデータを削除
- テスト実行後もクリーンアップを実施し、テストの独立性を確保

---

## 8. CI/CD統合

### 8.1 GitHub Actions設定例

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start Docker Compose
        run: make up

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 1; done'

      - name: Run E2E tests
        run: pnpm --dir frontend run test:e2e:ci

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

## 9. 今後の拡張予定

### 9.1 未実装のテストシナリオ

今後新機能が追加された際に、対応するE2Eテストシナリオを追加予定。

### 9.2 パフォーマンステスト

| テスト項目 | 目標値 |
|-----------|-------|
| **ページ読み込み時間** | 3秒以内 |
| **API応答時間** | 1秒以内 |

---

## 10. 関連ドキュメント

- [テスト戦略書](./06_testing-strategy.md) - テストピラミッド、テストレベル
- [機能一覧](./03_feature-list.md) - 実装済み機能一覧
- [システム構成設計書](./01_system-architecture.md) - システムアーキテクチャ
- [認証・認可設計書](./02_authentication-authorization.md) - 認証フロー、セキュリティ

---

**END OF DOCUMENT**
