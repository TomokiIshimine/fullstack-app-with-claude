# テスト戦略書

**作成日:** 2025-10-28
**バージョン:** 1.0
**対象システム:** TODO アプリケーション

---

## 1. はじめに

### 1.1 本ドキュメントの目的

本ドキュメントは、TODOアプリケーションのテスト戦略を定めます。テストレベル、カバレッジ目標、テストデータ管理方針を明確にし、品質保証の基準を提供します。

### 1.2 対象読者

- 開発者全般（フロントエンド、バックエンド）
- QAエンジニア
- テックリード、アーキテクト

**関連ドキュメント:**
- [システム構成設計書](./system-architecture.md) - テスト環境、技術スタック
- [API設計ガイド](./api-design-guide.md) - APIテスト観点
- [機能一覧](./feature-list.md) - テスト対象機能

---

## 2. テスト戦略概要

### 2.1 基本方針

| 方針 | 説明 |
|------|------|
| **テスト駆動開発（推奨）** | 可能な限りテストファーストで開発 |
| **テストピラミッド準拠** | ユニットテスト（多） > 統合テスト（中） > E2Eテスト（少） |
| **自動化優先** | 手動テストは最小限、CI/CDで自動実行 |
| **高速なフィードバック** | ユニットテストは数秒、統合テストは数分以内 |
| **独立性** | テストは互いに独立し、実行順序に依存しない |

### 2.2 テストレベル

```mermaid
graph TB
    subgraph Pyramid["テストピラミッド"]
        E2E["E2Eテスト (少)<br/>Playwright<br/>ブラウザ自動化"]
        Integration["統合テスト (中)<br/>API Tests (pytest)<br/>Component Tests (Vitest)"]
        Unit["ユニットテスト (多)<br/>Service/Repository (pytest)<br/>Components/Hooks (Vitest)<br/>Utils/Helpers"]

        E2E
        Integration
        Unit
    end

    style E2E fill:#ffcccc,stroke:#333,stroke-width:2px
    style Integration fill:#ffffcc,stroke:#333,stroke-width:2px
    style Unit fill:#ccffcc,stroke:#333,stroke-width:2px
    style Pyramid fill:#f9f9f9,stroke:#666,stroke-width:3px
```

---

## 3. ユニットテスト

### 3.1 対象と目的

**対象:**
- **バックエンド**: Serviceレイヤー、Repositoryレイヤー、ユーティリティ関数
- **フロントエンド**: カスタムフック、ユーティリティ関数、個別コンポーネント

**目的:**
- ロジックの正確性を検証
- 境界値、エラーケースを網羅
- リファクタリングの安全性確保

### 3.2 ツール

| プラットフォーム | ツール | 説明 |
|---------------|-------|------|
| **バックエンド** | pytest | Python標準のテストフレームワーク |
| **フロントエンド** | Vitest + Testing Library | React向け高速テストランナー |

### 3.3 カバレッジ目標

| レイヤー | カバレッジ目標 | 重要度 |
|---------|-------------|-------|
| **Serviceレイヤー** | 90%以上 | ★★★ |
| **Repositoryレイヤー** | 80%以上 | ★★★ |
| **ユーティリティ** | 100% | ★★★ |
| **Reactコンポーネント** | 70%以上 | ★★☆ |
| **カスタムフック** | 90%以上 | ★★★ |

### 3.4 実装例

#### バックエンド（pytest）

```python
# tests/test_todo_service.py
import pytest
from app.services.todo_service import TodoService

def test_create_todo_success():
    """TODO作成の正常系テスト"""
    service = TodoService()
    todo_data = {
        "title": "買い物",
        "detail": "野菜を買う",
        "due_date": "2025-10-30"
    }
    user_id = 1

    result = service.create_todo(user_id, todo_data)

    assert result["title"] == "買い物"
    assert result["user_id"] == user_id
    assert result["is_completed"] is False

def test_create_todo_with_invalid_date():
    """過去の期限日でエラー"""
    service = TodoService()
    todo_data = {
        "title": "買い物",
        "due_date": "2020-01-01"  # 過去の日付
    }

    with pytest.raises(ValueError, match="期限日は今日以降"):
        service.create_todo(1, todo_data)
```

#### フロントエンド（Vitest + Testing Library）

