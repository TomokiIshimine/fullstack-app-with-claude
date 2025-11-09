# 005: 環境変数管理の一元化

## 概要

現在、環境変数が複数のファイルで個別に読み込まれており、設定管理が分散している。これを `config.py` に一元化し、型安全で保守性の高い設定管理システムを構築する。

## 現状の問題

### 問題点

環境変数が以下のファイルで個別に読み込まれている：

1. **`backend/app/services/auth_service.py`** - JWT 設定
   ```python
   JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
   JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
   ```

2. **`backend/app/routes/auth_routes.py`** - トークン有効期限
   ```python
   ACCESS_TOKEN_EXPIRES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
   REFRESH_TOKEN_EXPIRES = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "7"))
   ```

3. **`backend/app/extensions/limiter.py`** - Redis 接続
   ```python
   REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
   ```

4. **`backend/main.py`** - CORS 設定
   ```python
   FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
   ```

5. **`backend/database.py`** - データベース接続（すでに部分的に一元化）

### 影響
- 設定の重複読み込み
- デフォルト値の不統一
- 型安全性の欠如（文字列→int 変換が散在）
- テストでのモック化が困難
- 環境変数の全体像が把握しづらい

## 修正方針

### 原則
1. **単一責任** - `config.py` がすべての環境変数を管理
2. **型安全** - Pydantic を使用して型バリデーション
3. **デフォルト値の明示** - すべての設定にデフォルト値を定義
4. **環境別設定** - development, testing, production の設定を分離
5. **検証** - 起動時に必須設定が存在することを確認

## 実装仕様

### 1. 設定クラスの作成

**ファイル:** `backend/config.py`

```python
"""Application configuration management."""
import os
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # 未定義の環境変数を無視
    )

    # ============================================================
    # Application Settings
    # ============================================================
    ENV: Literal["development", "testing", "production"] = Field(
        default="development",
        description="Application environment"
    )

    DEBUG: bool = Field(
        default=False,
        description="Debug mode flag"
    )

    # ============================================================
    # Database Settings
    # ============================================================
    DATABASE_URL: str = Field(
        default="mysql+pymysql://user:password@db:3306/todoapp",
        description="Database connection URL"
    )

    # Cloud SQL設定（GCP環境用）
    USE_CLOUD_SQL: bool = Field(default=False)
    CLOUD_SQL_CONNECTION_NAME: str = Field(default="")
    DB_USER: str = Field(default="user")
    DB_PASSWORD: str = Field(default="password")
    DB_NAME: str = Field(default="todoapp")

    # ============================================================
    # JWT Settings
    # ============================================================
    JWT_SECRET_KEY: str = Field(
        ...,  # 必須フィールド
        min_length=32,
        description="Secret key for JWT token signing"
    )

    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )

    ACCESS_TOKEN_EXPIRES_MINUTES: int = Field(
        default=15,
        ge=1,
        le=1440,  # 最大24時間
        description="Access token expiration in minutes"
    )

    REFRESH_TOKEN_EXPIRES_DAYS: int = Field(
        default=7,
        ge=1,
        le=90,  # 最大90日
        description="Refresh token expiration in days"
    )

    # ============================================================
    # CORS Settings
    # ============================================================
    FRONTEND_ORIGIN: str = Field(
        default="http://localhost:5173",
        description="Frontend origin for CORS"
    )

    # 複数オリジン対応（カンマ区切り）
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        description="Allowed CORS origins (comma-separated)"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # ============================================================
    # Redis Settings (Rate Limiting)
    # ============================================================
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for rate limiting"
    )

    USE_REDIS_RATE_LIMIT: bool = Field(
        default=False,
        description="Use Redis for rate limiting (falls back to in-memory if False)"
    )

    # ============================================================
    # Rate Limiting Settings
    # ============================================================
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable rate limiting"
    )

    RATE_LIMIT_DEFAULT: str = Field(
        default="100 per hour",
        description="Default rate limit for all endpoints"
    )

    RATE_LIMIT_AUTH: str = Field(
        default="5 per minute",
        description="Rate limit for authentication endpoints"
    )

    # ============================================================
    # Logging Settings
    # ============================================================
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Logging level"
    )

    LOG_FORMAT: str = Field(
        default="json",
        description="Log format (json or text)"
    )

    # ============================================================
    # Security Settings
    # ============================================================
    SECRET_KEY: str = Field(
        ...,  # 必須フィールド
        min_length=32,
        description="Flask secret key for session management"
    )

    BCRYPT_LOG_ROUNDS: int = Field(
        default=12,
        ge=4,
        le=31,
        description="Bcrypt hashing rounds"
    )

    # ============================================================
    # Testing Settings
    # ============================================================
    TESTING: bool = Field(
        default=False,
        description="Testing mode flag"
    )

    # ============================================================
    # Validators
    # ============================================================
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v.startswith(("mysql://", "mysql+pymysql://", "sqlite://")):
            raise ValueError("DATABASE_URL must start with mysql:// or sqlite://")
        return v

    @field_validator("JWT_SECRET_KEY", "SECRET_KEY")
    @classmethod
    def validate_secret_keys(cls, v: str) -> str:
        """Validate secret keys are strong enough."""
        if len(v) < 32:
            raise ValueError("Secret keys must be at least 32 characters long")
        return v

    @field_validator("REDIS_URL")
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        """Validate Redis URL format."""
        if not v.startswith("redis://"):
            raise ValueError("REDIS_URL must start with redis://")
        return v


# ============================================================
# Environment-specific configurations
# ============================================================

class DevelopmentSettings(Settings):
    """Development environment settings."""

    ENV: Literal["development"] = "development"
    DEBUG: bool = True
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "DEBUG"


class TestingSettings(Settings):
    """Testing environment settings."""

    ENV: Literal["testing"] = "testing"
    TESTING: bool = True
    DATABASE_URL: str = "sqlite:///:memory:"
    USE_REDIS_RATE_LIMIT: bool = False
    RATE_LIMIT_ENABLED: bool = False


class ProductionSettings(Settings):
    """Production environment settings."""

    ENV: Literal["production"] = "production"
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"


# ============================================================
# Settings factory
# ============================================================

def get_settings() -> Settings:
    """
    Get settings based on environment.

    Returns:
        Settings instance for the current environment
    """
    env = os.getenv("ENV", "development")

    settings_map = {
        "development": DevelopmentSettings,
        "testing": TestingSettings,
        "production": ProductionSettings,
    }

    settings_class = settings_map.get(env, Settings)
    return settings_class()


# Singleton instance
settings = get_settings()
```

