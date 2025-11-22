# 004: エラーレスポンス形式の統一化

## 概要

現在のエラーレスポンスが統一されておらず、異なる形式でエラー情報が返されている。フロントエンドでの一貫したエラーハンドリングを可能にするため、すべてのエラーレスポンスを統一した形式に標準化する。

## 現状の問題

### 問題点

現在、少なくとも3つの異なるエラーレスポンス形式が混在：

#### 形式1: ネストされたエラーオブジェクト
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": ["Field 'email' is required"]
  }
}
```

#### 形式2: シンプルなエラー文字列
```json
{
  "error": "User not found"
}
```

#### 形式3: エラーと詳細の並列
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email format"],
    "password": ["Password too short"]
  }
}
```

### 影響
- フロントエンドで複数のエラーハンドリングパターンが必要
- エラーメッセージの一貫性がない
- デバッグが困難
- API ドキュメントが複雑化

### 発生箇所
- `backend/app/routes/auth_routes.py`
- `backend/app/routes/todo_routes.py`
- `backend/app/routes/user_routes.py`
- エラーハンドラ（`backend/main.py`）

## 修正方針

### 標準エラーレスポンス形式

すべてのエラーレスポンスを以下の形式に統一：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": null | object | array,
    "request_id": "uuid-v4"
  }
}
```

### フィールド定義

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `code` | string | Yes | エラーコード（大文字スネークケース） |
| `message` | string | Yes | ユーザー向けエラーメッセージ |
| `details` | any | No | 追加のエラー情報（バリデーションエラーなど） |
| `request_id` | string | Yes | リクエスト識別子（ログトレーシング用） |

### エラーコード体系

| HTTP Status | Error Code | 説明 |
|-------------|------------|------|
| 400 | `VALIDATION_ERROR` | リクエストのバリデーションエラー |
| 400 | `INVALID_REQUEST` | 不正なリクエスト |
| 401 | `UNAUTHORIZED` | 認証が必要 |
| 401 | `INVALID_CREDENTIALS` | 認証情報が無効 |
| 401 | `TOKEN_EXPIRED` | トークンの有効期限切れ |
| 403 | `FORBIDDEN` | アクセス権限なし |
| 404 | `NOT_FOUND` | リソースが見つからない |
| 404 | `USER_NOT_FOUND` | ユーザーが見つからない |
| 404 | `TODO_NOT_FOUND` | TODOが見つからない |
| 409 | `CONFLICT` | リソースの競合 |
| 409 | `EMAIL_ALREADY_EXISTS` | メールアドレスが既に使用されている |
| 429 | `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| 500 | `INTERNAL_SERVER_ERROR` | サーバー内部エラー |
| 500 | `DATABASE_ERROR` | データベースエラー |

## 実装仕様

### 1. エラーレスポンスユーティリティの作成

**新規ファイル:** `backend/app/utils/error_response.py`

```python
"""Standardized error response utilities."""
from typing import Any, Optional
from flask import jsonify, g
from werkzeug.exceptions import HTTPException


class ErrorResponse:
    """Standardized error response builder."""

    @staticmethod
    def create(
        code: str,
        message: str,
        details: Optional[Any] = None,
        status_code: int = 400
    ):
        """
        Create a standardized error response.

        Args:
            code: Error code (UPPER_SNAKE_CASE)
            message: Human-readable error message
            details: Additional error details (optional)
            status_code: HTTP status code

        Returns:
            Flask response with standardized error format
        """
        request_id = g.get('request_id', 'unknown')

        error_body = {
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id
            }
        }

        if details is not None:
            error_body["error"]["details"] = details

        return jsonify(error_body), status_code


# 便利なヘルパー関数
def validation_error(message: str, details: Optional[dict] = None):
    """バリデーションエラーレスポンスを生成"""
    return ErrorResponse.create(
        code="VALIDATION_ERROR",
        message=message,
        details=details,
        status_code=400
    )


def unauthorized_error(message: str = "Authentication required"):
    """認証エラーレスポンスを生成"""
    return ErrorResponse.create(
        code="UNAUTHORIZED",
        message=message,
        status_code=401
    )


def forbidden_error(message: str = "Access denied"):
    """認可エラーレスポンスを生成"""
    return ErrorResponse.create(
        code="FORBIDDEN",
        message=message,
        status_code=403
    )


def not_found_error(resource: str = "Resource", resource_id: Optional[Any] = None):
    """Not Foundエラーレスポンスを生成"""
    message = f"{resource} not found"
    if resource_id:
        message += f": {resource_id}"

    return ErrorResponse.create(
        code="NOT_FOUND",
        message=message,
        status_code=404
    )


def conflict_error(message: str, details: Optional[dict] = None):
    """競合エラーレスポンスを生成"""
    return ErrorResponse.create(
        code="CONFLICT",
        message=message,
        details=details,
        status_code=409
    )


def internal_error(message: str = "An internal error occurred"):
    """内部エラーレスポンスを生成"""
    return ErrorResponse.create(
        code="INTERNAL_SERVER_ERROR",
        message=message,
        status_code=500
    )
```

