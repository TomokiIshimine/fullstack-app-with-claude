# 機能一覧

**作成日:** 2025-10-28
**バージョン:** 1.0
**対象システム:** TODO アプリケーション

---

## 1. 概要

本ドキュメントでは、TODO アプリケーションに実装されている全機能を一覧化します。

**関連ドキュメント:**
- [システム構成設計書](./01_system-architecture.md) - アーキテクチャ、技術スタック
- [データベース設計書](./04_database-design.md) - データベーススキーマ、ER図

---

## 2. 機能マップ

```mermaid
graph TB
    System["TODO アプリケーション"]

    System --> Auth["認証機能"]
    System --> TodoMgmt["TODO管理機能"]
    System --> Common["共通機能"]

    Auth --> Login["ログイン"]
    Auth --> Logout["ログアウト"]
    Auth --> TokenRefresh["トークン自動更新"]

    TodoMgmt --> Create["TODO作成"]
    TodoMgmt --> Read["TODO閲覧"]
    TodoMgmt --> Update["TODO編集"]
    TodoMgmt --> Delete["TODO削除"]
    TodoMgmt --> Toggle["完了/未完了切替"]
    TodoMgmt --> Filter["フィルタリング"]
    TodoMgmt --> Sort["ソート"]

    Filter --> FilterAll["全件表示"]
    Filter --> FilterActive["未完了のみ"]
    Filter --> FilterCompleted["完了のみ"]

    Sort --> SortAsc["期限昇順"]
    Sort --> SortDesc["期限降順"]

    Common --> Logging["ロギング"]
    Common --> ErrorHandle["エラーハンドリング"]
    Common --> Validation["バリデーション"]
    Common --> Security["セキュリティ"]

    style System fill:#e1f5ff
    style Auth fill:#fff4e6
    style TodoMgmt fill:#e8f5e9
    style Common fill:#f3e5f5
```

---

## 3. 機能詳細

### 3.1 認証機能

| 機能 | エンドポイント | 実装箇所 | 主な仕様 |
|------|--------------|---------|---------|
| **ログイン** | `POST /api/auth/login` | FE: `LoginPage.tsx`<br/>BE: `auth_routes.py` | - メール/パスワード認証<br/>- httpOnly Cookie (access_token, refresh_token)<br/>- bcrypt パスワードハッシュ化 |
| **ログアウト** | `POST /api/auth/logout` | FE: `TodoListPage.tsx`<br/>BE: `auth_routes.py` | - リフレッシュトークン無効化<br/>- Cookie クリア |
| **トークン更新** | `POST /api/auth/refresh` | FE: `AuthContext.tsx`<br/>BE: `auth_routes.py` | - 自動トークンリフレッシュ<br/>- トークンローテーション |

---

### 3.2 TODO管理機能

| 機能 | エンドポイント | 実装箇所 | 主な仕様 |
|------|--------------|---------|---------|
| **一覧取得** | `GET /api/todos` | FE: `useTodos.ts`<br/>BE: `todo_routes.py` | - クエリパラメータ: `status=all\|active\|completed`<br/>- 認証必須 (自分のTODOのみ)<br/>- FEでソート (期限昇順/降順) |
| **作成** | `POST /api/todos` | FE: `TodoForm.tsx`<br/>BE: `todo_routes.py` | - バリデーション: title必須(1-120文字), detail(最大1000文字), due_date(今日以降)<br/>- Pydanticによる検証 |
| **編集** | `PATCH /api/todos/{id}` | FE: `TodoForm.tsx`<br/>BE: `todo_routes.py` | - 作成と同じバリデーション<br/>- 他ユーザーのTODO編集不可 |
| **削除** | `DELETE /api/todos/{id}` | FE: `TodoList.tsx`<br/>BE: `todo_routes.py` | - レスポンス: 204 No Content<br/>- 他ユーザーのTODO削除不可 |
| **完了トグル** | `PATCH /api/todos/{id}/complete` | FE: `TodoList.tsx`<br/>BE: `todo_routes.py` | - リクエスト: `{is_completed: boolean}`<br/>- チェックボックスで操作 |
| **フィルタリング** | `GET /api/todos?status=...` | FE: `TodoFilterToggle.tsx`<br/>BE: `todo_routes.py` | - オプション: すべて/未完了/完了<br/>- 件数表示付き |
| **ソート** | - (クライアント側) | FE: `useTodos.ts` | - 期限日で昇順/降順<br/>- 期限未設定は末尾 |

---

### 3.3 共通機能

| 機能 | 実装箇所 | 主な仕様 |
|------|---------|---------|
| **ロギング** | BE: `logger.py`<br/>FE: `lib/logger.ts` | - リクエストトレーシング (UUID)<br/>- センシティブデータマスキング<br/>- 環境別ログレベル設定<br/>- 詳細は [システム構成設計書](./01_system-architecture.md) セクション6参照 |
| **エラーハンドリング** | BE: `main.py`<br/>FE: `ErrorBoundary.tsx` | **バックエンド:** HTTP例外の統一処理 (400/401/403/404/500)<br/>**フロントエンド:** React Error Boundary、フォールバックUI |
| **バリデーション** | BE: `schemas/`<br/>FE: `hooks/useTodoForm.ts` | **バックエンド:** Pydantic による厳格な入力検証<br/>**フロントエンド:** リアルタイムバリデーション、HTML5属性 |
| **セキュリティ** | BE: `utils/`, `auth_routes.py`<br/>FE: `AuthContext.tsx` | - JWT認証 (httpOnly Cookie)<br/>- bcryptハッシュ化<br/>- トークンローテーション<br/>- 詳細は [認証・認可設計書](./02_authentication-authorization.md) 参照 |

