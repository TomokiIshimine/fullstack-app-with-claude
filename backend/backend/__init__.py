"""Compatibility package to expose backend application factory."""

from app import create_app

__all__ = ["create_app"]
