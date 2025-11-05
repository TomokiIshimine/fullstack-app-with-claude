# 開発環境ガイド

このドキュメントでは、モノレポ環境での開発手順、環境変数の設定、トラブルシューティングのヒントをまとめます。

## プロジェクトドキュメント

本プロジェクトは以下のドキュメント構成で管理されています:

- **[システム構成設計書](./01_system-architecture.md)** - アーキテクチャ、技術スタック、システム全体の設計
- **[データベース設計書](./04_database-design.md)** - データベーススキーマ、ER図、テーブル定義
- **[認証・認可設計書](./02_authentication-authorization.md)** - JWT認証フロー、トークン仕様、セキュリティ対策
- **[機能一覧](./03_feature-list.md)** - 実装済み機能の一覧と実装状況
- **[開発環境ガイド](./00_development.md)** - 本ドキュメント（開発手順、環境設定）

詳細な実装ガイドは各ディレクトリの `CLAUDE.md` を参照してください:
- [backend/CLAUDE.md](../backend/CLAUDE.md) - バックエンド実装ガイド
- [frontend/CLAUDE.md](../frontend/CLAUDE.md) - フロントエンド実装ガイド

## 初期セットアップ

1. リポジトリをクローンします。
2. 必要なランタイムをインストールします（Node.js 20 / pnpm、Python 3.12 / Poetry、Docker / Docker Compose）。
3. 依存関係は `make install` でまとめてセットアップできます。

```bash
make install              # フロントエンド（pnpm）とバックエンド（poetry）の依存関係をインストール
make setup                # インストール後の完了メッセージを表示
```

## 環境変数

### Docker Compose 環境変数

- Docker Compose 全体の環境変数は `infra/.env.development` にまとめています。
- データベース接続情報（`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`）や Flask の `FLASK_APP` が含まれます。
- 変更した場合は `make down && make up` で再起動してください。

### JWT認証関連の環境変数

認証システムは JWT トークンを httpOnly Cookie で管理します。以下の環境変数で設定をカスタマイズできます:

| 環境変数 | デフォルト | 説明 |
|---------|-----------|------|
| `JWT_SECRET_KEY` | ランダム生成 | JWT署名用の秘密鍵（本番環境では必ず設定） |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 1440 (1日) | アクセストークンの有効期限（分） |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | リフレッシュトークンの有効期限（日） |
| `COOKIE_SECURE` | false | HTTPS限定Cookie（本番環境では`true`を推奨） |
| `COOKIE_DOMAIN` | (未設定) | Cookieの有効ドメイン |

詳細は [認証・認可設計書](./02_authentication-authorization.md) を参照してください。

### バックエンドローカル環境変数（オプション）

