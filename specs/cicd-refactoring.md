# CI/CD リファクタリング仕様書

## 概要

現在のCI/CDワークフローには以下の問題があります：
- コードの重複（Node.js/Python セットアップが各ジョブで重複）
- 非効率な依存関係（lint → test の直列実行）
- メンテナンス性の低下（セットアップ手順が各所に散在）
- GCP 認証やセットアップの重複

これらの問題を段階的に解決するため、4つのフェーズに分けてリファクタリングを実施します。

---

## Phase 1: 再利用可能な Composite Actions の作成

### 目的
重複しているセットアップ手順を Composite Actions として切り出し、再利用可能にする。

### 実装内容

#### 1.1 Frontend セットアップ用 Composite Action

**ファイル**: `.github/actions/setup-frontend/action.yml`

```yaml
name: 'Setup Frontend'
description: 'Setup Node.js, pnpm, and install frontend dependencies'

inputs:
  node-version:
    description: 'Node.js version to use'
    required: false
    default: '20'
  pnpm-version:
    description: 'pnpm version to use'
    required: false
    default: '10'

runs:
  using: 'composite'
  steps:
    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: ${{ inputs.pnpm-version }}

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'pnpm'
        cache-dependency-path: frontend/pnpm-lock.yaml

    - name: Install frontend dependencies
      shell: bash
      run: pnpm --dir frontend install
```

#### 1.2 Backend セットアップ用 Composite Action

**ファイル**: `.github/actions/setup-backend/action.yml`

```yaml
name: 'Setup Backend'
description: 'Setup Python, Poetry, and install backend dependencies'

inputs:
  python-version:
    description: 'Python version to use'
    required: false
    default: '3.12'

runs:
  using: 'composite'
  steps:
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: ${{ inputs.python-version }}

    - name: Install Poetry
      shell: bash
      run: pipx install poetry

    - name: Cache Poetry dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.cache/pypoetry
          ~/.local/share/pypoetry
          ~/.local/share/virtualenvs
        key: ${{ runner.os }}-poetry-${{ hashFiles('backend/poetry.lock') }}
        restore-keys: |
          ${{ runner.os }}-poetry-

    - name: Install backend dependencies
      shell: bash
      run: poetry -C backend install --no-interaction
```

#### 1.3 GCP セットアップ用 Composite Action

**ファイル**: `.github/actions/setup-gcp/action.yml`

```yaml
name: 'Setup GCP'
description: 'Authenticate to Google Cloud and setup gcloud SDK'

inputs:
  workload_identity_provider:
    description: 'GCP Workload Identity Provider'
    required: true
  service_account:
    description: 'GCP Service Account'
    required: true

runs:
  using: 'composite'
  steps:
    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: ${{ inputs.workload_identity_provider }}
        service_account: ${{ inputs.service_account }}

    - name: Setup Google Cloud SDK
      uses: google-github-actions/setup-gcloud@v2
```

### 変更対象ファイル
- 新規作成: `.github/actions/setup-frontend/action.yml`
- 新規作成: `.github/actions/setup-backend/action.yml`
- 新規作成: `.github/actions/setup-gcp/action.yml`

### 期待される効果
- セットアップ手順の一元管理
- コードの重複削減
- メンテナンス性の向上

### 検証方法
1. 各 Composite Action を作成
2. ローカルで YAML の構文チェック
3. 次の Phase 2 で実際に使用して動作確認

---

## Phase 2: CI ワークフローの最適化

### 目的
- Composite Actions を使用してコードを簡潔化
- lint と test を並列実行して CI 時間を短縮
- 共通のセットアップジョブを導入

### 実装内容

#### 2.1 CI ワークフローの再構成

**ファイル**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  workflow_dispatch:
  workflow_call:

