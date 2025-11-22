#!/bin/bash
set -e

# リリースノート生成スクリプト
# 前回リリースから現在までの PR 情報を取得し、カテゴリ別にリリースノートを生成する

CURRENT_TAG="$1"
PREVIOUS_TAG="$2"

if [ -z "$CURRENT_TAG" ]; then
  echo "Error: Current tag is required"
  echo "Usage: $0 <current_tag> [previous_tag]"
  exit 1
fi

# 前回タグが指定されていない場合は自動取得
if [ -z "$PREVIOUS_TAG" ]; then
  PREVIOUS_TAG=$(git tag --sort=-version:refname | grep -v "^${CURRENT_TAG}$" | head -1)
  if [ -z "$PREVIOUS_TAG" ]; then
    echo "No previous tag found. This is the first release."
    PREVIOUS_TAG=$(git rev-list --max-parents=0 HEAD)
  fi
fi

echo "Generating release notes from $PREVIOUS_TAG to $CURRENT_TAG"

# PR 一覧を取得 (コミット範囲ベース)
# 2つのタグ間のコミットメッセージから PR 番号を抽出し、PR 情報を取得する
echo "Extracting PR numbers from commits..."
PR_NUMBERS=$(git log --pretty=format:"%s" ${PREVIOUS_TAG}..${CURRENT_TAG} | \
  grep -oP '#\K\d+' | sort -u)

if [ -z "$PR_NUMBERS" ]; then
  echo "No PR numbers found in commit range."
  PRS="[]"
else
  # PR 情報を取得して JSON 配列を構築
  PRS="["
  FIRST=true
  for pr_number in $PR_NUMBERS; do
    echo "Fetching PR #$pr_number..."
    pr_info=$(gh pr view $pr_number --json number,title,labels 2>/dev/null || echo "")
    if [ -n "$pr_info" ]; then
      if [ "$FIRST" = true ]; then
        PRS="${PRS}${pr_info}"
        FIRST=false
      else
        PRS="${PRS},${pr_info}"
      fi
    fi
  done
  PRS="${PRS}]"
fi

# カテゴリ別に PR を分類
FEATURES=""
FIXES=""
DOCS=""
PERF=""
REFACTOR=""
OTHERS=""

while IFS= read -r pr; do
  if [ -z "$pr" ]; then
    continue
  fi

  NUMBER=$(echo "$pr" | jq -r '.number')
  TITLE=$(echo "$pr" | jq -r '.title')
  LABELS=$(echo "$pr" | jq -r '.labels[].name' | tr '\n' ' ')

  # タイトルまたはラベルからカテゴリを判定
  CATEGORY=""

  if echo "$TITLE $LABELS" | grep -qiE '(feat|feature)'; then
    CATEGORY="feature"
  elif echo "$TITLE $LABELS" | grep -qiE '(fix|bugfix|bug)'; then
    CATEGORY="fix"
  elif echo "$TITLE $LABELS" | grep -qiE '(doc|documentation)'; then
    CATEGORY="docs"
  elif echo "$TITLE $LABELS" | grep -qiE '(perf|performance)'; then
    CATEGORY="perf"
  elif echo "$TITLE $LABELS" | grep -qiE '(refactor|refactoring)'; then
    CATEGORY="refactor"
  else
    CATEGORY="other"
  fi

  # カテゴリごとに PR を追加
  PR_LINE="- $TITLE (#$NUMBER)"

  case "$CATEGORY" in
    feature)
      FEATURES="${FEATURES}${PR_LINE}\n"
      ;;
    fix)
      FIXES="${FIXES}${PR_LINE}\n"
      ;;
    docs)
      DOCS="${DOCS}${PR_LINE}\n"
      ;;
    perf)
      PERF="${PERF}${PR_LINE}\n"
      ;;
    refactor)
      REFACTOR="${REFACTOR}${PR_LINE}\n"
      ;;
    *)
      OTHERS="${OTHERS}${PR_LINE}\n"
      ;;
  esac
done < <(echo "$PRS" | jq -c '.[]')

# リリースノートを生成
RELEASE_NOTES="## What's Changed\n\n"

if [ -n "$FEATURES" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### 🚀 New Features\n\n${FEATURES}\n"
fi

if [ -n "$FIXES" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### 🐛 Bug Fixes\n\n${FIXES}\n"
fi

if [ -n "$PERF" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### ⚡ Performance Improvements\n\n${PERF}\n"
fi

if [ -n "$REFACTOR" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### ♻️ Refactoring\n\n${REFACTOR}\n"
fi

if [ -n "$DOCS" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### 📝 Documentation\n\n${DOCS}\n"
fi

if [ -n "$OTHERS" ]; then
  RELEASE_NOTES="${RELEASE_NOTES}### 🔧 Other Changes\n\n${OTHERS}\n"
fi

# コミット範囲を追加
RELEASE_NOTES="${RELEASE_NOTES}\n---\n\n"
RELEASE_NOTES="${RELEASE_NOTES}**Full Changelog**: https://github.com/${GITHUB_REPOSITORY}/compare/${PREVIOUS_TAG}...${CURRENT_TAG}\n"

# 結果を出力
echo -e "$RELEASE_NOTES"
