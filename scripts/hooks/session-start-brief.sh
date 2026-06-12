#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# session-start-brief.sh · SessionStart 开场简报（stdout 注入会话上下文）
# ───────────────────────────────────────────────────────────────
# 注入 3 件事（≤15 行 · 防止简报本身变成上下文负担）：
#   1. 在飞包（.active/.draft）与各自流水线进度（pipeline-state.json）
#   2. memory 待回填决议（⚠️待回填 标记 · knowledge/记忆体系.md § 四.1）
#   3. runs.csv 账本 vs .done 目录的名字级对账（GATE-RETRO 漏网点名）
# 项目无关：memory 路径按 Claude Code 规则从 pwd 推导（非字母数字→'-'）
# ═══════════════════════════════════════════════════════════════
WS="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WS"

echo "── 工作空间开场简报（hook 自动注入）──"
ACTIVE=$(ls deliverables/ 2>/dev/null | grep '\.active$')
echo "在飞 .active：${ACTIVE:-无}"
echo "在飞 .draft：$(ls deliverables/ 2>/dev/null | grep -c '\.draft$') 个"

for ST in product-docs/_drafts/*/pipeline-state.json; do
  [ -f "$ST" ] || continue
  python3 -c "
import json
d=json.load(open('$ST'))
gates=[k for k,v in d.get('gates',{}).items() if not v.get('resolved')]
print(f\"流水线 {d.get('slug','?')}: 当前步 {d.get('current_step','?')} · 未过 Gate: {','.join(gates) or '全过'}\")" 2>/dev/null
done

# memory 待回填（路径按 Claude Code 项目目录编码规则推导；无 memory 则静默跳过）
MEM_KEY=$(pwd | sed 's/[^a-zA-Z0-9]/-/g')
PENDING=$(grep -v "^>" "$HOME/.claude/projects/${MEM_KEY}/memory/MEMORY.md" 2>/dev/null | grep -c "⚠️待回填")
[ "${PENDING:-0}" -gt 0 ] && echo "⚠️ memory 有 ${PENDING} 条决议未回填权威文件（grep '待回填' MEMORY.md）"

# 名字级对账（编号归一化为无连字符大写）——数量对账会被"多记+漏记抵消"骗过
MISSING=$(comm -23 \
  <(ls deliverables/ deliverables/archive/ 2>/dev/null | grep '\.done$' | grep -oE "(OPT|AGENT)-?[0-9]+" | tr -d '-' | sort -u) \
  <(awk -F, 'NR>1{print $1}' evals/runs.csv 2>/dev/null | grep -oE "(OPT|AGENT)-?[0-9]+" | tr -d '-' | sort -u))
if [ -n "$MISSING" ]; then
  echo "⚠️ 已 .done 但 runs.csv 无账（GATE-RETRO 漏网）：$(echo $MISSING | tr '\n' ' ')"
else
  echo "账本对账：✅ 全部 .done 包已入 runs.csv"
fi
exit 0