jobs:
  # 共通のセットアップジョブ（キャッシュウォーミング用）
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Frontend
        uses: ./.github/actions/setup-frontend

      - name: Setup Backend
        uses: ./.github/actions/setup-backend

  # lint と test を並列実行
  lint:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Frontend
        uses: ./.github/actions/setup-frontend

      - name: Setup Backend
        uses: ./.github/actions/setup-backend

      - name: Run lint checks
        run: make lint

  test:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Frontend
        uses: ./.github/actions/setup-frontend

      - name: Setup Backend
        uses: ./.github/actions/setup-backend

      - name: Run tests
        run: make test
```

### 変更対象ファイル
- 修正: `.github/workflows/ci.yml`

### 期待される効果
- CI 実行時間の短縮（lint と test の並列化により約30-40%削減見込み）
- コード量の削減（約50行削減）
- 可読性の向上

### 検証方法
1. Pull Request を作成して CI が正常に動作することを確認
2. lint と test が並列実行されていることを確認
3. 実行時間を従来と比較

---

## Phase 3: ワークフロー実行タイミングの整理

### 目的
- `deploy.yml` と `terraform.yml` の実行タイミングを最適化
- 不要な重複実行を防止
- デプロイフローを効率化

### 実装内容

#### 3.1 Terraform ワークフローの更新

**ファイル**: `.github/workflows/terraform.yml`

現状のまま維持（Terraform ファイルの変更時のみ実行）

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'infra/terraform/**'
      - '.github/workflows/terraform.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'infra/terraform/**'
      - '.github/workflows/terraform.yml'
  workflow_dispatch:
```

#### 3.2 Deploy ワークフローの更新

**ファイル**: `.github/workflows/deploy.yml`

Terraform 以外のファイル変更時にデプロイを実行するように条件を追加：

```yaml
on:
  push:
    branches:
      - main
    paths-ignore:
      - 'infra/terraform/**'
      - '.github/workflows/terraform.yml'
      - '**.md'
      - 'docs/**'
  workflow_dispatch:
```

#### 3.3 統合デプロイワークフローの作成（オプション）

**ファイル**: `.github/workflows/main-deploy.yml`

Terraform と通常のデプロイを統合する場合の代替案：

```yaml
name: Main Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  check-changes:
    runs-on: ubuntu-latest
    outputs:
      terraform: ${{ steps.filter.outputs.terraform }}
      application: ${{ steps.filter.outputs.application }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            terraform:
              - 'infra/terraform/**'
              - '.github/workflows/terraform.yml'
            application:
              - 'backend/**'
              - 'frontend/**'
              - 'Makefile'
              - '.github/workflows/deploy.yml'

  terraform:
    needs: check-changes
    if: needs.check-changes.outputs.terraform == 'true'
    uses: ./.github/workflows/terraform.yml
    secrets: inherit

  deploy:
    needs: check-changes
    if: needs.check-changes.outputs.application == 'true'
    uses: ./.github/workflows/deploy.yml
    secrets: inherit
```

### 変更対象ファイル
- 修正: `.github/workflows/deploy.yml`
- オプション: 新規作成 `.github/workflows/main-deploy.yml`

### 期待される効果
- Terraform と通常デプロイの重複実行を防止
- ドキュメント変更時の不要なデプロイを防止
- ワークフロー実行コストの削減

### 検証方法
1. Terraform ファイルのみ変更して、Terraform ワークフローのみが実行されることを確認
2. アプリケーションコードのみ変更して、デプロイワークフローのみが実行されることを確認
3. ドキュメントのみ変更して、デプロイが実行されないことを確認

---

## Phase 4: キャッシュ戦略の改善と最終調整

### 目的
- キャッシュの効率を最大化
- ワークフロー全体の最適化
- ドキュメントの更新

### 実装内容

#### 4.1 キャッシュキーの改善

Backend セットアップの Composite Action を更新：

**ファイル**: `.github/actions/setup-backend/action.yml`

```yaml
- name: Cache Poetry dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/pypoetry
      ~/.local/share/pypoetry
      ~/.local/share/virtualenvs
    key: ${{ runner.os }}-poetry-${{ hashFiles('backend/poetry.lock') }}-${{ hashFiles('backend/pyproject.toml') }}
    restore-keys: |
      ${{ runner.os }}-poetry-${{ hashFiles('backend/poetry.lock') }}-
      ${{ runner.os }}-poetry-
```

