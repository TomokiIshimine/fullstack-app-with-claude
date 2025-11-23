# 開発環境ガイド

**作成日:** 2025-10-28
**最終更新:** 2025-11-23
**バージョン:** 1.1

---

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
2. 必要なランタイムをインストールします（Node.js 20 / pnpm 9+ (推奨: pnpm 10)、Python 3.12 / Poetry、Docker / Docker Compose）。
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

## Redis

バックエンドは Redis をレート制限のキャッシュストアとして使用します。

### 環境変数

| 環境変数 | デフォルト | 説明 |
|---------|-----------|------|
| `REDIS_HOST` | redis | Redisホスト名 |
| `REDIS_PORT` | 6379 | Redisポート番号 |
| `REDIS_PASSWORD` | dev-redis-password | Redis認証パスワード |
| `RATE_LIMIT_ENABLED` | true | レート制限の有効化 |

これらの環境変数は `infra/.env.development` で設定されており、Flask-Limiter によるAPIレート制限に使用されます。

### ヘルスチェック

```bash
docker compose -f infra/docker-compose.yml exec redis redis-cli ping
# 応答: PONG
```

### トラブルシューティング

```bash
# Redisの状態確認
docker compose -f infra/docker-compose.yml logs redis

# Redis CLIに接続
docker compose -f infra/docker-compose.yml exec redis redis-cli
# パスワード認証が必要な場合: AUTH <password>

# レート制限の動作確認
# 認証エンドポイントに連続リクエストを送ると429エラーが返される
# 例: ログインエンドポイントは10リクエスト/分に制限されています
```

詳細なレート制限の設定については、[認証・認可設計書](./02_authentication-authorization.md) を参照してください。

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
2. `infra/mysql/init/001_init.sql` を同じ内容に更新（新規インストール用）
3. `infra/mysql/migrations/` に連番付きマイグレーションSQL（例: `002_add_column.sql`）を作成
4. ローカル環境でマイグレーションをテスト

**ローカル開発環境でのマイグレーション適用:**
```bash
# SQLマイグレーションを適用（既存テーブルへのスキーマ変更）
poetry -C backend run python scripts/apply_sql_migrations.py
```

**CI/CD環境での自動マイグレーション:**

本番環境（Cloud Run）では、デプロイ時にマイグレーションが自動的に適用されます:

1. GitHub Actionsがデプロイワークフローを実行
2. Cloud Run Jobが`scripts/run_migrations.sh`を実行
   - Step 1: テーブル作成（新規テーブルのみ）
   - Step 2: **SQLマイグレーション自動適用**（既存テーブルのスキーマ変更）
   - Step 3: IAM権限付与
3. マイグレーション成功後にアプリケーションがデプロイされる

マイグレーションの適用状況は`schema_migrations`テーブルで追跡されます。

**重要な注意事項:**
- SQLAlchemy モデルと SQL ファイルは手動で同期する必要があります
- マイグレーションファイルは**一度適用したら変更しない**でください（チェックサムで整合性を検証）
- 新しいマイグレーションは必ず新しいファイルとして作成してください

詳細は以下を参照してください:
- [データベース設計書](./04_database-design.md) - スキーマ管理の詳細
- [システム構成設計書](./01_system-architecture.md) - CI/CDパイプライン
- [マイグレーションREADME](../infra/mysql/migrations/README.md) - マイグレーション手順

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

## CI/CD ワークフロー

本プロジェクトは GitHub Actions を使用した CI/CD パイプラインを実装しています。

### ワークフロー構成

#### 1. CI ワークフロー (`.github/workflows/ci.yml`)

Pull Request 時に自動実行され、コード品質を検証します:

- **setup**: 依存関係のキャッシュウォーミング
- **lint**: コード品質チェック（並列実行）
- **test**: テストスイート実行（並列実行）

```bash
# ローカルで CI と同等のチェックを実行
make lint                 # Lint チェック
make test                 # テスト実行
```

#### 2. Deploy ワークフロー (`.github/workflows/deploy.yml`)

バージョンタグ (v*) のプッシュ時に自動デプロイを実行します:

- **トリガー条件**: `v*` パターンのタグがプッシュされたとき（例: `v1.0.0`, `v2.1.3`）
- **デプロイ先**: Google Cloud Run
- **追加機能**: GitHub Release の自動作成、バージョン情報の設定

```bash
# デプロイ実行例
git tag v1.0.0
git push origin v1.0.0
```

**注意**: main ブランチへのマージのみではデプロイされません。デプロイするには明示的にタグをプッシュする必要があります。

