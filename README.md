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

## Setup & Run

1. 依存関係インストール:
   ```bash
   make install
   ```
2. 開発用コンテナの起動 (MySQL など):
   ```bash
   docker compose -f infra/docker-compose.yml --env-file infra/.env.development up -d
   ```
   ※ シンプルに `docker compose up -d` を使う場合は、同等の環境変数を読み込むよう注意してください。
3. フロントエンド開発サーバー:
   ```bash
   pnpm --dir frontend run dev --host 0.0.0.0 --port 5173
   ```
4. バックエンド API サーバー:
   ```bash
   poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000
   ```
5. 終了時は `make down` もしくは `docker compose ... down` を実行してリソースを解放してください。

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
