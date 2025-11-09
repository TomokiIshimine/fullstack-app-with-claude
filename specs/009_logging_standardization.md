# 009: ロギング基準の統一化

## 概要

現在、ロギングの詳細度や形式がサービスごとに異なり、一貫性がない。統一されたロギング基準を定義し、デバッグとトラブルシューティングを容易にする。

## 現状の問題

### 問題点

1. **TodoService** - 詳細なロギング
   ```python
   logger.info(f"Creating todo for user {user_id}: {data.title}")
   logger.info(f"Todo created successfully: {todo.id}")
   ```

2. **UserService** - 最小限のロギング
   ```python
   # ほとんどログがない
   ```

3. **AuthService** - 中程度のロギング
   ```python
   logger.warning(f"Failed login attempt for {email}")
   ```

### 影響
- ログの詳細度が不統一
- トラブルシューティング時に必要な情報が不足
- ログレベル（INFO, WARNING, ERROR）の使い分けが不明確
- セキュリティ上重要な情報がログに含まれる可能性

## 修正方針

### ロギング原則
1. **一貫性** - すべてのサービスで同じロギングパターン
2. **適切なレベル** - ログレベルの明確な使い分け
3. **セキュリティ** - 機密情報（パスワード、トークン）をログに出力しない
4. **トレーサビリティ** - リクエストIDでログをトレース可能に
5. **構造化ロギング** - JSON形式で出力（本番環境）

### ログレベル基準

| レベル | 用途 | 例 |
|--------|------|-----|
| DEBUG | 開発時の詳細情報 | 変数の値、詳細なフロー |
| INFO | 通常の操作 | リソースの作成、更新、削除 |
| WARNING | 警告（エラーではない） | 認証失敗、無効なリクエスト |
| ERROR | エラー発生 | 例外、データベースエラー |
| CRITICAL | 致命的なエラー | システムダウン |

## 実装仕様

### 1. ロギング設定の一元化

**ファイル:** `backend/app/utils/logger.py`

```python
"""Centralized logging configuration."""
import logging
import sys
from typing import Any, Dict
from pythonjsonlogger import jsonlogger
from flask import g, has_request_context


class RequestContextFilter(logging.Filter):
    """Add request context to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add request_id and user_id to log record."""
        if has_request_context():
            record.request_id = g.get('request_id', 'N/A')
            record.user_id = g.get('current_user', {}).get('id', 'N/A')
        else:
            record.request_id = 'N/A'
            record.user_id = 'N/A'
        return True


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields."""

    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any]
    ) -> None:
        """Add custom fields to JSON log."""
        super().add_fields(log_record, record, message_dict)

        # タイムスタンプ
        log_record['timestamp'] = self.formatTime(record, self.datefmt)

        # ログレベル
        log_record['level'] = record.levelname

        # モジュール情報
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno

        # リクエストコンテキスト
        log_record['request_id'] = getattr(record, 'request_id', 'N/A')
        log_record['user_id'] = getattr(record, 'user_id', 'N/A')


def setup_logging(app, log_level: str = "INFO", log_format: str = "json"):
    """
    Setup application logging.

    Args:
        app: Flask application
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Log format (json or text)
    """
    # ルートロガーの設定
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # 既存のハンドラを削除
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # ハンドラの作成
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level.upper()))

    # フォーマッターの設定
    if log_format == "json":
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(module)s %(funcName)s %(message)s'
        )
    else:
        # テキスト形式（開発環境用）
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(request_id)s] '
            '%(module)s.%(funcName)s:%(lineno)d - %(message)s'
        )

    handler.setFormatter(formatter)

    # リクエストコンテキストフィルタを追加
    handler.addFilter(RequestContextFilter())

    root_logger.addHandler(handler)

    # Flask のログレベルも設定
    app.logger.setLevel(getattr(logging, log_level.upper()))


def get_logger(name: str) -> logging.Logger:
    """
    Get logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
```

### 2. Main.py での初期化

**ファイル:** `backend/main.py`

```python
from backend.utils.logger import setup_logging
from backend.config import settings

# ロギング設定
setup_logging(
    app,
    log_level=settings.LOG_LEVEL,
    log_format=settings.LOG_FORMAT
)
```

### 3. サービス層のロギング基準

#### TodoService の例

**ファイル:** `backend/app/services/todo.py`