### 2. エラーハンドラの統一

**ファイル:** `backend/main.py`

```python
from backend.utils.error_response import ErrorResponse
from werkzeug.exceptions import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

@app.errorhandler(HTTPException)
def handle_http_exception(e):
    """Handle HTTP exceptions with standardized format."""
    return ErrorResponse.create(
        code=e.name.upper().replace(' ', '_'),
        message=e.description,
        status_code=e.code
    )


@app.errorhandler(ValidationError)
def handle_validation_error(e):
    """Handle Pydantic validation errors."""
    errors = {}
    for error in e.errors():
        field = '.'.join(str(loc) for loc in error['loc'])
        errors[field] = error['msg']

    return ErrorResponse.create(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details=errors,
        status_code=400
    )


@app.errorhandler(SQLAlchemyError)
def handle_database_error(e):
    """Handle database errors."""
    logger.error(f"Database error: {str(e)}")

    # 本番環境では詳細を隠す
    if app.config.get('ENV') == 'production':
        message = "A database error occurred"
    else:
        message = str(e)

    return ErrorResponse.create(
        code="DATABASE_ERROR",
        message=message,
        status_code=500
    )


@app.errorhandler(Exception)
def handle_generic_exception(e):
    """Handle all uncaught exceptions."""
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)

    # 本番環境では詳細を隠す
    if app.config.get('ENV') == 'production':
        message = "An unexpected error occurred"
    else:
        message = str(e)

    return ErrorResponse.create(
        code="INTERNAL_SERVER_ERROR",
        message=message,
        status_code=500
    )
```

### 3. 各ルートでの適用

#### AuthRoutes の例

**ファイル:** `backend/app/routes/auth_routes.py`

```python
from backend.utils.error_response import (
    validation_error,
    unauthorized_error,
    conflict_error,
    internal_error
)

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = RegisterRequest(**request.json)
    except ValidationError as e:
        return validation_error(
            message="Registration validation failed",
            details={err['loc'][0]: err['msg'] for err in e.errors()}
        )

    # メールアドレス重複チェック
    if user_service.get_user_by_email(data.email):
        return conflict_error(
            message="Email already registered",
            details={"email": "This email address is already in use"}
        )

    try:
        user = user_service.create_user(data.email, data.password, data.name)
        # ... 成功レスポンス
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        return internal_error(message="Failed to create user account")


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = LoginRequest(**request.json)
    except ValidationError as e:
        return validation_error(
            message="Login validation failed",
            details={err['loc'][0]: err['msg'] for err in e.errors()}
        )

    user = user_service.authenticate_user(data.email, data.password)
    if not user:
        return unauthorized_error(message="Invalid email or password")

    # ... トークン生成など
```

#### TodoRoutes の例

**ファイル:** `backend/app/routes/todo_routes.py`

```python
from backend.utils.error_response import (
    validation_error,
    not_found_error,
    forbidden_error
)

@todo_bp.route("/<int:todo_id>", methods=["GET"])
@require_auth
def get_todo(todo_id: int):
    todo = todo_service.get_todo_by_id(todo_id)

    if not todo:
        return not_found_error(resource="Todo", resource_id=todo_id)

    # 所有者チェック
    if todo.user_id != g.current_user.id:
        return forbidden_error(message="You don't have access to this todo")

    # ... 成功レスポンス


@todo_bp.route("", methods=["POST"])
@require_auth
def create_todo():
    try:
        data = TodoCreateData(**request.json)
    except ValidationError as e:
        return validation_error(
            message="Todo creation validation failed",
            details={err['loc'][0]: err['msg'] for err in e.errors()}
        )

    # ... TODO作成処理
```

### 4. Pydantic スキーマの定義（オプション）

**ファイル:** `backend/app/schemas/error.py`

```python
from pydantic import BaseModel, Field
from typing import Any, Optional


class ErrorDetail(BaseModel):
    """Standard error response schema."""

    code: str = Field(..., description="Error code in UPPER_SNAKE_CASE")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Any] = Field(None, description="Additional error details")
    request_id: str = Field(..., description="Request identifier for tracing")


class ErrorResponse(BaseModel):
    """Error response wrapper."""

    error: ErrorDetail
```

## テスト戦略

### 1. ユニットテスト

**ファイル:** `backend/tests/utils/test_error_response.py`

