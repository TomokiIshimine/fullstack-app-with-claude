# 実装指示書（方式A前提）：Cloud SQL Connector（Python）での TLS 接続対応

## 概要
Cloud SQL インスタンスで `require_ssl = true` を維持したまま、Cloud Run（本番サービスおよびマイグレーションジョブ）から **Cloud SQL Connector（Python）** を用いて **TLS 接続**を行う。証明書の手動管理を不要化し、将来的な監査・運用に耐える構成を確立する。

---

## 目的
- アプリ／マイグレーションの DB 接続を **TLS 前提**へ移行
- **証明書検証・サーバー真正性**を担保（Connector が自動処理）
- 可能であれば **IAM DB 認証** を採用し、パスワードレス化

---

## スコープ
- Cloud Run 本番サービス
- マイグレーションジョブ（Alembic など）
- 共有接続モジュール（アプリ／マイグレーションで共用）
- ネットワーク・権限・シークレットの見直し

---

## 前提条件・事前準備
- Cloud SQL（MySQL）インスタンス：
  - Private IP 利用
  - `require_ssl = true` を **維持**
  - （任意）**IAM DB 認証**を有効化
- Cloud Run サービスアカウント（以下 **CR-SA**）に付与するロール：
  - `roles/cloudsql.client`（Cloud SQL への接続許可）
  - （IAM DB 認証を使う場合）`roles/cloudsql.instanceUser`
  - Serverless VPC Access を使うための `roles/vpcaccess.user`
  - Secret Manager から取得する場合は `roles/secretmanager.secretAccessor`
- ネットワーク：
  - Cloud Run → VPC への経路（**Serverless VPC Access Connector**）を作成・割当
  - Cloud Run サービスで `--vpc-connector` を指定し、`--vpc-egress=private-ranges-only` を推奨
- （任意）Terraform/デプロイ基盤に上記設定を反映可能であること

---

## 依存パッケージ（Python）
- `cloud-sql-python-connector`
- `PyMySQL`
- `SQLAlchemy`

> バージョンは既存スタックと整合する最新安定版を採用。脆弱性フィードも確認すること。

---

## 環境変数（例）
- `CLOUDSQL_INSTANCE`：`<PROJECT_ID>:<REGION>:<INSTANCE_NAME>`
- `DB_USER`：DB ユーザー（IAM DB 認証時は IAM と整合するユーザー）
- `DB_NAME`：データベース名
- `ENABLE_IAM_AUTH`：`true` / `false`（既定 `true` 推奨）
- （IAM DB 認証を使わない場合のみ）`DB_PASS`：DB パスワード（Secret Manager 管理）
- `DB_POOL_SIZE`：プールサイズ（デフォルト例 `5`）
- `DB_MAX_OVERFLOW`：最大オーバーフロー（デフォルト例 `5`）

---

## 実装（共通接続モジュールのサンプル）
```python
# db_connector.py
import os
import sqlalchemy
from google.cloud.sql.connector import Connector, IPTypes

# グローバルに Connector を保持（プロセス終了時に close されるのが望ましい）
_connector = Connector(ip_type=IPTypes.PRIVATE)

def _enable_iam_auth() -> bool:
    return os.getenv("ENABLE_IAM_AUTH", "true").lower() == "true"

def get_engine() -> sqlalchemy.Engine:
    instance = os.environ["CLOUDSQL_INSTANCE"]
    user = os.environ["DB_USER"]
    db_name = os.environ["DB_NAME"]
    enable_iam = _enable_iam_auth()
    db_pass = os.environ.get("DB_PASS") if not enable_iam else None

    def getconn():
        # Connector が TLS/証明書検証を自動化
        return _connector.connect(
            instance,
            "pymysql",
            user=user,
            password=db_pass,
            db=db_name,
            enable_iam_auth=enable_iam,
        )

    pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
    max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "5"))
    engine = sqlalchemy.create_engine(
        "mysql+pymysql://",
        creator=getconn,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=pool_size,
        max_overflow=max_overflow,
        # echo=True  # デバッグ用。本番では無効化
    )
    return engine

def close_connector():
    _connector.close()
```
- **ポイント**
  - 接続 URL を直接組み立てず、`creator=getconn` を使う
  - TLS は Connector が自動有効化（証明書検証込み）
  - 可能なら `ENABLE_IAM_AUTH=true` とし、DB パスワードを排除

