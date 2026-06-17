#!/usr/bin/env bash
# validate-pipeline-state.sh · pipeline-state.json 契约自检（UPGRADE W3⑥ · M3）
# 用法:
#   bash scripts/validate-pipeline-state.sh <path/to/pipeline-state.json>
# 约定:
#   - best-effort · 非阻断闸：在升 .done / retrospect 前手动跑一次兜底，挡住数据契约漂移
#   - 故意不接 PostToolUse hook：pipeline-state 是逐字段增量写的，always-on 会在构造途中误报
#     （CSV 是整行原子 append 才适合 hook；二者写入模型不同）
#   - exit 1 = 硬违例（JSON 非法 / 缺必填键 / 缺 gate 键）；exit 0 = 通过（软违例只 ⚠️ 提示）
# 硬不变量（M3）：gates{} 必须含 5 个规范键 gate1 / gate1_5a / gate1_5b / gate2 / gate3
#   —— 否则控制塔遍历 gates{} 会漏渲染视觉环（gate1_5a/1_5b 是 PM 来回最久的环节）

set -euo pipefail
cd "$(dirname "$0")/.."

STATE="${1:?用法: validate-pipeline-state.sh <path/to/pipeline-state.json>}"

[ -f "$STATE" ] || { echo "❌ 文件不存在: $STATE" >&2; exit 1; }

command -v python3 >/dev/null 2>&1 || {
  echo "❌ 缺 python3：pipeline-state 校验依赖 python3，无法校验（fail-closed）。请先安装（macOS: brew install python3）后重试" >&2
  exit 1
}

python3 - "$STATE" <<'PYEOF'
# -*- coding: utf-8 -*-
import json, sys

path = sys.argv[1]
hard, warn = [], []

try:
    with open(path, encoding="utf-8") as f:
        st = json.load(f)
except Exception as e:
    print(f"❌ JSON 非法: {e}")
    sys.exit(1)

# 1. 必填顶层键
for k in ("slug", "current_step", "steps", "gates"):
    if k not in st:
        hard.append(f"缺必填顶层键: {k}")

gates = st.get("gates", {}) if isinstance(st.get("gates"), dict) else {}
steps = st.get("steps", {}) if isinstance(st.get("steps"), dict) else {}

# 2. 硬不变量（M3）：5 个规范 gate 键齐全
CANONICAL = ("gate1", "gate1_5a", "gate1_5b", "gate2", "gate3")
for g in CANONICAL:
    if g not in gates:
        hard.append(f"gates{{}} 缺规范键 {g}（M3：控制塔会漏渲染该 Gate）")

# 3. 软违例：ended 的步必有 started
for name, s in steps.items():
    if isinstance(s, dict) and s.get("ended_at") and not s.get("started_at"):
        warn.append(f"steps.{name} 有 ended_at 但缺 started_at（agent 耗时算不出）")

# 4. 软违例：已 resolve 的 gate 应有 asked_at + at（非 skipped）
for name, g in gates.items():
    if isinstance(g, dict) and g.get("resolved") is True and not g.get("skipped"):
        if not g.get("at") or not g.get("asked_at"):
            warn.append(f"gates.{name} resolved 但缺 asked_at/at（PM 等待时长算不出）")

for w in warn:
    print(f"⚠️  {w}")
if hard:
    for h in hard:
        print(f"❌ {h}")
    print(f"\n硬违例 {len(hard)} 条 → 修复后再升 .done")
    sys.exit(1)

print(f"✅ pipeline-state 契约通过（{len(warn)} 条 ⚠️ 软提示）· gate 键齐全 · {path}")
PYEOF
