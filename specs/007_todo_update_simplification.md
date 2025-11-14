# 007: TodoUpdateData の簡潔化

## 概要

現在の `TodoUpdateData` クラスは、部分更新を実現するために複雑な `_fields_set` トラッキング機構を実装している。これを Pydantic の標準機能 `exclude_unset=True` を使用した簡潔な実装に置き換える。

## 現状の問題

### 問題点

**ファイル:** `backend/app/schemas/todo.py`

```python
class TodoUpdateData(BaseModel):
    title: str | None = None
    description: str | None = None
    completed: bool | None = None

    # 複雑な実装
    _fields_set: set[str] = set()

    def model_post_init(self, __context):
        """Track which fields were explicitly set."""
        self._fields_set = set(self.model_fields_set)

    def get_update_data(self) -> dict:
        """Get only the fields that were explicitly set."""
        return {
            field: getattr(self, field)
            for field in self._fields_set
        }
```

### 影響
- コードが複雑で理解しづらい
- `model_post_init` のオーバーライドが必要
- Pydantic の標準機能で同じことが実現可能
- テストコードも複雑化

## 修正方針

### 原則
1. **Pydantic 標準機能を活用** - `model_dump(exclude_unset=True)` を使用
2. **シンプルな実装** - カスタムロジックを削除
3. **型安全性の維持** - 型ヒントはそのまま維持

### Pydantic の `exclude_unset` とは

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str | None = None
    email: str | None = None
    age: int | None = None

# リクエストで name と email のみ指定
user = User(name="Alice", email="alice@example.com")

# exclude_unset=True で指定されたフィールドのみ取得
user.model_dump(exclude_unset=True)
# => {"name": "Alice", "email": "alice@example.com"}
# age は含まれない（デフォルト値でも）
```

## 実装仕様

### 1. TodoUpdateData の簡潔化

**ファイル:** `backend/app/schemas/todo.py`

#### 変更前（複雑な実装）

```python
class TodoUpdateData(BaseModel):
    """Schema for updating a todo item."""

    title: str | None = None
    description: str | None = None
    completed: bool | None = None

    _fields_set: set[str] = set()

    def model_post_init(self, __context):
        """Track which fields were explicitly set."""
        self._fields_set = set(self.model_fields_set)

    def get_update_data(self) -> dict:
        """Get only the fields that were explicitly set."""
        return {
            field: getattr(self, field)
            for field in self._fields_set
        }
```

#### 変更後（シンプルな実装）

```python
class TodoUpdateData(BaseModel):
    """Schema for updating a todo item."""

    title: str | None = None
    description: str | None = None
    completed: bool | None = None

    # バリデーション（オプション）
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        """Validate title if provided."""
        if v is not None and len(v.strip()) == 0:
            raise ValueError("Title cannot be empty")
        return v

    def get_update_data(self) -> dict:
        """
        Get only the fields that were explicitly set.

        Returns:
            Dictionary containing only the fields provided in the request
        """
        return self.model_dump(exclude_unset=True)
```

### 2. TodoService の修正（必要に応じて）

**ファイル:** `backend/app/services/todo.py`

```python
# 変更前
def update_todo(self, todo_id: int, update_data: TodoUpdateData, user_id: int) -> Todo | None:
    todo = self.todo_repository.get_by_id(todo_id)
    if not todo or todo.user_id != user_id:
        return None

    # get_update_data() を使用
    updates = update_data.get_update_data()

    for field, value in updates.items():
        setattr(todo, field, value)

    # ...

# 変更後（同じコードで動作）
def update_todo(self, todo_id: int, update_data: TodoUpdateData, user_id: int) -> Todo | None:
    todo = self.todo_repository.get_by_id(todo_id)
    if not todo or todo.user_id != user_id:
        return None

    # get_update_data() は内部で model_dump(exclude_unset=True) を呼ぶ
    updates = update_data.get_update_data()

    for field, value in updates.items():
        setattr(todo, field, value)

    # ...
```

### 3. 代替アプローチ（直接 model_dump を使用）

サービス層で直接 `model_dump(exclude_unset=True)` を使用する場合：

```python
def update_todo(self, todo_id: int, update_data: TodoUpdateData, user_id: int) -> Todo | None:
    todo = self.todo_repository.get_by_id(todo_id)
    if not todo or todo.user_id != user_id:
        return None

    # 直接 model_dump を使用（get_update_data() を削除した場合）
    updates = update_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(todo, field, value)

    # ...
```

**推奨:** `get_update_data()` メソッドを残すことで、将来的な拡張性を保持

## テスト戦略

### 1. スキーマのユニットテスト

**ファイル:** `backend/tests/schemas/test_todo_schema.py`

```python
import pytest
from backend.schemas.todo import TodoUpdateData


