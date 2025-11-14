# 010: Pydantic `from_attributes` の一貫した使用

## 概要

Pydantic v2 では ORM モデルから Pydantic モデルへの変換に `from_attributes=True` を使用するが、現在は一部のコード（`auth_routes.py`）でのみ使用されている。これをすべての Response スキーマで統一し、コード品質を向上させる。

## 現状の問題

### 問題点

1. **一部のみで使用** - `auth_routes.py` のみで `UserResponse.model_validate(user)` を使用
2. **手動変換が散在** - 他のルートでは手動で辞書を作成
3. **型安全性の欠如** - 手動変換は型チェックが効かない

### 現在の実装例

#### AuthRoutes（正しい実装）

**ファイル:** `backend/app/routes/auth_routes.py`

```python
from backend.schemas.user import UserResponse

@auth_bp.route("/register", methods=["POST"])
def register():
    # ... ユーザー作成

    # ✓ Pydantic の model_validate を使用
    return jsonify({
        "user": UserResponse.model_validate(user).model_dump(),
        "access_token": access_token,
        "refresh_token": refresh_token
    })
```

#### TodoRoutes（手動変換）

**ファイル:** `backend/app/routes/todo_routes.py`

```python
@todo_bp.route("", methods=["GET"])
@require_auth
def get_todos():
    todos = todo_service.get_todos_by_user_id(g.current_user.id)

    # ❌ 手動で辞書を作成
    return jsonify([{
        "id": todo.id,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "created_at": todo.created_at.isoformat(),
        "updated_at": todo.updated_at.isoformat()
    } for todo in todos])
```

## 修正方針

### 原則
1. **すべてのResponseスキーマで `from_attributes=True` を使用**
2. **ORM → Pydantic の変換を標準化**
3. **手動変換を削除**
4. **型安全性を確保**

### Pydantic v2 の `from_attributes`

```python
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str

# ORMモデルからの変換
user_response = UserResponse.model_validate(user_orm)
```

## 実装仕様

### 1. Response スキーマの確認・修正

#### UserResponse（既存）

**ファイル:** `backend/app/schemas/user.py`

```python
from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """User response schema."""

    model_config = ConfigDict(from_attributes=True)  # ✓ 既に設定済み

    id: int
    email: str
    name: str
    role: str
    created_at: str
    updated_at: str
```

#### TodoResponse の作成

**ファイル:** `backend/app/schemas/todo.py`

```python
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class TodoResponse(BaseModel):
    """Todo response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    completed: bool = False
    user_id: int
    created_at: datetime
    updated_at: datetime

    # カスタムシリアライゼーション（オプション）
    @property
    def created_at_iso(self) -> str:
        """Get created_at in ISO format."""
        return self.created_at.isoformat()

    @property
    def updated_at_iso(self) -> str:
        """Get updated_at in ISO format."""
        return self.updated_at.isoformat()
```

### 2. ルート層の修正

#### TodoRoutes の修正

**ファイル:** `backend/app/routes/todo_routes.py`

#### 変更前（手動変換）

```python
@todo_bp.route("", methods=["GET"])
@require_auth
def get_todos():
    todos = todo_service.get_todos_by_user_id(g.current_user.id)

    return jsonify([{
        "id": todo.id,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "created_at": todo.created_at.isoformat(),
        "updated_at": todo.updated_at.isoformat()
    } for todo in todos])
```

#### 変更後（Pydantic使用）

```python
from backend.schemas.todo import TodoResponse

@todo_bp.route("", methods=["GET"])
@require_auth
def get_todos():
    todos = todo_service.get_todos_by_user_id(g.current_user.id)

    # ✓ Pydantic の model_validate を使用
    return jsonify([
        TodoResponse.model_validate(todo).model_dump()
        for todo in todos
    ])
```

#### 他のエンドポイントも同様に修正

