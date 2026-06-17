#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# guard-bash.sh · PreToolUse(Bash) 守卫（CC hooks 专职场景：会话内流程兜底）
# ───────────────────────────────────────────────────────────────
# 协议：stdin = JSON（tool_input.command）；exit 0 放行；
#       exit 2 阻断且 stderr 全文注入模型上下文（三段式：编号/原因/下一步）
# 只拦 2 件事（分层原则：push 由 L2 pre-push 钩子管 · 此处不重复）：
#   1. 绕过 promote.sh 直接 mv 交付包状态后缀
#   2. mkdir 手建带已占用编号的包目录（调 next-id.sh --check · 占用 exit 1 才拦，
#      刚用发号器取的新号不误拦；命令里已含 next-id.sh 的自检串联也放行）
# 设计约束：必须秒级返回（每次 Bash 调用都过这里）· 无跨次状态
# ═══════════════════════════════════════════════════════════════
INPUT=$(cat)
# ── 0. python3 缺失 → fail-closed（安全守卫坏了必须大声阻断，不能静默放行）──
if ! command -v python3 >/dev/null 2>&1; then
  echo "[GUARD-ENV] ❌ 缺 python3 → L4 安全守卫无法解析命令，已 fail-closed 阻断
原因：guard-bash 依赖 python3 解析 hook JSON；若静默放行（旧行为）= 绕过收口的 mv/mkdir 全部失守
下一步：安装 python3（macOS: brew install python3 · Debian: apt install python3）后重试；确需临时跳过则在 .claude/settings.json 摘除本 hook 并自行担责" >&2
  exit 2
fi
CMD=$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null)
[ -z "$CMD" ] && exit 0

# ── 1. 拦绕过 promote.sh 的状态 mv ──
if printf '%s' "$CMD" | grep -qE "mv +[\"']?deliverables/[^ ]*\.(draft|active|done)" \
   && ! printf '%s' "$CMD" | grep -q "promote.sh" \
   && ! printf '%s' "$CMD" | grep -qE "deliverables/9999-99-99"; then   # 自测假包豁免
  echo "[GUARD-PROMOTE] ❌ 直接 mv 交付包状态已拦截
原因：包状态变更必须走收口脚本（GATE-D5 单 active 闸 / GATE-RETRO runs.csv 先落账），直接 mv 正是 2026-05-25 漏 11 包 retrospect 的根因
下一步：bash scripts/promote.sh <包目录名> <active|done|archive>；确属特殊场景用 promote.sh --force 并在 08-修复历史留痕" >&2
  exit 2
fi

# ── 2. 拦手建已占用编号的包目录 ──
if printf '%s' "$CMD" | grep -qE "mkdir [^&|;]*deliverables/" \
   && ! printf '%s' "$CMD" | grep -q "next-id.sh" \
   && ! printf '%s' "$CMD" | grep -qE "deliverables/9999-99-99"; then   # 自测假包豁免
  NEWID=$(printf '%s' "$CMD" | grep -oE "deliverables/[^ ]*(OPT|AGENT)-?[0-9]{1,3}" | grep -oE "(OPT|AGENT)-?[0-9]{1,3}" | head -1)
  if [ -n "$NEWID" ]; then
    WS="$(cd "$(dirname "$0")/../.." && pwd)"
    CHECK=$(bash "$WS/scripts/next-id.sh" --check "$NEWID" 2>/dev/null)
    if [ $? -ne 0 ]; then
      echo "[GUARD-ID] ❌ mkdir 已拦截：编号 ${NEWID} 已被占用
原因：${CHECK}（历史撞号 4 次的根因 = 各入口自算编号 · 编号必须走发号器）
下一步：bash scripts/next-id.sh 取下一个可用号后再建目录" >&2
      exit 2
    fi
  fi
fi

exit 0
