# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a full-stack monorepo containing a React + TypeScript frontend and a Flask + SQLAlchemy backend, implementing a web application with user authentication. The project uses Docker Compose for local development with MySQL.

The system is designed around Clean Architecture principles: inner layers (domain and use cases) must remain independent from outer layers (frameworks, UI, infrastructure). When adding new functionality, keep dependencies flowing inward and isolate infrastructure-specific code at the edges of the system.

**For detailed documentation:**
- Backend: See [backend/CLAUDE.md](backend/CLAUDE.md)
- Frontend: See [frontend/CLAUDE.md](frontend/CLAUDE.md)

## Documentation

Comprehensive documentation is available in the `docs/` directory:

**For new developers, recommended reading order:**
1. **[Development Guide](docs/00_development.md)** - Start here: setup, commands, troubleshooting
2. **[System Architecture](docs/01_system-architecture.md)** - Overall system design and tech stack
3. **[Authentication & Authorization](docs/02_authentication-authorization.md)** - Security fundamentals
4. **[Feature List](docs/03_feature-list.md)** - Implemented features and API endpoints

**Specialized documentation:**
- **[Database Design](docs/04_database-design.md)** - Schema, ER diagrams, table definitions
- **[API Design Guide](docs/05_api-design-guide.md)** - REST API conventions and best practices
- **[Testing Strategy](docs/06_testing-strategy.md)** - Test levels, coverage goals, test data management
- **[Documentation Guide](docs/07_documentation-guide.md)** - Overview of all documentation (meta-document)
- **[E2E Test List](docs/08_e2e-test-list.md)** - E2E test scenarios and implementation guide
- **[CI/CD Setup Guide](docs/09_cicd-setup-guide.md)** - CI/CD environment setup after forking the project

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

### Linting and Formatting
```bash
make lint                 # Lint both frontend and backend (includes TypeScript check)
make format               # Format both frontend and backend
make format-check         # Check formatting without modifying files (used in CI)
```

## Testing

### Run All Tests
```bash
make test                 # Run all tests (frontend and backend) with coverage
```

### Test Variants
```bash
make test-frontend        # Run only frontend tests
make test-backend         # Run only backend tests
make test-fast            # Run tests without coverage (faster)
make test-cov             # Run tests with coverage and generate HTML report
make test-parallel        # Run backend tests in parallel
```

### Run Individual Tests
```bash
# Frontend - run specific test file
pnpm --dir frontend run test src/lib/api/auth.test.ts

# Backend - run specific test file
poetry -C backend run pytest backend/tests/routes/test_auth_routes.py

# Backend - run specific test function
poetry -C backend run pytest backend/tests/routes/test_auth_routes.py::test_login_success
```

**For detailed testing strategy, see [docs/06_testing-strategy.md](docs/06_testing-strategy.md)**

## Manual Testing and Browser Automation

### Browser Testing with Playwright MCP

When verifying UI functionality or performing manual testing, use the **mcp__playwright** tools provided by the Playwright MCP server. These tools allow Claude Code to interact with the browser directly.

**Common workflow:**
1. Start the application: `make up`
2. Use `mcp__playwright__browser_navigate` to open the application (e.g., `http://localhost:5174`)
3. Use `mcp__playwright__browser_snapshot` to capture the current page state
4. Interact with elements using `mcp__playwright__browser_click`, `mcp__playwright__browser_type`, etc.
5. Verify expected behaviors and take screenshots with `mcp__playwright__browser_take_screenshot`

**Example use cases:**
- Verify user registration and login flows
- Test form validations and error messages
- Check responsive design and UI components
- Validate API integrations from the frontend
- Confirm navigation and routing behavior

**Note:** These tools are for manual verification and exploratory testing. Automated E2E tests are not yet implemented. For the E2E test implementation plan, see [docs/08_e2e-test-list.md](docs/08_e2e-test-list.md).

## Database Management

### Quick Commands
```bash
make db-init              # Initialize/recreate all tables
make db-create-user EMAIL=user@example.com PASSWORD=password123  # Create test user
make db-reset             # Reset database (⚠️ destructive - drops all data)
```

**For detailed database schema and management, see:**
- [docs/04_database-design.md](docs/04_database-design.md) - Complete schema documentation
- [docs/00_development.md](docs/00_development.md) - Database setup workflows

## Pre-commit Hooks

Pre-commit hooks run lightweight checks (formatting, linting) before each commit. Heavy checks (mypy, pytest, vitest) are excluded for fast commits.

```bash
make pre-commit-install   # Install hooks (run once after clone)
make pre-commit-run       # Manually run hooks on all files
make pre-commit-update    # Update hook versions
```

**Note:** Type checking and tests are NOT run on commit. Run them manually with `make lint` and `make test`.

**For detailed setup and troubleshooting, see [docs/00_development.md](docs/00_development.md)**

## Docker Compose Setup

Four services run in Docker:
- `frontend` (Node 20-alpine)
- `backend` (Python 3.12-slim)
- `db` (MySQL 8.0)
- `redis` (Redis 7-alpine) - Used for rate limiting

Services communicate via the `app-network` bridge network.

**For detailed architecture and configuration, see [docs/01_system-architecture.md](docs/01_system-architecture.md)**

## Project Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with format `<type>(<scope>): <subject>`.

```bash
pnpm -C frontend run commitlint -- --help  # Check commit message format
```

### Code Organization

- **Backend**: Flask + SQLAlchemy with layered architecture (routes → services → models)
- **Frontend**: React + TypeScript with Vite, organized by pages and components
- All API routes use `/api` prefix
- Frontend proxies API requests to backend in development

**For detailed conventions and best practices, see:**
- [docs/05_api-design-guide.md](docs/05_api-design-guide.md) - API design principles
- [backend/CLAUDE.md](backend/CLAUDE.md) - Backend conventions
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend conventions
