from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, Literal

if TYPE_CHECKING:
    from app.models.todo import Todo

TodoStatus = Literal["all", "active", "completed"]


_MISSING = object()


@dataclass(frozen=True, slots=True)
class TodoCreateData:
    title: str
    detail: str | None = None
    due_date: date | None = None


@dataclass(frozen=True, slots=True)
class TodoUpdateData:
    title: str | object = _MISSING
    detail: str | None | object = _MISSING
    due_date: date | None | object = _MISSING

    def to_updates(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if self.title is not _MISSING:
            payload["title"] = self.title
        if self.detail is not _MISSING:
            payload["detail"] = self.detail
        if self.due_date is not _MISSING:
            payload["due_date"] = self.due_date
        return payload

    def has_updates(self) -> bool:
        return any(value is not _MISSING for value in (self.title, self.detail, self.due_date))


@dataclass(frozen=True, slots=True)
class TodoToggleData:
    is_completed: bool


@dataclass(frozen=True, slots=True)
class TodoResponse:
    id: int
    title: str
    detail: str | None
    due_date: date | None
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, todo: "Todo") -> "TodoResponse":
        return cls(
            id=todo.id,
            title=todo.title,
            detail=todo.detail,
            due_date=todo.due_date,
            is_completed=todo.is_completed,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "detail": self.detail,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


__all__ = [
    "TodoCreateData",
    "TodoUpdateData",
    "TodoToggleData",
    "TodoResponse",
    "TodoStatus",
]