---

## 4. 機能マトリクス

### 4.1 実装状況

| 機能カテゴリ | 機能名 | バックエンド | フロントエンド | テスト |
|------------|-------|------------|-------------|-------|
| 認証 | ログイン | ✓ | ✓ | BE: ✓ |
| 認証 | ログアウト | ✓ | ✓ | BE: ✓ |
| 認証 | トークン自動更新 | ✓ | ✓ | BE: ✓ |
| TODO管理 | TODO一覧取得 | ✓ | ✓ | BE: ✓, FE: API層 |
| TODO管理 | TODO作成 | ✓ | ✓ | BE: ✓, FE: API層 |
| TODO管理 | TODO編集 | ✓ | ✓ | BE: ✓, FE: API層 |
| TODO管理 | TODO削除 | ✓ | ✓ | BE: ✓, FE: API層 |
| TODO管理 | 完了/未完了切替 | ✓ | ✓ | BE: ✓, FE: API層 |
| TODO管理 | フィルタリング | ✓ | ✓ | BE: ✓, FE: ✓ |
| TODO管理 | ソート | - | ✓ | FE: ✓ |
| 共通 | ロギング | ✓ | ✓ | - |
| 共通 | エラーハンドリング | ✓ | ✓ | BE: ✓ |
| 共通 | バリデーション | ✓ | ✓ | BE: ✓, FE: ✓ |
| 共通 | セキュリティ | ✓ | ✓ | BE: ✓ |

**凡例:**
- BE: バックエンドテスト（pytest）
- FE: フロントエンドテスト（Vitest）
- FE「API層」: API関数のユニットテストのみ実装、コンポーネント・フックのテストなし
- FE「✓」: ユーティリティ層またはバリデーション層のテストが実装済み

### 4.2 共通機能詳細

| 機能 | 実装箇所 | 詳細 |
|------|---------|------|
| **レート制限** | BE: `limiter.py`<br/>BE: `routes/auth_routes.py` | - Flask-Limiter + Redis による実装<br/>- 認証エンドポイントに制限適用<br/>  - ログイン: 10req/分<br/>  - トークン更新: 30req/分<br/>  - ログアウト: 20req/分<br/>- 429エラーレスポンス |

---

## 5. API エンドポイント一覧

### 5.1 システム監視

| 機能 | エンドポイント | 実装箇所 | 詳細 |
|------|--------------|---------|------|
| **ヘルスチェック** | `GET /health` | FE: なし<br/>BE: `health.py` | アプリケーションとデータベースの状態確認。200 OK（正常）または 503 Service Unavailable（異常）を返す |

### 5.2 認証 API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| POST | `/api/auth/login` | 不要 | ログイン |
| POST | `/api/auth/logout` | 不要 | ログアウト |
| POST | `/api/auth/refresh` | 不要 | トークン更新 |

### 5.3 TODO API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/api/todos` | 必要 | TODO一覧取得 |
| POST | `/api/todos` | 必要 | TODO作成 |
| PATCH | `/api/todos/{id}` | 必要 | TODO更新 |
| DELETE | `/api/todos/{id}` | 必要 | TODO削除 |
| PATCH | `/api/todos/{id}/complete` | 必要 | 完了状態トグル |

**認証方法:** Cookie ベース (httpOnly Cookie に JWT トークンを含む)

---

## 6. 画面一覧

### 6.1 画面構成

| 画面名 | パス | 認証 | 説明 | ファイル |
|-------|------|------|------|---------|
| ログイン画面 | `/login` | 不要 | ユーザー認証 | `LoginPage.tsx` |
| TODOリスト画面 | `/todos` | 必要 | TODO管理メイン画面 | `TodoListPage.tsx` |

### 6.2 画面遷移図

```mermaid
stateDiagram-v2
    [*] --> Login: アプリ起動
    Login --> TodoList: ログイン成功
    TodoList --> Login: ログアウト
    TodoList --> TodoList: TODO操作
```

---

## 7. 関連ドキュメント

- [認証・認可設計書](./02_authentication-authorization.md) - 認証フロー、トークン仕様、セキュリティ対策
- [システム構成設計書](./01_system-architecture.md) - アーキテクチャ、技術スタック、開発環境
- [データベース設計書](./04_database-design.md) - データベーススキーマ、ER図、テーブル定義
- [バックエンドガイド](../backend/CLAUDE.md) - バックエンド実装ガイド
- [フロントエンドガイド](../frontend/CLAUDE.md) - フロントエンド実装ガイド

---

**END OF DOCUMENT**