```typescript
// src/hooks/useTodos.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTodos } from './useTodos';

describe('useTodos', () => {
  it('should fetch todos on mount', async () => {
    const { result } = renderHook(() => useTodos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todos).toHaveLength(3);
  });

  it('should filter todos by status', async () => {
    const { result } = renderHook(() => useTodos());

    result.current.setFilter('active');

    await waitFor(() => {
      expect(result.current.filteredTodos.every(t => !t.is_completed)).toBe(true);
    });
  });
});
```

### 3.5 モック戦略

**バックエンド:**
- データベースアクセス: `pytest-mock` でRepositoryレイヤーをモック
- 外部API: `responses` ライブラリでHTTPレスポンスをモック

**フロントエンド:**
- API呼び出し: `vi.mock()` でfetchをモック
- React Context: テスト用のProviderでラップ

---

## 4. 統合テスト

### 4.1 対象と目的

**対象:**
- **バックエンド**: APIエンドポイント（リクエスト → レスポンス）
- **フロントエンド**: コンポーネント統合（ページレベル）

**目的:**
- レイヤー間の連携を検証
- API仕様の正確性を確認
- ユーザーフロー全体の動作確認

### 4.2 実装例

#### バックエンドAPI統合テスト

```python
# tests/test_todo_api.py
import pytest
from flask import Flask

def test_create_todo_api(client, auth_headers):
    """TODO作成APIの統合テスト"""
    response = client.post(
        '/api/todos',
        json={
            "title": "買い物",
            "detail": "野菜を買う",
            "due_date": "2025-10-30"
        },
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "買い物"
    assert data["is_completed"] is False

def test_create_todo_without_auth(client):
    """認証なしで401エラー"""
    response = client.post(
        '/api/todos',
        json={"title": "買い物"}
    )

    assert response.status_code == 401
    assert "認証が必要" in response.get_json()["message"]
```

#### フロントエンドコンポーネント統合テスト

```typescript
// src/pages/TodoListPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodoListPage } from './TodoListPage';

describe('TodoListPage', () => {
  it('should display todos and allow creating new one', async () => {
    render(<TodoListPage />);

    // 既存TODOが表示される
    await waitFor(() => {
      expect(screen.getByText('買い物')).toBeInTheDocument();
    });

    // 新規TODO作成
    const titleInput = screen.getByPlaceholderText('タイトル');
    fireEvent.change(titleInput, { target: { value: 'レポート提出' } });
    fireEvent.click(screen.getByText('追加'));

    // 作成されたTODOが表示される
    await waitFor(() => {
      expect(screen.getByText('レポート提出')).toBeInTheDocument();
    });
  });
});
```

### 4.3 テストデータ

**バックエンド:**
- テスト用データベース: 各テストで独立したトランザクション
- Fixture: `pytest.fixture` でテストデータを用意

```python
@pytest.fixture
def sample_user(db_session):
    user = User(email="test@example.com", password_hash="...")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def auth_headers(sample_user):
    token = create_access_token(sample_user.id)
    return {"Cookie": f"access_token={token}"}
```

**フロントエンド:**
- MSW (Mock Service Worker): APIレスポンスをモック

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/todos', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, title: '買い物', is_completed: false },
        { id: 2, title: 'レポート', is_completed: true },
      ])
    );
  }),
];
```

---

## 5. E2Eテスト

### 5.1 対象と目的

**対象:**
- ユーザーシナリオ全体（ブラウザ自動化）

**目的:**
- 本番環境に近い環境での動作確認
- クリティカルなユーザーフローの保証

### 5.2 ツール

| ツール | 説明 |
|-------|------|
| **Playwright** | ブラウザ自動化ツール（Chromium, Firefox, WebKit） |

### 5.3 対象シナリオ（最小限）

| シナリオ | 優先度 | 説明 |
|---------|-------|------|
| **ログイン → TODO作成 → ログアウト** | ★★★ | 最も重要なユーザーフロー |
| **TODO編集 → 完了トグル** | ★★☆ | TODO管理の基本操作 |
| **フィルタリング → ソート** | ★☆☆ | 補助的な機能 |

### 5.4 実装例

```typescript
// e2e/todo.spec.ts
import { test, expect } from '@playwright/test';

