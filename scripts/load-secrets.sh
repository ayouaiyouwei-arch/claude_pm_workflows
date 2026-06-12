#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# load-secrets.sh · 本地密钥统一加载器（仓内禁写密码本体）
# ───────────────────────────────────────────────────────────────
# 功能：从 ~/.config/<工作空间目录名>/secrets.env（git 仓库外）加载
#       验收环境变量到当前 shell。
# 用法（必须 source，且与消费命令在同一条 shell 调用里）：
#   source scripts/load-secrets.sh && node tests/runner.js
# 说明：AI 工具的每次 Bash 调用都是独立 shell，单独跑一次
#       source 对下一条命令无效——必须用 && 串在同一条里。
# 密钥清单：见 scripts/secrets.env.example（仓内模板 · 无真实值）
# 轮换：只改 ~/.config/<目录名>/secrets.env，仓内零改动。
# ═══════════════════════════════════════════════════════════════

WS="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
SECRETS_FILE="${SECRETS_FILE:-$HOME/.config/$(basename "$WS")/secrets.env}"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[load-secrets] ❌ 密钥文件不存在：$SECRETS_FILE" >&2
  echo "[load-secrets] 下一步：mkdir -p \"$(dirname "$SECRETS_FILE")\" && cp scripts/secrets.env.example \"$SECRETS_FILE\" && chmod 600 \"$SECRETS_FILE\"，然后填入真实值" >&2
  return 1 2>/dev/null || exit 1
fi

# 权限自检：禁止组/其他用户可读（仅警告，不阻断）
PERM=$(stat -f "%Lp" "$SECRETS_FILE" 2>/dev/null || stat -c "%a" "$SECRETS_FILE" 2>/dev/null)
if [ -n "$PERM" ] && [ "$PERM" != "600" ] && [ "$PERM" != "400" ]; then
  echo "[load-secrets] ⚠️ 密钥文件权限为 $PERM，建议：chmod 600 $SECRETS_FILE" >&2
fi

set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

echo "[load-secrets] OK loaded $(grep -cE '^[A-Z_]+=' "$SECRETS_FILE") vars from $SECRETS_FILE"
