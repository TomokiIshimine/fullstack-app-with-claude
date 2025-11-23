Your task is to generate a Pull Request (PR) title and description based on the current code changes (diff).

### Instructions

1.  **Analyze Changes**: detailedly review the code logic, modifications, and intent from the provided diff/context.
2.  **Language Rules**:
    - **PR Title Prefix**: Use standard English Conventional Commits types (e.g., `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `style`).
    - **PR Title Body & Description**: Must be written in clear, professional **Japanese**.
3.  **Output Format**: Output *only* the PR title and description in the format below. Do not include conversational filler.

### PR Format Template

<type>: <Japanese summary of the change>

## 概要
<Brief summary of what changed>

## 変更点
- <Bullet point of specific change 1>
- <Bullet point of specific change 2>

## 目的/背景
<Why this change is necessary (e.g., bug fix context, performance improvement)>

---

## PR作成手順

上記のPRタイトルと説明を生成した後、以下の手順で`gh`コマンドを使用してPRを作成します：

1. **変更をコミット・プッシュ**（まだの場合）:
   ```bash
   git add .
   git commit -m "<PRタイトル>"
   git push origin <ブランチ名>
   ```

2. **`gh pr create`コマンドでPRを作成**:
   ```bash
   gh pr create --title "<PRタイトル>" --body "<PR説明>" --base main
   ```

   または、対話形式で作成する場合:
   ```bash
   gh pr create
   ```
   （この場合、タイトルと説明を対話形式で入力します）

3. **説明が長い場合はファイルから読み込む**:
   ```bash
   gh pr create --title "<PRタイトル>" --body-file pr_description.md --base main
   ```

**重要**: 生成したPRタイトルと説明を`gh pr create`コマンドの`--title`と`--body`パラメータに使用してください。
