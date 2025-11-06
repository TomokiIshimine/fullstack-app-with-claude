# API設計ガイド

**作成日:** 2025-10-28
**バージョン:** 1.0
**対象システム:** TODO アプリケーション

---

## 1. はじめに

### 1.1 本ドキュメントの目的

本ドキュメントは、TODOアプリケーションのREST API設計における原則、命名規約、エラーハンドリングの統一方針を定めます。開発者がAPI設計時に参照することで、一貫性のある保守しやすいAPIを構築できます。

### 1.2 対象読者

- バックエンド開発者（APIエンドポイント実装）
- フロントエンド開発者（API呼び出し実装）
- アーキテクト（API設計レビュー）

**関連ドキュメント:**
- [システム構成設計書](./01_system-architecture.md) - 技術スタック、アーキテクチャ
- [認証・認可設計書](./02_authentication-authorization.md) - 認証API詳細
- [機能一覧](./03_feature-list.md) - 実装済みAPIエンドポイント一覧

---

## 2. RESTful API設計原則

### 2.1 基本原則

| 原則 | 説明 | 例 |
|------|------|-----|
| **リソース指向** | URLはリソースを表現し、動詞ではなく名詞を使用 | ✓ `GET /api/todos`<br/>✗ `GET /api/getTodos` |
| **HTTPメソッドの適切な使用** | CRUD操作をHTTPメソッドで表現 | GET=取得、POST=作成、PATCH/PUT=更新、DELETE=削除 |
| **ステートレス** | リクエストごとに必要な情報をすべて含める | JWTトークンをCookieで送信 |
| **階層構造** | リソースの関係性をURLで表現 | `/api/todos/{id}/comments` |
| **冪等性** | GET, PUT, DELETEは冪等（何度実行しても同じ結果） | PUT /api/todos/1 を複数回実行しても同じ状態 |

### 2.2 HTTPメソッドの使い分け

| メソッド | 用途 | 冪等性 | リクエストボディ | レスポンスボディ | 実装例 |
|---------|------|-------|---------------|---------------|-------|
| **GET** | リソース取得 | ✓ | なし | リソースデータ | `GET /api/todos` |
| **POST** | リソース作成 | ✗ | リソースデータ | 作成されたリソース | `POST /api/todos` |
| **PUT** | リソース完全置換 | ✓ | 完全なリソースデータ | 更新されたリソース | (本プロジェクトでは未使用) |
| **PATCH** | リソース部分更新 | △ | 更新フィールドのみ | 更新されたリソース | `PATCH /api/todos/{id}` |
| **DELETE** | リソース削除 | ✓ | なし | なし (204 No Content) | `DELETE /api/todos/{id}` |

**注:** 本プロジェクトではPUTではなくPATCHを使用しています。部分更新が主なユースケースのためです。

---

## 3. エンドポイント命名規約

### 3.1 URL構造

```
https://{domain}/api/{version}/{resource}/{id}/{sub-resource}
```

**例:**
- `https://example.com/api/todos` - TODO一覧取得
- `https://example.com/api/todos/123` - TODO個別取得
- `https://example.com/api/todos/123/complete` - TODO完了操作（アクション）

### 3.2 命名ルール

| 要素 | ルール | 例 |
|------|-------|-----|
| **ベースパス** | `/api` で始める | `/api/todos` |
| **バージョン** | 現在は未使用（将来的に `/api/v1/` 形式を検討） | - |
| **リソース名** | 複数形の名詞、小文字、ハイフン区切り | `todos`, `refresh-tokens` |
| **IDパラメータ** | リソースIDは数値、UUID等 | `/api/todos/123` |
| **クエリパラメータ** | スネークケース（snake_case） | `?status=active&sort_by=due_date` |
| **アクション** | 動詞を使う場合は明示的なサブパス | `/api/todos/{id}/complete` |

### 3.3 実装済みエンドポイント例

