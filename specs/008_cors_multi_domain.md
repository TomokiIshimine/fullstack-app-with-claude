# 008: CORS 複数ドメイン対応

## 概要

現在の CORS 設定は単一のフロントエンドオリジンのみをサポートしているが、開発環境・ステージング環境・本番環境で異なるドメインを使用するため、複数オリジンに対応する必要がある。

## 現状の問題

### 問題点

**ファイル:** `backend/main.py`

```python
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
CORS(app, origins=[FRONTEND_ORIGIN])
```

### 影響
- 複数のフロントエンドドメインをサポートできない
- 開発環境で複数のポート（Vite の 5173、別の開発サーバーの 3000 など）を使用する場合に不便
- ステージング環境と本番環境で異なるドメインを使い分けられない

### ユースケース

| 環境 | フロントエンドURL |
|------|------------------|
| Local Development (Vite) | `http://localhost:5173` |
| Local Development (別サーバー) | `http://localhost:3000` |
| Staging | `https://staging.example.com` |
| Production | `https://app.example.com` |

## 修正方針

### 原則
1. **環境変数で複数オリジンを指定** - カンマ区切りで複数ドメインをサポート
2. **デフォルト値の設定** - 開発環境で一般的なポートをデフォルト設定
3. **セキュリティ優先** - 本番環境では明示的なオリジンのみ許可
4. **設定の一元化** - `config.py` で管理（spec 005と連携）

## 実装仕様

### 1. Config の拡張（spec 005との連携）

**ファイル:** `backend/config.py`

```python
class Settings(BaseSettings):
    # ... 既存の設定

    # CORS Settings
    FRONTEND_ORIGIN: str = Field(
        default="http://localhost:5173",
        description="Primary frontend origin (backward compatibility)"
    )

    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        description="Allowed CORS origins (comma-separated)"
    )

    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow cookies and credentials in CORS requests"
    )

    CORS_MAX_AGE: int = Field(
        default=3600,
        description="CORS preflight cache duration in seconds"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """
        Get CORS origins as a list.

        Returns:
            List of allowed origins, deduplicated and trimmed
        """
        # CORS_ORIGINS と FRONTEND_ORIGIN を統合
        origins_str = self.CORS_ORIGINS
        if self.FRONTEND_ORIGIN not in origins_str:
            origins_str += f",{self.FRONTEND_ORIGIN}"

        # カンマ区切りでリストに変換、重複を削除
        origins = [origin.strip() for origin in origins_str.split(",")]
        return list(set(origins))  # 重複削除


class DevelopmentSettings(Settings):
    """Development environment settings."""

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"


class ProductionSettings(Settings):
    """Production environment settings."""

    # 本番環境では明示的にオリジンを指定（デフォルト値を使用しない）
    CORS_ORIGINS: str = Field(
        ...,  # 必須
        description="Production CORS origins (must be explicitly set)"
    )
```

### 2. CORS 初期化の修正

**ファイル:** `backend/main.py`

#### 変更前

```python
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
CORS(app, origins=[FRONTEND_ORIGIN])
```

#### 変更後

```python
from flask_cors import CORS
from backend.config import settings

# CORS設定
CORS(
    app,
    origins=settings.cors_origins_list,
    supports_credentials=settings.CORS_ALLOW_CREDENTIALS,
    max_age=settings.CORS_MAX_AGE,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type", "Authorization"],
)

# ログにCORS設定を出力（デバッグ用）
logger.info(f"CORS enabled for origins: {settings.cors_origins_list}")
```

### 3. .env ファイルの更新

**ファイル:** `backend/.env.example`

```bash
# CORS Settings
# カンマ区切りで複数のオリジンを指定
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# レガシー互換性のため FRONTEND_ORIGIN も維持（オプション）
FRONTEND_ORIGIN=http://localhost:5173

# CORS詳細設定
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=3600
```

**本番環境の例（`.env.production`）:**