`backend/.env` ファイルを作成して、ローカル開発用の環境変数を設定できます:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/app_db
FLASK_ENV=development
LOG_LEVEL=DEBUG
JWT_SECRET_KEY=your-secret-key-here
```

### Cloud SQL 接続設定（本番環境向け）

Google Cloud SQL に接続する場合は、以下の環境変数を設定します:

| 環境変数 | 必須 | デフォルト | 説明 |
|---------|------|-----------|------|
| `USE_CLOUD_SQL_CONNECTOR` | いいえ | `false` | Cloud SQL Connector を有効化（`true`/`false`） |
| `CLOUDSQL_INSTANCE` | はい* | - | Cloud SQL インスタンス名（`project:region:instance`形式） |
| `DB_USER` | はい* | - | データベースユーザー名 |
| `DB_NAME` | はい* | - | データベース名 |
| `ENABLE_IAM_AUTH` | いいえ | `false` | IAM 認証を使用（`true`/`false`） |
| `DB_PASS` | 条件付き** | - | データベースパスワード |
| `DB_POOL_SIZE` | いいえ | `5` | 接続プールサイズ |
| `DB_MAX_OVERFLOW` | いいえ | `10` | 最大オーバーフロー接続数 |

*`USE_CLOUD_SQL_CONNECTOR=true` の場合のみ必須
**`ENABLE_IAM_AUTH=false` の場合のみ必須

**設定例（IAM 認証）:**
```env
USE_CLOUD_SQL_CONNECTOR=true
CLOUDSQL_INSTANCE=my-project:asia-northeast1:my-instance
DB_USER=my-service-account@my-project.iam
DB_NAME=app_db
ENABLE_IAM_AUTH=true
```

**設定例（パスワード認証）:**
```env
USE_CLOUD_SQL_CONNECTOR=true
CLOUDSQL_INSTANCE=my-project:asia-northeast1:my-instance
DB_USER=app_user
DB_NAME=app_db
DB_PASS=my-secure-password
ENABLE_IAM_AUTH=false
```

詳細は [backend/CLAUDE.md - Database Configuration](../backend/CLAUDE.md#database-configuration) を参照してください。

## よく使うコマンド

| フロー            | コマンド            | 説明                                     |
|------------------|---------------------|------------------------------------------|
| 依存関係の導入    | `make install`      | frontend/backend の依存を一括インストール |
| Docker 起動       | `make up`           | MySQL を含むコンテナをバックグラウンドで起動 |
| Docker 停止       | `make down`         | コンテナ群を停止／削除                   |
| Lint & Type Check | `make lint`         | ESLint (React) / flake8 & mypy (Flask)   |
| テスト            | `make test`         | Vitest (frontend) と pytest (backend)    |
| フォーマット      | `make format`       | Prettier / isort / black                 |

**テストインフラ:**
テストファクトリー・ヘルパー関数・セキュリティテストなどの詳細については、[テスト戦略書](./06_testing-strategy.md) を参照してください。

## データベース管理

### 初回セットアップ（新規環境）

新規環境では、Docker Compose が自動的にデータベースを初期化します:

```bash
make up                   # すべてのサービスを起動（MySQL含む）
```

MySQL コンテナは初回起動時に `infra/mysql/init/001_init.sql` を実行し、以下のテーブルを作成します:
- `users` - ユーザー認証
- `refresh_tokens` - JWT トークン管理
- `todos` - TODO アイテム（ユーザーと関連付け）

### 手動スキーマ管理

既存環境やスキーマ更新時には以下のコマンドを使用します:

**すべてのテーブルを初期化/再作成:**
```bash
make db-init
# または直接:
poetry -C backend run python scripts/create_tables.py
```

このスクリプトは SQLAlchemy モデルを使用して `Base.metadata.create_all()` でテーブルを作成します。スクリプトは `backend/scripts/create_tables.py` にあります。

**テストユーザーの作成:**
```bash
make db-create-user EMAIL=user@example.com PASSWORD=password123
# または直接:
poetry -C backend run python scripts/create_user.py user@example.com password123
```

**データベースのリセット（⚠️ 破壊的操作）:**
```bash
make db-reset             # Docker ボリュームを削除してデータベースを再作成
```

### スキーマ更新のワークフロー

データベーススキーマを変更する場合:

1. `app/models/` の SQLAlchemy モデルを更新
2. `infra/mysql/init/001_init.sql` を同じ内容に更新
3. 既存環境では `make db-init` を実行するか、手動でデータを移行

**重要な注意事項:**
- SQLAlchemy モデルと SQL ファイルは手動で同期する必要があります
- 現在プロジェクトでは Alembic マイグレーションを使用していません
- 本番デプロイでは適切なマイグレーションツールの導入を検討してください

詳細は [データベース設計書](./04_database-design.md) を参照してください。

## Pre-commit フック（軽量チェック）

Pre-commit フックは、コミット前にステージングされたファイルに対して**軽量チェック**を自動実行します。重いチェック（mypy、pytest、vitest）は意図的に除外され、高速なコミットを実現しています。

### コミット時に自動実行される内容

- コードフォーマット（フロントエンド: Prettier、バックエンド: black/isort）
- Lint チェック（フロントエンド: ESLint、バックエンド: flake8）
- 一般的な問題チェック（末尾の空白、マージコンフリクト、大容量ファイル）

### 手動コマンド

```bash
make pre-commit-install   # フックのインストール（クローン後に一度実行）
make pre-commit-run       # すべてのファイルに対してフックを手動実行
make pre-commit-update    # フックのバージョン更新
```

### 重要な注意事項

型チェック（mypy）とテスト（pytest、vitest）はパフォーマンスのためコミット時に実行されません。手動で実行してください:

```bash
make lint                 # mypy + flake8 + ESLint を実行
make test                 # カバレッジ付きでテストを実行
```

## 認証システム

本プロジェクトは **JWT (JSON Web Token) ベースの認証システム**を実装しています:

- **認証方式**: JWT トークン（アクセストークン + リフレッシュトークン）
- **トークン管理**: httpOnly Cookie によるセキュアな管理
- **セキュリティ**: XSS 攻撃防止、トークンローテーション、bcrypt パスワードハッシュ化
- **認証 API**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`

