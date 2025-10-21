# Full Stack App Monorepo

This repository is organized as a monorepo hosting the frontend, backend, and infrastructure code for the project. Shared development standards live at the repository root to keep all packages consistent.

## Directory Structure
- `frontend/` – client application source and tooling.
- `backend/` – API services, background workers, and related backend code.
- `infra/` – infrastructure-as-code definitions, deployment scripts, and ops tooling.

## Getting Started
1. Ensure the language runtimes and tooling described in `docs/\u74b0\u5883\u69cb\u7bc9\u5177\u4f53\u5316.md` are installed.
2. Install dependencies inside `frontend/` and `backend/` using the package managers defined for each workspace.
3. Follow the environment setup instructions in the documentation to configure environment variables, containers, and supporting services.

## Shared Configuration
Common editor and ignore rules are defined in `.editorconfig` and `.gitignore` respectively. Adjust these files when adding new packages or tooling so that formatting and repository hygiene stay consistent across the monorepo.