---

## アプリ側統合（例）
```python
# app.py（FastAPI/Flask 等）
from db_connector import get_engine, close_connector

engine = get_engine()

# …アプリ起動処理…

# アプリ終了時フックで Connector を明示的にクローズ（任意）
import atexit
atexit.register(close_connector)
```

---

## マイグレーション（Alembic 例）
- `env.py` で上記の `get_engine()` を呼び出して Engine を取得する。
```python
# alembic/env.py
from db_connector import get_engine
from myapp.models import Base  # metadata を持つ宣言ベース

target_metadata = Base.metadata

def run_migrations_online():
    connectable = get_engine()
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
```

---

## Cloud Run 設定（例：gcloud）
```bash
# Serverless VPC Access Connector 作成（初回のみ）
gcloud compute networks vpc-access connectors create <connector-name> \
  --network <vpc-name> \
  --region <region> \
  --range 10.8.0.0/28

# Cloud Run サービス更新
gcloud run services update <service-name> \
  --set-env-vars CLOUDSQL_INSTANCE=<PROJECT:REGION:INSTANCE>,DB_USER=<USER>,DB_NAME=<DB> \
  --set-env-vars ENABLE_IAM_AUTH=true,DB_POOL_SIZE=5,DB_MAX_OVERFLOW=5 \
  --vpc-connector <connector-name> \
  --vpc-egress private-ranges-only \
  --service-account <CR-SA>
```
> 追加で必要なロール（CR-SA）：`roles/cloudsql.client`, `roles/vpcaccess.user`、（IAM DB 認証時）`roles/cloudsql.instanceUser`、Secret 参照なら `roles/secretmanager.secretAccessor`。

---

## セキュリティ要件
- `require_ssl = true` を維持
- パスワードを使う場合でも **Secret Manager** 管理、ログ出力禁止
- CR-SA の権限は **最小権限**（上記ロールに限定）
- 監査ログ／構成管理に記録（誰が、いつ設定変更したか）

---

## 受け入れ基準（Acceptance Criteria）
- [ ] ステージングでアプリ／マイグレーションともに **正常接続・CRUD 成功**
- [ ] TLS 使用を確認（例：`SHOW SESSION STATUS LIKE 'Ssl_version'` が `TLSv*` を返す）
- [ ] パフォーマンス回帰なし（p95/p99、接続確立時間、プール挙動）
- [ ] 秘密情報は Secret 管理、平文やログ出力なし
- [ ] 運用手順にローテーション（IAM/Secret）を追記

---

## テスト計画
1. 接続性：read/write、トランザクション、再接続
2. TLS 検証：上記 `SHOW SESSION STATUS LIKE 'Ssl_version'` の確認
3. 障害系：DB 再起動、ネットワーク断、プール枯渇、同時接続増
4. マイグレーション：dry-run → 本実行、ロールバック検証

---

## ロールアウト
- ステージング完了 → カナリア（部分トラフィック）→ メトリクス監視 → 全量切替
- 監視：接続エラー率、レイテンシ、DB ログ、Cloud Run/Cloud SQL のメトリクス
- 営業時間内のウィンドウで実施、DB 管理者待機

---

## ロールバック
- 直前リビジョンへ切替
- ネットワーク／権限の不整合は優先修正（VPC Connector、ロール）
- `require_ssl` の無効化は **非常手段のみ**（期限と再有効化計画を必ず記録）

---

## 期限（記入例）
- ステージング適用：YYYY-MM-DD
- 本番適用：YYYY-MM-DD
