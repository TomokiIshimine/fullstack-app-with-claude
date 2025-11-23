# CI/CD環境構築ガイド

**作成日:** 2025-11-10
**最終更新:** 2025-11-23
**バージョン:** 1.1
**対象システム:** フルスタックWebアプリケーション

**更新履歴:**
- v1.1 (2025-11-23): 最終更新日の更新
- v1.0 (2025-11-10): 初版作成

---

## 1. はじめに

### 1.1 本ドキュメントの目的

このドキュメントは、本プロジェクトをフォークした後、CI/CD環境を構築し、自動テスト・デプロイパイプラインを稼働させるまでの手順を説明します。初心者の方でも一歩ずつ進められるように、各手順を詳しく解説しています。

### 1.2 前提知識

このガイドを理解するために、以下の基礎知識があると望ましいです：

- GitHub の基本操作（リポジトリのフォーク、プルリクエスト）
- Git の基本コマンド
- CI/CD の基本概念
- Google Cloud Platform の基本操作（任意、デプロイを行う場合）

### 1.3 このガイドで達成できること

本ガイドに従うことで、以下が実現できます：

1. プルリクエスト作成時に自動的にコードの品質チェックとテストが実行される
2. バージョンタグのプッシュ時に自動的に本番環境へデプロイされる（オプション）
3. インフラ変更時に Terraform が自動適用される（オプション）

---

## 2. CI/CD パイプライン概要

### 2.1 ワークフロー構成

本プロジェクトでは、以下の4つの GitHub Actions ワークフローが構成されています：

| ワークフロー | ファイル | トリガー | 目的 |
|------------|---------|---------|------|
| CI | `.github/workflows/ci.yml` | プルリクエスト作成時 | コード品質チェック・テスト実行 |
| Deploy | `.github/workflows/deploy.yml` | バージョンタグ (v*) の push | 本番環境へのデプロイ・GitHub Release作成 |
| Terraform | `.github/workflows/terraform.yml` | Terraform ファイル変更時 | インフラの計画・適用 |
| Terraform Unlock | `.github/workflows/terraform-unlock.yml` | 手動実行 | Terraform ステートロック解除 |

### 2.2 CI ワークフローの詳細

CI ワークフローは、以下のジョブで構成されています：

#### Frontend ジョブ

1. **lint-frontend**
   - ESLint によるコード品質チェック
   - TypeScript の型チェック
   - Prettier によるフォーマットチェック

2. **test-frontend**
   - Vitest によるユニットテスト実行
   - カバレッジレポート生成・アップロード

#### Backend ジョブ

1. **lint-backend**
   - flake8 による Python コード品質チェック
   - mypy による型チェック
   - isort によるインポート順序チェック
   - black によるフォーマットチェック

2. **test-backend**
   - pytest によるユニットテスト実行
   - カバレッジレポート生成・アップロード

#### Security ジョブ

1. **security**
   - pnpm audit による Frontend 依存関係の脆弱性チェック
   - poetry check による Backend 依存関係チェック
   - pip-audit による既知のセキュリティ問題チェック

### 2.3 デプロイワークフローの詳細

Deploy ワークフローは、バージョンタグ（例: `v1.0.0`）のプッシュ時に実行され、Google Cloud Platform の Cloud Run にアプリケーションをデプロイします：

1. **CI の実行** - 上記の CI ワークフローを呼び出し
2. **インフラ情報の取得** - Terraform の output から Cloud Run の情報を取得
3. **バックエンドのデプロイ**
   - Docker イメージのビルド（Frontend + Backend を含む）
   - Artifact Registry へのプッシュ
   - データベースマイグレーションの実行
   - Cloud Run へのデプロイ（`APP_VERSION` 環境変数にタグ名を設定）
   - ヘルスチェック実行
4. **GitHub Release の自動作成**（タグプッシュ時のみ）
   - PRベースのリリースノート自動生成
   - カテゴリ別分類（新機能、バグ修正、パフォーマンス改善など）
   - GitHub Release の作成

---

## 3. 最小構成：CI のみを有効化（推奨）

フォーク直後は、まず CI（自動テスト）のみを有効化することを推奨します。デプロイ環境の構築は不要で、GitHub のみで動作します。

### 3.1 必要な作業

