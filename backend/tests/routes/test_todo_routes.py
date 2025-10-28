"""Tests for TODO routes (CRUD operations)."""

from __future__ import annotations

from tests.factories import TodoFactory, get_tomorrow, get_yesterday
from tests.helpers import assert_response_error, assert_response_success, create_todo


def test_get_todos_returns_empty_list(auth_client):
    """Test that GET /api/todos returns empty list initially."""
    response = auth_client.get("/api/todos")
    data = assert_response_success(response, 200)
    assert data["items"] == []
    assert data["meta"]["count"] == 0


def test_create_todo_success(auth_client):
    """Test successful TODO creation with all fields."""
    due_date = get_tomorrow().isoformat()
    todo_data = TodoFactory.build(title="New todo", detail="Details", due_date=due_date)

    response = auth_client.post("/api/todos", json=todo_data)

    assert_response_success(response, 201, title="New todo", detail="Details", due_date=due_date, is_completed=False)


def test_create_todo_with_past_due_date_returns_error(auth_client):
    """Test that creating TODO with past due date returns validation error."""
    past_due = get_yesterday().isoformat()
    todo_data = TodoFactory.build(title="Invalid", due_date=past_due)

    response = auth_client.post("/api/todos", json=todo_data)

    assert_response_error(response, 400, 400)


def test_update_todo_updates_selected_fields(auth_client):
    """Test that PATCH /api/todos/{id} updates only specified fields."""
    # Create a todo
    todo = create_todo(auth_client, title="Original", detail="Desc")
    todo_id = todo["id"]
    tomorrow = get_tomorrow().isoformat()

    # Update title only
    response = auth_client.patch(f"/api/todos/{todo_id}", json={"title": "Updated"})
    assert_response_success(response, 200, title="Updated", detail="Desc")

    # Update detail and due_date
    response = auth_client.patch(f"/api/todos/{todo_id}", json={"detail": " New detail ", "due_date": tomorrow})
    assert_response_success(response, 200, detail="New detail", due_date=tomorrow)


def test_update_todo_missing_body_returns_error(auth_client):
    """Test that updating TODO without body returns error."""
    todo = create_todo(auth_client, title="No body")

    response = auth_client.patch(f"/api/todos/{todo['id']}", data="invalid", content_type="text/plain")

    assert_response_error(response, 400)


def test_toggle_todo_completion(auth_client):
    """Test marking TODO as complete/incomplete."""
    todo = create_todo(auth_client, title="Toggle")

    response = auth_client.patch(f"/api/todos/{todo['id']}/complete", json={"is_completed": True})

    assert_response_success(response, 200, is_completed=True)


def test_toggle_todo_requires_boolean(auth_client):
    """Test that completion toggle requires boolean value."""
    todo = create_todo(auth_client, title="Toggle invalid")

    response = auth_client.patch(f"/api/todos/{todo['id']}/complete", json={"is_completed": "yes"})

    assert_response_error(response, 400)


def test_delete_todo_success(auth_client):
    """Test successful TODO deletion."""
    todo = create_todo(auth_client, title="Delete")
    todo_id = todo["id"]

    response = auth_client.delete(f"/api/todos/{todo_id}")
    assert response.status_code == 204

    # Verify todo is deleted
    follow_up = auth_client.get("/api/todos?status=all")
    data = follow_up.get_json()
    ids = [item["id"] for item in data["items"]]
    assert todo_id not in ids


def test_get_todos_with_status_filter(auth_client):
    """Test filtering TODOs by status (active/completed)."""
    active_todo = create_todo(auth_client, title="Active")
    completed_todo = create_todo(auth_client, title="Completed")

    # Mark one as completed
    auth_client.patch(f"/api/todos/{completed_todo['id']}/complete", json={"is_completed": True})

    # Get active todos (should not include completed)
    active_response = auth_client.get("/api/todos?status=active")
    active_ids = [item["id"] for item in active_response.get_json()["items"]]
    assert completed_todo["id"] not in active_ids
    assert active_todo["id"] in active_ids

    # Get completed todos (should include completed)
    completed_response = auth_client.get("/api/todos?status=completed")
    completed_ids = [item["id"] for item in completed_response.get_json()["items"]]
    assert completed_todo["id"] in completed_ids
    assert active_todo["id"] not in completed_ids


def test_invalid_status_returns_error(auth_client):
    """Test that invalid status filter returns error."""
    response = auth_client.get("/api/todos?status=unknown")

    assert_response_error(response, 400)
