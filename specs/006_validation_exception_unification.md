# 006: バリデーション例外の統一化

## 概要

現在、バリデーションエラーの例外クラスがモジュールごとに異なり、一貫性がない。これを統一された基底クラスを持つ例外階層に再構築し、エラーハンドリングを標準化する。

## 現状の問題

### 問題点

現在、以下のように異なる例外が使用されている：

1. **`backend/app/services/auth.py`** - `ValueError`（標準ライブラリ）
   ```python
   if not email or not password:
       raise ValueError("Email and password are required")
   ```

2. **`backend/app/services/todo.py`** - `TodoValidationError`（カスタム例外）
   ```python
   raise TodoValidationError("Title is required")
   ```

3. **`backend/app/services/user.py`** - `UserValidationError`（カスタム例外）
   ```python
   raise UserValidationError("Invalid email format")
   ```

### 影響
- エラーハンドリングが複雑化（複数の例外を個別にキャッチ）
- エラーメッセージの形式が不統一
- 例外の継承関係が明確でない
- 新しいサービスを追加する際のパターンが不明確

## 修正方針

### 原則
1. **共通基底クラス** - すべてのバリデーション例外が継承する基底クラス
2. **階層的な例外設計** - ドメインごとにサブクラスを定義
3. **エラー詳細の保持** - 例外オブジェクトにエラー詳細を格納
4. **標準例外との分離** - `ValueError` など標準例外は使用しない

### 例外階層

```
AppException (基底)
├── ValidationException (バリデーションエラー全般)
│   ├── AuthValidationError (認証関連)
│   ├── TodoValidationError (TODO関連)
│   └── UserValidationError (ユーザー関連)
├── AuthenticationException (認証失敗)
├── AuthorizationException (認可失敗)
└── ResourceNotFoundException (リソース不存在)
    ├── UserNotFoundException
    └── TodoNotFoundException
```

## 実装仕様

### 1. 例外クラスの定義

**新規ファイル:** `backend/app/exceptions/__init__.py`

```python
"""Custom exception classes for the application."""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base exception for all application-specific exceptions."""

    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize application exception.

        Args:
            message: Human-readable error message
            code: Error code for identification
            details: Additional error details
        """
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON response."""
        result = {
            "code": self.code,
            "message": self.message
        }
        if self.details:
            result["details"] = self.details
        return result


# ============================================================
# Validation Exceptions
# ============================================================

class ValidationException(AppException):
    """Base exception for validation errors."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details=details
        )


class AuthValidationError(ValidationException):
    """Authentication validation error."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message=message, details=details)
        self.code = "AUTH_VALIDATION_ERROR"


class TodoValidationError(ValidationException):
    """Todo validation error."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message=message, details=details)
        self.code = "TODO_VALIDATION_ERROR"


class UserValidationError(ValidationException):
    """User validation error."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message=message, details=details)
        self.code = "USER_VALIDATION_ERROR"


# ============================================================
# Authentication & Authorization Exceptions
# ============================================================

class AuthenticationException(AppException):
    """Authentication failure."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            details=details
        )


class AuthorizationException(AppException):
    """Authorization failure."""

    def __init__(
        self,
        message: str = "Access denied",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            details=details
        )


# ============================================================
# Resource Not Found Exceptions
# ============================================================

class ResourceNotFoundException(AppException):
    """Base exception for resource not found errors."""

    def __init__(
        self,
        resource: str,
        resource_id: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        message = f"{resource} not found"
        if resource_id:
            message += f": {resource_id}"

        super().__init__(
            message=message,
            code="RESOURCE_NOT_FOUND",
            details=details
        )


class UserNotFoundException(ResourceNotFoundException):
    """User not found."""

    def __init__(
        self,
        user_id: Optional[int] = None,
        email: Optional[str] = None
    ):
        identifier = user_id or email
        super().__init__(resource="User", resource_id=identifier)
        self.code = "USER_NOT_FOUND"


class TodoNotFoundException(ResourceNotFoundException):
    """Todo not found."""

    def __init__(self, todo_id: int):
        super().__init__(resource="Todo", resource_id=todo_id)
        self.code = "TODO_NOT_FOUND"


# ============================================================
# Business Logic Exceptions
# ============================================================

class DuplicateResourceException(AppException):
    """Resource already exists."""

    def __init__(
        self,
        resource: str,
        field: str,
        value: str
    ):
        message = f"{resource} with {field}='{value}' already exists"
        super().__init__(
            message=message,
            code="DUPLICATE_RESOURCE",
            details={"field": field, "value": value}
        )


class InvalidOperationException(AppException):
    """Invalid operation attempt."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="INVALID_OPERATION",
            details=details
        )
```

### 2. エラーハンドラの追加

**ファイル:** `backend/main.py`

