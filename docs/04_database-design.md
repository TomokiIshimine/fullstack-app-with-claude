# データベース設計書

**作成日:** 2025-10-28
**最終更新:** 2025-11-23
**バージョン:** 1.1
**対象システム:** フルスタックWebアプリケーション

---

## 1. データベース概要

**関連ドキュメント:**
- [認証・認可設計書](./02_authentication-authorization.md) - 認証フロー、users/refresh_tokensテーブル詳細
- [システム構成設計書](./01_system-architecture.md) - アーキテクチャ、技術スタック
- [機能一覧](./03_feature-list.md) - 実装済み機能の一覧

### 1.1 データベース管理システム

| 項目               | 内容                          |
|-------------------|------------------------------|
| RDBMS             | MySQL 8.0                    |
| ストレージエンジン | InnoDB                       |
| 文字セット         | UTF8MB4                      |
| 照合順序           | utf8mb4_general_ci           |

### 1.2 テーブル一覧

| テーブル名         | 説明                          |
|-------------------|------------------------------|
| users             | ユーザー情報管理              |
| refresh_tokens    | JWT リフレッシュトークン管理  |
| schema_migrations | データベースマイグレーション履歴 |

---

## 2. ER図

```mermaid
erDiagram
    users ||--o{ refresh_tokens : "has"

    users {
        BIGINT id PK "ユーザーID"
        VARCHAR email UK "メールアドレス"
        VARCHAR password_hash "パスワードハッシュ"
        ENUM role "ロール(admin/user)"
        VARCHAR name "ユーザー名"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }

    refresh_tokens {
        BIGINT id PK "トークンID"
        BIGINT user_id FK "ユーザーID"
        VARCHAR token UK "リフレッシュトークン"
        DATETIME expires_at "有効期限"
        TINYINT is_revoked "無効化フラグ"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }
```

---

## 3. テーブル定義

### 3.1 users テーブル

ユーザー情報を管理するテーブル。

| カラム名        | データ型           | 制約                     | 説明                        |
|----------------|-------------------|-------------------------|----------------------------|
| id             | BIGINT UNSIGNED   | PRIMARY KEY, AUTO_INC   | ユーザーID                  |
| email          | VARCHAR(255)      | NOT NULL, UNIQUE        | メールアドレス（ログインID） |
| password_hash  | VARCHAR(255)      | NOT NULL                | bcryptハッシュ化パスワード   |
| role           | ENUM('admin', 'user') | NOT NULL, DEFAULT 'user' | ユーザーロール              |
| name           | VARCHAR(100)      | NULL                    | ユーザー名                  |
| created_at     | TIMESTAMP         | NOT NULL, DEFAULT NOW   | レコード作成日時             |
| updated_at     | TIMESTAMP         | NOT NULL, ON UPDATE NOW | レコード更新日時             |

**インデックス:**
- `idx_users_role` on `role` (ロール別検索の高速化)

**ビジネスルール:**
- email は一意である必要がある
- password_hash は bcrypt でハッシュ化された値を保存
- role は 'admin' または 'user' のいずれか（デフォルト: 'user'）
- name はオプション（NULL許可）

---

### 3.2 refresh_tokens テーブル

JWT リフレッシュトークンを管理するテーブル。

| カラム名        | データ型           | 制約                     | 説明                        |
|----------------|-------------------|-------------------------|----------------------------|
| id             | BIGINT UNSIGNED   | PRIMARY KEY, AUTO_INC   | トークンID                  |
| token          | VARCHAR(500)      | NOT NULL, UNIQUE        | リフレッシュトークン         |
| user_id        | BIGINT UNSIGNED   | NOT NULL, FOREIGN KEY   | ユーザーID (users.id)       |
| expires_at     | DATETIME          | NOT NULL                | トークン有効期限             |
| is_revoked     | TINYINT(1)        | NOT NULL, DEFAULT 0     | 無効化フラグ                 |
| created_at     | TIMESTAMP         | NOT NULL, DEFAULT NOW   | レコード作成日時             |
| updated_at     | TIMESTAMP         | NOT NULL, ON UPDATE NOW | レコード更新日時             |

