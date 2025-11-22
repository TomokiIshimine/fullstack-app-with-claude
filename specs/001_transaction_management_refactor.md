# 001: トランザクション管理の統一リファクタリング

## 概要

現在のリポジトリ層でトランザクション管理が不一貫な状態になっており、一部のリポジトリでは `session.commit()` を使用し、他では `session.flush()` のみを使用している。これを統一し、Flask の `teardown_appcontext` でトランザクション管理を一元化する。

## 現状の問題

### 問題点
- **RefreshTokenRepository** のみが `session.commit()` を呼び出している
- **UserRepository**, **TodoRepository** は `session.flush()` のみ使用
- トランザクションの責務がリポジトリ層とアプリケーション層で分散
- データ永続性の保証が不明確

### 影響範囲
- `backend/app/repositories/refresh_token.py`
- `backend/app/repositories/user.py`
- `backend/app/repositories/todo.py`
- `backend/main.py` (teardown_appcontext)

## 修正方針

### 原則
1. **リポジトリ層は `flush()` のみを使用** - データベースへの書き込みを準備するが、コミットはしない
2. **サービス層はトランザクション境界を意識しない** - ビジネスロジックに集中
3. **Flask の `teardown_appcontext` で自動コミット** - リクエストごとにトランザクションを管理

### アーキテクチャ図
```
Request → Routes → Services → Repositories → flush()
                                              ↓
                        teardown_appcontext → commit() / rollback()
```

## 実装仕様

### 1. RefreshTokenRepository の修正

**ファイル:** `backend/app/repositories/refresh_token.py`

#### 変更前
```python
def save_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
    try:
        self.session.add(refresh_token)
        self.session.commit()  # ← 削除
        self.session.refresh(refresh_token)
        return refresh_token
    except SQLAlchemyError as e:
        self.session.rollback()  # ← 削除
        logger.error(f"Error saving refresh token: {str(e)}")
        raise

def delete_refresh_token_by_token(self, token: str) -> None:
    refresh_token = self._get_by_token(token)
    if refresh_token:
        self.session.delete(refresh_token)
        self.session.commit()  # ← 削除
```

#### 変更後
```python
def save_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
    try:
        self.session.add(refresh_token)
        self.session.flush()  # ← 変更: commit → flush
        self.session.refresh(refresh_token)
        return refresh_token
    except SQLAlchemyError as e:
        logger.error(f"Error saving refresh token: {str(e)}")
        raise  # teardown_appcontext でロールバック

def delete_refresh_token_by_token(self, token: str) -> None:
    refresh_token = self._get_by_token(token)
    if refresh_token:
        self.session.delete(refresh_token)
        self.session.flush()  # ← 変更: commit → flush
```

### 2. teardown_appcontext の確認・強化

**ファイル:** `backend/main.py`

#### 現状確認
```python
@app.teardown_appcontext
def shutdown_session(exception=None):
    """Clean up the database session after each request."""
    if exception:
        db.session.rollback()
    db.session.remove()
```

#### 改善版（必要に応じて）
```python
@app.teardown_appcontext
def shutdown_session(exception=None):
    """
    Clean up the database session after each request.
    Commits successful transactions or rolls back on errors.
    """
    try:
        if exception:
            logger.warning(f"Request ended with exception, rolling back: {exception}")
            db.session.rollback()
        else:
            # 正常終了時は自動コミット
            db.session.commit()
    except Exception as e:
        logger.error(f"Error during session teardown: {str(e)}")
        db.session.rollback()
    finally:
        db.session.remove()
```

### 3. 他のリポジトリの確認

**UserRepository, TodoRepository** はすでに `flush()` を使用しているため、変更不要。

```python
# backend/app/repositories/user.py - OK
self.session.add(user)
self.session.flush()

# backend/app/repositories/todo.py - OK
self.session.add(todo)
self.session.flush()
```

## テスト戦略

### 1. ユニットテスト（リポジトリ層）

**ファイル:** `backend/tests/repositories/test_refresh_token_repository.py`