CI ワークフローは GitHub Actions の標準機能のみを使用しているため、**追加の設定は不要**です。

### 3.2 動作確認手順

1. **ブランチを作成**

   ```bash
   git checkout -b test/ci-check
   ```

2. **適当な変更を加える**

   ```bash
   # 例：README に空行を追加
   echo "" >> README.md
   git add README.md
   git commit -m "test: verify CI workflow"
   git push origin test/ci-check
   ```

3. **プルリクエストを作成**

   GitHub でプルリクエストを作成すると、自動的に CI ワークフローが実行されます。

4. **CI の実行結果を確認**

   - GitHub のプルリクエストページで「Checks」タブを確認
   - すべてのチェックが緑色（✓）になれば成功

5. **カバレッジレポートを確認**

   - CI ジョブの詳細ページで「Artifacts」セクションを確認
   - `frontend-coverage` と `backend-coverage` がダウンロード可能

### 3.3 CI のトラブルシューティング

#### ケース1: テストが失敗する

**症状:**
```
FAIL src/components/UserList.test.tsx
  ✕ should render users
```

**原因:** テストコードまたはアプリケーションコードに問題がある

**対処法:**
1. ローカルでテストを実行して詳細を確認
   ```bash
   make test
   ```
2. エラーメッセージを確認して該当箇所を修正
3. 修正後、再度 push して CI を再実行

#### ケース2: Lint エラーが発生する

**症状:**
```
Error: 'foo' is defined but never used  no-unused-vars
```

**原因:** コーディング規約に違反している

**対処法:**
1. ローカルで lint を実行
   ```bash
   make lint
   ```
2. エラーを修正、または自動修正を実行
   ```bash
   make format
   ```
3. 修正後、再度 push

#### ケース3: セキュリティチェックが失敗する

**症状:**
```
found 3 vulnerabilities (1 moderate, 2 high)
```

**原因:** 依存パッケージに既知の脆弱性がある

**対処法:**
1. 依存関係を更新
   ```bash
   # Frontend
   pnpm --dir frontend update

   # Backend
   poetry -C backend update
   ```
2. それでも解決しない場合は、該当パッケージのバージョンを個別に更新

**注意:** セキュリティチェックは `continue-on-error: true` が設定されているため、失敗しても CI 全体は成功扱いになります。

---

## 4. フル構成：デプロイまで有効化（上級者向け）

CI に加えて、GCP へのデプロイまで自動化する場合の手順です。

### 4.1 前提条件

- Google Cloud Platform のアカウント
- GCP プロジェクトの作成権限
- 基本的な GCP の知識（Cloud Run、Cloud SQL、IAM など）
- Terraform の基本知識

### 4.2 GCP プロジェクトの準備

#### ステップ1: GCP プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 新しいプロジェクトを作成
3. プロジェクト ID をメモ（例：`my-fullstack-app-123456`）

#### ステップ2: 必要な API の有効化

以下の API を有効化します：

```bash
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable vpcaccess.googleapis.com
gcloud services enable servicenetworking.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable iamcredentials.googleapis.com
```

または、GCP Console から手動で有効化することもできます。

#### ステップ3: サービスアカウントの作成

GitHub Actions から GCP リソースにアクセスするためのサービスアカウントを作成します。

```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Service Account" \
    --project=YOUR_PROJECT_ID

# 必要な権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

#### ステップ4: Workload Identity 連携の設定

GitHub Actions が GCP にアクセスするための Workload Identity 連携を設定します。

```bash
# Workload Identity プールの作成
gcloud iam workload-identity-pools create "github-actions" \
    --project="YOUR_PROJECT_ID" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Workload Identity プロバイダーの作成
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
    --project="YOUR_PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="github-actions" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition="assertion.repository_owner == 'YOUR_GITHUB_USERNAME'" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントとの紐付け
gcloud iam service-accounts add-iam-policy-binding \
    github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com \
    --project="YOUR_PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_USERNAME/REPO_NAME"
```

**重要:** `PROJECT_NUMBER` は GCP プロジェクトの番号です。プロジェクト ID ではありません。
以下のコマンドで確認できます：

```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

#### ステップ5: Workload Identity Provider の完全な識別子を取得