```bash
# Production CORS Settings
CORS_ORIGINS=https://app.example.com,https://www.example.com
FRONTEND_ORIGIN=https://app.example.com
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=86400  # 24時間
```

### 4. 動的オリジン検証（オプション・高度な実装）

セキュリティを強化したい場合、オリジンの検証を動的に行う：

**ファイル:** `backend/app/utils/cors.py`

```python
"""CORS utility functions."""
import re
from typing import List


def validate_origin(origin: str, allowed_origins: List[str]) -> bool:
    """
    Validate if origin is allowed.

    Args:
        origin: Request origin header
        allowed_origins: List of allowed origins (supports wildcards)

    Returns:
        True if origin is allowed, False otherwise
    """
    if not origin:
        return False

    for allowed in allowed_origins:
        # 完全一致
        if origin == allowed:
            return True

        # ワイルドカードサポート（例: https://*.example.com）
        if "*" in allowed:
            pattern = allowed.replace(".", r"\.").replace("*", r"[^.]+")
            if re.match(f"^{pattern}$", origin):
                return True

    return False


def get_cors_config(settings):
    """
    Get CORS configuration.

    Args:
        settings: Application settings

    Returns:
        Dictionary of CORS configuration
    """
    return {
        "origins": settings.cors_origins_list,
        "supports_credentials": settings.CORS_ALLOW_CREDENTIALS,
        "max_age": settings.CORS_MAX_AGE,
        "allow_headers": ["Content-Type", "Authorization", "X-Request-ID"],
        "expose_headers": ["Content-Type", "X-Request-ID"],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }
```

**使用例（main.py）:**

```python
from backend.utils.cors import get_cors_config
from backend.config import settings

# CORS設定を取得
cors_config = get_cors_config(settings)
CORS(app, **cors_config)
```

## テスト戦略

### 1. 設定のユニットテスト

**ファイル:** `backend/tests/test_config.py`

```python
from backend.config import Settings, DevelopmentSettings, ProductionSettings


class TestCORSConfig:
    def test_cors_origins_list_single(self):
        """単一オリジンの場合のテスト"""
        settings = Settings(
            CORS_ORIGINS="http://localhost:5173",
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert len(settings.cors_origins_list) == 1
        assert "http://localhost:5173" in settings.cors_origins_list

    def test_cors_origins_list_multiple(self):
        """複数オリジンの場合のテスト"""
        settings = Settings(
            CORS_ORIGINS="http://localhost:5173,http://localhost:3000,https://app.example.com",
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        assert len(settings.cors_origins_list) >= 3
        assert "http://localhost:5173" in settings.cors_origins_list
        assert "http://localhost:3000" in settings.cors_origins_list
        assert "https://app.example.com" in settings.cors_origins_list

    def test_cors_origins_list_deduplication(self):
        """重複するオリジンが削除されることを確認"""
        settings = Settings(
            CORS_ORIGINS="http://localhost:5173,http://localhost:5173",
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        # 重複が削除されて1つだけ
        assert settings.cors_origins_list.count("http://localhost:5173") == 1

    def test_cors_origins_list_with_spaces(self):
        """スペースが含まれていても正しくパースされることを確認"""
        settings = Settings(
            CORS_ORIGINS="http://localhost:5173 , http://localhost:3000 ",
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        # スペースがトリムされる
        assert "http://localhost:5173" in settings.cors_origins_list
        assert "http://localhost:3000" in settings.cors_origins_list

    def test_development_settings_cors_defaults(self):
        """Development設定のデフォルトCORSオリジンを確認"""
        settings = DevelopmentSettings(
            JWT_SECRET_KEY="a" * 32,
            SECRET_KEY="b" * 32
        )

        # 開発環境では複数のlocalhostポートが含まれる
        assert "http://localhost:5173" in settings.cors_origins_list
        assert "http://localhost:3000" in settings.cors_origins_list
```

### 2. CORS の統合テスト

**ファイル:** `backend/tests/test_cors.py`

