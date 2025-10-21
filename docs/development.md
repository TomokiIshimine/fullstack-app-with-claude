# 開発環境ガイド

このドキュメントでは、モノレポ環境での開発手順、環境変数の設定、トラブルシューティングのヒントをまとめます。

## 初期セットアップ

1. リポジトリをクローンします。
2. 必要なランタイムをインストールします（Node.js 20 / pnpm、Python 3.12 / Poetry、Docker / Docker Compose）。
3. 依存関係は `make install` でまとめてセットアップできます。

```bash
make install
```

## 環境変数

- Docker Compose 全体の環境変数は `infra/.env.development` にまとめています。
- データベース接続情報（`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`）や Flask の `FLASK_APP` が含まれます。
- 変更した場合は再起動を忘れずに実行してください。

## よく使うコマンド

| フロー            | コマンド            | 説明                                     |
|------------------|---------------------|------------------------------------------|
| 依存関係の導入    | `make install`      | frontend/backend の依存を一括インストール |
| Docker 起動       | `make up`           | MySQL を含むコンテナをバックグラウンドで起動 |
| Docker 停止       | `make down`         | コンテナ群を停止／削除                   |
| Lint & Type Check | `make lint`         | React の ESLint と Flask 側の flake8/mypy |
| テスト            | `make test`         | Vitest と pytest                         |
| フォーマット      | `make format`       | Prettier / isort / black                 |

## 開発フロー

1. コンテナを起動: `make up`
2. フロントエンド開発: `pnpm --dir frontend run dev --host 0.0.0.0 --port 5173`
3. バックエンド開発: `poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000`
4. 終了時は `make down`

## トラブルシューティング

- **環境変数の読み込みに失敗する**
  `.env` ファイルの変更後は `make down && make up` で再起動し、`docker compose ... exec db env` などで反映を確認します。

- **Docker が起動しない**
  既存のボリュームが壊れている可能性があります。`docker compose ... down -v` を検討し、それでも改善しない場合はログ (`docker compose logs db`) を確認してください。

- **テストの CPU 使用量が高い**
  `make test` はスレッド数を制限する設定を含みますが、Vitest 側のキャッシュをリセットしたい場合は `pnpm --dir frontend run test -- --runInBand --clearCache` を試してください。

- **Lint でエラーが出る**
  `make format` を実行して Prettier / isort / black で整形し、必要に応じてルール例外を検討します。

## 参考

- 追加のサービスを導入する場合は `infra/docker-compose.yml` の `# Alembic` コメントを基にマイグレーション用コンテナを検討してください。
- 詳細は `docs/環境構築具体化.md` も参照してください。
