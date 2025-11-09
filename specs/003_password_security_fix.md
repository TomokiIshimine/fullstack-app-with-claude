# 003: パスワード生成のセキュリティ修正

## 概要

現在のパスワード生成関数が暗号学的に安全でない `random.choices()` を使用しているため、セキュリティ上のリスクがある。これを `secrets` モジュールに置き換えて、暗号学的に安全な乱数生成に変更する。

## 現状の問題

### 脆弱性の詳細
- **ファイル:** `backend/utils/password.py` の `generate_random_password()`
- **問題:** `random.choices()` は疑似乱数生成器（PRNG）で、予測可能なシーケンスを生成する可能性がある
- **リスク:** 攻撃者がシステムの内部状態を推測できれば、生成されるパスワードを予測できる
- **影響範囲:** 管理者アカウント作成時の初期パスワード生成

### セキュリティ評価
- **CVSS スコア:** 中程度（5.0 - 6.9）
- **CWE-338:** Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
- **OWASP Top 10:** A02:2021 – Cryptographic Failures

### 現在のコード

**ファイル:** `backend/utils/password.py`

```python
import random
import string

def generate_random_password(length: int = 12) -> str:
    """Generate a random password with the specified length."""
    # ❌ セキュリティ上の問題：random は暗号学的に安全でない
    characters = string.ascii_letters + string.digits
    return ''.join(random.choices(characters, k=length))
```

## 修正方針

### 原則
1. **`secrets` モジュールを使用** - Python 標準ライブラリの暗号学的に安全な乱数生成器
2. **パスワード複雑性の向上** - 記号を含めて強度を上げる（オプション）
3. **最小長の引き上げ** - 12文字 → 16文字以上を推奨（オプション）

### `random` vs `secrets` の比較

| 項目 | `random` | `secrets` |
|------|----------|-----------|
| 用途 | シミュレーション、ゲーム | パスワード、トークン、セキュリティ |
| 予測可能性 | 予測可能（シードが同じ場合） | 予測不可能 |
| 暗号学的強度 | なし | あり |
| パフォーマンス | 高速 | やや遅い（誤差範囲） |

## 実装仕様

### 1. パスワード生成関数の修正

**ファイル:** `backend/utils/password.py`

#### 最小限の修正版（後方互換性維持）

```python
import secrets
import string

def generate_random_password(length: int = 12) -> str:
    """
    Generate a cryptographically secure random password.

    Args:
        length: Password length (default: 12, minimum: 8)

    Returns:
        A randomly generated password string

    Raises:
        ValueError: If length is less than 8
    """
    if length < 8:
        raise ValueError("Password length must be at least 8 characters")

    characters = string.ascii_letters + string.digits
    # ✓ 修正：secrets.choice() を使用（暗号学的に安全）
    return ''.join(secrets.choice(characters) for _ in range(length))
```

#### 推奨版（記号を含む、より強力）

```python
import secrets
import string

def generate_random_password(
    length: int = 16,
    include_symbols: bool = True
) -> str:
    """
    Generate a cryptographically secure random password.

    Args:
        length: Password length (default: 16, minimum: 12)
        include_symbols: Include special characters (default: True)

    Returns:
        A randomly generated password string meeting complexity requirements

    Raises:
        ValueError: If length is less than 12
    """
    if length < 12:
        raise ValueError("Password length must be at least 12 characters")

    # 文字セットの定義
    letters = string.ascii_letters
    digits = string.digits
    symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?" if include_symbols else ""

    # すべての文字を組み合わせ
    characters = letters + digits + symbols

    # パスワード生成
    while True:
        password = ''.join(secrets.choice(characters) for _ in range(length))

        # 複雑性チェック（少なくとも1つの大文字、小文字、数字を含む）
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_symbol = any(c in symbols for c in password) if include_symbols else True

        if has_lower and has_upper and has_digit and has_symbol:
            return password
```

### 2. ハッシュ化関数の確認（変更不要）

**ファイル:** `backend/utils/password.py`

