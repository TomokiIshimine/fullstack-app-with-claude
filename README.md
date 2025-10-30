# Full Stack App Monorepo

React + TypeScript フロントエンドと Flask + SQLAlchemy バックエンドを含むフルスタックモノレポです。現在は TODO アプリケーションを実装しており、Docker Compose を使用した MySQL によるローカル開発環境を提供しています。

## ディレクトリ構造

```
.
├── frontend/          # React + TypeScript クライアントアプリケーション
├── backend/           # Flask API サーバーとバックエンドコード
│   └── scripts/       # データベース管理などの運用スクリプト
├── infra/             # Infrastructure as Code、デプロイスクリプト、運用ツール
├── docs/              # プロジェクトドキュメント
└── specs/             # 仕様書
```

## ドキュメント

包括的なドキュメントは `docs/` ディレクトリに用意されています。

### 新規開発者向け推奨読み順

1. **[開発環境ガイド](docs/development.md)** - まずここから：セットアップ、コマンド、トラブルシューティング
2. **[システム構成設計書](docs/system-architecture.md)** - システム全体の設計と技術スタック
3. **[認証・認可設計書](docs/authentication-authorization.md)** - セキュリティの基礎
4. **[機能一覧](docs/feature-list.md)** - 実装済み機能とAPIエンドポイント

### 専門分野別ドキュメント

- **[データベース設計書](docs/database-design.md)** - スキーマ、ER図、テーブル定義
- **[API設計ガイド](docs/api-design-guide.md)** - REST API規約とベストプラクティス
- **[テスト戦略書](docs/testing-strategy.md)** - テストレベル、カバレッジ目標、テストデータ管理
- **[ドキュメント構成ガイド](docs/documentation-guide.md)** - 全ドキュメントの概要（メタドキュメント）

### 実装ガイド

詳細な実装ガイドは各ディレクトリの `CLAUDE.md` を参照してください：
- **[backend/CLAUDE.md](backend/CLAUDE.md)** - バックエンド実装規約
- **[frontend/CLAUDE.md](frontend/CLAUDE.md)** - フロントエンド実装規約
- **[CLAUDE.md](CLAUDE.md)** - プロジェクト共通ガイド

## クイックスタート

### セットアップとインストール

```bash
make install              # すべての依存関係をインストール（frontend: pnpm, backend: poetry）
make setup                # 完全な環境セットアップ
```

### スタックの起動

```bash
make up                   # Docker コンテナを起動（MySQL、frontend、backend）
make down                 # Docker コンテナを停止
```

### リントとフォーマット

```bash
make lint                 # frontend と backend をリント
make format               # frontend と backend をフォーマット
```

## テスト

### すべてのテストを実行

```bash
make test                 # すべてのテスト（frontend と backend）をカバレッジ付きで実行
```

### テストバリエーション

```bash
make test-frontend        # frontend のテストのみ実行
make test-backend         # backend のテストのみ実行
make test-fast            # カバレッジなしでテスト実行（高速）
make test-cov             # カバレッジ付きでテスト実行し、HTML レポートを生成
make test-parallel        # backend テストを並列実行
```

### 個別テストの実行

```bash
# Frontend - 特定のテストファイルを実行
pnpm --dir frontend run test src/lib/api/todos.test.ts

# Backend - 特定のテストファイルを実行
poetry -C backend run pytest backend/tests/routes/test_todo_routes.py

# Backend - 特定のテスト関数を実行
poetry -C backend run pytest backend/tests/routes/test_todo_routes.py::test_create_todo
```

詳細なテスト戦略については、[docs/testing-strategy.md](docs/testing-strategy.md) を参照してください。

## データベース管理

### クイックコマンド

```bash
make db-init              # すべてのテーブルを初期化/再作成
make db-create-user EMAIL=user@example.com PASSWORD=password123  # テストユーザーを作成
make db-reset             # データベースをリセット（⚠️ 破壊的 - すべてのデータを削除）
```

詳細なデータベーススキーマと管理については、以下を参照してください：
- [docs/database-design.md](docs/database-design.md) - 完全なスキーマドキュメント
- [docs/development.md](docs/development.md) - データベースセットアップワークフロー

## Pre-commit フック

Pre-commit フックは各コミット前に軽量なチェック（フォーマット、リント）を実行します。重いチェック（mypy、pytest、vitest）は高速なコミットのため除外されています。

```bash
make pre-commit-install   # フックをインストール（clone 後に一度実行）
make pre-commit-run       # すべてのファイルに対してフックを手動実行
make pre-commit-update    # フックのバージョンを更新
```

**注意:** 型チェックとテストはコミット時に実行されません。`make lint` と `make test` で手動実行してください。

詳細なセットアップとトラブルシューティングについては、[docs/development.md](docs/development.md) を参照してください。

## Docker Compose セットアップ

3つのサービスが Docker で実行されます：`frontend` (Node 20)、`backend` (Python 3.12)、`db` (MySQL 8.0)。サービスは `app-network` ブリッジネットワークで通信します。

詳細なアーキテクチャと設定については、[docs/system-architecture.md](docs/system-architecture.md) を参照してください。

## プロジェクト規約

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従い、`<type>(<scope>): <subject>` の形式を使用します。

```bash
pnpm -C frontend run commitlint -- --help  # コミットメッセージ形式をチェック
```

**例:**
- `feat(frontend): ユーザーダッシュボードを追加`
- `fix(backend): 空のペイロードを処理`

### コード構成

- **Backend**: Flask + SQLAlchemy のレイヤードアーキテクチャ（routes → services → models）
- **Frontend**: React + TypeScript with Vite、ページとコンポーネントで整理
- すべての API ルートは `/api` プレフィックスを使用
- Frontend は開発時に API リクエストを Backend にプロキシ

詳細な規約とベストプラクティスについては、以下を参照してください：
- [docs/api-design-guide.md](docs/api-design-guide.md) - API 設計原則
- [backend/CLAUDE.md](backend/CLAUDE.md) - Backend 規約
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend 規約

## ライセンス

このプロジェクトのライセンスについては、プロジェクト管理者にお問い合わせください。

## 貢献

プロジェクトへの貢献方法については、開発チームにお問い合わせください。
