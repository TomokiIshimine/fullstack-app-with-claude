# 002: SQLAlchemy 2.x API への統一移行

## 概要

現在のコードベースで SQLAlchemy の API が混在しており、一部のリポジトリでは旧式の `.query()` API（1.x スタイル）を使用し、他では新しい `select()` API（2.x スタイル）を使用している。これを SQLAlchemy 2.x の推奨 API に統一する。

## 現状の問題

### 問題点
- **UserRepository** - `.query()` API を使用（SQLAlchemy 1.x スタイル、非推奨）
- **RefreshTokenRepository** - `.query()` API を使用（SQLAlchemy 1.x スタイル、非推奨）
- **TodoRepository** - `select()` API を使用（SQLAlchemy 2.x スタイル、推奨）
- コード一貫性の欠如
- SQLAlchemy 3.0 での `.query()` API 削除予定による将来的な互換性問題

### 影響範囲
- `backend/app/repositories/user.py`
- `backend/app/repositories/refresh_token.py`

## 修正方針

### 原則
1. すべてのリポジトリで `select()` API を使用
2. `session.execute()` を介してクエリを実行
3. 結果は `.scalar()`, `.scalars()`, `.all()` で取得
4. SQLAlchemy 2.0 スタイルガイドに準拠

### API マッピング表

| 旧API (1.x) | 新API (2.x) |
|------------|------------|
| `session.query(Model).filter(...)` | `session.execute(select(Model).where(...))` |
| `.first()` | `.scalar()` または `.scalars().first()` |
| `.all()` | `.scalars().all()` |
| `.filter_by(col=val)` | `.where(Model.col == val)` |
| `.filter(Model.col == val)` | `.where(Model.col == val)` |
| `.order_by(Model.col)` | `.order_by(Model.col)` |

## 実装仕様

### 1. UserRepository の移行

**ファイル:** `backend/app/repositories/user.py`

#### 変更前
```python
from backend.models.user import User

class UserRepository:
    def get_by_email(self, email: str) -> User | None:
        return self.session.query(User).filter_by(email=email).first()

    def get_by_id(self, user_id: int) -> User | None:
        return self.session.query(User).filter_by(id=user_id).first()

    def exists_by_email(self, email: str) -> bool:
        return self.session.query(User).filter_by(email=email).first() is not None
```

#### 変更後
```python
from sqlalchemy import select
from backend.models.user import User

class UserRepository:
    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return self.session.execute(stmt).scalar()

    def get_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.session.execute(stmt).scalar()

    def exists_by_email(self, email: str) -> bool:
        stmt = select(User).where(User.email == email)
        return self.session.execute(stmt).scalar() is not None
```

### 2. RefreshTokenRepository の移行

**ファイル:** `backend/app/repositories/refresh_token.py`

#### 変更前
```python
from backend.models.refresh_token import RefreshToken

class RefreshTokenRepository:
    def _get_by_token(self, token: str) -> RefreshToken | None:
        return (
            self.session.query(RefreshToken)
            .filter_by(token=token)
            .first()
        )

    def get_by_token(self, token: str) -> RefreshToken | None:
        return (
            self.session.query(RefreshToken)
            .filter_by(token=token, revoked=False)
            .first()
        )

    def delete_all_by_user_id(self, user_id: int) -> None:
        self.session.query(RefreshToken).filter_by(user_id=user_id).delete()
```

#### 変更後
```python
from sqlalchemy import select, delete
from backend.models.refresh_token import RefreshToken

class RefreshTokenRepository:
    def _get_by_token(self, token: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token == token)
        return self.session.execute(stmt).scalar()

    def get_by_token(self, token: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.revoked == False
        )
        return self.session.execute(stmt).scalar()

    def delete_all_by_user_id(self, user_id: int) -> None:
        stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
        self.session.execute(stmt)
```

### 3. TodoRepository の確認（変更不要）

**ファイル:** `backend/app/repositories/todo.py`

すでに `select()` API を使用しているため、変更不要。参考として正しい実装例：

