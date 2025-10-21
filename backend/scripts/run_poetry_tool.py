#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"

COMMANDS: dict[str, list[str]] = {
    "isort": ["poetry", "run", "isort"],
    "black": ["poetry", "run", "black"],
    "flake8": ["poetry", "run", "flake8"],
    "mypy": ["poetry", "run", "mypy"],
    "pytest": ["poetry", "run", "pytest", "-q"],
}


def to_backend_rel(path: str) -> str | None:
    candidate = Path(path)
    if candidate.is_absolute():
        try:
            candidate = candidate.relative_to(ROOT)
        except ValueError:
            return None
    try:
        return str(candidate.relative_to("backend"))
    except ValueError:
        return None


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        available = ", ".join(sorted(COMMANDS))
        print(
            f"Usage: {sys.argv[0]} <tool>\nAvailable tools: {available}",
            file=sys.stderr,
        )
        return 1

    tool = sys.argv[1]
    extra_args = sys.argv[2:]

    os.chdir(BACKEND_DIR)

    relative_files = []
    for arg in extra_args:
        rel = to_backend_rel(arg)
        if rel is not None:
            relative_files.append(rel)

    cmd = COMMANDS[tool][:]
    if tool == "flake8":
        cmd.append("--max-line-length=150")

    if tool in {"isort", "black", "flake8"}:
        python_targets = [f for f in relative_files if f.endswith((".py", ".pyi"))]
        if not python_targets:
            return 0
        cmd.extend(python_targets)
    elif tool == "mypy":
        python_targets = [f for f in relative_files if f.endswith((".py", ".pyi"))]
        cmd.extend(python_targets or ["app"])
    elif tool == "pytest":
        # Always run the suite when backend files are touched.
        pass

    result = subprocess.run(cmd, check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