### 2. 既存コードの修正

#### 2.1 AuthService の修正

**ファイル:** `backend/app/services/auth_service.py`

```python
# 変更前
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# 変更後
from backend.config import settings

class AuthService:
    def _generate_token(self, user_id: int, expires_delta: timedelta) -> str:
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + expires_delta,
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,  # ← 変更
            algorithm=settings.JWT_ALGORITHM  # ← 変更
        )
```

#### 2.2 AuthRoutes の修正

**ファイル:** `backend/app/routes/auth_routes.py`

```python
# 変更前
ACCESS_TOKEN_EXPIRES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
REFRESH_TOKEN_EXPIRES = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "7"))

# 変更後
from backend.config import settings
from datetime import timedelta

@auth_bp.route("/login", methods=["POST"])
def login():
    # ... 認証処理

    # トークン生成
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRES_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRES_DAYS)

    access_token = auth_service.generate_access_token(user.id, access_token_expires)
    refresh_token = auth_service.generate_refresh_token(user.id, refresh_token_expires)
```

#### 2.3 Limiter の修正

**ファイル:** `backend/app/extensions/limiter.py`

```python
# 変更前
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# 変更後
from backend.config import settings

def get_limiter_storage():
    """Get rate limiter storage based on configuration."""
    if settings.USE_REDIS_RATE_LIMIT:
        return f"{settings.REDIS_URL}"
    else:
        return "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=get_limiter_storage(),
    default_limits=[settings.RATE_LIMIT_DEFAULT]
)
```

#### 2.4 Main.py の修正

**ファイル:** `backend/main.py`

```python
# 変更前
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
CORS(app, origins=[FRONTEND_ORIGIN])

# 変更後
from backend.config import settings

CORS(app, origins=settings.cors_origins_list)

# アプリケーション設定
app.config["SECRET_KEY"] = settings.SECRET_KEY
app.config["ENV"] = settings.ENV
app.config["DEBUG"] = settings.DEBUG
```

#### 2.5 Database の修正

**ファイル:** `backend/database.py`

```python
# 変更前
database_url = os.getenv("DATABASE_URL")

# 変更後
from backend.config import settings

database_url = settings.DATABASE_URL
```

### 3. .env.example の更新

**ファイル:** `backend/.env.example`

```bash
# Application Settings
ENV=development
DEBUG=true

# Database Settings
DATABASE_URL=mysql+pymysql://user:password@db:3306/todoapp

# Cloud SQL (GCP)
USE_CLOUD_SQL=false
CLOUD_SQL_CONNECTION_NAME=
DB_USER=user
DB_PASSWORD=password
DB_NAME=todoapp

# JWT Settings (REQUIRED)
JWT_SECRET_KEY=your-secret-key-at-least-32-characters-long-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRES_MINUTES=15
REFRESH_TOKEN_EXPIRES_DAYS=7

# CORS Settings
FRONTEND_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis Settings
REDIS_URL=redis://redis:6379/0
USE_REDIS_RATE_LIMIT=false

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=100 per hour
RATE_LIMIT_AUTH=5 per minute

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Security (REQUIRED)
SECRET_KEY=your-flask-secret-key-at-least-32-characters-long-change-this
BCRYPT_LOG_ROUNDS=12

# Testing
TESTING=false
```

