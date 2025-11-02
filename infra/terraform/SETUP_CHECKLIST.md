# Terraform Cloud SQL セットアップチェックリスト

Task 7の実施前に、以下の項目が完了していることを確認してください。

## 1. GCPプロジェクトの準備

- [ ] GCPプロジェクトが作成されている
- [ ] プロジェクトID: `fullstack-app-base` (または terraform.tfvars で設定した値)
- [ ] 課金アカウントが設定されている

## 2. 必要なAPIの有効化

以下のコマンドで必要なAPIを有効化してください:

```bash
# プロジェクトIDを設定
export PROJECT_ID="fullstack-app-base"

# 必要なAPIを一括有効化
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  vpcaccess.googleapis.com \
  --project=${PROJECT_ID}
```

### APIの説明

| API | 用途 |
|-----|------|
| `cloudresourcemanager.googleapis.com` | プロジェクト管理 |
| `storage-api.googleapis.com` | Cloud Storage (Terraform State) |
| `storage-component.googleapis.com` | Cloud Storage (フロントエンド) |
| `sqladmin.googleapis.com` | Cloud SQL |
| `compute.googleapis.com` | VPC Network |
| `servicenetworking.googleapis.com` | VPC Peering |
| `vpcaccess.googleapis.com` | VPC Access Connector |

## 3. 認証情報の設定

### ローカル開発環境の場合

```bash
# Google Cloud SDKで認証
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project ${PROJECT_ID}
```

### GitHub Actionsの場合 (後で設定)

- [ ] Workload Identity連携の設定
- [ ] GitHub Secretsの登録
  - `GCP_PROJECT_ID`
  - `GCP_REGION`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT`
  - `DATABASE_PASSWORD`
  - `FLASK_SECRET_KEY`

## 4. Terraform State用バケットの作成

```bash
# バケット名 (グローバルユニークである必要がある)
export BUCKET_NAME="terraform-state-${PROJECT_ID}"

# バケット作成
gsutil mb -p ${PROJECT_ID} -c STANDARD -l asia-northeast1 gs://${BUCKET_NAME}

# バージョニング有効化
gsutil versioning set on gs://${BUCKET_NAME}

# 確認
gsutil ls -L gs://${BUCKET_NAME}
```

## 5. terraform.tfvars の設定

`infra/terraform/terraform.tfvars` ファイルを編集:

```hcl
# 本番用のパスワードとシークレットキーを設定
cloud_sql_password = "your-secure-password-here"
flask_secret_key   = "your-flask-secret-key-here"
```

**重要:**
- このファイルは `.gitignore` に追加されていることを確認
- 本番環境では GitHub Secrets を使用

## 6. 事前確認コマンド

```bash
# 現在のプロジェクト確認
gcloud config get-value project

# 有効なAPIの確認
gcloud services list --enabled --project=${PROJECT_ID}

# 認証情報の確認
gcloud auth application-default print-access-token > /dev/null && echo "認証OK" || echo "認証が必要"

# Terraform State バケットの確認
gsutil ls gs://terraform-state-${PROJECT_ID}
```

## 7. Terraform実行準備

```bash
cd infra/terraform

# 初期化
terraform init

# フォーマット確認
terraform fmt -check

# 検証
terraform validate

# 計画 (dry-run)
terraform plan
```

## チェックリスト完了後

すべての項目が完了したら、[README_CLOUD_SQL.md](README_CLOUD_SQL.md) の動作確認手順に従って、Task 7を実施してください。

## コスト見積もりの確認

Cloud SQLを作成する前に、コストを確認してください:

```bash
# 現在の課金状態を確認
gcloud billing accounts list

# プロジェクトの課金レポートを確認
gcloud beta billing projects describe ${PROJECT_ID}
```

**見積もり:**
- Cloud SQL (db-f1-micro): 約 $7-10/月
- Cloud Storage (State): 約 $0/月 (5GB以下)
- VPC Network: 約 $0/月 (基本料金無料)
- VPC Access Connector: 約 $0-2/月 (使用量による)

**合計: 約 $7-12/月**

## トラブルシューティング

### "API ... is not enabled" エラー

```bash
# エラーメッセージに表示されたAPIを有効化
gcloud services enable <API_NAME> --project=${PROJECT_ID}
```

### "Permission denied" エラー

```bash
# 現在のアカウントを確認
gcloud auth list

# 必要に応じて再認証
gcloud auth application-default login
```

### Terraform State バケットにアクセスできない

```bash
# バケットの権限を確認
gsutil iam get gs://terraform-state-${PROJECT_ID}

# 必要に応じて権限を付与
gsutil iam ch user:$(gcloud config get-value account):objectAdmin gs://terraform-state-${PROJECT_ID}
```