| カテゴリ | エンドポイント | 説明 |
|---------|--------------|------|
| **認証** | `POST /api/auth/login` | ログイン（リソース作成） |
| **認証** | `POST /api/auth/logout` | ログアウト（アクション） |
| **認証** | `POST /api/auth/refresh` | トークン更新（アクション） |
| **TODO** | `GET /api/todos` | TODO一覧取得 |
| **TODO** | `POST /api/todos` | TODO作成 |
| **TODO** | `PATCH /api/todos/{id}` | TODO更新 |
| **TODO** | `DELETE /api/todos/{id}` | TODO削除 |
| **TODO** | `PATCH /api/todos/{id}/complete` | 完了状態トグル（特殊な更新） |

---

## 4. リクエスト・レスポンス形式

### 4.1 リクエスト形式

#### JSONボディ
```json
{
  "title": "買い物リスト作成",
  "detail": "スーパーで野菜を買う",
  "due_date": "2025-10-30"
}
```

**ルール:**
- Content-Type: `application/json`
- フィールド名: スネークケース (`due_date`, `is_completed`)
- 日付形式: ISO 8601 (`YYYY-MM-DD` または `YYYY-MM-DDTHH:MM:SSZ`)

#### クエリパラメータ
```
GET /api/todos?status=active&sort_by=due_date&order=asc
```

**ルール:**
- スネークケース
- ブール値: `true` / `false` （小文字）
- 列挙値: 小文字、アンダースコア区切り (`all`, `active`, `completed`)

### 4.2 レスポンス形式

#### 成功レスポンス（リソース取得・作成）
```json
{
  "id": 123,
  "title": "買い物リスト作成",
  "detail": "スーパーで野菜を買う",
  "due_date": "2025-10-30",
  "is_completed": false,
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:00:00Z"
}
```

**注記:** `user_id` はセキュリティ上の理由で、APIレスポンスには含まれません。ユーザーは自分のTODOのみにアクセスでき、認証トークンから自動的に判別されます。

#### 成功レスポンス（一覧取得）
```json
{
  "items": [
    {
      "id": 123,
      "title": "買い物リスト作成",
      ...
    },
    {
      "id": 124,
      "title": "レポート提出",
      ...
    }
  ],
  "meta": {
    "count": 2
  }
}
```

**注:** 将来的にはページネーション対応を検討:
```json
{
  "items": [...],
  "meta": {
    "count": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

#### 成功レスポンス（メッセージのみ）
```json
{
  "message": "ログアウトしました"
}
```

---

## 5. エラーハンドリング

### 5.1 HTTPステータスコード

| コード | 意味 | 使用ケース | 実装例 |
|-------|------|-----------|-------|
| **200 OK** | 成功 | リソース取得・更新成功 | `GET /api/todos` |
| **201 Created** | 作成成功 | リソース作成成功 | `POST /api/todos` |
| **204 No Content** | 成功（ボディなし） | 削除成功 | `DELETE /api/todos/{id}` |
| **400 Bad Request** | クライアントエラー（入力不正） | バリデーションエラー | titleが空、due_dateが過去 |
| **401 Unauthorized** | 認証エラー | トークン未提供、期限切れ | アクセストークン無効 |
| **403 Forbidden** | 認可エラー | 権限不足 | 他ユーザーのTODO編集試行 |
| **404 Not Found** | リソース不存在 | 指定IDのリソースが存在しない | `GET /api/todos/99999` |
| **429 Too Many Requests** | レート制限超過 | API呼び出し頻度が制限を超えた | 認証エンドポイント |
| **500 Internal Server Error** | サーバーエラー | 予期しないエラー | データベース接続エラー |

### 5.2 エラーレスポンス形式

#### 基本形式
```json
{
  "error": {
    "code": 400,
    "message": "タイトルは1文字以上120文字以下である必要があります"
  }
}
```

#### バリデーションエラー（詳細）
```json
{
  "error": {
    "code": 400,
    "message": "Request must contain application/json body."
  }
}
```

#### 認証エラー
```json
{
  "error": {
    "code": 401,
    "message": "認証が必要です"
  }
}
```

#### 認可エラー
```json
{
  "error": {
    "code": 403,
    "message": "このリソースへのアクセス権限がありません"
  }
}
```

**注:** 一部の認証エンドポイント（`/api/auth/login`, `/api/auth/logout`）では、簡易形式のエラーレスポンス `{"error": "エラーメッセージ"}` を返す場合があります。

### 5.3 エラー実装例

**バックエンド（Flask）:**
```python
from flask import jsonify

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "Bad Request",
        "message": str(error)
    }), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        "error": "Unauthorized",
        "message": "認証が必要です"
    }), 401