```python
from backend.exceptions import (
    AppException,
    ValidationException,
    AuthenticationException,
    AuthorizationException,
    ResourceNotFoundException
)

@app.errorhandler(AppException)
def handle_app_exception(e: AppException):
    """Handle all application-specific exceptions."""
    logger.warning(f"{e.code}: {e.message}", extra={"details": e.details})

    # ステータスコードのマッピング
    status_code_map = {
        "VALIDATION_ERROR": 400,
        "AUTH_VALIDATION_ERROR": 400,
        "TODO_VALIDATION_ERROR": 400,
        "USER_VALIDATION_ERROR": 400,
        "AUTHENTICATION_ERROR": 401,
        "AUTHORIZATION_ERROR": 403,
        "RESOURCE_NOT_FOUND": 404,
        "USER_NOT_FOUND": 404,
        "TODO_NOT_FOUND": 404,
        "DUPLICATE_RESOURCE": 409,
        "INVALID_OPERATION": 400,
    }

    status_code = status_code_map.get(e.code, 500)

    return jsonify({"error": e.to_dict()}), status_code
```

### 3. サービス層の修正

#### 3.1 AuthService の修正

**ファイル:** `backend/app/services/auth.py`

```python
# 変更前
if not email or not password:
    raise ValueError("Email and password are required")

# 変更後
from backend.exceptions import AuthValidationError

if not email or not password:
    raise AuthValidationError(
        message="Email and password are required",
        details={"missing_fields": ["email", "password"]}
    )
```

#### 3.2 TodoService の修正

**ファイル:** `backend/app/services/todo.py`

```python
# 変更前
from backend.services.exceptions import TodoValidationError

if not title:
    raise TodoValidationError("Title is required")

# 変更後
from backend.exceptions import TodoValidationError, TodoNotFoundException

if not title:
    raise TodoValidationError(
        message="Title is required",
        details={"field": "title"}
    )

# リソース不存在エラー
todo = todo_repository.get_by_id(todo_id)
if not todo:
    raise TodoNotFoundException(todo_id=todo_id)
```

#### 3.3 UserService の修正

**ファイル:** `backend/app/services/user.py`

```python
# 変更前
from backend.services.exceptions import UserValidationError

if not is_valid_email(email):
    raise UserValidationError("Invalid email format")

# 変更後
from backend.exceptions import (
    UserValidationError,
    UserNotFoundException,
    DuplicateResourceException
)

if not is_valid_email(email):
    raise UserValidationError(
        message="Invalid email format",
        details={"field": "email", "value": email}
    )

# 重複チェック
if user_repository.exists_by_email(email):
    raise DuplicateResourceException(
        resource="User",
        field="email",
        value=email
    )

# リソース不存在
user = user_repository.get_by_id(user_id)
if not user:
    raise UserNotFoundException(user_id=user_id)
```

### 4. 旧例外クラスの削除

**削除対象:**
- `backend/app/services/exceptions.py`（存在する場合）
- サービス層で定義されている個別の例外クラス

## テスト戦略

### 1. 例外クラスのユニットテスト

**ファイル:** `backend/tests/exceptions/test_exceptions.py`

```python
import pytest
from backend.exceptions import (
    AppException,
    ValidationException,
    AuthValidationError,
    TodoValidationError,
    UserValidationError,
    AuthenticationException,
    AuthorizationException,
    UserNotFoundException,
    TodoNotFoundException,
    DuplicateResourceException
)


class TestAppException:
    def test_app_exception_initialization(self):
        """AppException が正しく初期化されることを確認"""
        exc = AppException(
            message="Test error",
            code="TEST_ERROR",
            details={"key": "value"}
        )

        assert exc.message == "Test error"
        assert exc.code == "TEST_ERROR"
        assert exc.details == {"key": "value"}

    def test_app_exception_to_dict(self):
        """to_dict() が正しい辞書を返すことを確認"""
        exc = AppException(
            message="Test error",
            code="TEST_ERROR",
            details={"key": "value"}
        )

        result = exc.to_dict()

        assert result["code"] == "TEST_ERROR"
        assert result["message"] == "Test error"
        assert result["details"] == {"key": "value"}


class TestValidationExceptions:
    def test_validation_exception_code(self):
        """ValidationException が正しいコードを持つことを確認"""
        exc = ValidationException(message="Validation failed")
        assert exc.code == "VALIDATION_ERROR"

    def test_auth_validation_error_code(self):
        """AuthValidationError が正しいコードを持つことを確認"""
        exc = AuthValidationError(message="Auth validation failed")
        assert exc.code == "AUTH_VALIDATION_ERROR"

    def test_todo_validation_error_code(self):
        """TodoValidationError が正しいコードを持つことを確認"""
        exc = TodoValidationError(message="Todo validation failed")
        assert exc.code == "TODO_VALIDATION_ERROR"


class TestResourceNotFoundExceptions:
    def test_user_not_found_with_id(self):
        """UserNotFoundException がuser_idで初期化されることを確認"""
        exc = UserNotFoundException(user_id=123)

        assert exc.code == "USER_NOT_FOUND"
        assert "User not found: 123" in exc.message

    def test_user_not_found_with_email(self):
        """UserNotFoundException がemailで初期化されることを確認"""
        exc = UserNotFoundException(email="test@example.com")

        assert exc.code == "USER_NOT_FOUND"
        assert "test@example.com" in exc.message

    def test_todo_not_found(self):
        """TodoNotFoundException が正しく初期化されることを確認"""
        exc = TodoNotFoundException(todo_id=456)

        assert exc.code == "TODO_NOT_FOUND"
        assert "Todo not found: 456" in exc.message


class TestDuplicateResourceException:
    def test_duplicate_resource_initialization(self):
        """DuplicateResourceException が正しく初期化されることを確認"""
        exc = DuplicateResourceException(
            resource="User",
            field="email",
            value="test@example.com"
        )

        assert exc.code == "DUPLICATE_RESOURCE"
        assert "User with email='test@example.com' already exists" in exc.message
        assert exc.details["field"] == "email"
        assert exc.details["value"] == "test@example.com"
```

