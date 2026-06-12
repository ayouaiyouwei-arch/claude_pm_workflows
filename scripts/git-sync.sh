#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# git-sync.sh · 同步研发最新代码（拉取方向 · "复制即跑模板"的脚本化）
# ───────────────────────────────────────────────────────────────
# 用法：bash scripts/git-sync.sh            # 同步 $REPO_DIR（按 $SYNC_BRANCH_MODE 拉）
# 规则：双向隔离仓 sync 前必须站在拉取分支（业务分支可能含本侧 revert / 半成品）
# 留痕：同步后把输出的 commit SHA 写进 说明文档.md 进度记录
# 多仓项目：为每个仓复制一份本脚本改 REPO_DIR，或传第一个参数为仓目录名
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
WS="$(cd "$(dirname "$0")/.." && pwd)"

# ⚙️ 项目参数区（/init-project 按 PROJECT-PROFILE § 二 调整）
REPO_DIR="${1:-$(ls -d "$WS"/code/*/ 2>/dev/null | head -1)}"          # 默认 code/ 下第一个仓
SYNC_BRANCH_MODE="${SYNC_BRANCH_MODE:-release-latest}"                 # release-latest | main

[ -z "$REPO_DIR" ] && { echo "❌ code/ 下没有仓库（先 /init-project clone）" >&2; exit 1; }
cd "$REPO_DIR" 2>/dev/null || cd "$WS/code/$REPO_DIR"

git fetch --all --tags --prune
if [ "$SYNC_BRANCH_MODE" = "release-latest" ]; then
  # 拉最新 release/v* 分支（双向隔离模式：拉 release · 推 business）
  SYNC_BRANCH=$(git branch -r | grep -oE "origin/release/v[^ ]+" | sort -V | tail -1 | sed 's|origin/||')
  [ -z "$SYNC_BRANCH" ] && { echo "❌ 找不到 release/v* 分支（若本仓拉 main，请设 SYNC_BRANCH_MODE=main）" >&2; exit 1; }
else
  SYNC_BRANCH="$SYNC_BRANCH_MODE"
  [ "$SYNC_BRANCH" = "main" ] || true
fi
git checkout "$SYNC_BRANCH"
git pull --rebase
echo "$(basename "$PWD") ${SYNC_BRANCH} HEAD = $(git rev-parse --short HEAD)（留痕到说明文档进度记录）"