以下のコマンドで、GitHub Secrets に設定する値を取得します：

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
    --project="YOUR_PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="github-actions" \
    --format="value(name)"
```

出力例：
```
projects/123456789/locations/global/workloadIdentityPools/github-actions/providers/github-actions-provider
```

### 4.3 GitHub Secrets の設定

GitHub リポジトリの Settings > Secrets and variables > Actions から、以下の Secrets を追加します：

#### 必須の Secrets

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider の完全な識別子 | 上記ステップ5のコマンド出力 |
| `GCP_SERVICE_ACCOUNT` | サービスアカウントのメールアドレス | `github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com` |
| `DATABASE_PASSWORD` | Cloud SQL のパスワード | 任意の強力なパスワードを生成（例：`openssl rand -base64 32`） |
| `FLASK_SECRET_KEY` | Flask のセッション暗号化キー | 任意の強力なキーを生成（例：`openssl rand -hex 32`） |
| `ADMIN_EMAIL` | 管理者ユーザーのメールアドレス | 任意のメールアドレス（例：`admin@example.com`） |
| `ADMIN_PASSWORD_HASH` | 管理者ユーザーのパスワードハッシュ | 後述の方法で生成 |

#### 管理者パスワードハッシュの生成方法

```bash
# Backend ディレクトリで実行
poetry -C backend run python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your_admin_password'))"
```

出力されたハッシュ値（`scrypt:32768:8:1$...` の形式）を `ADMIN_PASSWORD_HASH` に設定します。

### 4.4 Terraform 変数の設定

`infra/terraform/terraform.tfvars` ファイルを作成し、以下の内容を記述します：

```hcl
gcp_project_id = "YOUR_PROJECT_ID"
gcp_region     = "asia-northeast1"  # 東京リージョン

# その他の変数はデフォルト値を使用
# 必要に応じてカスタマイズ可能
```

**注意:** `terraform.tfvars` は Git にコミットしないでください（`.gitignore` に含まれています）。

### 4.5 Terraform バックエンドの設定

Terraform の state を保存する GCS バケットを作成します：

```bash
# バケット名は全世界で一意である必要があります
gsutil mb -p YOUR_PROJECT_ID -l asia-northeast1 gs://YOUR_PROJECT_ID-terraform-state

# バージョニングを有効化
gsutil versioning set on gs://YOUR_PROJECT_ID-terraform-state
```

`infra/terraform/backend.tf` を確認し、バケット名が正しく設定されていることを確認します。

### 4.6 初回の Terraform 実行

GitHub Actions でデプロイする前に、ローカルで Terraform を実行してインフラを構築します：

```bash
cd infra/terraform

# 初期化
terraform init

# プランの確認
terraform plan \
  -var="cloud_sql_password=$(echo $DATABASE_PASSWORD)" \
  -var="flask_secret_key=$(echo $FLASK_SECRET_KEY)"

# 適用（確認後に実行）
terraform apply \
  -var="cloud_sql_password=$(echo $DATABASE_PASSWORD)" \
  -var="flask_secret_key=$(echo $FLASK_SECRET_KEY)"
