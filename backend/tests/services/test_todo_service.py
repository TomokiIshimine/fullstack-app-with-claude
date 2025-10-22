from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.main import get_session_factory
from app.models.todo import Todo
from app.schemas.todo import TodoCreateData, TodoToggleData, TodoUpdateData
from app.services.todo_service import (
    TodoNotFoundError,
    TodoValidationError,
    create_todo,
    delete_todo,
    list_todos,
    serialize_todo,
    serialize_todos,
    toggle_completed,
    update_todo,
)


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


def test_create_todo_success(db_session):
    data = TodoCreateData(title="  Write tests  ", detail="  Ensure coverage ", due_date=date.today())
    todo = create_todo(db_session, data)

    assert todo.id is not None
    assert todo.title == "Write tests"
    assert todo.detail == "Ensure coverage"
    assert todo.due_date == date.today()
    assert todo.is_completed is False


def test_create_todo_rejects_past_due_date(db_session):
    past_due = date.today() - timedelta(days=1)
    data = TodoCreateData(title="Past due", due_date=past_due)

    with pytest.raises(TodoValidationError):
        create_todo(db_session, data)


def test_list_todos_filters_by_status(db_session):
    active = create_todo(db_session, TodoCreateData(title="Active task"))
    completed = create_todo(db_session, TodoCreateData(title="Completed task"))
    toggle_completed(db_session, completed.id, TodoToggleData(is_completed=True))

    active_items = list_todos(db_session, "active")
    assert [todo.id for todo in active_items] == [active.id]

    completed_items = list_todos(db_session, "completed")
    assert [todo.id for todo in completed_items] == [completed.id]

    all_items = list_todos(db_session, "all")
    assert {todo.id for todo in all_items} == {active.id, completed.id}


def test_list_todos_invalid_status(db_session):
    with pytest.raises(TodoValidationError):
        list_todos(db_session, "invalid")  # type: ignore[arg-type]


def test_update_todo_updates_selected_fields(db_session):
    todo = create_todo(db_session, TodoCreateData(title="Initial", detail="Original"))
    tomorrow = date.today() + timedelta(days=1)

    updated = update_todo(
        db_session,
        todo.id,
        TodoUpdateData(title=" Updated ", due_date=tomorrow),
    )

    assert updated.title == "Updated"
    assert updated.detail == "Original"
    assert updated.due_date == tomorrow


def test_update_todo_clears_detail(db_session):
    todo = create_todo(db_session, TodoCreateData(title="With detail", detail="Something"))

    updated = update_todo(
        db_session,
        todo.id,
        TodoUpdateData(detail="   "),
    )

    assert updated.detail is None


def test_update_todo_requires_fields(db_session):
    todo = create_todo(db_session, TodoCreateData(title="No updates"))

    with pytest.raises(TodoValidationError):
        update_todo(db_session, todo.id, TodoUpdateData())


def test_update_todo_not_found(db_session):
    with pytest.raises(TodoNotFoundError):
        update_todo(db_session, 9999, TodoUpdateData(title="Missing"))


def test_toggle_completed_updates_flag(db_session):
    todo = create_todo(db_session, TodoCreateData(title="Toggle me"))

    toggled = toggle_completed(db_session, todo.id, TodoToggleData(is_completed=True))
    assert toggled.is_completed is True

    toggled_back = toggle_completed(db_session, todo.id, TodoToggleData(is_completed=False))
    assert toggled_back.is_completed is False


def test_toggle_completed_not_found(db_session):
    with pytest.raises(TodoNotFoundError):
        toggle_completed(db_session, 42, TodoToggleData(is_completed=True))


def test_delete_todo_removes_record(db_session):
    todo = create_todo(db_session, TodoCreateData(title="Delete me"))
    delete_todo(db_session, todo.id)

    assert db_session.get(Todo, todo.id) is None


def test_serialize_helpers_return_expected_structure(db_session):
    todo = create_todo(db_session, TodoCreateData(title="Serialize"))
    single = serialize_todo(todo)
    assert single["title"] == "Serialize"
    assert single["is_completed"] is False
    assert single["due_date"] is None

    collection = serialize_todos([todo])
    assert isinstance(collection, list)
    assert collection[0]["id"] == todo.id
