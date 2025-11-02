terraform {
  backend "gcs" {
    bucket = "terraform-state-fullstack-app-base"
    prefix = "terraform/state"
    # State LockingはGCSバックエンドでデフォルトで有効
    # GCSはオブジェクトレベルのロックを使用して状態のロックを管理
  }
}