```

**注意:** 初回実行時は、リソースの作成に15-20分程度かかります（特に Cloud SQL）。

### 4.7 デプロイの動作確認

1. **main ブランチに変更をマージ**

   Pull Request を main ブランチにマージします。この時点ではデプロイは実行されません。

2. **バージョンタグを作成・プッシュ**

   デプロイするタイミングで、バージョンタグを作成してプッシュします：

   ```bash
   # mainブランチに切り替え
   git checkout main
   git pull origin main

   # バージョンタグを作成（セマンティックバージョニング推奨）
   git tag v1.0.0

   # タグをプッシュ（デプロイが自動実行される）
   git push origin v1.0.0
   ```

3. **デプロイの進行状況を確認**

   - GitHub の Actions タブで Deploy ワークフローの実行状況を確認
   - 各ステップのログを確認
   - デプロイには通常5-10分程度かかります

4. **デプロイされたアプリケーションにアクセス**

   Deploy ワークフローの最後に表示される URL にアクセス：
   ```
   🚀 Full-stack application deployed successfully!
   🌐 Application URL: https://YOUR_SERVICE-RANDOM_ID-an.a.run.app
   ```

5. **GitHub Release の確認**

   - リポジトリの Releases ページで新しいリリースが自動作成されていることを確認
   - リリースノートにPR情報がカテゴリ別に整理されていることを確認

6. **バージョン情報の確認**

   - デプロイされたアプリケーションにアクセス
   - ヘッダー右上にバージョン情報（例: `v1.0.0`）が表示されることを確認
   - または `/api/health` エンドポイントで確認：
     ```bash
     curl https://YOUR_SERVICE-RANDOM_ID-an.a.run.app/api/health
     # {"status": "healthy", "database": "connected", "version": "v1.0.0"}
     ```

7. **ログインして動作確認**

   - 設定した管理者メールアドレスとパスワードでログイン
   - アプリケーションが正常に動作することを確認

### 4.8 デプロイのトラブルシューティング

#### ケース1: Workload Identity 認証エラー

**症状:**
```
Error: google: could not find default credentials
```

**原因:** Workload Identity の設定が正しくない

**対処法:**
1. Workload Identity Provider の識別子が正しいか確認
2. サービスアカウントのメールアドレスが正しいか確認
3. `attribute-condition` で指定した GitHub ユーザー名/リポジトリ名が正しいか確認

#### ケース2: 権限エラー

**症状:**
```
Error: The caller does not have permission
```

**原因:** サービスアカウントに必要な権限が付与されていない

**対処法:**
1. ステップ3で示したすべての IAM ロールが付与されているか確認
2. 権限の反映には数分かかる場合があるため、少し待ってから再実行

#### ケース3: データベースマイグレーションの失敗

**症状:**
```
Error: Database migration job failed
```

**原因:** Cloud SQL への接続に失敗、またはマイグレーションスクリプトにエラーがある

**対処法:**
1. Cloud Run Jobs のログを確認
   ```bash
   gcloud run jobs executions list --job=db-migrate --region=asia-northeast1
   gcloud run jobs executions describe EXECUTION_NAME --region=asia-northeast1
   ```
2. データベース接続設定（VPC Connector、Cloud SQL Proxy）を確認
3. マイグレーションスクリプトにエラーがないか確認

#### ケース4: ヘルスチェックの失敗

**症状:**
```
❌ Health check failed after 10 attempts
```

**原因:** アプリケーションが正常に起動していない、または `/api/health` エンドポイントにアクセスできない

**対処法:**
1. Cloud Run のログを確認
   ```bash
   gcloud run services logs read YOUR_SERVICE_NAME --region=asia-northeast1
   ```
2. 環境変数が正しく設定されているか確認
3. Docker イメージのビルドが成功しているか確認

---

## 5. Terraform ワークフローの使用

### 5.1 Terraform ワークフローの動作

Terraform ワークフローは、インフラ変更時に自動的に実行されます：

1. **Pull Request 時**
   - `terraform plan` を実行
   - 変更内容を PR にコメント

2. **main ブランチへの push 時**
   - `terraform apply` を自動実行
   - インフラを実際に変更

### 5.2 Terraform ファイルの変更手順

1. **ブランチを作成**

   ```bash
   git checkout -b infra/add-redis-cache
   ```

2. **Terraform ファイルを編集**

   ```bash
   vim infra/terraform/main.tf
   ```

3. **ローカルで検証**

   ```bash
   cd infra/terraform
   terraform fmt
   terraform validate
   terraform plan
   ```

4. **変更をコミット・プッシュ**

   ```bash
   git add infra/terraform/
   git commit -m "feat(infra): add Redis cache"
   git push origin infra/add-redis-cache
   ```

5. **Pull Request を作成**

   - PR を作成すると、自動的に `terraform plan` が実行される
   - PR のコメントに変更内容が表示される
   - 変更内容を確認して問題がなければマージ

6. **main へのマージ**

   - マージすると自動的に `terraform apply` が実行される
   - インフラが実際に変更される

### 5.3 Terraform State のロック解除

稀に Terraform のステートがロックされたままになる場合があります。

**症状:**
```
Error: Error acquiring the state lock
Lock Info:
  ID:        12345678-1234-1234-1234-123456789abc