**インデックス:**
- `idx_refresh_tokens_token` on `token` (トークン検証の高速化)
- `idx_refresh_tokens_user_id` on `user_id` (ユーザー別検索)
- `idx_refresh_tokens_expires_at` on `expires_at` (期限切れトークンクリーンアップ)

**外部キー:**
- `user_id` → `users.id` (ON DELETE CASCADE)

**ビジネスルール:**
- token は一意である必要がある
- is_revoked が 1 の場合、トークンは無効化されている
- expires_at を過ぎたトークンは無効

---

## 4. データベーススキーマ管理

### 4.1 スキーマファイル

- **初期化スクリプト**: `infra/mysql/init/001_init.sql`
  - Docker コンテナ初回起動時に自動実行
  - 全テーブルの作成とインデックス設定

- **SQLAlchemy モデル**: `backend/app/models/`
  - `user.py` - User モデル
  - `refresh_token.py` - RefreshToken モデル
  - `schema_migration.py` - SchemaMigration モデル（マイグレーション追跡用）

### 4.2 マイグレーション

#### 4.2.1 新規インストール（Docker環境）

Docker Compose起動時、`infra/mysql/init/001_init.sql`が自動実行され、全テーブルが作成されます:

```bash
make up                   # すべてのサービスを起動（MySQL含む）
```

#### 4.2.2 既存環境へのスキーマ変更（マイグレーション）

既存テーブルへのスキーマ変更は、SQLマイグレーションファイルを使用します:

**手順:**

1. SQLAlchemy モデルを更新（`backend/app/models/`）
2. `infra/mysql/init/001_init.sql` を更新（新規インストール用）
3. `infra/mysql/migrations/` に連番付きマイグレーションSQLを作成
   ```bash
   # 例: 002_add_status_column.sql
   ```
4. ローカル環境でマイグレーションをテスト

**ローカル開発環境:**
```bash
# SQLマイグレーションを適用
poetry -C backend run python scripts/apply_sql_migrations.py
```

**CI/CD環境（本番・ステージング）:**

マイグレーションは**デプロイ時に自動実行**されます:

1. GitHub Actionsがデプロイワークフローを実行
2. Cloud Run Jobが`scripts/run_migrations.sh`を実行
   - Step 1: テーブル作成（新規テーブルのみ）
   - Step 2: **SQLマイグレーション自動適用**
   - Step 3: IAM権限付与
3. マイグレーション成功後にアプリケーションがデプロイされる
4. マイグレーション失敗時はデプロイが中止される

#### 4.2.3 マイグレーション追跡

`schema_migrations`テーブルで適用済みマイグレーションを追跡します:

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| id | BIGINT | 主キー |
| filename | VARCHAR(255) | マイグレーションファイル名（例: `001_add_role.sql`） |
| checksum | VARCHAR(64) | SHA256ハッシュ（ファイル内容の整合性検証用） |
| applied_at | TIMESTAMP | 適用日時 |

**機能:**
- 適用済みマイグレーションを記録
- 重複実行を防止（べき等性）
- ファイル変更を検出（チェックサム比較）

#### 4.2.4 マイグレーション管理のベストプラクティス

1. **マイグレーションファイルは不変**
   - 一度適用したファイルは変更しない
   - 新しい変更は新しいファイルとして作成

2. **連番管理**
   - ファイル名に連番を使用（`001_`, `002_`, ...）
   - アルファベット順で実行される

3. **破壊的変更に注意**
   - ALTER TABLE DROP COLUMNなどは慎重に
   - バックアップ取得を推奨

4. **必ずローカルでテスト**
   - 本番適用前にローカル環境で検証
   - ステージング環境があればそこでも検証

