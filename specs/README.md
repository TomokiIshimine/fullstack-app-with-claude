# バックエンド リファクタリング仕様書

このディレクトリには、バックエンドのコード品質向上とセキュリティ強化のためのリファクタリング仕様書が含まれています。

## 📋 概要

バックエンドの実装を詳細に分析した結果、25個の改善点が特定されました。これらを優先度に応じて9のタスクにまとめ、実装仕様書として文書化しました。

> **注記:** 003番（パスワード生成のセキュリティ修正）は、既に `secrets` モジュールを使用して実装済みであることが判明したため削除しました（欠番）。

## 🎯 優先度と実装順序

### 優先度：高（セキュリティ・機能上の問題）

これらのタスクは、セキュリティリスクや機能の一貫性に関わる重要な改善です。

| No. | タスク | 優先度 | 影響度 | 工数 |
|-----|--------|--------|--------|------|
| [001](001_transaction_management_refactor.md) | トランザクション管理の統一 | 🔴 CRITICAL | 高 | 中 |
| [002](002_sqlalchemy_api_migration.md) | SQLAlchemy 2.x API への移行 | 🔴 HIGH | 高 | 中 |
| ~~003~~ | ~~パスワード生成のセキュリティ修正~~ | - | - | **削除済み** |
| [004](004_error_response_standardization.md) | エラーレスポンス形式の統一 | 🔴 HIGH | 中 | 中 |
| [005](005_config_centralization.md) | 環境変数管理の一元化 | 🟠 MEDIUM-HIGH | 中 | 大 |

### 優先度：中（コード品質・保守性）

これらのタスクは、コードの保守性と拡張性を向上させます。

| No. | タスク | 優先度 | 影響度 | 工数 |
|-----|--------|--------|--------|------|
| [006](006_validation_exception_unification.md) | バリデーション例外の統一 | 🟠 MEDIUM | 中 | 中 |
| [007](007_todo_update_simplification.md) | TodoUpdateData の簡潔化 | 🟡 MEDIUM | 低 | 小 |
| [008](008_cors_multi_domain.md) | CORS 複数ドメイン対応 | 🟠 MEDIUM | 中 | 小 |
| [009](009_logging_standardization.md) | ロギング基準の統一 | 🟡 MEDIUM | 中 | 中 |
| [010](010_pydantic_orm_mode_consistency.md) | Pydantic from_attributes の統一 | 🟡 MEDIUM | 低 | 小 |

## 📚 各仕様書の詳細

### 001: トランザクション管理の統一リファクタリング

**問題:** RefreshTokenRepository のみが `commit()` を使用し、他は `flush()` のみ使用。
**解決策:** すべてのリポジトリで `flush()` に統一し、Flask の `teardown_appcontext` でコミット管理。

**主な変更:**
- RefreshTokenRepository の `commit()` を `flush()` に変更
- teardown_appcontext でトランザクション自動コミット

**期待効果:**
- トランザクション管理の一貫性向上
- データ永続性の明確化
- エラー時の自動ロールバック

---

### 002: SQLAlchemy 2.x API への統一移行

**問題:** UserRepository と RefreshTokenRepository が旧式の `.query()` API を使用。
**解決策:** すべてのリポジトリで `select()` API に統一。

**主な変更:**
- `session.query(Model).filter_by()` → `session.execute(select(Model).where())`
- `delete(Model).where()` の使用

**期待効果:**
- SQLAlchemy 3.0 互換性
- コード一貫性の向上
- 型安全性の向上

---

### 004: エラーレスポンス形式の統一化

**問題:** 3つの異なるエラーレスポンス形式が混在。
**解決策:** 統一されたエラーレスポンス形式を定義。

**標準形式:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": null | object,
    "request_id": "uuid-v4"
  }
}
```

**期待効果:**
- フロントエンドのエラーハンドリング簡素化
- API ドキュメントの明確化
- デバッグの容易化

---

### 005: 環境変数管理の一元化

**問題:** 環境変数が複数のファイルで個別に読み込まれている。
**解決策:** Pydantic Settings を使用した `config.py` に一元化。

**主な変更:**
- `backend/config.py` の作成
- 型安全な設定管理
- 環境別設定（Development, Testing, Production）

**期待効果:**
- 設定の一元管理
- 型チェックとバリデーション
- テストの容易化

---

### 006: バリデーション例外の統一化

**問題:** バリデーション例外が `ValueError`, `TodoValidationError`, `UserValidationError` など混在。
**解決策:** 共通基底クラスを持つ例外階層を構築。

**例外階層:**
```
AppException
├── ValidationException
│   ├── AuthValidationError
│   ├── TodoValidationError
│   └── UserValidationError
├── AuthenticationException
├── AuthorizationException
└── ResourceNotFoundException
```

**期待効果:**
- 一貫した例外処理
- エラーハンドリングの簡素化
- 拡張性の向上

---

### 007: TodoUpdateData の簡潔化

**問題:** 複雑な `_fields_set` トラッキング機構を実装。
**解決策:** Pydantic の `model_dump(exclude_unset=True)` を使用。

**主な変更:**
```python
# Before
_fields_set: set[str] = set()
def model_post_init(self, __context):
    self._fields_set = set(self.model_fields_set)

# After
def get_update_data(self) -> dict:
    return self.model_dump(exclude_unset=True)
```

**期待効果:**
- コードの簡潔性
- 保守性の向上
- Pydantic 標準機能の活用

---

### 008: CORS 複数ドメイン対応

**問題:** 単一のフロントエンドオリジンのみサポート。
**解決策:** カンマ区切りで複数ドメインを指定可能に。

**主な変更:**
```python
# Before
CORS(app, origins=[FRONTEND_ORIGIN])