```python
import logging

logger = logging.getLogger(__name__)


class TodoService:
    def create_todo(self, data: TodoCreateData, user_id: int) -> Todo:
        """Create a new todo."""
        logger.info(
            "Creating todo",
            extra={
                "user_id": user_id,
                "title": data.title,
                "has_description": bool(data.description)
            }
        )

        try:
            todo = Todo(
                title=data.title,
                description=data.description,
                user_id=user_id
            )
            self.todo_repository.save(todo)

            logger.info(
                "Todo created successfully",
                extra={"todo_id": todo.id, "user_id": user_id}
            )

            return todo

        except Exception as e:
            logger.error(
                "Failed to create todo",
                extra={"user_id": user_id, "error": str(e)},
                exc_info=True
            )
            raise

    def update_todo(self, todo_id: int, data: TodoUpdateData, user_id: int) -> Todo:
        """Update a todo."""
        logger.debug(
            "Updating todo",
            extra={"todo_id": todo_id, "user_id": user_id, "updates": data.get_update_data()}
        )

        todo = self.todo_repository.get_by_id(todo_id)
        if not todo:
            logger.warning(
                "Todo not found for update",
                extra={"todo_id": todo_id, "user_id": user_id}
            )
            raise TodoNotFoundException(todo_id=todo_id)

        if todo.user_id != user_id:
            logger.warning(
                "Unauthorized todo update attempt",
                extra={"todo_id": todo_id, "owner_id": todo.user_id, "requester_id": user_id}
            )
            raise AuthorizationException("You don't have permission to update this todo")

        # 更新処理
        updates = data.get_update_data()
        for field, value in updates.items():
            setattr(todo, field, value)

        self.todo_repository.save(todo)

        logger.info(
            "Todo updated successfully",
            extra={"todo_id": todo_id, "updated_fields": list(updates.keys())}
        )

        return todo
```

#### UserService の例

**ファイル:** `backend/app/services/user.py`

```python
import logging

logger = logging.getLogger(__name__)


class UserService:
    def create_user(self, email: str, password: str, name: str) -> User:
        """Create a new user."""
        logger.info("Creating user", extra={"email": email, "name": name})

        # メールアドレス重複チェック
        if self.user_repository.exists_by_email(email):
            logger.warning(
                "User creation failed: email already exists",
                extra={"email": email}
            )
            raise DuplicateResourceException("User", "email", email)

        try:
            # パスワードハッシュ化（パスワードをログに出力しない！）
            password_hash = hash_password(password)

            user = User(email=email, password_hash=password_hash, name=name)
            self.user_repository.save(user)

            logger.info(
                "User created successfully",
                extra={"user_id": user.id, "email": email}
            )

            return user

        except Exception as e:
            logger.error(
                "Failed to create user",
                extra={"email": email, "error": str(e)},
                exc_info=True
            )
            raise

    def get_user_by_id(self, user_id: int) -> User | None:
        """Get user by ID."""
        logger.debug("Getting user by ID", extra={"user_id": user_id})

        user = self.user_repository.get_by_id(user_id)

        if not user:
            logger.debug("User not found", extra={"user_id": user_id})

        return user
```

#### AuthService の例

**ファイル:** `backend/app/services/auth.py`

```python
import logging

logger = logging.getLogger(__name__)


class AuthService:
    def authenticate_user(self, email: str, password: str) -> User | None:
        """Authenticate user."""
        logger.info("Authentication attempt", extra={"email": email})

        user = self.user_repository.get_by_email(email)

        if not user:
            logger.warning(
                "Authentication failed: user not found",
                extra={"email": email}
            )
            return None

        # パスワード検証（パスワードをログに出力しない！）
        if not verify_password(password, user.password_hash):
            logger.warning(
                "Authentication failed: invalid password",
                extra={"email": email, "user_id": user.id}
            )
            return None

        logger.info(
            "Authentication successful",
            extra={"email": email, "user_id": user.id}
        )

        return user

    def generate_tokens(self, user_id: int) -> dict:
        """Generate access and refresh tokens."""
        logger.debug("Generating tokens", extra={"user_id": user_id})

        access_token = self._generate_access_token(user_id)
        refresh_token = self._generate_refresh_token(user_id)

        # トークンをログに出力しない！
        logger.info(
            "Tokens generated",
            extra={"user_id": user_id}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }
```