```python
@todo_bp.route("/<int:todo_id>", methods=["GET"])
@require_auth
def get_todo(todo_id: int):
    todo = todo_service.get_todo_by_id(todo_id)

    if not todo:
        return not_found_error(resource="Todo", resource_id=todo_id)

    if todo.user_id != g.current_user.id:
        return forbidden_error(message="Access denied")

    # ✓ Pydantic 使用
    return jsonify(TodoResponse.model_validate(todo).model_dump())


@todo_bp.route("", methods=["POST"])
@require_auth
def create_todo():
    data = TodoCreateData(**request.json)
    todo = todo_service.create_todo(data, g.current_user.id)

    # ✓ Pydantic 使用
    return jsonify(TodoResponse.model_validate(todo).model_dump()), 201


@todo_bp.route("/<int:todo_id>", methods=["PUT"])
@require_auth
def update_todo(todo_id: int):
    data = TodoUpdateData(**request.json)
    todo = todo_service.update_todo(todo_id, data, g.current_user.id)

    # ✓ Pydantic 使用
    return jsonify(TodoResponse.model_validate(todo).model_dump())
```

### 3. ヘルパー関数の作成（オプション）

複数の Response を一括変換するヘルパー：

**ファイル:** `backend/app/utils/response.py`

```python
"""Response utility functions."""
from typing import Any, List, Type, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)


def serialize_model(model: Any, response_class: Type[T]) -> dict:
    """
    Serialize ORM model to Pydantic response.

    Args:
        model: ORM model instance
        response_class: Pydantic response class

    Returns:
        Serialized dictionary
    """
    return response_class.model_validate(model).model_dump()


def serialize_models(models: List[Any], response_class: Type[T]) -> List[dict]:
    """
    Serialize list of ORM models to Pydantic responses.

    Args:
        models: List of ORM model instances
        response_class: Pydantic response class

    Returns:
        List of serialized dictionaries
    """
    return [
        response_class.model_validate(model).model_dump()
        for model in models
    ]
```

**使用例:**

```python
from backend.utils.response import serialize_model, serialize_models
from backend.schemas.todo import TodoResponse

@todo_bp.route("", methods=["GET"])
@require_auth
def get_todos():
    todos = todo_service.get_todos_by_user_id(g.current_user.id)
    return jsonify(serialize_models(todos, TodoResponse))


@todo_bp.route("/<int:todo_id>", methods=["GET"])
@require_auth
def get_todo(todo_id: int):
    todo = todo_service.get_todo_by_id(todo_id)
    # ...
    return jsonify(serialize_model(todo, TodoResponse))
```

### 4. UserRoutes の修正（存在する場合）

**ファイル:** `backend/app/routes/user_routes.py`

```python
from backend.schemas.user import UserResponse
from backend.utils.response import serialize_model

@user_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current user information."""
    user = user_service.get_user_by_id(g.current_user.id)

    # ✓ Pydantic 使用
    return jsonify(serialize_model(user, UserResponse))
```

## テスト戦略

### 1. スキーマのテスト

**ファイル:** `backend/tests/schemas/test_todo_schema.py`

```python
from backend.schemas.todo import TodoResponse
from backend.models.todo import Todo
from datetime import datetime


def test_todo_response_from_orm():
    """ORMモデルから TodoResponse が作成できることを確認"""
    todo = Todo(
        id=1,
        title="Test Todo",
        description="Test Description",
        completed=False,
        user_id=1,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    response = TodoResponse.model_validate(todo)

    assert response.id == 1
    assert response.title == "Test Todo"
    assert response.description == "Test Description"
    assert response.completed is False
    assert response.user_id == 1


def test_todo_response_model_dump():
    """TodoResponse が正しく辞書に変換されることを確認"""
    todo = Todo(
        id=1,
        title="Test Todo",
        description="Test Description",
        completed=False,
        user_id=1,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    response = TodoResponse.model_validate(todo)
    data = response.model_dump()

    assert isinstance(data, dict)
    assert data["id"] == 1
    assert data["title"] == "Test Todo"
```

### 2. ルート層のテスト

**ファイル:** `backend/tests/routes/test_todo_routes.py`

