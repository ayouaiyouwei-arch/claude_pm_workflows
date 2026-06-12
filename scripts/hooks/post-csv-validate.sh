#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# post-csv-validate.sh · PostToolUse(Edit|Write) evals 三表写后自动校验
# ───────────────────────────────────────────────────────────────
# 协议：stdin = JSON（tool_input.file_path）；PostToolUse 无法撤销已发生的写，
#       但 exit 2 + stderr 会把校验失败立即喂回模型（当场修，不等周报才发现）
# 兜的场景：有人绕过 retrospector/promote.sh 直接 Edit evals/*.csv
# ═══════════════════════════════════════════════════════════════
INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
case "$FP" in
  *evals/runs.csv)    KEY=runs ;;
  *evals/loops.csv)   KEY=loops ;;
  *evals/escapes.csv) KEY=escapes ;;
  *) exit 0 ;;
esac

WS="$(cd "$(dirname "$0")/../.." && pwd)"
OUT=$(bash "$WS/scripts/validate-evals-csv.sh" "$KEY" --last 2>&1)
if [ $? -ne 0 ]; then
  echo "[GUARD-CSV] ❌ evals/${KEY}.csv 末行 schema 校验未通过（写入已发生 · 必须当场修正）
$OUT
下一步：按上方违例明细修正该行（字段说明见 evals/_${KEY}字段说明.md 或 runs 表头 22 列 v1.1），修完本钩子会自动复检" >&2
  exit 2
fi
exit 0