### 4. セキュリティ上のログ除外リスト

**絶対にログに出力してはいけない情報:**

- パスワード（平文）
- JWTトークン
- リフレッシュトークン
- APIキー
- クレジットカード情報
- 個人を特定できる機密情報（SSN、パスポート番号など）

**ログ出力OK:**

- メールアドレス（必要に応じてマスク）
- ユーザーID
- リクエストID
- エラーメッセージ
- リソースID（todo_id など）

## テスト戦略

### 1. ロギング設定のテスト

**ファイル:** `backend/tests/utils/test_logger.py`

```python
import logging
import json
from backend.utils.logger import setup_logging, get_logger


def test_logger_initialization(app):
    """ロガーが正しく初期化されることを確認"""
    setup_logging(app, log_level="INFO", log_format="text")

    logger = get_logger(__name__)
    assert logger.level == logging.INFO


def test_logger_json_format(app, caplog):
    """JSON形式のログが出力されることを確認"""
    setup_logging(app, log_level="INFO", log_format="json")

    logger = get_logger(__name__)
    logger.info("Test message", extra={"key": "value"})

    # ログが JSON形式であることを確認（実装詳細に依存）


def test_logger_request_context(app, client):
    """リクエストコンテキストがログに含まれることを確認"""
    with app.test_request_context():
        from flask import g
        g.request_id = "test-request-id"

        logger = get_logger(__name__)
        with caplog.at_level(logging.INFO):
            logger.info("Test with context")

        # request_id がログに含まれることを確認
        assert "test-request-id" in caplog.text
```

### 2. サービス層のログテスト

**ファイル:** `backend/tests/services/test_todo_service.py`

```python
import logging


def test_create_todo_logs_info(db_session, user_factory, caplog):
    """TODO作成時にINFOログが出力されることを確認"""
    service = TodoService(db_session)
    user = user_factory()

    with caplog.at_level(logging.INFO):
        data = TodoCreateData(title="Test Todo", description="Description")
        service.create_todo(data, user.id)

    # ログメッセージの確認
    assert "Creating todo" in caplog.text
    assert "Todo created successfully" in caplog.text


def test_update_nonexistent_todo_logs_warning(db_session, user_factory, caplog):
    """存在しないTODO更新時にWARNINGログが出力されることを確認"""
    service = TodoService(db_session)
    user = user_factory()

    with caplog.at_level(logging.WARNING):
        with pytest.raises(TodoNotFoundException):
            data = TodoUpdateData(title="Updated")
            service.update_todo(99999, data, user.id)

    assert "Todo not found" in caplog.text
```

## 実装チェックリスト

### ロギング設定
- [ ] `backend/app/utils/logger.py` を作成
- [ ] `RequestContextFilter` を実装
- [ ] `CustomJsonFormatter` を実装
- [ ] `setup_logging()` を実装

### Main.py 修正
- [ ] `backend/main.py` でロギング初期化を実行

### サービス層修正
- [ ] `backend/app/services/todo.py` のロギングを統一
- [ ] `backend/app/services/user.py` のロギングを追加
- [ ] `backend/app/services/auth.py` のロギングを統一
- [ ] すべてのサービスで機密情報をログに出力していないことを確認

### テスト
- [ ] `backend/tests/utils/test_logger.py` を作成
- [ ] ロギング設定のテストを実装
- [ ] サービス層のログテストを追加
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `backend/CLAUDE.md` にロギング基準を追加
- [ ] `docs/00_development.md` にログの見方を追加

## 期待される効果

### メリット
1. **一貫性** - すべてのログが統一された形式
2. **トレーサビリティ** - リクエストIDでログをトレース可能
3. **デバッグ効率** - 適切なログレベルで問題を特定しやすい
4. **セキュリティ** - 機密情報がログに出力されない
5. **本番運用** - JSON形式でログ集約システムと統合しやすい

### ログ出力例（JSON形式）

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "INFO",
  "module": "todo",
  "function": "create_todo",
  "line": 45,
  "request_id": "abc123-def456",
  "user_id": 42,
  "message": "Todo created successfully",
  "todo_id": 123
}
```

## 参考資料

- [Python Logging Documentation](https://docs.python.org/3/library/logging.html)
- [python-json-logger](https://github.com/madzak/python-json-logger)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [12-Factor App: Logs](https://12factor.net/logs)