```python
from sqlalchemy import select
from backend.models.todo import Todo

class TodoRepository:
    def get_by_id(self, todo_id: int) -> Todo | None:
        stmt = select(Todo).where(Todo.id == todo_id)
        return self.session.execute(stmt).scalar()

    def get_all_by_user_id(self, user_id: int) -> list[Todo]:
        stmt = select(Todo).where(Todo.user_id == user_id)
        return list(self.session.execute(stmt).scalars().all())
```

## テスト戦略

### 1. ユニットテスト（リポジトリ層）

**ファイル:** `backend/tests/repositories/test_user_repository.py`

```python
def test_get_by_email_uses_select_api(db_session):
    """UserRepository.get_by_email が select() API を使用することを確認"""
    repo = UserRepository(db_session)

    user = User(email="test@example.com", password_hash="hash", name="Test")
    db_session.add(user)
    db_session.flush()

    result = repo.get_by_email("test@example.com")

    assert result is not None
    assert result.email == "test@example.com"

def test_get_by_id_uses_select_api(db_session):
    """UserRepository.get_by_id が select() API を使用することを確認"""
    repo = UserRepository(db_session)

    user = User(email="test2@example.com", password_hash="hash", name="Test2")
    db_session.add(user)
    db_session.flush()

    result = repo.get_by_id(user.id)

    assert result is not None
    assert result.id == user.id

def test_exists_by_email_uses_select_api(db_session):
    """UserRepository.exists_by_email が select() API を使用することを確認"""
    repo = UserRepository(db_session)

    user = User(email="exists@example.com", password_hash="hash", name="Exists")
    db_session.add(user)
    db_session.flush()

    assert repo.exists_by_email("exists@example.com") is True
    assert repo.exists_by_email("notexists@example.com") is False
```

**ファイル:** `backend/tests/repositories/test_refresh_token_repository.py`

```python
def test_get_by_token_uses_select_api(db_session, user_factory):
    """RefreshTokenRepository.get_by_token が select() API を使用することを確認"""
    repo = RefreshTokenRepository(db_session)
    user = user_factory()

    token = RefreshToken(token="test_token_123", user_id=user.id)
    db_session.add(token)
    db_session.flush()

    result = repo.get_by_token("test_token_123")

    assert result is not None
    assert result.token == "test_token_123"

def test_delete_all_by_user_id_uses_delete_api(db_session, user_factory):
    """RefreshTokenRepository.delete_all_by_user_id が delete() API を使用することを確認"""
    repo = RefreshTokenRepository(db_session)
    user = user_factory()

    # 複数トークンを作成
    for i in range(3):
        token = RefreshToken(token=f"token_{i}", user_id=user.id)
        db_session.add(token)
    db_session.flush()

    # 削除実行
    repo.delete_all_by_user_id(user.id)
    db_session.flush()

    # 削除確認
    stmt = select(RefreshToken).where(RefreshToken.user_id == user.id)
    result = db_session.execute(stmt).scalars().all()
    assert len(result) == 0
```

### 2. 統合テスト（既存テストの実行）

すべての既存テストが pass することを確認：

```bash
# すべてのリポジトリテストを実行
poetry -C backend run pytest backend/tests/repositories/ -v

# サービス層のテストも実行（リポジトリを間接的に使用）
poetry -C backend run pytest backend/tests/services/ -v

# ルート層のテストも実行（E2E的にリポジトリを使用）
poetry -C backend run pytest backend/tests/routes/ -v
```

### 3. パフォーマンステスト（オプション）

新旧 API のパフォーマンスを比較：

```python
import time
from sqlalchemy import select

def test_performance_comparison(db_session, benchmark):
    """select() API のパフォーマンスを確認（参考）"""

    def query_with_select():
        stmt = select(User).where(User.email == "test@example.com")
        return db_session.execute(stmt).scalar()

    # benchmarkライブラリを使用してパフォーマンス測定
    result = benchmark(query_with_select)
    assert result is not None
```

## 移行チェックリスト

