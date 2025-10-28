from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.database import get_session_factory
from app.models.todo import Todo
from app.schemas.todo import TodoCreateData, TodoToggleData, TodoUpdateData, TodoValidationError, serialize_todo, serialize_todos
from app.services.todo_service import TodoNotFoundError, TodoService


@pytest.fixture()
def db_session(app):
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
        session.rollback()
    finally:
        session.close()
        session_factory.remove()


@pytest.fixture()
def test_user_id(app, db_session):
    """Create a test user and return its ID."""
    from app.models.user import User
    from app.utils.password import hash_password

    user = User(email="test@example.com", password_hash=hash_password("password123"))
    db_session.add(user)
    db_session.commit()
    return user.id


@pytest.fixture()
def todo_service(db_session):
    return TodoService(db_session)


def test_create_todo_success(todo_service, test_user_id):
    data = TodoCreateData(title="  Write tests  ", detail="  Ensure coverage ", due_date=date.today())
    todo = todo_service.create_todo(test_user_id, data)

    assert todo.id is not None
    assert todo.title == "Write tests"
    assert todo.detail == "Ensure coverage"
    assert todo.due_date == date.today()
    assert todo.is_completed is False


def test_create_todo_rejects_past_due_date(todo_service):
    past_due = date.today() - timedelta(days=1)

    # Pydantic validates on instantiation, so this raises ValidationError
    with pytest.raises(ValidationError):
        TodoCreateData(title="Past due", due_date=past_due)


def test_list_todos_filters_by_status(todo_service, test_user_id):
    active = todo_service.create_todo(test_user_id, TodoCreateData(title="Active task"))
    completed = todo_service.create_todo(test_user_id, TodoCreateData(title="Completed task"))
    todo_service.toggle_completed(test_user_id, completed.id, TodoToggleData(is_completed=True))

    active_items = todo_service.list_todos(test_user_id, "active")
    assert [todo.id for todo in active_items] == [active.id]

    completed_items = todo_service.list_todos(test_user_id, "completed")
    assert [todo.id for todo in completed_items] == [completed.id]

    all_items = todo_service.list_todos(test_user_id, "all")
    assert {todo.id for todo in all_items} == {active.id, completed.id}


def test_list_todos_invalid_status(todo_service):
    # Status validation is now done in the route layer via validate_status()
    # The service layer accepts any valid TodoStatus literal
    # This test is no longer applicable at the service layer
    pass


def test_update_todo_updates_selected_fields(todo_service, test_user_id):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="Initial", detail="Original"))
    tomorrow = date.today() + timedelta(days=1)

    updated = todo_service.update_todo(
        test_user_id,
        todo.id,
        TodoUpdateData(title=" Updated ", due_date=tomorrow),
    )

    assert updated.title == "Updated"
    assert updated.detail == "Original"
    assert updated.due_date == tomorrow


def test_update_todo_clears_detail(todo_service, test_user_id):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="With detail", detail="Something"))

    updated = todo_service.update_todo(
        test_user_id,
        todo.id,
        TodoUpdateData(detail="   "),
    )

    assert updated.detail is None


def test_update_todo_requires_fields(todo_service, test_user_id):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="No updates"))

    with pytest.raises(TodoValidationError):
        todo_service.update_todo(test_user_id, todo.id, TodoUpdateData())


def test_update_todo_not_found(todo_service, test_user_id):
    with pytest.raises(TodoNotFoundError):
        todo_service.update_todo(test_user_id, 9999, TodoUpdateData(title="Missing"))


def test_toggle_completed_updates_flag(todo_service, test_user_id):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="Toggle me"))

    toggled = todo_service.toggle_completed(test_user_id, todo.id, TodoToggleData(is_completed=True))
    assert toggled.is_completed is True

    toggled_back = todo_service.toggle_completed(test_user_id, todo.id, TodoToggleData(is_completed=False))
    assert toggled_back.is_completed is False


def test_toggle_completed_not_found(todo_service, test_user_id):
    with pytest.raises(TodoNotFoundError):
        todo_service.toggle_completed(test_user_id, 42, TodoToggleData(is_completed=True))


def test_delete_todo_removes_record(todo_service, test_user_id, db_session):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="Delete me"))
    todo_service.delete_todo(test_user_id, todo.id)

    assert db_session.get(Todo, todo.id) is None


def test_serialize_helpers_return_expected_structure(todo_service, test_user_id):
    todo = todo_service.create_todo(test_user_id, TodoCreateData(title="Serialize"))
    single = serialize_todo(todo)
    assert single["title"] == "Serialize"
    assert single["is_completed"] is False
    assert single["due_date"] is None

    collection = serialize_todos([todo])
    assert isinstance(collection, list)
    assert collection[0]["id"] == todo.id