詳細な認証フロー、トークン仕様、セキュリティ対策については [認証・認可設計書](./authentication-authorization.md) を参照してください。

## 開発フロー

1. コンテナを起動: `make up`
2. フロントエンド開発サーバー起動（オプション）:
   ```bash
   pnpm --dir frontend run dev --host 0.0.0.0 --port 5173
   ```
3. バックエンド開発サーバー起動（オプション）:
   ```bash
   poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000
   ```
4. 開発作業を実施
5. 終了時: `make down`

**注**: Docker Compose 起動時（`make up`）にフロントエンドとバックエンドも自動起動されます。開発サーバーを手動起動するのは、個別に再起動したい場合やデバッグ時のみです。

## トラブルシューティング

### 環境変数の読み込みに失敗する

`.env` ファイルの変更後は必ずコンテナを再起動してください:

```bash
make down && make up
```

反映を確認するには:
```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.development exec backend env | grep MYSQL
```

### Docker が起動しない

既存のボリュームが壊れている可能性があります:

1. ログを確認: `docker compose -f infra/docker-compose.yml logs db`
2. ボリュームをリセット: `make db-reset` （データが削除されます）
3. それでも解決しない場合: `docker compose -f infra/docker-compose.yml down -v` でボリュームを完全削除

### データベース接続エラー

バックエンドがデータベースに接続できない場合:

1. MySQL コンテナが起動しているか確認: `docker compose -f infra/docker-compose.yml ps`
2. MySQL のヘルスチェック状態を確認: `docker compose -f infra/docker-compose.yml ps db`
3. 接続情報を確認: `infra/.env.development` の `MYSQL_*` 変数をチェック
4. ログを確認: `docker compose -f infra/docker-compose.yml logs backend`

### テストの CPU 使用量が高い

`make test` はスレッド数を制限する設定を含みますが、Vitest 側のキャッシュをリセットしたい場合:

```bash
pnpm --dir frontend run test -- --runInBand --clearCache
```

または:
```bash
rm -rf frontend/node_modules/.vitest
```

### Lint でエラーが出る

まずフォーマッターを実行してコードを整形してください:

```bash
make format               # Prettier / isort / black を実行
```

それでもエラーが残る場合は、ルールの例外設定を検討するか、コードを修正してください。

### 認証関連のエラー

**「Unauthorized」エラーが出る:**
- Cookie が正しく送信されているか確認（ブラウザの開発者ツール → Application → Cookies）
- トークンの有効期限が切れていないか確認
- `/api/auth/refresh` でトークンを更新してみる

**ログイン後すぐにログアウトされる:**
- `backend/.env` の `JWT_SECRET_KEY` が設定されているか確認
- バックエンドを再起動した場合、既存のトークンは無効になるため再ログインが必要

詳細は [認証・認可設計書](./authentication-authorization.md) のトラブルシューティングセクションを参照してください。

## 参考

- 追加のサービスを導入する場合は `infra/docker-compose.yml` の `# Alembic` コメントを基にマイグレーション用コンテナを検討してください。
- システム全体の構成については [システム構成設計書](./01_system-architecture.md) を参照してください。
- API 仕様や実装の詳細は `backend/CLAUDE.md` と `frontend/CLAUDE.md` を参照してください。