```python
def test_get_todos_returns_pydantic_response(client, auth_headers, todo_factory, current_user):
    """GET /todos が Pydantic Response を返すことを確認"""
    # TODOを作成
    todo = todo_factory(user_id=current_user.id, title="Test Todo")

    response = client.get('/api/todos', headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()

    # レスポンスが正しい形式であることを確認
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "title" in data[0]
    assert "created_at" in data[0]
    assert "updated_at" in data[0]


def test_create_todo_returns_pydantic_response(client, auth_headers):
    """POST /todos が Pydantic Response を返すことを確認"""
    response = client.post(
        '/api/todos',
        json={"title": "New Todo", "description": "Description"},
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.get_json()

    # レスポンスが正しい形式であることを確認
    assert "id" in data
    assert data["title"] == "New Todo"
    assert "created_at" in data
```

### 3. ヘルパー関数のテスト

**ファイル:** `backend/tests/utils/test_response.py`

```python
from backend.utils.response import serialize_model, serialize_models
from backend.schemas.todo import TodoResponse
from backend.models.todo import Todo


def test_serialize_model(todo_factory):
    """serialize_model が正しく動作することを確認"""
    todo = todo_factory(title="Test")

    result = serialize_model(todo, TodoResponse)

    assert isinstance(result, dict)
    assert result["title"] == "Test"


def test_serialize_models(todo_factory):
    """serialize_models が正しく動作することを確認"""
    todos = [
        todo_factory(title=f"Todo {i}")
        for i in range(3)
    ]

    result = serialize_models(todos, TodoResponse)

    assert isinstance(result, list)
    assert len(result) == 3
    assert all(isinstance(item, dict) for item in result)
```

## 実装チェックリスト

### スキーマ修正
- [ ] `backend/app/schemas/todo.py` に `TodoResponse` を作成
- [ ] `model_config = ConfigDict(from_attributes=True)` を設定
- [ ] `backend/app/schemas/user.py` の `UserResponse` を確認

### ヘルパー関数作成（オプション）
- [ ] `backend/app/utils/response.py` を作成
- [ ] `serialize_model()` を実装
- [ ] `serialize_models()` を実装

### ルート層修正
- [ ] `backend/app/routes/todo_routes.py` をすべて Pydantic 使用に変更
- [ ] `backend/app/routes/user_routes.py` を確認（存在する場合）
- [ ] 手動変換をすべて削除

### テスト
- [ ] `backend/tests/schemas/test_todo_schema.py` を作成
- [ ] `backend/tests/utils/test_response.py` を作成（ヘルパー使用時）
- [ ] ルート層のテストを更新
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] `backend/CLAUDE.md` に Pydantic 使用方法を追加

## 期待される効果

### メリット
1. **型安全性** - Pydantic が型チェックを行う
2. **一貫性** - すべてのレスポンスが同じ方法で作成される
3. **保守性** - スキーマ変更時にコンパイルエラーで検出
4. **バリデーション** - Pydantic がレスポンスデータを検証
5. **ドキュメント** - スキーマがレスポンス形式のドキュメントになる

### ビフォー・アフター比較

#### Before（手動変換）
```python
return jsonify([{
    "id": todo.id,
    "title": todo.title,
    "description": todo.description,
    "completed": todo.completed,
    "created_at": todo.created_at.isoformat(),  # 手動でiso変換
    "updated_at": todo.updated_at.isoformat()   # 手動でiso変換
} for todo in todos])
```

#### After（Pydantic使用）
```python
return jsonify([
    TodoResponse.model_validate(todo).model_dump()
    for todo in todos
])
```

または

```python
return jsonify(serialize_models(todos, TodoResponse))
```

## 参考資料

- [Pydantic v2: Models from ORM](https://docs.pydantic.dev/latest/concepts/models/#arbitrary-class-instances)
- [Pydantic v2: ConfigDict](https://docs.pydantic.dev/latest/api/config/)
- [Pydantic v2: Serialization](https://docs.pydantic.dev/latest/concepts/serialization/)