現在の実装は bcrypt を使用しており、セキュリティ上問題なし：

```python
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(
        password.encode('utf-8'),
        password_hash.encode('utf-8')
    )
```

### 3. 既存のコードへの影響確認

**ファイル:** 検索結果

```bash
# generate_random_password() の使用箇所を検索
$ grep -r "generate_random_password" backend/
```

主な使用箇所：
- `backend/scripts/create_admin.py` - 管理者アカウント作成時

```python
# 変更不要（引数を渡していないため、デフォルト値が使用される）
random_password = generate_random_password()
```

## テスト戦略

### 1. ユニットテスト

**ファイル:** `backend/tests/utils/test_password.py`

```python
import pytest
import string
from backend.utils.password import generate_random_password, hash_password, verify_password

class TestGenerateRandomPassword:
    def test_default_length_is_12(self):
        """デフォルトの長さが12文字であることを確認"""
        password = generate_random_password()
        assert len(password) == 12

    def test_custom_length(self):
        """カスタム長が正しく適用されることを確認"""
        password = generate_random_password(length=20)
        assert len(password) == 20

    def test_minimum_length_validation(self):
        """最小長（8文字）未満でエラーが発生することを確認"""
        with pytest.raises(ValueError, match="at least 8 characters"):
            generate_random_password(length=7)

    def test_contains_only_valid_characters(self):
        """生成されたパスワードが有効な文字のみを含むことを確認"""
        valid_chars = set(string.ascii_letters + string.digits)
        password = generate_random_password()
        assert all(c in valid_chars for c in password)

    def test_randomness_uniqueness(self):
        """連続して生成されるパスワードが異なることを確認"""
        passwords = [generate_random_password() for _ in range(100)]
        # すべてのパスワードがユニークであることを確認
        assert len(set(passwords)) == 100

    def test_unpredictability(self):
        """生成されるパスワードに明らかなパターンがないことを確認"""
        passwords = [generate_random_password() for _ in range(1000)]

        # 文字の分布が均等に近いことを確認（カイ二乗検定など）
        all_chars = ''.join(passwords)
        char_freq = {c: all_chars.count(c) for c in set(all_chars)}

        # 各文字が少なくとも1回は出現
        assert len(char_freq) > 0

        # 極端に偏った分布がないことを確認（簡易チェック）
        avg_freq = len(all_chars) / len(char_freq)
        for freq in char_freq.values():
            # 平均の50%～150%の範囲内であることを確認（緩い基準）
            assert 0.5 * avg_freq <= freq <= 1.5 * avg_freq


class TestPasswordHashing:
    def test_hash_password(self):
        """パスワードがハッシュ化されることを確認"""
        password = generate_random_password()
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """正しいパスワードが検証されることを確認"""
        password = generate_random_password()
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """間違ったパスワードが拒否されることを確認"""
        password = generate_random_password()
        hashed = hash_password(password)

        assert verify_password("wrong_password", hashed) is False
```

### 2. セキュリティテスト

**ファイル:** `backend/tests/utils/test_password_security.py`

```python
import pytest
from backend.utils.password import generate_random_password

class TestPasswordSecurity:
    def test_no_common_patterns(self):
        """一般的な脆弱なパターンがないことを確認"""
        weak_patterns = [
            "123456", "password", "qwerty", "abc123",
            "111111", "123123", "admin", "letmein"
        ]

        passwords = [generate_random_password() for _ in range(100)]

        for password in passwords:
            for pattern in weak_patterns:
                assert pattern.lower() not in password.lower()

    def test_entropy_calculation(self):
        """パスワードのエントロピーが十分に高いことを確認"""
        import math

        password = generate_random_password(length=12)

        # 文字セットのサイズ（a-z, A-Z, 0-9 = 62文字）
        charset_size = 62

        # エントロピー = log2(charset_size^length)
        entropy = len(password) * math.log2(charset_size)

        # 12文字の場合、エントロピーは約71.4ビット
        # 60ビット以上を推奨とする
        assert entropy >= 60

    def test_collision_resistance(self):
        """大量生成時の衝突がないことを確認"""
        # 10,000個のパスワードを生成
        passwords = set()
        for _ in range(10000):
            password = generate_random_password()
            passwords.add(password)

        # すべてがユニークであることを確認（衝突なし）
        assert len(passwords) == 10000
```