test('should create and complete a todo', async ({ page }) => {
  // ログイン
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // TODOページに遷移
  await expect(page).toHaveURL(/.*todos/);

  // 新規TODO作成
  await page.fill('input[placeholder="タイトル"]', '買い物');
  await page.fill('textarea[placeholder="詳細"]', '野菜を買う');
  await page.click('button:has-text("追加")');

  // 作成されたTODOが表示される
  await expect(page.locator('text=買い物')).toBeVisible();

  // 完了状態にする
  await page.click('input[type="checkbox"]:near(:text("買い物"))');

  // 完了マークが付く
  await expect(page.locator('.todo-item.completed:has-text("買い物")')).toBeVisible();
});
```

---

## 6. テスト実行環境

### 6.1 ローカル環境

**バックエンド:**
```bash
make test-backend             # すべてのバックエンドテストを実行
poetry -C backend run pytest  # 直接実行
poetry -C backend run pytest --cov  # カバレッジ付き
```

**フロントエンド:**
```bash
make test-frontend            # すべてのフロントエンドテストを実行
pnpm --dir frontend run test  # 直接実行
pnpm --dir frontend run test:coverage  # カバレッジ付き
```

### 6.2 CI/CD環境

**GitHub Actions:**
- プルリクエスト作成時: すべてのテストを自動実行
- mainブランチマージ時: カバレッジレポート生成

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run backend tests
        run: make test-backend

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run frontend tests
        run: make test-frontend
```

---

## 7. カバレッジ目標

### 7.1 全体目標

| カテゴリ | 目標カバレッジ | 現状 |
|---------|-------------|------|
| **バックエンド全体** | 80%以上 | 実装中 |
| **フロントエンド全体** | 70%以上 | 実装中 |

### 7.2 重要度別カバレッジ

| 重要度 | 対象 | 目標 |
|-------|------|------|
| **Critical** | 認証ロジック、データアクセス | 100% |
| **High** | ビジネスロジック（Service層） | 90%以上 |
| **Medium** | UIコンポーネント、バリデーション | 70%以上 |
| **Low** | ユーティリティ、スタイル関連 | 50%以上 |

### 7.3 カバレッジレポート

**バックエンド:**
```bash
poetry -C backend run pytest --cov=app --cov-report=html
# HTMLレポート: backend/htmlcov/index.html
```

**フロントエンド:**
```bash
pnpm --dir frontend run test:coverage
# HTMLレポート: frontend/coverage/index.html
```

---

## 8. テストデータ管理

### 8.1 テストデータ戦略

| 戦略 | 説明 | 使用場面 |
|------|------|---------|
| **Fixture** | 事前定義されたテストデータ | ユニットテスト |
| **Factory** | プログラムで動的生成 | 統合テスト |
| **Seed Data** | データベース初期データ | E2Eテスト |
| **Mock** | 偽のデータ・レスポンス | フロントエンドテスト |

### 8.2 テストデータの原則

**独立性:**
- 各テストは独自のデータを使用
- テスト間でデータを共有しない

**クリーンアップ:**
- バックエンド: トランザクションロールバック
- フロントエンド: テスト後にlocalStorage/sessionStorageをクリア

**現実的なデータ:**
- 実際のユースケースに近いデータ
- 境界値、特殊文字を含むケース

### 8.3 実装例

**バックエンド（Fixture）:**
```python
# tests/conftest.py
@pytest.fixture
def db_session():
    """各テストで独立したトランザクション"""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def sample_todos(db_session, sample_user):
    """サンプルTODOデータ"""
    todos = [
        Todo(user_id=sample_user.id, title="買い物", is_completed=False),
        Todo(user_id=sample_user.id, title="レポート", is_completed=True),
    ]
    db_session.add_all(todos)
    db_session.commit()
    return todos
```

**フロントエンド（MSW）:**
```typescript
// src/mocks/handlers.ts
export const handlers = [
  rest.get('/api/todos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, title: '買い物', is_completed: false },
        { id: 2, title: 'レポート', is_completed: true },
      ])
    );
  }),
];
```

---

## 9. モック・スタブ戦略

### 9.1 モック対象

| レイヤー | モック対象 | 理由 |
|---------|-----------|------|
| **データベース** | Repositoryレイヤー | Serviceロジックのみをテスト |
| **外部API** | HTTP通信 | ネットワークに依存しない |
| **時間** | `datetime.now()` | 時刻に依存しないテスト |
| **ファイルシステム** | ログファイル書き込み | I/Oを避ける |