```python
def test_save_refresh_token_uses_flush_not_commit(mocker, db_session):
    """refresh token保存時にflush()を使用することを確認"""
    repo = RefreshTokenRepository(db_session)
    mock_commit = mocker.spy(db_session, 'commit')
    mock_flush = mocker.spy(db_session, 'flush')

    token = RefreshToken(token="test_token", user_id=1)
    repo.save_refresh_token(token)

    # flush()が呼ばれ、commit()は呼ばれないことを確認
    mock_flush.assert_called_once()
    mock_commit.assert_not_called()
```

### 2. 統合テスト（teardown_appcontext）

**ファイル:** `backend/tests/test_main.py`

```python
def test_teardown_appcontext_commits_on_success(client, db_session, mocker):
    """正常終了時にコミットされることを確認"""
    mock_commit = mocker.spy(db_session, 'commit')
    mock_rollback = mocker.spy(db_session, 'rollback')

    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'Password123!',
        'name': 'Test User'
    })

    assert response.status_code == 201
    mock_commit.assert_called()
    mock_rollback.assert_not_called()

def test_teardown_appcontext_rollbacks_on_error(client, db_session, mocker):
    """エラー時にロールバックされることを確認"""
    mock_commit = mocker.spy(db_session, 'commit')
    mock_rollback = mocker.spy(db_session, 'rollback')

    # エラーを引き起こすリクエスト
    response = client.post('/api/auth/register', json={
        'email': 'invalid-email',  # バリデーションエラー
        'password': 'weak',
        'name': ''
    })

    assert response.status_code == 400
    mock_rollback.assert_called()
```

### 3. E2Eテスト（データ永続性）

**ファイル:** `backend/tests/routes/test_auth_routes.py`

```python
def test_refresh_token_persists_after_request(client, db_session):
    """リフレッシュトークンがリクエスト後に永続化されることを確認"""
    # ユーザー登録
    register_response = client.post('/api/auth/register', json={
        'email': 'persist@example.com',
        'password': 'Password123!',
        'name': 'Persist User'
    })

    # トークン取得
    refresh_token = register_response.json['refresh_token']

    # セッションをクリアして新しいセッションで確認
    db_session.expire_all()

    # データベースに永続化されていることを確認
    from backend.repositories.refresh_token import RefreshTokenRepository
    repo = RefreshTokenRepository(db_session)
    token_obj = repo.get_by_token(refresh_token)

    assert token_obj is not None
    assert token_obj.token == refresh_token
```

## ロールバック計画

万が一問題が発生した場合、以下の手順で元に戻す：

```python
# RefreshTokenRepository の save_refresh_token, delete_refresh_token_by_token
# で flush() → commit() に戻す
self.session.commit()

# teardown_appcontext で自動コミットを削除
@app.teardown_appcontext
def shutdown_session(exception=None):
    if exception:
        db.session.rollback()
    db.session.remove()
```

## 実装チェックリスト

- [ ] RefreshTokenRepository.save_refresh_token() を flush() に変更
- [ ] RefreshTokenRepository.delete_refresh_token_by_token() を flush() に変更
- [ ] teardown_appcontext で自動コミットを実装
- [ ] UserRepository, TodoRepository が flush() を使用していることを確認
- [ ] ユニットテストを追加・実行
- [ ] 統合テストを追加・実行
- [ ] E2Eテストを追加・実行
- [ ] すべてのテストが pass することを確認
- [ ] ログ出力を確認（commit/rollback のタイミング）
- [ ] 既存の機能に影響がないことを確認

## 期待される効果

### メリット
1. **一貫性の向上** - すべてのリポジトリで同じトランザクション管理パターン
2. **責任の明確化** - リポジトリ層はデータ操作のみ、トランザクション管理はアプリケーション層
3. **保守性の向上** - トランザクション管理が一箇所に集約
4. **エラーハンドリングの改善** - teardown_appcontext で統一的なエラー処理

### リスク
- teardown_appcontext の実装ミスによるデータロス
- テストカバレッジが不十分な場合のリグレッション

### 緩和策
- 包括的なテスト実装
- 段階的なロールアウト（dev → staging → production）
- ロールバック計画の準備

## 参考資料

- [Flask: Application Teardown](https://flask.palletsprojects.com/en/3.0.x/appcontext/#storing-data)
- [SQLAlchemy: Session Basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [SQLAlchemy: flush() vs commit()](https://docs.sqlalchemy.org/en/20/orm/session_api.html#sqlalchemy.orm.Session.flush)
