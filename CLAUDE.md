# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a full-stack monorepo containing a React + TypeScript frontend and a Flask + SQLAlchemy backend, currently implementing a TODO application. The project uses Docker Compose for local development with MySQL.

**For detailed documentation:**
- Backend: See [backend/CLAUDE.md](backend/CLAUDE.md)
- Frontend: See [frontend/CLAUDE.md](frontend/CLAUDE.md)

## Quick Start

### Setup and Installation
```bash
make install              # Install all dependencies (frontend via pnpm, backend via poetry)
make setup                # Full environment setup
```

### Running the Stack
```bash
make up                   # Start Docker containers (MySQL, frontend, backend)
make down                 # Stop Docker containers
```

### Testing
```bash
make test                 # Run all tests (frontend and backend)
```

### Linting and Formatting
```bash
make lint                 # Lint both frontend and backend
make format               # Format both frontend and backend
```

## Pre-commit Hooks (Lightweight)

Pre-commit hooks automatically run **lightweight checks** on staged files before each commit. Heavy checks (mypy, pytest, vitest) are intentionally excluded for fast commits.

**What runs automatically on commit:**
- Code formatting (Prettier for frontend, black/isort for backend)
- Linting (ESLint for frontend, flake8 for backend)
- Common issues (trailing whitespace, merge conflicts, large files)

**Manual commands:**
```bash
make pre-commit-install   # Install hooks (run once after clone)
make pre-commit-run       # Manually run hooks on all files
make pre-commit-update    # Update hook versions
```

**Important:** Type checking (mypy) and tests (pytest, vitest) are NOT run on commit for performance. Run them manually:
```bash
make lint                 # Run mypy + flake8 + ESLint
make test                 # Run tests with coverage
```

## Docker Compose Setup

Three services: `frontend` (Node 20), `backend` (Python 3.12), `db` (MySQL 8.0). All services share the `app-network` bridge network. The backend service waits for database via health checks. MySQL data persists in named volume `mysql-data`.

## Project Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with format `<type>(<scope>): <subject>`. Use `commitlint` via:
```bash
pnpm -C frontend run commitlint -- --help
```

### Code Organization

- **Backend**: Flask + SQLAlchemy with layered architecture (routes → services → models)
- **Frontend**: React + TypeScript with Vite, organized by pages and components
- All API routes use `/api` prefix
- Frontend proxies API requests to backend in development