## テスト戦略

### 1. 設定のバリデーションテスト

**ファイル:** `backend/tests/test_config.py`

```python
import pytest
from pydantic import ValidationError
from backend.config import Settings, DevelopmentSettings, ProductionSettings


class TestSettings:
    def test_default_settings(self):
        """デフォルト設定が正しく読み込まれることを確認"""
        settings = Settings(
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert settings.ENV == "development"
        assert settings.JWT_ALGORITHM == "HS256"
        assert settings.ACCESS_TOKEN_EXPIRES_MINUTES == 15

    def test_jwt_secret_key_required(self):
        """JWT_SECRET_KEY が必須であることを確認"""
        with pytest.raises(ValidationError):
            Settings(SECRET_KEY="a" * 32)

    def test_jwt_secret_key_min_length(self):
        """JWT_SECRET_KEY の最小長が検証されることを確認"""
        with pytest.raises(ValidationError, match="at least 32 characters"):
            Settings(
                JWT_SECRET_KEY="short",
                SECRET_KEY="a" * 32
            )

    def test_database_url_validation(self):
        """DATABASE_URL のフォーマットが検証されることを確認"""
        with pytest.raises(ValidationError, match="must start with mysql"):
            Settings(
                DATABASE_URL="postgresql://invalid",
                JWT_SECRET_KEY="a" * 32,
                SECRET_KEY="b" * 32
            )

    def test_cors_origins_list(self):
        """CORS origins がリストとして取得できることを確認"""
        settings = Settings(
            CORS_ORIGINS="http://localhost:5173,http://localhost:3000",
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert len(settings.cors_origins_list) == 2
        assert "http://localhost:5173" in settings.cors_origins_list


class TestEnvironmentSettings:
    def test_development_settings(self):
        """Development 設定が正しく適用されることを確認"""
        settings = DevelopmentSettings(
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert settings.ENV == "development"
        assert settings.DEBUG is True
        assert settings.LOG_LEVEL == "DEBUG"

    def test_production_settings(self):
        """Production 設定が正しく適用されることを確認"""
        settings = ProductionSettings(
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert settings.ENV == "production"
        assert settings.DEBUG is False
        assert settings.LOG_LEVEL == "INFO"
```

### 2. 統合テスト

**ファイル:** `backend/tests/test_integration_config.py`

```python
def test_app_uses_config_settings(app):
    """アプリケーションが config の設定を使用していることを確認"""
    from backend.config import settings

    assert app.config["SECRET_KEY"] == settings.SECRET_KEY
    assert app.config["ENV"] == settings.ENV


def test_auth_service_uses_config(db_session):
    """AuthService が config の JWT 設定を使用していることを確認"""
    from backend.services.auth_service import AuthService
    from backend.config import settings

    service = AuthService(db_session)
    # JWT生成時に settings.JWT_SECRET_KEY が使用されることを確認
    # （実装詳細に依存）
```

## 実装チェックリスト

### 設定ファイル作成
- [ ] `backend/config.py` を作成
- [ ] Pydantic Settings クラスを実装
- [ ] 環境別設定クラスを実装
- [ ] バリデータを実装

### 既存コード修正
- [ ] `backend/app/services/auth_service.py` を修正
- [ ] `backend/app/routes/auth_routes.py` を修正
- [ ] `backend/app/extensions/limiter.py` を修正
- [ ] `backend/main.py` を修正
- [ ] `backend/database.py` を修正

### 環境変数ファイル
- [ ] `backend/.env.example` を更新
- [ ] `.env` ファイルを確認（実際の値を設定）

### テスト
- [ ] `backend/tests/test_config.py` を作成
- [ ] 設定バリデーションテストを実装
- [ ] 環境別設定テストを実装
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `docs/00_development.md` に環境変数の説明を追加
- [ ] `backend/CLAUDE.md` を更新

## 期待される効果

### メリット
1. **一元管理** - すべての設定が 1 ファイルで管理される
2. **型安全** - Pydantic による型チェックとバリデーション
3. **ドキュメント化** - 設定の説明が Field の description に記載される
4. **テスト容易性** - 設定のモックが簡単
5. **環境別設定** - 環境ごとの設定を明示的に管理

### デメリット・リスク
- 既存コードの広範な修正が必要
- Pydantic Settings の学習コストわずかにあり

## 参考資料

- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [12-Factor App: Config](https://12factor.net/config)
- [Flask Configuration Handling](https://flask.palletsprojects.com/en/3.0.x/config/)