#### 3. Terraform ワークフロー (`.github/workflows/terraform.yml`)

インフラストラクチャ変更時に実行されます:

- **トリガー条件**: Terraform ファイル変更時のみ
- **Pull Request**: Terraform Plan 結果をコメント
- **main ブランチ**: Terraform Apply を自動実行

### 再利用可能な Composite Actions

コードの重複を削減し、メンテナンス性を向上するため、以下の Composite Actions を提供しています:

#### setup-frontend (`.github/actions/setup-frontend`)

Node.js、pnpm、フロントエンド依存関係をセットアップします。

```yaml
- name: Setup Frontend
  uses: ./.github/actions/setup-frontend
  with:
    node-version: '20'    # オプション、デフォルト: 20
    pnpm-version: '10'    # オプション、デフォルト: 10
```

#### setup-backend (`.github/actions/setup-backend`)

Python、Poetry、バックエンド依存関係をセットアップします。

```yaml
- name: Setup Backend
  uses: ./.github/actions/setup-backend
  with:
    python-version: '3.12'  # オプション、デフォルト: 3.12
```

**キャッシュ戦略**: `poetry.lock` と `pyproject.toml` のハッシュを組み合わせた階層化キャッシュキーを使用し、キャッシュヒット率を最大化しています。

#### setup-gcp (`.github/actions/setup-gcp`)

GCP 認証と gcloud SDK をセットアップします。

```yaml
- name: Setup GCP
  uses: ./.github/actions/setup-gcp
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

#### setup-terraform (`.github/actions/setup-terraform`)

Terraform と GCP 認証を統合セットアップします。

```yaml
- name: Setup Terraform
  uses: ./.github/actions/setup-terraform
  with:
    terraform-version: '~1.9.0'  # オプション、デフォルト: ~1.9.0
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

### パフォーマンス最適化

#### 並列実行

CI ワークフローでは lint と test を並列実行し、実行時間を約 30-40% 短縮しています:

```yaml
lint:
  needs: setup
  # lint ジョブを実行

test:
  needs: setup
  # test ジョブを並列実行
```

#### Path Filtering

deploy.yml と terraform.yml は path フィルタリングを使用し、不要な実行を防止しています:

- **Terraform 変更**: terraform.yml のみ実行
- **アプリケーション変更**: deploy.yml のみ実行
- **ドキュメント変更**: どちらも実行しない

これにより、ワークフロー実行コストと時間を削減しています。

#### キャッシュ戦略

- **pnpm**: `pnpm-lock.yaml` を使用した自動キャッシュ
- **Poetry**: 階層化キャッシュキー（`poetry.lock` + `pyproject.toml`）
- **setup ジョブ**: 後続ジョブのキャッシュウォーミング

### トラブルシューティング

#### CI/CD が失敗する場合

1. **ローカルで同じチェックを実行**:
   ```bash
   make lint && make test
   ```

2. **依存関係の更新**:
   ```bash
   make install
   ```

3. **キャッシュのクリア**: GitHub Actions の UI から "Clear cache" を実行

#### Terraform の状態ロックエラー

Terraform の状態がロックされている場合、`terraform-unlock.yml` ワークフローを使用します:

```bash
# GitHub Actions UI から workflow_dispatch で実行
# Lock ID を指定して強制アンロック
```

詳細は [システム構成設計書](./01_system-architecture.md) を参照してください。

## 認証システム

本プロジェクトは **JWT (JSON Web Token) ベースの認証システム**を実装しています:

- **認証方式**: JWT トークン（アクセストークン + リフレッシュトークン）
- **トークン管理**: httpOnly Cookie によるセキュアな管理
- **セキュリティ**: XSS 攻撃防止、トークンローテーション、bcrypt パスワードハッシュ化
- **認証 API**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`

詳細な認証フロー、トークン仕様、セキュリティ対策については [認証・認可設計書](./02_authentication-authorization.md) を参照してください。

## 開発フロー

1. コンテナを起動: `make up`
2. フロントエンド開発サーバー起動（オプション）:
   ```bash
   pnpm --dir frontend run dev --host 0.0.0.0 --port 5174
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

詳細は [認証・認可設計書](./02_authentication-authorization.md) のトラブルシューティングセクションを参照してください。

## 参考

- 追加のサービスを導入する場合は `infra/docker-compose.yml` の `# Alembic` コメントを基にマイグレーション用コンテナを検討してください。
- システム全体の構成については [システム構成設計書](./01_system-architecture.md) を参照してください。
- API 仕様や実装の詳細は `backend/CLAUDE.md` と `frontend/CLAUDE.md` を参照してください。