```python
import pytest


class TestCORSIntegration:
    def test_cors_preflight_allowed_origin(self, client):
        """許可されたオリジンからのpreflightリクエストが成功することを確認"""
        response = client.options(
            '/api/auth/login',
            headers={
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        )

        assert response.status_code == 200
        assert response.headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173'
        assert 'POST' in response.headers.get('Access-Control-Allow-Methods', '')

    def test_cors_preflight_disallowed_origin(self, client):
        """許可されていないオリジンからのpreflightリクエストが拒否されることを確認"""
        response = client.options(
            '/api/auth/login',
            headers={
                'Origin': 'http://malicious.com',
                'Access-Control-Request-Method': 'POST',
            }
        )

        # Originヘッダーが返されない、または異なる値
        assert response.headers.get('Access-Control-Allow-Origin') != 'http://malicious.com'

    def test_cors_actual_request_with_credentials(self, client):
        """認証情報を含むCORSリクエストが正しく処理されることを確認"""
        response = client.post(
            '/api/auth/login',
            json={'email': 'test@example.com', 'password': 'password'},
            headers={'Origin': 'http://localhost:5173'}
        )

        # Access-Control-Allow-Credentials ヘッダーが true
        assert response.headers.get('Access-Control-Allow-Credentials') == 'true'
```

### 3. E2Eテスト（フロントエンドから）

フロントエンドからの実際のCORSリクエストをテスト：

```typescript
// frontend/tests/e2e/cors.spec.ts
describe('CORS Tests', () => {
  it('should allow requests from localhost:5173', async () => {
    const response = await fetch('http://localhost:8000/api/todos', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      }
    });

    expect(response.ok).toBe(true);
  });
});
```

## 実装チェックリスト

### 設定ファイル修正
- [ ] `backend/config.py` に CORS 関連設定を追加
- [ ] `cors_origins_list` プロパティを実装
- [ ] 環境別設定（Development, Production）を定義

### CORS 初期化修正
- [ ] `backend/main.py` の CORS 初期化を複数オリジン対応に変更
- [ ] CORS ログ出力を追加

### 環境変数ファイル
- [ ] `backend/.env.example` を更新
- [ ] `.env.production.example` を作成（オプション）

### ユーティリティ（オプション）
- [ ] `backend/app/utils/cors.py` を作成
- [ ] `validate_origin()` を実装
- [ ] `get_cors_config()` を実装

### テスト
- [ ] `backend/tests/test_config.py` に CORS 設定テストを追加
- [ ] `backend/tests/test_cors.py` を作成
- [ ] CORS統合テストを実装
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `docs/00_development.md` に CORS 設定方法を追加
- [ ] `backend/CLAUDE.md` を更新

## 期待される効果

### メリット
1. **柔軟性** - 複数のフロントエンドドメインをサポート
2. **環境対応** - 開発・ステージング・本番で異なるドメインを使用可能
3. **セキュリティ** - 明示的に許可したオリジンのみアクセス可能
4. **保守性** - 設定が一元化され管理しやすい

### 使用例

```bash
# 開発環境（.env）
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# ステージング環境（.env.staging）
CORS_ORIGINS=https://staging-app.example.com,https://preview.example.com

# 本番環境（.env.production）
CORS_ORIGINS=https://app.example.com,https://www.example.com
```

## セキュリティ考慮事項

### ワイルドカードの使用（非推奨）

```python
# ❌ 危険：すべてのオリジンを許可
CORS(app, origins="*")

# ✓ 安全：明示的なオリジンのみ許可
CORS(app, origins=["https://app.example.com", "https://www.example.com"])
```

### サブドメインワイルドカード（慎重に使用）

```python
# オプション：サブドメインワイルドカードをサポートする場合
# *.example.com のようなパターンマッチングを実装
# ただし、セキュリティリスクを理解した上で使用
```

## 参考資料

- [Flask-CORS Documentation](https://flask-cors.readthedocs.io/)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Cheat_Sheet.html)
