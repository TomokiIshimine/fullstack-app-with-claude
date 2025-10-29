# フルスタックアプリケーション モノレポ

このリポジトリは、フロントエンド、バックエンド、インフラストラクチャコードをホストするモノレポとして構成されています。共通の開発標準はリポジトリルートに配置され、すべてのパッケージの一貫性を保ちます。

## ディレクトリ構造
- `frontend/` – クライアントアプリケーションのソースとツール
- `backend/` – APIサービス、バックグラウンドワーカー、関連するバックエンドコード
- `infra/` – Infrastructure as Code定義、デプロイスクリプト、運用ツール

## はじめに
1. `docs/development.md` に記載されている言語ランタイムとツールがインストールされていることを確認してください
2. `frontend/` および `backend/` 内で、各ワークスペース用に定義されたパッケージマネージャーを使用して依存関係をインストールします
3. ドキュメントの環境セットアップ手順に従って、環境変数、コンテナ、およびサポートサービスを設定します

## 共通設定
共通のエディタ設定と無視ルールは、それぞれ `.editorconfig` と `.gitignore` で定義されています。新しいパッケージやツールを追加する際は、これらのファイルを調整して、モノレポ全体でフォーマットとリポジトリ衛生を一貫して保ちます。

## セットアップと実行

1. 依存関係のインストール:
   ```bash
   make install
   ```
2. 開発用コンテナの起動（MySQL など）:
   ```bash
   docker compose -f infra/docker-compose.yml --env-file infra/.env.development up -d
   ```
   ※ シンプルに `docker compose up -d` を使う場合は、同等の環境変数を読み込むよう注意してください。
3. フロントエンド開発サーバー:
   ```bash
   pnpm --dir frontend run dev --host 0.0.0.0 --port 5173
   ```
4. バックエンド API サーバー:
   ```bash
   poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000
   ```
5. 終了時は `make down` もしくは `docker compose ... down` を実行してリソースを解放してください。

## コミットメッセージガイドライン

このリポジトリは、履歴を読みやすく自動化に適したものにするため、[Conventional Commits](https://www.conventionalcommits.org/) に従います。`<type>(<scope>): <subject>` の形式を使用してください。例：

- `feat(frontend): ユーザーダッシュボードを追加`
- `fix(backend): 空のペイロードを処理`

### commitlint

コミットメッセージをローカルで検証するには、依存関係をインストールしてから pnpm 経由で commitlint を実行します：

```bash
pnpm -C frontend install
pnpm -C frontend run commitlint -- --help
```

Husky のようなツールを使用して commitlint を `commit-msg` フックに接続するか、コミットメッセージを作成した後に `pnpm -C frontend exec commitlint --edit .git/COMMIT_EDITMSG` を実行できます。