### 事前準備
- [ ] SQLAlchemy のバージョンを確認（2.0 以上であることを確認）
- [ ] 既存テストがすべて pass することを確認
- [ ] Git ブランチを作成（`feat/sqlalchemy-2x-migration`）

### UserRepository
- [ ] `get_by_email()` を `select()` API に移行
- [ ] `get_by_id()` を `select()` API に移行
- [ ] `exists_by_email()` を `select()` API に移行
- [ ] `save()` メソッドを確認（問題なければ変更不要）
- [ ] import 文に `from sqlalchemy import select` を追加

### RefreshTokenRepository
- [ ] `_get_by_token()` を `select()` API に移行
- [ ] `get_by_token()` を `select()` API に移行
- [ ] `delete_all_by_user_id()` を `delete()` API に移行
- [ ] `save_refresh_token()` を確認（問題なければ変更不要）
- [ ] import 文に `from sqlalchemy import select, delete` を追加

### テスト
- [ ] UserRepository のユニットテストを実行
- [ ] RefreshTokenRepository のユニットテストを実行
- [ ] すべてのサービス層テストを実行
- [ ] すべてのルート層テストを実行
- [ ] カバレッジレポートを確認（80%以上を維持）

### ドキュメント
- [ ] CLAUDE.md を更新（SQLAlchemy 2.x 使用を明記）
- [ ] コミットメッセージを作成（`refactor(backend): migrate to SQLAlchemy 2.x select() API`）

## ロールバック計画

問題が発生した場合、以下の手順で元に戻す：

```python
# UserRepository を旧APIに戻す
def get_by_email(self, email: str) -> User | None:
    return self.session.query(User).filter_by(email=email).first()

# RefreshTokenRepository を旧APIに戻す
def get_by_token(self, token: str) -> RefreshToken | None:
    return self.session.query(RefreshToken).filter_by(token=token, revoked=False).first()
```

## 期待される効果

### メリット
1. **将来的な互換性** - SQLAlchemy 3.0 へのスムーズな移行
2. **コード一貫性** - すべてのリポジトリで同じ API パターン
3. **保守性の向上** - 新しい開発者が混乱しない統一されたコードベース
4. **パフォーマンス** - SQLAlchemy 2.x の最適化を活用
5. **型安全性** - `select()` API は型ヒントとの相性が良い

### デメリット・リスク
- 移行作業の工数
- 既存テストの一部修正が必要になる可能性
- チーム全体への API 変更の周知が必要

### 緩和策
- 包括的なテスト実装
- 段階的な移行（リポジトリごとに順次移行）
- ロールバック計画の準備
- ドキュメントの更新

## 参考資料

- [SQLAlchemy 2.0 Migration Guide](https://docs.sqlalchemy.org/en/20/changelog/migration_20.html)
- [SQLAlchemy 2.0 - ORM Querying Guide](https://docs.sqlalchemy.org/en/20/orm/queryguide/)
- [What's New in SQLAlchemy 2.0?](https://docs.sqlalchemy.org/en/20/changelog/whatsnew_20.html)
- [SQLAlchemy 2.0 - select() API](https://docs.sqlalchemy.org/en/20/core/selectable.html#sqlalchemy.sql.expression.select)

## 補足：よくある間違い

### ❌ 間違った移行例

```python
# ❌ 悪い例：execute() を忘れている
stmt = select(User).where(User.email == email)
return stmt.scalar()  # エラー！

# ✓ 正しい例
stmt = select(User).where(User.email == email)
return self.session.execute(stmt).scalar()
```

```python
# ❌ 悪い例：scalar() と scalars() を混同
stmt = select(User).where(User.role == "admin")
return self.session.execute(stmt).scalar()  # 1件だけ返す

# ✓ 正しい例（複数件取得）
stmt = select(User).where(User.role == "admin")
return list(self.session.execute(stmt).scalars().all())
```

```python
# ❌ 悪い例：filter_by() を使おうとする（select()にはない）
stmt = select(User).filter_by(email=email)  # エラー！

# ✓ 正しい例：where() を使用
stmt = select(User).where(User.email == email)
```