```

**対処法:**

1. GitHub の Actions タブで「Terraform Force Unlock」ワークフローを手動実行
2. Lock ID（上記の例では `12345678-1234-1234-1234-123456789abc`）を入力
3. 実行してロックを解除

**注意:** 複数人が同時に Terraform を実行していないことを確認してから実行してください。

---

## 6. ワークフローのカスタマイズ

### 6.1 CI のカスタマイズ

#### テストのタイムアウトを変更

`.github/workflows/ci.yml` の該当ジョブに `timeout-minutes` を追加：

```yaml
test-frontend:
  name: Test Frontend
  runs-on: ubuntu-latest
  timeout-minutes: 15  # デフォルトは360分
  steps:
    # ...
```

#### 特定のブランチでのみ CI を実行

```yaml
on:
  pull_request:
    branches:
      - main
      - develop  # develop ブランチへの PR でも CI を実行
```

#### カバレッジの閾値を設定

Frontend の場合（`frontend/vitest.config.ts`）：

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
```

Backend の場合（`backend/pyproject.toml`）：

```toml
[tool.pytest.ini_options]
addopts = "--cov-fail-under=80"
```

### 6.2 デプロイのカスタマイズ

#### デプロイ先のリージョンを変更

`.github/workflows/deploy.yml` の環境変数を変更：

```yaml
env:
  GCP_REGION: us-central1  # アメリカ中部に変更
```

同様に、`infra/terraform/terraform.tfvars` も変更：

```hcl
gcp_region = "us-central1"
```

#### デプロイの承認フローを追加

GitHub の環境（Environments）機能を使用して、デプロイ前に承認を必須にできます。

1. GitHub リポジトリの Settings > Environments > New environment
2. 環境名を入力（例：`production`）
3. 「Required reviewers」を有効化
4. 承認者を追加

`.github/workflows/deploy.yml` に環境を指定：

```yaml
deploy-backend:
  name: "Deploy Backend"
  runs-on: ubuntu-latest
  environment: production  # 追加
  needs: get-terraform-outputs
  steps:
    # ...
```

#### デプロイを特定の時間帯のみに制限

夜間のみデプロイを許可する例：

```yaml
jobs:
  check-time:
    runs-on: ubuntu-latest
    steps:
      - name: Check if deployment time is allowed
        run: |
          HOUR=$(TZ='Asia/Tokyo' date +%H)
          if [ $HOUR -lt 22 ] || [ $HOUR -gt 6 ]; then
            echo "Deployment is only allowed between 22:00 and 06:00 JST"
            exit 1
          fi

  deploy-backend:
    needs: check-time
    # ...
```

### 6.3 セキュリティチェックのカスタマイズ

#### Snyk によるセキュリティスキャンを追加

`.github/workflows/ci.yml` に新しいジョブを追加：

```yaml
snyk-security:
  name: Snyk Security Scan
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        command: test
        args: --severity-threshold=high
```

---

## 7. ベストプラクティス

### 7.1 CI/CD の運用

1. **Pull Request は小さく保つ**
   - CI の実行時間を短く保つ
   - レビューしやすくなる

2. **main ブランチを保護する**
   - Settings > Branches > Branch protection rules
   - 「Require status checks to pass before merging」を有効化
   - CI のすべてのチェックを必須にする

3. **定期的な依存関係の更新**
   - Dependabot を有効化して自動的に更新 PR を作成
   - Settings > Security > Dependabot

4. **失敗したデプロイのロールバック**
   - GCP Console から前のバージョンに即座にロールバック可能
   - Cloud Run > サービス > REVISIONS タブ

### 7.2 コスト最適化

1. **開発環境用のリソースを削減**
   - `terraform.tfvars` で小さいインスタンスタイプを使用
   ```hcl
   cloud_run_max_instances = 1
   cloud_sql_tier = "db-f1-micro"
   ```

2. **使用していない環境を削除**
   ```bash
   terraform destroy
   ```

3. **Cloud SQL のバックアップ設定を最適化**
   - 本番環境以外はバックアップを無効化または頻度を下げる

### 7.3 セキュリティのベストプラクティス

1. **Secrets のローテーション**
   - 定期的に（3-6ヶ月ごと）Secrets を更新
   - 特に離職者が出た場合は即座に更新

2. **最小権限の原則**
   - サービスアカウントには必要最小限の権限のみを付与
   - 不要な権限は削除

3. **監査ログの有効化**
   - GCP の監査ログを有効化して変更履歴を記録

