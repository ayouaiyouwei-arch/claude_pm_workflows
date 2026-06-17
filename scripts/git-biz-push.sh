#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# git-biz-push.sh · 业务侧交付包镜像 push（推送方向 + 五项自检脚本化）
# ───────────────────────────────────────────────────────────────
# 用法：bash scripts/git-biz-push.sh "<包目录名>" "biz(req): 一句话"
# 前提：generate-research-deliverable 已把 .draft 镜像到
#       $REPO_DIR/$MIRROR_PREFIX<包目录名>/（含 $PROMPT_FILE · 提示词先于 push）
# 自检：五项内置 + pre-push 钩子（G1/G2/G3）双保险
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
WS="$(cd "$(dirname "$0")/.." && pwd)"
PKG="${1:?用法: git-biz-push.sh <包目录名> <commit message>}"
MSG="${2:?用法: git-biz-push.sh <包目录名> <commit message>}"

# ⚙️ 项目参数区（/init-project 按 PROJECT-PROFILE § 二 调整）
REPO_DIR="${REPO_DIR:-$(ls -d "$WS"/code/*/ 2>/dev/null | head -1)}"
BIZ_BRANCH_PREFIX="${BIZ_BRANCH_PREFIX:-feature/business-submit-}"   # 推送分支前缀（+日期）
MIRROR_PREFIX="${MIRROR_PREFIX:-docs/acceptance/问题说明/}"           # 镜像目录前缀
MIRROR_ALLOW="${MIRROR_ALLOW:-docs/acceptance/}"                     # 暂存区白名单前缀
PROMPT_FILE="${PROMPT_FILE:-00-Codex派活提示词.md}"                   # 派活提示词文件名
COMMIT_PREFIX="${COMMIT_PREFIX:-biz(req):}"                          # commit message 强制前缀
GIT_IDENT_NAME="${GIT_IDENT_NAME:-pm-workspace}"
GIT_IDENT_EMAIL="${GIT_IDENT_EMAIL:-pm-workspace@local}"

[ -z "$REPO_DIR" ] && { echo "❌ code/ 下没有仓库（先 /init-project clone）；REPO_DIR 为空时禁止 cd（否则会误推骨架自身仓）" >&2; exit 1; }
cd "$REPO_DIR"
BIZ_BRANCH="${BIZ_BRANCH_PREFIX}$(date +%Y%m%d)"
PKG_DIR="${MIRROR_PREFIX}${PKG}"

# 自检 0：镜像目录与派活提示词存在（push 之前就要有）
[ -d "$PKG_DIR" ] || { echo "❌ 镜像目录不存在：$PKG_DIR（先跑 generate-research-deliverable 镜像）" >&2; exit 1; }
[ -f "$PKG_DIR/$PROMPT_FILE" ] || { echo "❌ 缺 ${PKG_DIR}/${PROMPT_FILE} · 先调 write-fix-prompt 落包内再 push" >&2; exit 1; }

# 自检 1：commit message 前缀
echo "$MSG" | grep -q "^${COMMIT_PREFIX}" || { echo "❌ commit message 必须 ${COMMIT_PREFIX} 前缀" >&2; exit 1; }

# 切到业务分支（不存在则基于当前拉取分支 HEAD 新建）
git checkout "$BIZ_BRANCH" 2>/dev/null || git checkout -b "$BIZ_BRANCH"

# 自检 2：当前不在 release 分支
[ "$(git branch --show-current | grep -c '^release/')" = "0" ] || { echo "❌ 在 release 分支上不准 push" >&2; exit 1; }

# 仅 add 本次包目录（禁止整目录 add）
git add "$PKG_DIR"

# 自检 3：暂存区只含镜像白名单
BAD=$(git diff --cached --name-only | grep -v "^${MIRROR_ALLOW}" || true)
[ -z "$BAD" ] && true || { echo "❌ 暂存区含非交付包内容：" >&2; echo "$BAD" >&2; git reset >/dev/null; exit 1; }

git -c user.name="$GIT_IDENT_NAME" -c user.email="$GIT_IDENT_EMAIL" commit -m "$MSG"
git push origin "$BIZ_BRANCH"   # pre-push 钩子（G1/G2/G3）在此再拦一道

echo "✅ 已推 ${BIZ_BRANCH} · commit $(git rev-parse --short HEAD)"
echo "ℹ️ 收尾：git checkout 回拉取分支（sync 安全）+ 留痕 说明文档 + deliverables/提交记录.md"
