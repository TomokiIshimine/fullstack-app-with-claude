# Cloud SQL (MySQL) Terraform設定 - Task 7

このドキュメントは、Task 7「Cloud SQL（データベース）のTerraform定義」の実装内容と動作確認手順を記載しています。

## 実装内容

### 作成したリソース

[cloud-sql.tf](cloud-sql.tf)で以下のリソースを定義しました:

1. **Cloud SQL Instance** (`google_sql_database_instance.main`)
   - MySQL 8.0
   - db-f1-micro (最小構成)
   - パブリックIPとプライベートIP両方有効
   - バックアップ無効 (コスト削減)
   - 文字セット: utf8mb4

2. **Cloud SQL Database** (`google_sql_database.database`)
   - データベース名: `app_db` (variables.tfで設定可能)
   - 文字セット: utf8mb4
   - コレーション: utf8mb4_unicode_ci

3. **Cloud SQL User** (`google_sql_user.user`)
   - ユーザー名: `app_user` (variables.tfで設定可能)
   - パスワード: GitHub Secretsから取得

4. **VPC Network** (`google_compute_network.vpc`)
   - VPC名: `fullstack-app-vpc`
   - 自動サブネット作成: 有効

5. **VPC Peering** (`google_compute_global_address.private_ip_address`)
   - プライベートIP範囲: /16
   - Cloud SQLとのVPCピアリング接続

6. **VPC Access Connector** (`google_vpc_access_connector.connector`)
   - Cloud RunからCloud SQLへの接続用
   - IP範囲: 10.8.0.0/28

### 出力値 (outputs.tf)

以下の出力値を[outputs.tf](outputs.tf)に追加しました:

- `cloud_sql_instance_name`: インスタンス名
- `cloud_sql_connection_name`: 接続名 (Cloud Run設定で使用)
- `cloud_sql_database_name`: データベース名
- `cloud_sql_public_ip`: パブリックIPアドレス
- `cloud_sql_private_ip`: プライベートIPアドレス
- `vpc_connector_name`: VPCコネクタ名

## 動作確認手順

### 前提条件

Task 1-6が完了していること:
- GCPプロジェクトのセットアップ
- Workload Identity連携の設定
- Terraform State用バケットの作成
- Terraformディレクトリ構造の作成
- Terraformプロバイダー設定
- Cloud Storage (フロントエンド) の設定

### 1. Terraform初期化

```bash
cd infra/terraform
terraform init
```

**期待される結果:**
```
Initializing the backend...
Successfully configured the backend "gcs"!
Initializing provider plugins...
- Installing hashicorp/google v5.x.x...
- Installing hashicorp/random v3.x.x...
Terraform has been successfully initialized!
```

### 2. Terraform検証

```bash
terraform validate
```

**期待される結果:**
```
Success! The configuration is valid.
```

### 3. Terraform計画 (Cloud SQLのみ)

```bash
terraform plan -target=google_sql_database_instance.main \
               -target=google_sql_database.database \
               -target=google_sql_user.user \
               -target=google_compute_network.vpc \
               -target=google_compute_global_address.private_ip_address \
               -target=google_service_networking_connection.private_vpc_connection \
               -target=google_vpc_access_connector.connector \
               -out=tfplan
```

**確認ポイント:**
- Cloud SQLインスタンスが `db-f1-micro` で作成される
- VPCネットワークとサブネットが作成される
- VPCピアリングが設定される
- VPCコネクタが作成される
- プライベートIPが設定される

**期待される出力例:**
```
Plan: 7 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + cloud_sql_connection_name = (known after apply)
  + cloud_sql_instance_name   = (known after apply)
  + cloud_sql_private_ip      = (known after apply)
  + cloud_sql_public_ip       = (known after apply)
  + vpc_connector_name        = (known after apply)
```

### 4. Terraform適用 (5-10分かかる)

```bash
terraform apply tfplan
```

**注意:** Cloud SQLインスタンスの作成には5-10分かかります。

**期待される結果:**
```
Apply complete! Resources: 7 added, 0 changed, 0 destroyed.

Outputs:
cloud_sql_connection_name = "fullstack-app-base:asia-northeast1:fullstack-app-db-xxxxx"
cloud_sql_instance_name = "fullstack-app-db-xxxxx"
cloud_sql_database_name = "app_db"
cloud_sql_public_ip = "xx.xx.xx.xx"
cloud_sql_private_ip = "10.x.x.x"
vpc_connector_name = "fullstack-app-vpc-connector"
```

