# Repository Guidelines

CLAUDE.md のガイダンスを踏まえて、以下のポイントを守って作業してください。

## プロジェクト構成とモジュール配置
- ルートはモノレポ構成です。`frontend/`（React + TypeScript）, `backend/`（Flask + Poetry）, `infra/`（Docker と MySQL 設定）を中心にまとめています。
- `frontend/src/` は `components/`, `pages/`, `hooks/`, `lib/`, `styles/` に責務分割されています。`@/` エイリアスで共通ユーティリティにアクセスしてください。詳細は `frontend/CLAUDE.md` を参照します。
- `backend/app/` は `routes/`, `services/`, `models/`, `schemas/`, `config.py`, `main.py` を持ちます。追加モジュールは責務ごとに既存ディレクトリへ配置し、`backend/tests/` に対応するテストを必ず追加します。バックエンド固有の規約は `backend/CLAUDE.md` を確認してください。
- 本プロジェクトはクリーンアーキテクチャを前提としており、ユースケースやドメインを中心に外側の層が依存する構造を崩さないようにしてください。
- `infra/docker-compose.yml` と `infra/mysql/` 配下にコンテナ定義と初期化スクリプトをまとめています。アーキテクチャ概要は `docs/01_system-architecture.md` を参照してください。

## ドキュメントと参照資料
- プロジェクト全体の導入手順は `docs/00_development.md` を最初に確認してください。
- 機能一覧や API 仕様は `docs/03_feature-list.md` および `docs/05_api-design-guide.md` にまとまっています。
- 認証・認可、テスト方針、CI/CD など専門トピックは `docs/02_authentication-authorization.md` から `docs/09_cicd-setup-guide.md` を必要に応じて参照します。

## セットアップ・開発用コマンド
- 依存関係のインストール：`make install`（frontend の `pnpm install` と backend の `poetry install` を一括実行）
- 環境の初期化：`make setup`
- 開発用スタックの起動／停止：`make up` / `make down`（Docker Compose 利用、環境変数は `infra/.env.development`）
- 単体コマンド：
  - フロントエンド開発サーバー：`pnpm -C frontend run dev --host 0.0.0.0 --port 5173`
  - バックエンド開発サーバー：`poetry -C backend run flask --app app.main run --debug`
- データベース操作：`make db-init`, `make db-reset`, `make db-create-user EMAIL=... PASSWORD=...`（破壊的操作に注意）

## Lint・フォーマッタ・テスト
- 静的解析一括実行：`make lint`
- フォーマット：`make format`（確認のみは `make format-check`）
- テスト一括実行：`make test`（高速実行は `make test-fast`、カバレッジ付きは `make test-cov`、フロント／バック個別は `make test-frontend`, `make test-backend`）
- 個別テスト：
  - フロント：`pnpm --dir frontend run test <test-file>`
  - バック：`poetry -C backend run pytest <path>::<function>`
- フロントは Vitest + Testing Library、バックエンドは pytest を採用しています。CI では lint と test が並列で走るため、ローカルでも `make lint` → `make test` を基本フローとしてください。

## コーディングスタイルと命名規約
- `.editorconfig` に従い、デフォルトはスペース 2、Python ファイルはスペース 4。全言語で行長 150 を上限とします。
- フロントは ESLint + Prettier を `pnpm run lint` / `pnpm run format` で適用します。バックは black・isort・flake8・mypy を `poetry run` 系コマンドで実行します。
- コンポーネント・サービス名は UpperCamelCase、React フックは `use` プレフィックスを付け、Python モジュールは `snake_case.py` を採用します。
- 追加のガイドラインがある場合は各モジュール直下の `AGENTS.md` や `CLAUDE.md` を確認してください。

## プリコミットフック
- `make pre-commit-install` で初回インストールし、手動実行は `make pre-commit-run` を使用します。
- フックは軽量チェックのみを対象としています。型チェックやテストは `make lint`・`make test` を手動で実行してください。

## コミットとプルリクエスト運用
- コミットは Conventional Commits（例：`feat(frontend): ヘッダーのレイアウトを追加`）に従い、メッセージ本文は必ず日本語で書いてください。
- PR では目的、主要変更点、動作確認コマンド（例：`make lint`, `make test`, `docker compose up -d`）を記載し、関連 Issue を `#` でリンクします。UI 変更がある場合はスクリーンショットを添付してください。
- pre-commit は変更ファイルのみに適用されます。`poetry -C backend run pre-commit run` でローカル確認し、失敗時は指摘部分を修正して再実行してください。

## Docker Compose とサービス構成
- `frontend`（Node 20-alpine）、`backend`（Python 3.12-slim）、`db`（MySQL 8.0）、`redis`（Redis 7-alpine）が `app-network` 上で連携します。
- 詳細なアーキテクチャは `docs/01_system-architecture.md`、CI/CD セットアップは `docs/09_cicd-setup-guide.md` を確認してください。

## 追加ヒント
- 新しいメンバーは `docs/00_development.md` → `docs/01_system-architecture.md` → `docs/02_authentication-authorization.md` → `docs/03_feature-list.md` の順で読むと全体像を掴みやすいです。
- 認証やテスト戦略、E2E シナリオなど詳細は `docs/04_database-design.md` 以降を適宜参照してください。