```

**実装箇所:** `backend/app/main.py` にグローバルエラーハンドラーを実装済み

---

## 6. クエリパラメータ設計

### 6.1 フィルタリング

```
GET /api/todos                    # デフォルト: status=active
GET /api/todos?status=active      # 未完了TODOのみ
GET /api/todos?status=completed   # 完了TODOのみ
GET /api/todos?status=all         # 全TODO
```

**パラメータ:**

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|----------|------|
| `status` | string | No | `active` | フィルタ条件: `all`, `active`, `completed` |

**ルール:**
- パラメータ名: リソースの属性名に対応（`status`, `category` 等）
- 値: 小文字、アンダースコア区切り
- 複数条件: `&` で結合

### 6.2 ソート

```
GET /api/todos?sort_by=due_date&order=asc
GET /api/todos?sort_by=created_at&order=desc
```

**ルール:**
- `sort_by`: ソート対象フィールド（スネークケース）
- `order`: `asc` (昇順) または `desc` (降順)
- デフォルト: `created_at` 降順（最新が先頭）

**注:** 現在のTODOアプリではフロントエンド側でソートを実装しています。

### 6.3 ページネーション（将来実装予定）

```
GET /api/todos?page=2&per_page=20
```

**ルール:**
- `page`: ページ番号（1始まり）
- `per_page`: 1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス例:**
```json
{
  "items": [...],
  "total": 100,
  "page": 2,
  "per_page": 20,
  "total_pages": 5
}
```

---

## 7. バージョニング戦略

### 7.1 現在の方針

現在はバージョニングを実装していません（`/api/` のみ）。

### 7.2 将来的なバージョニング戦略

破壊的変更が必要な場合、以下のいずれかの方式を採用:

#### URLバージョニング（推奨）
```
/api/v1/todos
/api/v2/todos
```

**メリット:**
- シンプルで分かりやすい
- ブラウザで直接アクセス可能
- キャッシュしやすい

#### ヘッダーバージョニング
```
GET /api/todos
Accept: application/vnd.myapp.v2+json
```

**メリット:**
- URLが変わらない
- より「RESTful」

**推奨:** URLバージョニング（実装の簡便性とキャッシュの扱いやすさから）

---

## 8. 認証・認可

### 8.1 認証方式

**Cookie ベース JWT 認証**
- アクセストークン: httpOnly Cookie に格納
- リフレッシュトークン: httpOnly Cookie + データベース管理

**リクエスト例:**
```http
GET /api/todos HTTP/1.1
Host: example.com
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 8.2 認可ヘッダー

現在はCookieベース認証のため、`Authorization` ヘッダーは使用していません。