### 2. エラーハンドラの統合テスト

**ファイル:** `backend/tests/test_error_handlers.py`

```python
from backend.exceptions import TodoValidationError, TodoNotFoundException

def test_validation_exception_handler(client):
    """バリデーション例外が400を返すことを確認"""
    # TodoValidationError を発生させるエンドポイントを呼び出す
    response = client.post('/api/todos', json={
        "title": "",  # 空のタイトル
        "description": "Test"
    }, headers=auth_headers)

    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "TODO_VALIDATION_ERROR"


def test_not_found_exception_handler(client, auth_headers):
    """NotFound例外が404を返すことを確認"""
    response = client.get('/api/todos/99999', headers=auth_headers)

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "TODO_NOT_FOUND"
```

## 実装チェックリスト

### 新規ファイル作成
- [ ] `backend/app/exceptions/__init__.py` を作成
- [ ] 基底クラス `AppException` を実装
- [ ] バリデーション例外クラスを実装
- [ ] リソース不存在例外クラスを実装
- [ ] ビジネスロジック例外クラスを実装

### エラーハンドラ追加
- [ ] `backend/main.py` に `AppException` ハンドラを追加

### サービス層修正
- [ ] `backend/app/services/auth.py` を新例外に移行
- [ ] `backend/app/services/todo.py` を新例外に移行
- [ ] `backend/app/services/user.py` を新例外に移行

### 旧コード削除
- [ ] `backend/app/services/exceptions.py` を削除（存在する場合）
- [ ] 旧例外クラスへの参照をすべて削除

### テスト
- [ ] `backend/tests/exceptions/test_exceptions.py` を作成
- [ ] 例外クラスのユニットテストを実装
- [ ] エラーハンドラの統合テストを実装
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `backend/CLAUDE.md` に例外階層を追加
- [ ] `docs/05_api-design-guide.md` にエラーコードを追加

## 期待される効果

### メリット
1. **一貫性** - すべての例外が統一された基底クラスを継承
2. **エラーハンドリングの簡素化** - 基底クラスをキャッチすればすべての例外を処理可能
3. **エラー詳細の構造化** - `details` フィールドで追加情報を提供
4. **拡張性** - 新しい例外クラスを簡単に追加可能
5. **型安全性** - 例外の型が明確で IDE の補完が効く

### 使用例

```python
# サービス層
from backend.exceptions import TodoValidationError, TodoNotFoundException

def update_todo(todo_id: int, data: dict) -> Todo:
    todo = todo_repository.get_by_id(todo_id)
    if not todo:
        raise TodoNotFoundException(todo_id=todo_id)

    if not data.get("title"):
        raise TodoValidationError(
            message="Title is required",
            details={"field": "title"}
        )

    # ... 更新処理

# ルート層（エラーハンドラが自動処理）
@todo_bp.route("/<int:todo_id>", methods=["PUT"])
def update_todo_route(todo_id: int):
    data = request.get_json()
    # 例外は自動的にハンドラで処理される
    todo = todo_service.update_todo(todo_id, data)
    return jsonify(TodoResponse.from_orm(todo).model_dump())
```

## 参考資料

- [Python Exception Hierarchy](https://docs.python.org/3/library/exceptions.html#exception-hierarchy)
- [Effective Python: Item 87 - Define Root Exceptions](https://effectivepython.com/)
- [Flask Error Handling](https://flask.palletsprojects.com/en/3.0.x/errorhandling/)
