# Full Stack App Monorepo

React + TypeScript フロントエンドと Flask + SQLAlchemy バックエンドを含むフルスタックモノレポです。ユーザー認証機能を持つWebアプリケーションを実装しており、Docker Compose を使用した MySQL によるローカル開発環境を提供しています。

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

1. **[開発環境ガイド](docs/00_development.md)** - まずここから：セットアップ、コマンド、トラブルシューティング
2. **[システム構成設計書](docs/01_system-architecture.md)** - システム全体の設計と技術スタック
3. **[認証・認可設計書](docs/02_authentication-authorization.md)** - セキュリティの基礎
4. **[機能一覧](docs/03_feature-list.md)** - 実装済み機能とAPIエンドポイント

### 専門分野別ドキュメント

- **[データベース設計書](docs/04_database-design.md)** - スキーマ、ER図、テーブル定義
- **[API設計ガイド](docs/05_api-design-guide.md)** - REST API規約とベストプラクティス
- **[テスト戦略書](docs/06_testing-strategy.md)** - テストレベル、カバレッジ目標、テストデータ管理
- **[ドキュメント構成ガイド](docs/07_documentation-guide.md)** - 全ドキュメントの概要（メタドキュメント）
- **[E2Eテスト一覧](docs/08_e2e-test-list.md)** - E2Eテストシナリオと実装ガイド

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
pnpm --dir frontend run test src/lib/api/auth.test.ts

# Backend - 特定のテストファイルを実行
poetry -C backend run pytest backend/tests/routes/test_auth_routes.py

# Backend - 特定のテスト関数を実行
poetry -C backend run pytest backend/tests/routes/test_auth_routes.py::test_login_success
```

詳細なテスト戦略については、[docs/06_testing-strategy.md](docs/06_testing-strategy.md) を参照してください。

## データベース管理

### クイックコマンド

```bash
make db-init              # すべてのテーブルを初期化/再作成
make db-create-user EMAIL=user@example.com PASSWORD=password123  # テストユーザーを作成
make db-reset             # データベースをリセット（⚠️ 破壊的 - すべてのデータを削除）
```

詳細なデータベーススキーマと管理については、以下を参照してください：
- [docs/04_database-design.md](docs/04_database-design.md) - 完全なスキーマドキュメント
- [docs/00_development.md](docs/00_development.md) - データベースセットアップワークフロー

## Pre-commit フック

Pre-commit フックは各コミット前に軽量なチェック（フォーマット、リント）を実行します。重いチェック（mypy、pytest、vitest）は高速なコミットのため除外されています。

```bash
make pre-commit-install   # フックをインストール（clone 後に一度実行）
make pre-commit-run       # すべてのファイルに対してフックを手動実行
make pre-commit-update    # フックのバージョンを更新
```

**注意:** 型チェックとテストはコミット時に実行されません。`make lint` と `make test` で手動実行してください。

詳細なセットアップとトラブルシューティングについては、[docs/00_development.md](docs/00_development.md) を参照してください。

## 環境変数設定

### Admin ユーザー設定（必須）

アプリケーションの初回起動時に、Admin ユーザーを作成するための環境変数を設定する必要があります。

`backend/.env` ファイルに以下を追加：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpCCaa70.MYW
```

**パスワードハッシュの生成方法:**

```bash
# ハッシュ生成スクリプトを実行
poetry -C backend run python backend/scripts/generate_admin_hash.py

# パスワードを入力するとハッシュが表示される
# 例: admin123 → $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpCCaa70.MYW
```

**注意:**
- `ADMIN_PASSWORD_HASH` には必ず bcrypt でハッシュ化された値を設定してください
- 平文のパスワードを設定するとバリデーションエラーになります
- 本番環境では強固なパスワードを使用してください

**開発環境での簡易設定:**

平文パスワードを直接設定することもできます（自動的にハッシュ化されます）：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123
```

詳細は `backend/.env.example` を参照してください。

### 本番環境デプロイ時の設定（GitHub Secrets）

GitHub Actions でのデプロイ時に、管理者アカウント情報を安全に設定できます。

**手順:**

1. GitHubリポジトリの設定ページを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動
3. **New repository secret** をクリック
4. 以下の2つのシークレットを追加：

| シークレット名 | 説明 | 例 |
|-------------|------|-----|
| `ADMIN_EMAIL` | 管理者のメールアドレス | `admin@example.com` |
| `ADMIN_PASSWORD_HASH` | 管理者のパスワード（bcryptハッシュ） | `$2b$12$LQv3...` |

ハッシュの生成方法:
```bash
poetry -C backend run python backend/scripts/generate_admin_hash.py
```

**セキュリティ上の注意:**
- パスワードは8文字以上で数字を含む必要があります
- GitHub Secretsは暗号化されて保存されます
- bcryptハッシュを保存することで、平文パスワードの漏洩リスクを最小化します
- GitHub Secretsは GitHub Actions のログに表示されません

## Docker Compose セットアップ

3つのサービスが Docker で実行されます：`frontend` (Node 20)、`backend` (Python 3.12)、`db` (MySQL 8.0)。サービスは `app-network` ブリッジネットワークで通信します。

詳細なアーキテクチャと設定については、[docs/01_system-architecture.md](docs/01_system-architecture.md) を参照してください。

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
  - **共有UIライブラリ**: Tailwind CSSベースのデザインシステム (`components/ui/`)
- すべての API ルートは `/api` プレフィックスを使用
- Frontend は開発時に API リクエストを Backend にプロキシ

詳細な規約とベストプラクティスについては、以下を参照してください：
- [docs/05_api-design-guide.md](docs/05_api-design-guide.md) - API 設計原則
- [backend/CLAUDE.md](backend/CLAUDE.md) - Backend 規約
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend 規約

## 本番環境デプロイ

### Google Cloud SQL 対応

このアプリケーションは Google Cloud SQL への安全な接続をサポートしています：

**主な機能:**
- 🔒 **自動 SSL/TLS 暗号化** - 証明書管理不要
- 🔑 **IAM 認証サポート** - パスワードレス認証が可能
- 🔄 **自動接続プール管理** - 最適なリソース利用
- ⚡ **自動再接続** - 一時的な障害からの復旧

**設定例:**
```env
USE_CLOUD_SQL_CONNECTOR=true
CLOUDSQL_INSTANCE=my-project:asia-northeast1:my-instance
DB_USER=my-service-account@my-project.iam
DB_NAME=app_db
ENABLE_IAM_AUTH=true
```

詳細な設定方法と環境変数については、[docs/00_development.md - Cloud SQL 接続設定](docs/00_development.md#cloud-sql-接続設定本番環境向け) を参照してください。

## ライセンス

このプロジェクトのライセンスについては、プロジェクト管理者にお問い合わせください。

## 貢献

プロジェクトへの貢献方法については、開発チームにお問い合わせください。