### 5. Cloud SQLインスタンスの確認

```bash
# インスタンス詳細の確認
gcloud sql instances describe $(terraform output -raw cloud_sql_instance_name)
```

**確認ポイント:**
- `state: RUNNABLE`
- `databaseVersion: MYSQL_8_0`
- `tier: db-f1-micro`
- `ipAddresses`: パブリックIPとプライベートIPが両方存在

### 6. データベースとユーザーの確認

```bash
# データベース一覧
gcloud sql databases list --instance=$(terraform output -raw cloud_sql_instance_name)

# ユーザー一覧
gcloud sql users list --instance=$(terraform output -raw cloud_sql_instance_name)
```

**期待される結果:**
- データベース `app_db` が存在
- ユーザー `app_user` が存在

### 7. VPC Connectorの確認

```bash
# VPCコネクタの確認
gcloud compute networks vpc-access connectors describe \
  $(terraform output -raw vpc_connector_name) \
  --region=asia-northeast1
```

**確認ポイント:**
- `state: READY`
- `network: fullstack-app-vpc`
- `ipCidrRange: 10.8.0.0/28`

### 8. 接続テスト (オプション - Cloud SQL Proxyを使用)

```bash
# Cloud SQL Proxyのインストール (まだの場合)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Cloud SQL Proxyの起動
./cloud-sql-proxy $(terraform output -raw cloud_sql_connection_name) &

# MySQLクライアントで接続
mysql -h 127.0.0.1 -u app_user -p app_db
# パスワード: terraform.tfvarsで設定した値
```

**期待される結果:**
```
mysql> SHOW DATABASES;
+--------------------+
| Database           |
+--------------------+
| app_db             |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+

mysql> SHOW VARIABLES LIKE 'character_set%';
+--------------------------+----------------------------+
| Variable_name            | Value                      |
+--------------------------+----------------------------+
| character_set_server     | utf8mb4                    |
...
```

## コスト見積もり

Cloud SQLの推定コスト (東京リージョン):

- **db-f1-micro**: 約 $7-10/月
- **ストレージ (10GB HDD)**: 約 $1-2/月
- **ネットワーク送信**: 使用量による
- **合計**: 約 $8-12/月

**コスト削減のヒント:**
```bash
# 使用しない時はインスタンスを停止
gcloud sql instances patch $(terraform output -raw cloud_sql_instance_name) \
  --activation-policy=NEVER

# 再度起動する時
gcloud sql instances patch $(terraform output -raw cloud_sql_instance_name) \
  --activation-policy=ALWAYS
```

## トラブルシューティング

### エラー: "Error 403: ... does not have storage.objects.list access"

**原因:** Terraform State用のGCSバケットへのアクセス権限がない

**解決方法:**
```bash
# サービスアカウントにStorage Adminロールを付与
gcloud projects add-iam-policy-binding fullstack-app-base \
  --member="serviceAccount:terraform@fullstack-app-base.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### エラー: "Compute Engine API has not been enabled"

**原因:** VPC作成に必要なCompute Engine APIが有効になっていない

**解決方法:**
```bash
gcloud services enable compute.googleapis.com
```

### エラー: "Service Networking API has not been enabled"

**原因:** VPCピアリングに必要なService Networking APIが有効になっていない

**解決方法:**
```bash
gcloud services enable servicenetworking.googleapis.com
```

### エラー: "VPC Access API has not been enabled"

**原因:** VPCコネクタ作成に必要なVPC Access APIが有効になっていない

**解決方法:**
```bash
gcloud services enable vpcaccess.googleapis.com
```

## 次のステップ

Task 7が完了したら、以下のタスクに進んでください:

- **Task 8**: Cloud Run (バックエンド) のTerraform定義
- **Task 9**: IAM設定のTerraform定義
- **Task 10**: Terraform出力定義の最終調整

## 参考資料

- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Terraform Google Provider - Cloud SQL](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance)
- [VPC Access Connector](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
- [Cloud SQL Proxy](https://cloud.google.com/sql/docs/mysql/connect-admin-proxy)
