#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# next-id.sh · OPT / AGENT 编号统一发号器（L1 结构性消除撞号）
# ───────────────────────────────────────────────────────────────
# 背景：历史撞号 4 次（OPT-035 / OPT-045 / OPT-046 / OPT-049），
#       根因 = 各入口自算编号 + 正则漏 CHG-OPTxxx 无连字符写法 +
#       扫描源不全（漏 _drafts 在飞包 / 研发自编号 / business git log）。
# 原则：所有需要新编号的入口（pre-parallel-check / /new-feature 主对话 /
#       手动起包）一律调本脚本，禁止任何地方自算编号。
# 用法：bash scripts/next-id.sh                 # 输出下一个可用 OPT 与 AGENT 号
#       bash scripts/next-id.sh --check OPT-051 # 复核某号是否已被占用（Gate 3 用）
# 扫描源（5 处 · 取全空间最大值 + 1）：
#   ① deliverables/ 目录名（兼容 OPT-049 与 CHG-OPT049 两种写法）
#   ② product-docs/*/baseline/03-产品变更登记.md（CHG-OPTxxx-X）
#   ③ product-docs/_drafts/ 在飞包（OPT-049 撞号教训：曾漏扫）
#   ④ code/robobus/scripts/ 研发自编号（小写无连字符 opt043 / agent003 风格）
#   ⑤ code/robobus 全分支 git log subject（未登台账的直接派活包兜底）
# 匹配规则（防误匹配 · 实证校准）：
#   - 大写带连字符：OPT-049 / AGENT-009 / CHG-OPT049（PM 编号体系）
#   - 小写无连字符：opt043 / agent003（研发 regression 脚本风格）
#   - 不匹配小写带连字符（如包名 slug 里的 "agent-502-fix" 是 HTTP 502，非编号）
# ═══════════════════════════════════════════════════════════════
set -uo pipefail
WS="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WS"

collect_nums() {  # $1 = OPT | AGENT；输出去前导零的十进制编号列表（升序去重）
  local up="$1"
  local low; low=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  {
    ls deliverables/ product-docs/_drafts/ 2>/dev/null
    cat product-docs/*/baseline/03-产品变更登记.md 2>/dev/null
    ls code/*/scripts/ 2>/dev/null
    for R in code/*/.git; do git -C "${R%/.git}" log --all -300 --format="%s" 2>/dev/null; done
  } | grep -oE "((CHG-)?${up}-?[0-9]{1,3}|${low}[0-9]{1,3})" \
    | grep -oE "[0-9]{1,3}$" | sed 's/^0*//;s/^$/0/' | sort -n | uniq
}

MAX_OPT=$(collect_nums "OPT" | tail -1)
MAX_AGENT=$(collect_nums "AGENT" | tail -1)

if [ "${1:-}" = "--check" ] && [ -n "${2:-}" ]; then
  TARGET_NUM=$(echo "$2" | grep -oE "[0-9]+$" | sed 's/^0*//;s/^$/0/')
  TARGET_PREFIX=$(echo "$2" | grep -ioE "^(OPT|AGENT)" | tr '[:lower:]' '[:upper:]')
  TARGET_PREFIX=${TARGET_PREFIX:-OPT}
  MAX_P=$(collect_nums "$TARGET_PREFIX" | tail -1)
  if collect_nums "$TARGET_PREFIX" | grep -qx "$TARGET_NUM"; then
    echo "❌ ${2} 已被占用（全空间 5 源扫描命中）· 下一个可用 = ${TARGET_PREFIX}-$(printf %03d $(( ${MAX_P:-0} + 1 )))"
    exit 1
  fi
  echo "✅ ${2} 未被占用，可使用"
  exit 0
fi

echo "NEXT_OPT=OPT-$(printf %03d $(( ${MAX_OPT:-0} + 1 )))"
echo "NEXT_AGENT=AGENT-$(printf %03d $(( ${MAX_AGENT:-0} + 1 )))"
echo "# 当前最大占用：OPT-$(printf %03d "${MAX_OPT:-0}") / AGENT-$(printf %03d "${MAX_AGENT:-0}")（5 源全空间扫描）"