詳細は以下を参照してください:
- [マイグレーションREADME](../infra/mysql/migrations/README.md) - 詳細な手順
- [システム構成設計書](./01_system-architecture.md#82-データベースマイグレーション自動化) - CI/CDフロー
- [開発環境ガイド](./00_development.md#スキーマ更新のワークフロー) - ローカル開発手順

**注意:** 手動での`make db-init`はテーブルを再作成し、既存データが削除されます。本番環境では使用しないでください。

### 4.3 テストデータ

開発環境用のテストユーザーを作成:

```bash
make db-create-user EMAIL=test@example.com PASSWORD=password123

# または直接実行
poetry -C backend run python scripts/create_user.py test@example.com password123
```

---

## 5. パフォーマンス最適化

### 5.1 インデックス設計

**users テーブル:**
- `email` にユニーク制約（ログイン時の高速検索）
- `role` にインデックス（ロール別ユーザー検索の高速化）

**refresh_tokens テーブル:**
- `token` にインデックス（トークン検証の高速化）
- `user_id` にインデックス（ユーザー別トークン取得）
- `expires_at` にインデックス（期限切れトークンのクリーンアップ）

### 5.2 クエリ最適化

- **N+1 問題の回避**: SQLAlchemy の `joinedload` を使用
- **コネクションプーリング**: SQLAlchemy のコネクションプール機能を活用
- **トランザクション管理**: 適切なトランザクションスコープの設定

---

## 6. データ保護とセキュリティ

### 6.1 データ暗号化

- **パスワード**: bcrypt によるハッシュ化（コスト係数: デフォルト 12）
- **トークン**: JWT 署名による改ざん検知
- **通信**: HTTPS による暗号化（本番環境）

### 6.2 データ整合性

- **外部キー制約**: CASCADE DELETE によるリレーションシップの整合性維持
- **NOT NULL 制約**: 必須項目の保証
- **UNIQUE 制約**: 一意性の保証（email, token）

### 6.3 バックアップ戦略（将来的）

- 定期的なデータベースバックアップ
- ポイントインタイムリカバリ
- レプリケーションによる冗長性確保

---

## 7. 付録

### 7.1 データベース管理コマンド

```bash
# データベース初期化
make db-init              # テーブル作成（SQLAlchemy モデルから）

# データベースリセット
make db-reset             # 全データ削除＋再作成

# テストユーザー作成
make db-create-user EMAIL=user@example.com PASSWORD=password123

# MySQL コンソール接続
docker compose -f infra/docker-compose.yml exec db mysql -u app_user -p app_db
```

### 7.2 SQLAlchemy モデルとSQL定義の同期

スキーマの信頼できる情報源（Source of Truth）は **SQLAlchemy モデル** です:

1. モデル定義を更新: `backend/app/models/*.py`
2. 初期化SQLを更新: `infra/mysql/init/001_init.sql`
3. 変更を適用: `make db-init`

### 7.3 SQLAlchemy型マッピング

SQLAlchemyの型とMySQLの型の対応関係:

| SQLAlchemy型 | MySQL型 | 備考 |
|-------------|---------|------|
| `BigInteger` | `BIGINT` | UNSIGNED制約はクロスDB互換性のため省略 |
| `Boolean` | `TINYINT(1)` | MySQLには真偽型がないため |
| `DateTime` | `DATETIME` | TIMESTAMPとは異なる（タイムゾーン非対応） |
| `String(length)` | `VARCHAR(length)` | |
| `Text` | `TEXT` | |

**注意**: `created_at` / `updated_at` カラムは、SQLAlchemyモデルでは `DateTime` 型を使用していますが、MySQL初期化スクリプト（`infra/mysql/init/001_init.sql`）では `TIMESTAMP` 型を使用しています。これは互換性のための設計判断で、どちらも日時を正しく扱えます。

---

**END OF DOCUMENT**
