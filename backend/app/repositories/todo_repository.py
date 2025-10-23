from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.todo import Todo


class TodoRepository:
    """Repository for Todo data access operations."""

    def __init__(self, session: Session):
        self.session = session

    def find_all(self) -> Sequence[Todo]:
        """Retrieve all todos ordered by due date and created time."""
        stmt = select(Todo).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        return list(self.session.scalars(stmt))

    def find_active(self) -> Sequence[Todo]:
        """Retrieve active (not completed) todos."""
        stmt = select(Todo).where(Todo.is_completed.is_(False)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        return list(self.session.scalars(stmt))

    def find_completed(self) -> Sequence[Todo]:
        """Retrieve completed todos."""
        stmt = select(Todo).where(Todo.is_completed.is_(True)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        return list(self.session.scalars(stmt))

    def find_by_id(self, todo_id: int) -> Todo | None:
        """Retrieve a todo by ID."""
        return self.session.get(Todo, todo_id)

    def save(self, todo: Todo) -> Todo:
        """Save a new todo to the database."""
        self.session.add(todo)
        self.session.flush()
        self.session.refresh(todo)
        return todo

    def update(self, todo: Todo) -> Todo:
        """Update an existing todo."""
        self.session.flush()
        self.session.refresh(todo)
        return todo

    def delete(self, todo: Todo) -> None:
        """Delete a todo from the database."""
        self.session.delete(todo)
        self.session.flush()


__all__ = ["TodoRepository"]
