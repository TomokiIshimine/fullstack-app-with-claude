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

## Commit Message Guidelines

This repository follows [Conventional Commits](https://www.conventionalcommits.org/) to keep history readable and automation-friendly. Use the `<type>(<scope>): <subject>` format, for example:

- `feat(frontend): add user dashboard`
- `fix(backend): handle empty payload`

### commitlint

To lint commit messages locally, install dependencies and then run commitlint via pnpm:

```bash
pnpm -C frontend install
pnpm -C frontend run commitlint -- --help
```

You can wire commitlint to the `commit-msg` hook using tools like Husky, or run `pnpm -C frontend exec commitlint --edit .git/COMMIT_EDITMSG` after crafting a commit message.