#### 4.2 Terraform と GCP セットアップの統合

**ファイル**: `.github/actions/setup-terraform/action.yml`

```yaml
name: 'Setup Terraform'
description: 'Setup Terraform and authenticate to GCP'

inputs:
  terraform-version:
    description: 'Terraform version to use'
    required: false
    default: '~1.9.0'
  workload_identity_provider:
    description: 'GCP Workload Identity Provider'
    required: true
  service_account:
    description: 'GCP Service Account'
    required: true
  working-directory:
    description: 'Working directory for Terraform'
    required: false
    default: 'infra/terraform'

runs:
  using: 'composite'
  steps:
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ inputs.terraform-version }}
        terraform_wrapper: false

    - name: Setup GCP
      uses: ./.github/actions/setup-gcp
      with:
        workload_identity_provider: ${{ inputs.workload_identity_provider }}
        service_account: ${{ inputs.service_account }}
```

#### 4.3 Deploy ワークフローでの GCP セットアップ使用

**ファイル**: `.github/workflows/deploy.yml` の一部修正

```yaml
steps:
  - name: Checkout repository
    uses: actions/checkout@v4

  - name: Setup GCP
    uses: ./.github/actions/setup-gcp
    with:
      workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
      service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

  - name: Configure Docker for Artifact Registry
    run: |
      gcloud auth configure-docker ${{ env.GCP_REGION }}-docker.pkg.dev
```

#### 4.4 Terraform ワークフローでの統合セットアップ使用

**ファイル**: `.github/workflows/terraform.yml` の一部修正

```yaml
steps:
  - name: Checkout repository
    uses: actions/checkout@v4

  - name: Setup Terraform
    uses: ./.github/actions/setup-terraform
    with:
      workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
      service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

#### 4.5 ドキュメント更新

**ファイル**: `docs/00_development.md`

CI/CD の変更内容を反映：
- 新しい Composite Actions の説明
- ワークフロー構成の説明
- トラブルシューティングセクションの追加

### 変更対象ファイル
- 修正: `.github/actions/setup-backend/action.yml`
- 新規作成: `.github/actions/setup-terraform/action.yml`
- 修正: `.github/workflows/deploy.yml`
- 修正: `.github/workflows/terraform.yml`
- 修正: `.github/workflows/terraform-unlock.yml`
- 修正: `docs/00_development.md`

### 期待される効果
- キャッシュヒット率の向上
- さらなるコード重複の削減
- ドキュメントの最新化

### 検証方法
1. 連続した CI 実行でキャッシュが効いていることを確認
2. 全ワークフローが正常に動作することを確認
3. ドキュメントの内容が実装と一致していることを確認

---

## 実装スケジュール

1. **Phase 1**: 1-2時間（Composite Actions の作成）
2. **Phase 2**: 1-2時間（CI ワークフローの更新とテスト）
3. **Phase 3**: 1-2時間（デプロイフロー最適化とテスト）
4. **Phase 4**: 2-3時間（最終調整、ドキュメント更新、総合テスト）

**合計見積もり**: 5-9時間

---

## ロールバック計画

各フェーズ完了後に以下を確認：
- CI/CD が正常に動作すること
- テストがすべてパスすること
- デプロイが成功すること

問題が発生した場合は、該当フェーズの変更を git revert で戻す。

---

## 成功基準

1. CI 実行時間が30%以上短縮される
2. コードの重複が50%以上削減される
3. すべてのワークフローが正常に動作する
4. キャッシュヒット率が80%以上
5. ドキュメントが最新の状態に保たれている

---

## 備考

- 各フェーズは独立して実装可能
- Phase 1 を完了してから Phase 2 以降を進めることを推奨
- Phase 3 の統合デプロイワークフローはオプションのため、必要に応じて実装
