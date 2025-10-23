from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, Iterable, Literal

if TYPE_CHECKING:
    from app.models.todo import Todo

TodoStatus = Literal["all", "active", "completed"]

MAX_TITLE_LENGTH = 120
MAX_DETAIL_LENGTH = 1000
VALID_STATUSES: tuple[TodoStatus, ...] = ("all", "active", "completed")

_MISSING = object()


class TodoValidationError(ValueError):
    """Raised when todo data validation fails."""

    pass


@dataclass(frozen=True, slots=True)
class TodoCreateData:
    title: str
    detail: str | None = None
    due_date: date | None = None

    def validate(self) -> TodoCreateData:
        """Validate and normalize the data, returning a new validated instance."""
        normalized_title = self._validate_title(self.title)
        normalized_detail = self._validate_detail(self.detail)
        validated_due_date = self._validate_due_date(self.due_date)

        return TodoCreateData(
            title=normalized_title,
            detail=normalized_detail,
            due_date=validated_due_date,
        )

    @staticmethod
    def _validate_title(title: str) -> str:
        if not isinstance(title, str):
            raise TodoValidationError("Title must be a string.")
        trimmed = title.strip()
        if not trimmed:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        if len(trimmed) > MAX_TITLE_LENGTH:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        return trimmed

    @staticmethod
    def _validate_detail(detail: str | None) -> str | None:
        if detail is None:
            return None
        if not isinstance(detail, str):
            raise TodoValidationError("Detail must be a string.")
        trimmed = detail.strip()
        if len(trimmed) > MAX_DETAIL_LENGTH:
            raise TodoValidationError("Detail must be at most 1000 characters.")
        return trimmed or None

    @staticmethod
    def _validate_due_date(due_date: date | None) -> date | None:
        if due_date is None:
            return None
        if not isinstance(due_date, date):
            raise TodoValidationError("Due date must be a date.")
        if due_date < date.today():
            raise TodoValidationError("Due date cannot be in the past.")
        return due_date


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

    def validate(self) -> TodoUpdateData:
        """Validate and normalize the data, returning a new validated instance."""
        validated_title: str | object = _MISSING
        validated_detail: str | None | object = _MISSING
        validated_due_date: date | None | object = _MISSING

        if self.title is not _MISSING:
            if not isinstance(self.title, str):
                raise TodoValidationError("Title must be a string.")
            trimmed = self.title.strip()
            if not trimmed:
                raise TodoValidationError("Title must be between 1 and 120 characters.")
            if len(trimmed) > MAX_TITLE_LENGTH:
                raise TodoValidationError("Title must be between 1 and 120 characters.")
            validated_title = trimmed

        if self.detail is not _MISSING:
            if self.detail is None:
                validated_detail = None
            elif isinstance(self.detail, str):
                trimmed = self.detail.strip()
                if len(trimmed) > MAX_DETAIL_LENGTH:
                    raise TodoValidationError("Detail must be at most 1000 characters.")
                validated_detail = trimmed or None
            else:
                raise TodoValidationError("Detail must be a string or null.")

        if self.due_date is not _MISSING:
            if self.due_date is None:
                validated_due_date = None
            elif isinstance(self.due_date, date):
                if self.due_date < date.today():
                    raise TodoValidationError("Due date cannot be in the past.")
                validated_due_date = self.due_date
            else:
                raise TodoValidationError("Due date must be a date or null.")

        return TodoUpdateData(
            title=validated_title,
            detail=validated_detail,
            due_date=validated_due_date,
        )


@dataclass(frozen=True, slots=True)
class TodoToggleData:
    is_completed: bool

    def validate(self) -> TodoToggleData:
        """Validate the data."""
        if not isinstance(self.is_completed, bool):
            raise TodoValidationError("is_completed must be a boolean.")
        return self


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


def serialize_todo(todo: "Todo") -> Dict[str, Any]:
    """Convert a Todo model to a dictionary."""
    schema = TodoResponse.from_model(todo)
    return schema.to_dict()


def serialize_todos(todos: Iterable["Todo"]) -> list[Dict[str, Any]]:
    """Convert a sequence of Todo models to a list of dictionaries."""
    return [serialize_todo(todo) for todo in todos]


def validate_status(status: str | None) -> TodoStatus:
    """Validate and normalize the status filter."""
    if status is None:
        return "active"
    if status not in VALID_STATUSES:
        raise TodoValidationError("Invalid status filter.")
    return status  # type: ignore


__all__ = [
    "TodoCreateData",
    "TodoUpdateData",
    "TodoToggleData",
    "TodoResponse",
    "TodoStatus",
    "TodoValidationError",
    "serialize_todo",
    "serialize_todos",
    "validate_status",
]