class TestTodoUpdateData:
    def test_get_update_data_with_all_fields(self):
        """すべてのフィールドを指定した場合のテスト"""
        data = TodoUpdateData(
            title="New Title",
            description="New Description",
            completed=True
        )

        updates = data.get_update_data()

        assert updates == {
            "title": "New Title",
            "description": "New Description",
            "completed": True
        }

    def test_get_update_data_with_partial_fields(self):
        """一部のフィールドのみ指定した場合のテスト"""
        data = TodoUpdateData(title="Updated Title")

        updates = data.get_update_data()

        assert updates == {"title": "Updated Title"}
        assert "description" not in updates
        assert "completed" not in updates

    def test_get_update_data_with_none_value(self):
        """明示的に None を指定した場合のテスト"""
        data = TodoUpdateData(description=None)

        updates = data.get_update_data()

        # 明示的に None が指定された場合は含まれる
        assert "description" in updates
        assert updates["description"] is None

    def test_get_update_data_with_no_fields(self):
        """フィールドを何も指定しなかった場合のテスト"""
        data = TodoUpdateData()

        updates = data.get_update_data()

        assert updates == {}

    def test_get_update_data_with_empty_title(self):
        """空のタイトルでバリデーションエラーが発生することを確認"""
        with pytest.raises(ValueError, match="Title cannot be empty"):
            TodoUpdateData(title="   ")

    def test_model_dump_exclude_unset_directly(self):
        """model_dump(exclude_unset=True) が正しく動作することを確認"""
        data = TodoUpdateData(title="Test", completed=True)

        # 直接 model_dump を呼び出し
        result = data.model_dump(exclude_unset=True)

        assert result == {"title": "Test", "completed": True}
        assert "description" not in result
```

### 2. サービス層の統合テスト

**ファイル:** `backend/tests/services/test_todo_service.py`

```python
def test_update_todo_partial_update(db_session, todo_factory, user_factory):
    """部分更新が正しく動作することを確認"""
    service = TodoService(db_session)
    user = user_factory()
    todo = todo_factory(user_id=user.id, title="Original", completed=False)

    # title のみ更新
    update_data = TodoUpdateData(title="Updated Title")
    updated = service.update_todo(todo.id, update_data, user.id)

    assert updated.title == "Updated Title"
    assert updated.description == todo.description  # 変更されていない
    assert updated.completed == False  # 変更されていない


def test_update_todo_completed_only(db_session, todo_factory, user_factory):
    """completed のみ更新が正しく動作することを確認"""
    service = TodoService(db_session)
    user = user_factory()
    todo = todo_factory(user_id=user.id, title="Test", completed=False)

    # completed のみ更新
    update_data = TodoUpdateData(completed=True)
    updated = service.update_todo(todo.id, update_data, user.id)

    assert updated.title == "Test"  # 変更されていない
    assert updated.completed is True


def test_update_todo_no_changes(db_session, todo_factory, user_factory):
    """何も指定しない場合に変更がないことを確認"""
    service = TodoService(db_session)
    user = user_factory()
    todo = todo_factory(user_id=user.id, title="Original")

    # 何も更新しない
    update_data = TodoUpdateData()
    updated = service.update_todo(todo.id, update_data, user.id)

    # 元の値のまま
    assert updated.title == "Original"
```

### 3. E2Eテスト

**ファイル:** `backend/tests/routes/test_todo_routes.py`

```python
def test_update_todo_partial(client, auth_headers, todo_factory, current_user):
    """部分更新のE2Eテスト"""
    todo = todo_factory(user_id=current_user.id, title="Original", completed=False)

    # title のみ更新
    response = client.put(
        f'/api/todos/{todo.id}',
        json={"title": "Updated"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["title"] == "Updated"
    assert data["completed"] is False  # 変更されていない
```

## 実装チェックリスト

### スキーマ修正
- [ ] `backend/app/schemas/todo.py` の `TodoUpdateData` を簡潔化
- [ ] `_fields_set` を削除
- [ ] `model_post_init` を削除
- [ ] `get_update_data()` を `model_dump(exclude_unset=True)` に変更

### サービス層確認
- [ ] `backend/app/services/todo.py` の `update_todo` が正しく動作することを確認
- [ ] 既存のロジックに影響がないことを確認

### テスト
- [ ] `backend/tests/schemas/test_todo_schema.py` を作成/更新
- [ ] スキーマのユニットテストを実装
- [ ] サービス層の統合テストを実行
- [ ] E2Eテストを実行
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `backend/CLAUDE.md` を更新（Pydantic のベストプラクティスとして記載）

## 期待される効果

### メリット
1. **コードの簡潔性** - 複雑なトラッキング機構が不要
2. **保守性の向上** - Pydantic 標準機能を使用
3. **可読性の向上** - 意図が明確
4. **パフォーマンス** - Pydantic のネイティブ実装を活用

### ビフォー・アフター比較

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| コード行数 | 15行 | 8行 |
| カスタムロジック | あり（`model_post_init`） | なし |
| Pydantic 標準機能 | 未使用 | 使用 |
| 理解しやすさ | 中 | 高 |

## 参考資料

- [Pydantic: Model Export - exclude_unset](https://docs.pydantic.dev/latest/concepts/serialization/#model_dump)
- [Pydantic: Partial Updates](https://docs.pydantic.dev/latest/concepts/models/#partial-updates)
- [FastAPI: Body - Updates](https://fastapi.tiangolo.com/tutorial/body-updates/)