4. **シークレットスキャンの有効化**
   - GitHub の Secret scanning を有効化
   - Settings > Security > Code security and analysis

---

## 8. まとめ

### 8.1 最小構成（CI のみ）の場合

フォーク後、すぐに以下が利用可能です：

- ✅ 自動的なコード品質チェック
- ✅ 自動的なテスト実行
- ✅ カバレッジレポートの生成
- ✅ セキュリティチェック

追加の設定は不要です。

### 8.2 フル構成（デプロイ含む）の場合

以下の手順が必要です：

1. ✅ GCP プロジェクトの作成
2. ✅ 必要な API の有効化
3. ✅ サービスアカウントの作成と権限付与
4. ✅ Workload Identity 連携の設定
5. ✅ GitHub Secrets の設定
6. ✅ Terraform バックエンドの準備
7. ✅ 初回の Terraform 実行

これらが完了すれば、main ブランチへのマージで自動的にデプロイされます。

### 8.3 次のステップ

CI/CD 環境が整ったら、以下のドキュメントも参照してください：

- [開発環境ガイド](00_development.md) - ローカル開発環境のセットアップ
- [テスト戦略書](06_testing-strategy.md) - テストの書き方とベストプラクティス
- [API 設計ガイド](05_api-design-guide.md) - API 開発時の規約

---

## 9. よくある質問（FAQ）

### Q1: CI の実行時間を短縮したい

**A:** 以下の方法があります：

1. キャッシュの活用（現在の設定では既に活用済み）
2. テストの並列実行（Backend では `pytest-xdist` を使用可能）
3. 不要なステップの削除

### Q2: ローカルで CI と同じチェックを実行したい

**A:** 以下のコマンドで同等のチェックが実行できます：

```bash
# すべてのチェックを実行
make lint
make test

# または個別に
make lint-frontend
make test-frontend
make lint-backend
make test-backend
```

### Q3: デプロイを一時的に停止したい

**A:** 以下のいずれかの方法があります：

1. **ワークフローを無効化**
   - `.github/workflows/deploy.yml` の先頭に `if: false` を追加

2. **デプロイジョブをスキップ**
   - コミットメッセージに `[skip deploy]` を含める（要設定変更）

3. **ブランチ保護ルールで deploy ジョブを必須から外す**

### Q4: 本番環境とステージング環境を分けたい

**A:** 以下の手順で実現できます：

1. GCP に別プロジェクトを作成（ステージング用）
2. GitHub Environments で `staging` と `production` を作成
3. Deploy ワークフローを分割または環境を指定するよう変更
4. ブランチごとにデプロイ先を変更（例：`develop` → staging、`main` → production）

### Q5: CI/CD のログはどこで確認できますか？

**A:** 以下の場所で確認できます：

1. **GitHub Actions のログ**
   - リポジトリの Actions タブ
   - 各ワークフローの実行詳細

2. **GCP のログ**
   - Cloud Run のログ: Cloud Console > Cloud Run > サービス > LOGS タブ
   - Cloud SQL のログ: Cloud Console > Cloud SQL > インスタンス > LOGS タブ
   - すべてのログ: Cloud Console > Logging > ログエクスプローラ

### Q6: デプロイ時にダウンタイムは発生しますか？

**A:** いいえ、ほぼゼロダウンタイムでデプロイされます。

Cloud Run は新しいリビジョンをデプロイする際に：
1. 新しいコンテナを起動
2. ヘルスチェックが成功するまで待機
3. トラフィックを徐々に新しいリビジョンに切り替え
4. 古いコンテナを段階的にシャットダウン

ただし、データベースマイグレーションに重大な変更（テーブル削除など）がある場合は影響が出る可能性があります。

---

## 10. 参考リソース

### 公式ドキュメント

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

### プロジェクト内ドキュメント

- [システム構成設計書](01_system-architecture.md)
- [開発環境ガイド](00_development.md)
- [テスト戦略書](06_testing-strategy.md)

### 関連ツール

- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [gcloud CLI リファレンス](https://cloud.google.com/sdk/gcloud/reference)
- [Terraform Registry](https://registry.terraform.io/)

---

**ドキュメントの改善提案やフィードバックは Issue または Pull Request でお願いします。**