# After
CORS(app, origins=settings.cors_origins_list)
```

**期待効果:**
- 複数環境対応
- 柔軟な CORS 設定
- セキュリティの向上

---

### 009: ロギング基準の統一化

**問題:** ロギングの詳細度や形式がサービスごとに異なる。
**解決策:** 統一されたロギング基準とJSON形式ログの導入。

**主な変更:**
- `backend/app/utils/logger.py` の作成
- リクエストコンテキストの自動追加
- JSON形式ログ出力（本番環境）

**期待効果:**
- ログの一貫性
- トレーサビリティの向上
- ログ集約システムとの統合

---

### 010: Pydantic from_attributes の統一

**問題:** 一部のルートのみで `model_validate()` を使用、他は手動変換。
**解決策:** すべての Response スキーマで `from_attributes=True` を使用。

**主な変更:**
```python
# Before
return jsonify([{
    "id": todo.id,
    "title": todo.title,
    ...
} for todo in todos])

# After
return jsonify([
    TodoResponse.model_validate(todo).model_dump()
    for todo in todos
])
```

**期待効果:**
- 型安全性の向上
- コード一貫性
- 保守性の向上

## 🚀 実装ロードマップ

### Week 1-2: 高優先度タスク（セキュリティ・機能）

1. **[001] トランザクション管理統一** （工数: 中、影響: 高）
   - データ整合性に関わる重要な修正

2. **[002] SQLAlchemy API 統一** （工数: 中、影響: 高）
   - 将来的な互換性を確保

3. **[004] エラーレスポンス統一** （工数: 中、影響: 中）
   - フロントエンド連携の改善

4. **[005] 環境変数一元化** （工数: 大、影響: 中）
   - 他のタスクの基盤となる

### Week 3-4: 中優先度タスク（コード品質）

5. **[007] TodoUpdateData 簡潔化** （工数: 小、影響: 低）
   - 簡単に完了できる改善

6. **[008] CORS 複数ドメイン対応** （工数: 小、影響: 中）
   - 環境対応の柔軟性向上

7. **[006] バリデーション例外統一** （工数: 中、影響: 中）
   - エラーハンドリングの一貫性

8. **[010] Pydantic from_attributes 統一** （工数: 小、影響: 低）
   - コード品質の向上

9. **[009] ロギング基準統一** （工数: 中、影響: 中）
   - 運用性の向上

## 📊 全体的な影響評価

### セキュリティ影響度

| タスク | セキュリティ影響 |
|--------|------------------|
| 001: トランザクション管理 | 🟠 **中** |
| 005: 環境変数管理 | 🟠 **中** |
| 004: エラーレスポンス | 🟡 **低** |
| 008: CORS 設定 | 🟡 **低** |

### コード品質改善度

| カテゴリ | 改善タスク | 期待効果 |
|----------|------------|----------|
| 一貫性 | 001, 002, 004, 006, 009, 010 | ⭐⭐⭐⭐⭐ |
| 保守性 | 005, 006, 007, 009 | ⭐⭐⭐⭐ |
| セキュリティ | 001, 005 | ⭐⭐⭐⭐ |
| 拡張性 | 005, 006, 008 | ⭐⭐⭐⭐ |

## ✅ 実装時の注意事項

### 共通事項

1. **テストを先に実行** - 既存テストがすべて pass することを確認
2. **ブランチを作成** - 各タスクごとに feature ブランチを作成
3. **段階的な実装** - 一度にすべて変更せず、タスクごとに完了させる
4. **テストカバレッジ** - 80%以上を維持
5. **コードレビュー** - すべての変更をレビュー

### タスク間の依存関係

```
005 (環境変数一元化)
  ├─→ 008 (CORS 複数ドメイン)
  └─→ 009 (ロギング統一)

004 (エラーレスポンス統一)
  └─→ 006 (バリデーション例外統一)

002 (SQLAlchemy API 統一)
  └─→ 001 (トランザクション管理)
```

### ロールバック計画

各仕様書に「ロールバック計画」セクションがあります。問題が発生した場合は、その手順に従って元に戻してください。

## 📖 参考資料

- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [12-Factor App](https://12factor.net/)

## 🤝 コントリビューション

リファクタリングを実装する際は：

1. 対応するブランチを作成（例: `refactor/001-transaction-management`）
2. 仕様書の「実装チェックリスト」を確認
3. テストを含めて実装
4. プルリクエストを作成
5. コードレビューを受ける
6. マージ後に次のタスクへ

## 📝 進捗管理

各タスクの実装状況は以下で管理：

| No. | タスク | ステータス | 担当者 | 完了日 |
|-----|--------|-----------|--------|--------|
| 001 | トランザクション管理 | ⬜ 未着手 | - | - |
| 002 | SQLAlchemy API 統一 | ⬜ 未着手 | - | - |
| ~~003~~ | ~~パスワード生成修正~~ | ❌ **削除済み** | - | - |
| 004 | エラーレスポンス統一 | ⬜ 未着手 | - | - |
| 005 | 環境変数一元化 | ⬜ 未着手 | - | - |
| 006 | バリデーション例外統一 | ⬜ 未着手 | - | - |
| 007 | TodoUpdateData 簡潔化 | ⬜ 未着手 | - | - |
| 008 | CORS 複数ドメイン | ⬜ 未着手 | - | - |
| 009 | ロギング統一 | ⬜ 未着手 | - | - |
| 010 | Pydantic 統一 | ⬜ 未着手 | - | - |

**ステータス記号:**
- ⬜ 未着手
- 🟡 進行中
- ✅ 完了
- ❌ ブロック

---

**作成日:** 2025-01-15
**最終更新:** 2025-01-15
**バージョン:** 1.0.0