### 9.2 実装例

**バックエンド（pytest-mock）:**
```python
def test_create_todo_with_mock(mocker):
    """Repositoryをモックしてテスト"""
    mock_repo = mocker.Mock()
    mock_repo.create.return_value = {
        "id": 1,
        "title": "買い物",
        "is_completed": False
    }

    service = TodoService(repository=mock_repo)
    result = service.create_todo(1, {"title": "買い物"})

    assert result["title"] == "買い物"
    mock_repo.create.assert_called_once()
```

**フロントエンド（Vitest）:**
```typescript
// src/hooks/useTodos.test.ts
import { vi } from 'vitest';

vi.mock('../lib/api/todos', () => ({
  fetchTodos: vi.fn(() => Promise.resolve([
    { id: 1, title: '買い物', is_completed: false },
  ])),
}));

test('should fetch todos', async () => {
  const { result } = renderHook(() => useTodos());
  await waitFor(() => expect(result.current.todos).toHaveLength(1));
});
```

---

## 10. テストの保守性

### 10.1 テストコードの品質

**原則:**
- **可読性**: テスト名で何をテストしているか明確にする
- **独立性**: テストの実行順序に依存しない
- **高速性**: ユニットテストは1秒以内、統合テストは数秒以内
- **DRY原則**: 共通のセットアップはFixture/Helperに抽出

### 10.2 良いテストの例

```python
def test_todo_cannot_be_created_with_past_due_date():
    """期限日が過去の場合、TODO作成に失敗する"""
    service = TodoService()
    past_date = "2020-01-01"

    with pytest.raises(ValueError, match="期限日は今日以降"):
        service.create_todo(1, {"title": "買い物", "due_date": past_date})
```

**ポイント:**
- テスト名が日本語で明確
- 1つのテストで1つのケースのみ検証
- エラーメッセージまで検証

### 10.3 避けるべきパターン

**❌ 悪い例:**
```python
def test_todo():
    # 何をテストしているか不明
    service = TodoService()
    result = service.create_todo(1, {"title": "買い物"})
    assert result  # 何を検証しているか不明
```

**✓ 良い例:**
```python
def test_create_todo_returns_todo_with_generated_id():
    """TODO作成時、自動生成されたIDを含むTODOが返される"""
    service = TodoService()
    result = service.create_todo(1, {"title": "買い物"})

    assert isinstance(result["id"], int)
    assert result["id"] > 0
```

---

## 11. 継続的テスト改善

### 11.1 定期レビュー

| タイミング | レビュー内容 |
|-----------|------------|
| **スプリントごと** | カバレッジ確認、テスト追加計画 |
| **リリース前** | E2Eテスト全実行、クリティカルパス確認 |
| **四半期ごと** | テスト戦略見直し、新しいツール検討 |

### 11.2 テスト追加のトリガー

| イベント | アクション |
|---------|-----------|
| **バグ発見** | バグを再現するテストを追加 |
| **新機能追加** | 機能に対するテストを同時に実装 |
| **リファクタリング** | 既存テストが通ることを確認、必要に応じて追加 |

---

## 12. ツール・ライブラリ一覧

### 12.1 バックエンド

| ツール | 用途 |
|-------|------|
| **pytest** | テストフレームワーク |
| **pytest-cov** | カバレッジ測定 |
| **pytest-mock** | モック・スタブ |
| **factory-boy** | テストデータFactory |
| **Faker** | ダミーデータ生成 |

### 12.2 フロントエンド

| ツール | 用途 |
|-------|------|
| **Vitest** | テストランナー |
| **Testing Library** | Reactコンポーネントテスト |
| **MSW** | APIモック |
| **Playwright** | E2Eテスト |

---

## 13. 関連ドキュメント

- [システム構成設計書](./system-architecture.md) - テスト環境、技術スタック
- [API設計ガイド](./api-design-guide.md) - APIテスト観点、エラーケース
- [機能一覧](./feature-list.md) - テスト対象機能一覧
- [開発環境ガイド](./development.md) - テスト実行コマンド、トラブルシューティング

---

**END OF DOCUMENT**
