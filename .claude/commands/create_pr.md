Your task is to generate a Pull Request (PR) title and description based on the current code changes (diff), and then create the PR using the `gh` command.

### Instructions

1.  **Analyze Changes**: detailedly review the code logic, modifications, and intent from the provided diff/context.
2.  **Language Rules**:
    - **PR Title Prefix**: Use standard English Conventional Commits types (e.g., `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `style`).
    - **PR Title Body & Description**: Must be written in clear, professional **Japanese**.
3.  **Output Format**: First, output the PR title and description in the format below.
4.  **Create PR**: After generating the PR content, execute the following command to create the PR:
    ```bash
    gh pr create --title "<PR_TITLE>" --body "<PR_DESCRIPTION>"
    ```
    Where:
    - `<PR_TITLE>` is the formatted title (e.g., `feat: 新機能の追加`)
    - `<PR_DESCRIPTION>` is the full description including 概要, 変更点, and 目的/背景

### PR Format Template

<type>: <Japanese summary of the change>

## 概要
<Brief summary of what changed>

## 変更点
- <Bullet point of specific change 1>
- <Bullet point of specific change 2>

## 目的/背景
<Why this change is necessary (e.g., bug fix context, performance improvement)>

### Example Workflow

1. First, show the PR title and description to the user
2. Then execute: `gh pr create --title "feat: ユーザー認証機能の追加" --body "## 概要\n..."`
3. Confirm the PR was created successfully