### 3. 統合テスト

**ファイル:** `backend/tests/scripts/test_create_admin.py`

```python
def test_create_admin_with_secure_password(db_session, mocker):
    """管理者作成時にセキュアなパスワードが生成されることを確認"""
    from backend.scripts.create_admin import create_admin_account
    from backend.utils.password import generate_random_password

    # パスワード生成をスパイ
    original_generate = generate_random_password
    mock_generate = mocker.spy(backend.utils.password, 'generate_random_password')

    admin = create_admin_account(email="admin@example.com", name="Admin")

    # generate_random_password が呼ばれたことを確認
    mock_generate.assert_called_once()

    # パスワードが設定されていることを確認
    assert admin.password_hash is not None
    assert len(admin.password_hash) > 0
```

## 実装チェックリスト

### コード修正
- [ ] `backend/utils/password.py` の import を `import random` → `import secrets` に変更
- [ ] `generate_random_password()` を `random.choices()` → `secrets.choice()` に変更
- [ ] 最小長のバリデーションを追加（8文字以上）
- [ ] Docstring を更新（暗号学的に安全であることを明記）

### テスト
- [ ] `test_password.py` にユニットテストを追加
- [ ] `test_password_security.py` にセキュリティテストを追加
- [ ] 既存の `test_create_admin.py` が pass することを確認
- [ ] すべてのテストが pass することを確認

### ドキュメント
- [ ] CHANGELOG.md にセキュリティ修正を記載
- [ ] docs/02_authentication-authorization.md を更新（パスワード生成の説明）

### セキュリティレビュー
- [ ] コードレビューでセキュリティチームの承認を得る
- [ ] 脆弱性スキャンツール（Bandit など）を実行
- [ ] ペネトレーションテストを実施（オプション）

## ロールバック計画

問題が発生した場合、以下の手順で元に戻す：

```python
import random
import string

def generate_random_password(length: int = 12) -> str:
    """Generate a random password with the specified length."""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choices(characters, k=length))
```

ただし、セキュリティ上の理由から、ロールバックは最終手段とし、問題を修正して前進することを推奨。

## 期待される効果

### セキュリティ向上
1. **暗号学的に安全** - `secrets` モジュールによる予測不可能な乱数生成
2. **CWE-338 の解決** - 暗号学的に弱い PRNG の使用を排除
3. **コンプライアンス** - NIST, OWASP のガイドラインに準拠

### パフォーマンス影響
- `secrets.choice()` は `random.choices()` よりわずかに遅いが、実用上問題なし
- 管理者アカウント作成は低頻度な操作のため、影響は無視できる

### 互換性
- 後方互換性を完全に維持（シグネチャ変更なし）
- 既存のコードは変更不要

## セキュリティベストプラクティス

### パスワード生成の推奨事項
1. **最小長:** 12文字以上（16文字を推奨）
2. **文字セット:** 大文字、小文字、数字、記号を含む
3. **エントロピー:** 60ビット以上を目指す
4. **乱数生成器:** `secrets` モジュールを使用

### コードレビューチェックリスト
- [ ] `random` モジュールがセキュリティ用途で使われていないか確認
- [ ] `secrets` モジュールを使用しているか確認
- [ ] パスワード長が十分か確認（12文字以上）
- [ ] 複雑性要件を満たしているか確認

## 参考資料

- [Python secrets — Generate secure random numbers](https://docs.python.org/3/library/secrets.html)
- [CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator](https://cwe.mitre.org/data/definitions/338.html)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Bandit: Security linter for Python](https://bandit.readthedocs.io/en/latest/plugins/b311_random.html)