**将来的なトークンベース認証の場合:**
```http
GET /api/todos HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 8.3 認証が必要なエンドポイント

| エンドポイント | 認証 |
|--------------|------|
| `POST /api/auth/login` | 不要 |
| `POST /api/auth/logout` | 不要（Cookieは必要） |
| `POST /api/auth/refresh` | 不要（Cookieは必要） |
| `GET /api/todos` | **必要** |
| `POST /api/todos` | **必要** |
| `PATCH /api/todos/{id}` | **必要** |
| `DELETE /api/todos/{id}` | **必要** |
| `PATCH /api/todos/{id}/complete` | **必要** |

**実装方法:** `@require_auth` デコレータ（`backend/app/utils/auth_decorator.py`）

詳細は [認証・認可設計書](./02_authentication-authorization.md) を参照してください。

---

## 9. 共通HTTPヘッダー

### 9.1 リクエストヘッダー

| ヘッダー | 必須 | 説明 | 例 |
|---------|------|------|-----|
| `Content-Type` | POST/PATCH時 | リクエストボディの形式 | `application/json` |
| `Cookie` | 認証必須API | JWT トークン | `access_token=...` |

### 9.2 レスポンスヘッダー

| ヘッダー | 説明 | 例 |
|---------|------|-----|
| `Content-Type` | レスポンスボディの形式 | `application/json` |
| `Set-Cookie` | 認証トークン設定 | `access_token=...; HttpOnly; SameSite=Lax` |

### 9.3 レート制限ヘッダー

Flask-Limiterが自動的に以下のヘッダーを返します:

| ヘッダー | 説明 | 例 |
|---------|------|-----|
| `X-RateLimit-Limit` | 制限値 | `10` |
| `X-RateLimit-Remaining` | 残りリクエスト数 | `7` |
| `X-RateLimit-Reset` | リセット時刻（UNIXタイムスタンプ） | `1699564800` |

---

## 10. API開発ベストプラクティス

### 10.1 バリデーション

**ルール:**
- すべての入力値をPydanticスキーマでバリデーション
- バリデーションエラーは400 Bad Requestで返す
- エラーメッセージは日本語で分かりやすく

**実装箇所:**
- `backend/app/schemas/todo.py` - TODO API
- `backend/app/schemas/auth.py` - 認証 API

### 10.2 エラーメッセージ

**ルール:**
- ユーザーフレンドリーな日本語メッセージ
- 開発者向けにはログで詳細情報を記録
- センシティブ情報（パスワード、トークン）は含めない

**良い例:**
```json
{
  "error": "Validation Error",
  "message": "期限日は今日以降の日付を指定してください"
}
```

**悪い例:**
```json
{
  "error": "ValueError: date must be >= today",
  "traceback": "..."
}
```

### 10.3 パフォーマンス

- **N+1クエリの回避**: SQLAlchemyの `joinedload` を使用
- **適切なインデックス**: データベース設計書参照
- **ページネーション**: 大量データには必須（将来実装予定）

### 10.4 セキュリティ

- **入力サニタイズ**: Pydanticによる自動検証
- **SQLインジェクション対策**: ORM使用、生SQLは避ける
- **ユーザー別データアクセス制御**: JWTのuser_idでフィルタ

---

## 11. テスト

### 11.1 APIテスト戦略

| テストタイプ | ツール | 対象 |
|------------|-------|------|
| **ユニットテスト** | pytest | Serviceレイヤー、Repositoryレイヤー |
| **統合テスト** | pytest | APIエンドポイント（E2E） |
| **フロントエンド統合** | Vitest | API呼び出しのモック |

### 11.2 テストケース例

**成功ケース:**
- 正常なリクエストで200 OKを返す
- 作成したリソースが正しく返される

**エラーケース:**
- バリデーションエラーで400を返す
- 認証なしで401を返す
- 他ユーザーのリソース操作で403を返す
- 存在しないリソースで404を返す

### 11.3 テストカバレッジ

APIエンドポイントの包括的なテストカバレッジとテスト戦略の詳細については、[テスト戦略書](./06_testing-strategy.md) を参照してください。

---

## 12. ドキュメント管理

### 12.1 APIドキュメント更新タイミング

| 変更内容 | ドキュメント更新 |
|---------|---------------|
| **新規エンドポイント追加** | 本ドキュメント + 機能一覧 |
| **エンドポイント変更・削除** | 本ドキュメント + 機能一覧 |
| **エラーレスポンス変更** | 本ドキュメント（セクション5） |
| **クエリパラメータ追加** | 本ドキュメント（セクション6） |

### 12.2 OpenAPI仕様（将来的）

将来的にはOpenAPI（Swagger）仕様書の導入を検討:
- 自動ドキュメント生成
- インタラクティブなAPI試用（Swagger UI）
- クライアントコード自動生成

---

## 13. 関連ドキュメント

- [システム構成設計書](./01_system-architecture.md) - 技術スタック、アーキテクチャ
- [認証・認可設計書](./02_authentication-authorization.md) - 認証API詳細、セキュリティ対策
- [データベース設計書](./04_database-design.md) - データモデル、テーブル定義
- [機能一覧](./03_feature-list.md) - 実装済みAPIエンドポイント一覧
- [テスト戦略書](./06_testing-strategy.md) - テスト方針、カバレッジ目標

---

**END OF DOCUMENT**
