# Repository Guidelines

## プロジェクト構成とモジュール配置
- ルートはモノレポ構成で、`frontend/`（React + TypeScript）, `backend/`（Flask + Poetry）, `infra/`（Docker と MySQL 設定）を中心にまとめています。
- `frontend/src/` は `components/`, `pages/`, `hooks/`, `lib/`, `styles/` で責務を分割しています。`@/` エイリアスで共通ユーティリティへアクセスしてください。
- `backend/app/` は `routes/`, `services/`, `models/`, `schemas/`, `config.py`, `main.py` を持ちます。追加モジュールは責務ごとに既存ディレクトリへ配置し、`backend/tests/` に対応するテストを必ず追加します。
- `infra/docker-compose.yml` と `infra/mysql/` 配下にコンテナ定義と初期化スクリプトをまとめています。

## ビルド・テスト・開発コマンド
- `make install`：フロントは `pnpm install`、バックエンドは `poetry install` をまとめて実行します。
- `make up` / `make down`：`docker compose` でアプリケーションスタックを起動・停止します。環境変数は `infra/.env.development` を参照します。
- `make lint`：`pnpm -C frontend run lint` と `poetry -C backend run flake8` などの静的解析を一括実行します。
- `make test`：`pnpm -C frontend run test` と `poetry -C backend run pytest` を呼び出し、ユニットテストを実行します。
- ローカル開発時は `pnpm -C frontend run dev --host 0.0.0.0 --port 5173`、`poetry -C backend run flask --app app.main run --debug` を併用してください。

## コーディングスタイルと命名規約
- `.editorconfig` に従い、デフォルトはスペース 2、Python ファイルはスペース 4 です。全言語で行長 150 を上限とします。
- フロントエンドは ESLint + Prettier（`pnpm run lint` / `pnpm run format`）、バックエンドは black・isort・flake8・mypy を `poetry run` コマンドで適用します。
- コンポーネント・サービス名は UpperCamelCase、React フックは `use` プレフィックスを付け、Python モジュールは `snake_case.py` を採用します。

## テストガイドライン
- フロントは Vitest + Testing Library を使用し、`*.test.tsx` 形式で UI 振る舞いを検証します。`pnpm run test -- --runInBand` で直列実行が可能です。
- バックエンドは pytest を採用し、I/O を伴わないユニットテストを優先します。データベースを要するケースは将来的な統合テストとして `tests/integration/` を拡張してください。
- CI (`.github/workflows/ci.yml`) では lint と test ジョブが並列で走るため、ローカルでも `make lint` → `make test` を基本フローとします。

## コミットとプルリクエスト運用
- コミットは Conventional Commits（例：`feat(frontend): ヘッダーのレイアウトを追加`）に従い、メッセージ本文は必ず日本語で書いてください。自動整形後の差分のみを含め、不要なファイルは `.gitignore` を確認します。
- PR では目的、主要変更点、動作確認コマンド（例：`make lint`, `make test`, `docker compose up -d`）を記載し、関連 Issue を `#` でリンクします。UI 変更がある場合はスクリーンショットを添付してください。
- pre-commit は変更ファイルのみに適用されるよう設定済みです。`poetry -C backend run pre-commit run` でローカル確認し、失敗時は指摘部分を修正して再実行してください。