```python
import pytest
from backend.utils.error_response import (
    ErrorResponse,
    validation_error,
    unauthorized_error,
    forbidden_error,
    not_found_error,
    conflict_error,
    internal_error
)

def test_error_response_create():
    """ErrorResponse.create が正しい形式を返すことを確認"""
    response, status_code = ErrorResponse.create(
        code="TEST_ERROR",
        message="Test error message",
        details={"field": "value"},
        status_code=400
    )

    assert status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"]["code"] == "TEST_ERROR"
    assert data["error"]["message"] == "Test error message"
    assert data["error"]["details"] == {"field": "value"}
    assert "request_id" in data["error"]


def test_validation_error():
    """validation_error が400を返すことを確認"""
    response, status_code = validation_error(
        message="Validation failed",
        details={"email": "Invalid format"}
    )

    assert status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_unauthorized_error():
    """unauthorized_error が401を返すことを確認"""
    response, status_code = unauthorized_error()

    assert status_code == 401
    data = response.get_json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_not_found_error():
    """not_found_error が404を返すことを確認"""
    response, status_code = not_found_error(resource="User", resource_id=123)

    assert status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "User not found: 123" in data["error"]["message"]
```

### 2. 統合テスト

**ファイル:** `backend/tests/routes/test_error_responses.py`

```python
def test_register_with_invalid_email_returns_standard_error(client):
    """無効なメールアドレスで登録時に標準エラーが返ることを確認"""
    response = client.post('/api/auth/register', json={
        'email': 'invalid-email',
        'password': 'Password123!',
        'name': 'Test User'
    })

    assert response.status_code == 400
    data = response.get_json()

    # 標準エラー形式を確認
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert "request_id" in data["error"]
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_login_with_wrong_credentials_returns_standard_error(client):
    """間違った認証情報でログイン時に標準エラーが返ることを確認"""
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'WrongPassword123!'
    })

    assert response.status_code == 401
    data = response.get_json()

    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "request_id" in data["error"]


def test_get_nonexistent_todo_returns_standard_error(client, auth_headers):
    """存在しないTODO取得時に標準エラーが返ることを確認"""
    response = client.get('/api/todos/99999', headers=auth_headers)

    assert response.status_code == 404
    data = response.get_json()

    assert data["error"]["code"] == "NOT_FOUND"
    assert "Todo not found" in data["error"]["message"]
    assert "request_id" in data["error"]
```

## 実装チェックリスト

### 新規ファイル作成
- [ ] `backend/app/utils/error_response.py` を作成
- [ ] `backend/app/schemas/error.py` を作成（オプション）
- [ ] `backend/tests/utils/test_error_response.py` を作成

### エラーハンドラ修正
- [ ] `backend/main.py` のエラーハンドラを統一形式に変更
- [ ] HTTPException ハンドラを追加
- [ ] ValidationError ハンドラを追加
- [ ] SQLAlchemyError ハンドラを追加
- [ ] 汎用 Exception ハンドラを追加

### ルート修正
- [ ] `backend/app/routes/auth_routes.py` のエラーレスポンスを統一
- [ ] `backend/app/routes/todo_routes.py` のエラーレスポンスを統一
- [ ] `backend/app/routes/user_routes.py` のエラーレスポンスを統一

### テスト
- [ ] エラーレスポンスユーティリティのユニットテストを追加
- [ ] 各ルートの統合テストでエラー形式を確認
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `docs/05_api-design-guide.md` にエラーレスポンス形式を追加
- [ ] API エンドポイントドキュメントを更新

### フロントエンド対応
- [ ] フロントエンドのエラーハンドリングコードを更新
- [ ] エラー型定義を追加（TypeScript）

## 期待される効果

### メリット
1. **一貫性** - すべてのエラーが同じ形式で返される
2. **フロントエンド開発の効率化** - 統一されたエラーハンドリング
3. **デバッグの容易化** - request_id によるログトレーシング
4. **API ドキュメントの簡素化** - 1つのエラー形式のみ説明すれば良い
5. **拡張性** - 新しいエラー情報を details に追加可能

### フロントエンドでの使用例

```typescript
// TypeScript型定義
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    request_id: string;
  };
}

// エラーハンドリング
try {
  const response = await api.post('/auth/login', data);
} catch (error) {
  if (error.response) {
    const errorData: ErrorResponse = error.response.data;

    // 統一されたエラー処理
    switch (errorData.error.code) {
      case 'VALIDATION_ERROR':
        // バリデーションエラー表示
        showValidationErrors(errorData.error.details);
        break;
      case 'UNAUTHORIZED':
        // 認証エラー表示
        showLoginError(errorData.error.message);
        break;
      default:
        // 汎用エラー表示
        showGenericError(errorData.error.message);
    }

    // ログにrequest_idを記録
    logger.error(`Error: ${errorData.error.request_id}`);
  }
}
```

## 参考資料

- [RFC 7807: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Google API Design Guide: Errors](https://cloud.google.com/apis/design/errors)
- [Microsoft REST API Guidelines: Error Handling](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#7102-error-condition-responses)
- [OWASP: Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
