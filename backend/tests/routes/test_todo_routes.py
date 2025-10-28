from __future__ import annotations

from datetime import date, timedelta


def test_get_todos_returns_empty_list(auth_client):
    response = auth_client.get("/api/todos")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["items"] == []
    assert payload["meta"]["count"] == 0


def test_create_todo_success(auth_client):
    due_date = (date.today() + timedelta(days=1)).isoformat()
    response = auth_client.post(
        "/api/todos",
        json={"title": "New todo", "detail": "Details", "due_date": due_date},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "New todo"
    assert data["detail"] == "Details"
    assert data["due_date"] == due_date
    assert data["is_completed"] is False


def test_create_todo_with_past_due_date_returns_error(auth_client):
    past_due = (date.today() - timedelta(days=1)).isoformat()
    response = auth_client.post("/api/todos", json={"title": "Invalid", "due_date": past_due})
    assert response.status_code == 400
    error = response.get_json()["error"]
    assert error["code"] == 400


def test_update_todo_partial_fields(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "Original", "detail": "Desc"})
    todo_id = create_resp.get_json()["id"]

    response = auth_client.patch(f"/api/todos/{todo_id}", json={"title": "Updated"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["title"] == "Updated"
    assert data["detail"] == "Desc"


def test_update_todo_with_due_date_and_detail(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "Update me"})
    todo_id = create_resp.get_json()["id"]
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    response = auth_client.patch(
        f"/api/todos/{todo_id}",
        json={"detail": " New detail ", "due_date": tomorrow},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["detail"] == "New detail"
    assert data["due_date"] == tomorrow


def test_update_todo_missing_body_returns_error(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "No body"})
    todo_id = create_resp.get_json()["id"]

    response = auth_client.patch(f"/api/todos/{todo_id}", data="invalid", content_type="text/plain")
    assert response.status_code == 400


def test_toggle_todo_completion(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "Toggle"})
    todo_id = create_resp.get_json()["id"]

    response = auth_client.patch(f"/api/todos/{todo_id}/complete", json={"is_completed": True})
    assert response.status_code == 200
    data = response.get_json()
    assert data["is_completed"] is True


def test_toggle_todo_requires_boolean(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "Toggle invalid"})
    todo_id = create_resp.get_json()["id"]

    response = auth_client.patch(f"/api/todos/{todo_id}/complete", json={"is_completed": "yes"})
    assert response.status_code == 400


def test_delete_todo_success(auth_client):
    create_resp = auth_client.post("/api/todos", json={"title": "Delete"})
    todo_id = create_resp.get_json()["id"]

    response = auth_client.delete(f"/api/todos/{todo_id}")
    assert response.status_code == 204

    follow_up = auth_client.get("/api/todos?status=all")
    data = follow_up.get_json()
    ids = [item["id"] for item in data["items"]]
    assert todo_id not in ids


def test_get_todos_with_status_filter(auth_client):
    active_resp = auth_client.post("/api/todos", json={"title": "Active"})
    completed_resp = auth_client.post("/api/todos", json={"title": "Completed"})

    completed_id = completed_resp.get_json()["id"]
    auth_client.patch(f"/api/todos/{completed_id}/complete", json={"is_completed": True})

    active_resp = auth_client.get("/api/todos?status=active")
    active_ids = [item["id"] for item in active_resp.get_json()["items"]]
    assert completed_id not in active_ids

    completed_resp = auth_client.get("/api/todos?status=completed")
    completed_ids = [item["id"] for item in completed_resp.get_json()["items"]]
    assert completed_id in completed_ids


def test_invalid_status_returns_error(auth_client):
    response = auth_client.get("/api/todos?status=unknown")
    assert response.status_code == 400
