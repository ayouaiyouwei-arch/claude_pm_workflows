#!/usr/bin/env bash
# selftest.sh · 骨架确定性层自检（UPGRADE Track A · 合成沙箱 · 无需真实项目）
# ───────────────────────────────────────────────────────────────
# 这套骨架从未端到端跑过 → 最大隐性风险。本脚本在不接真实仓库的前提下，
# 用 guard-bash 早已埋好却从没人用的 `deliverables/9999-99-99` 自测豁免，
# 把确定性层（收口脚本 / hook 守卫 / 状态机契约 / schema 校验 / lint）全驱动一遍并断言行为。
# 自清理：trap EXIT 还原一切沙箱产物（含临时 mutate 的 runs.csv）→ 开源骨架跑完零残留。
# 用法: bash scripts/selftest.sh
# exit 0 = 全过；exit 1 = 有断言失败。
# 注：dev=macOS(bash 3.2/BSD) · CI=ubuntu(bash 5/GNU)；构造均取两者交集语义。
# ───────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.."

FAKE="deliverables/9999-99-99-selftest.draft"   # 9999-99-99 = guard-bash 自测豁免前缀
TMPS=()
RUNS_BAK=""        # 若对 runs.csv 做了临时 mutate，这里存备份路径
PASS=0; FAIL=0

cleanup() {
  # 1) 先还原被临时 mutate 的 runs.csv（必须在删 temp 之前）
  [ -n "$RUNS_BAK" ] && [ -f "$RUNS_BAK" ] && cp "$RUNS_BAK" evals/runs.csv 2>/dev/null || true
  # 2) 删沙箱包
  rm -rf "$FAKE" "deliverables/9999-99-99-selftest.active" 2>/dev/null || true
  # 3) 删所有 temp 目录
  for d in "${TMPS[@]:-}"; do [ -n "$d" ] && rm -rf "$d" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

check() {   if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ❌ $1（exit=$2, 期望 $3）"; fi; }
checkeq() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ❌ $1（得 '$2', 期望 '$3'）"; fi; }

T=$(mktemp -d 2>/dev/null || mktemp -d -t selftest); TMPS+=("$T")

# ════════ A. 确定性脚本 smoke + 真校验 ════════
echo "A. 确定性脚本"
OUT=$(bash scripts/next-id.sh 2>/dev/null)
echo "$OUT" | grep -qE '(OPT|AGENT)-[0-9]+'; check "next-id.sh 输出真实编号形（(OPT|AGENT)-NNN）" $? 0
bash scripts/lint-skeleton.sh --quiet >/dev/null 2>&1; check "lint-skeleton 绿（引用完整性 · 0 ERROR）" $? 0
# validate-evals 真测：表头态通过 + 畸形行被拒（临时 mutate runs.csv，trap 兜底还原）
bash scripts/validate-evals-csv.sh runs --all >/dev/null 2>&1; check "validate-evals runs 表头态通过" $? 0
RUNS_BAK="$T/runs.csv.bak"; cp evals/runs.csv "$RUNS_BAK"
printf 'BADROW_only_one_field\n' >> evals/runs.csv
bash scripts/validate-evals-csv.sh runs --all >/dev/null 2>&1; check "validate-evals 拒绝畸形行（schema 闸有牙）" $? 1
cp "$RUNS_BAK" evals/runs.csv; RUNS_BAK=""    # 立即还原 + 解除 trap 还原标记

# ════════ B. pipeline-state 契约校验器 ════════
echo "B. pipeline-state 契约"
printf '%s' '{"slug":"x","current_step":"A1","steps":{},"gates":{"gate1":{"resolved":false},"gate1_5a":{"resolved":false},"gate1_5b":{"resolved":false},"gate2":{"resolved":false},"gate3":{"resolved":false}}}' > "$T/good.json"
printf '%s' '{"slug":"x","current_step":"A1","steps":{},"gates":{"gate1":{"resolved":false},"gate2":{"resolved":false},"gate3":{"resolved":false}}}' > "$T/bad.json"
bash scripts/validate-pipeline-state.sh "$T/good.json" >/dev/null 2>&1; check "合法 state（含 5 gate 键）通过" $? 0
bash scripts/validate-pipeline-state.sh "$T/bad.json"  >/dev/null 2>&1; check "缺视觉环 gate 键 → 硬拦（M3）" $? 1

# ════════ C. guard-bash 守卫逻辑（管道喂 hook JSON） ════════
echo "C. guard-bash 守卫"
gb() { printf '{"tool_input":{"command":%s}}' "$1" | bash scripts/hooks/guard-bash.sh >/dev/null 2>&1; echo $?; }
checkeq "真实绕过 mv .draft→.active 被拦" "$(gb '"mv deliverables/2026-01-01-x.draft deliverables/2026-01-01-x.active"')" 2
checkeq "9999-99-99 自测包 mv 被豁免"      "$(gb '"mv deliverables/9999-99-99-selftest.draft deliverables/9999-99-99-selftest.active"')" 0
checkeq "含 promote.sh 的 mv 走豁免分支放行" "$(gb '"mv deliverables/2026-01-01-x.draft deliverables/2026-01-01-x.active && bash scripts/promote.sh x active"')" 0
checkeq "普通命令放行"                       "$(gb '"ls deliverables/"')" 0

# ════════ D. pre-push G1 硬闸（清理环境变量，防外部 BIZ_BRANCH_GLOB 反转结果） ════════
echo "D. git pre-push 守卫"
G1=$(echo "refs/heads/main 000 refs/heads/main 000" | env -u BIZ_BRANCH_GLOB -u MIRROR_PREFIX -u PKG_DIR_GLOB bash scripts/git-hooks/pre-push 2>&1)
echo "$G1" | grep -q 'GUARD-G1'; check "push 到 main 被 G1 拦截" $? 0

# ════════ E. _template → 合成交付包（状态机起点 · 先清后拷防嵌套） ════════
echo "E. 合成交付包脚手架"
rm -rf "$FAKE"                                  # HIGH 修复：防上次 SIGKILL 残留致 cp 嵌套
cp -r deliverables/_template "$FAKE" 2>/dev/null
ROOTMD=$(find "$FAKE" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
EXP=$(find deliverables/_template -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
checkeq "_template 根 .md 完整复制（cp 保真）" "$ROOTMD" "$EXP"
[ -f "$FAKE/99-状态.md" ]; check "含 99-状态.md" $? 0

# ════════ G. 交付包终审（deliverable-final-check.sh · 跨产物勾稽） ════════
echo "G. 交付包终审"
GT=$(mktemp -d 2>/dev/null || mktemp -d -t selftest-final); TMPS+=("$GT")
GP="$GT/2026-01-01-CHG-000-selftest.draft"; mkdir -p "$GP/test-cases-snapshot"
# 合成一个干净的非 UI 交付包（满足全部 BLOCKER 检查项）
printf '# 00\n'                                                              > "$GP/00-给Codex的导读.md"
printf '# 01\n## 二、关联背景\n| 关联 CHG | CHG-000 |\n'                       > "$GP/01-需求范围与边界.md"
printf '# 02\n基线版本 B1.4 · commit abc123\n'                              > "$GP/02-基线快照.md"
printf '# 03\n## 一、背景\n正文。\n'                                          > "$GP/03-PRD片段.md"
printf '# 04\n## 一、接口清单\n| 编号 |\n|---|\n| API-01 |\n## 二、鉴权\nx\n## 四、详细契约\n### API-01 GET /api/x\nok\n## 五、出处\ny\n' > "$GP/04-接口契约.md"
printf '# 05\n## 二、本次必过用例\n| case_id | t |\n|---|---|\n| SHF-001 | a |\n## 三、回归\n## 四、登记\n### 4.3 本期新增\n| case_id |\n|---|\n| SHF-001 |\n## 五、资产\n' > "$GP/05-用例清单.md"
printf '# 06\n## 二、用例门槛\nC1 P0 100%%\n'                                 > "$GP/06-验收标准.md"
printf '# 07\n' > "$GP/07-时间与里程碑.md"; printf '# 08\n' > "$GP/08-修复历史.md"
printf '# 99\n## 五、关联\nCHG-000\n' > "$GP/99-状态.md"; printf '# AGENTS\n' > "$GP/AGENTS.md"
printf 'case_id,t\nSHF-001,a\n' > "$GP/test-cases-snapshot/s.csv"
bash scripts/deliverable-final-check.sh "$GP" --quiet >/dev/null 2>&1;            check "干净非 UI 包终审通过（跨产物自洽）" $? 0
bash scripts/deliverable-final-check.sh deliverables/_template --quiet >/dev/null 2>&1; check "纯模板被拦（脚手架占位 + 用例漂移）" $? 1
cp -r "$GP" "$GP.broken"
# 注入单点缺陷：§一 列 API-01 + API-02，§四 只详述 API-01（重写整文件，避免就地换行手术）
printf '# 04\n## 一、接口清单\n| 编号 |\n|---|\n| API-01 |\n| API-02 |\n## 二、鉴权\nx\n## 四、详细契约\n### API-01 GET /api/x\nok\n## 五、出处\ny\n' > "$GP.broken/04-接口契约.md"
bash scripts/deliverable-final-check.sh "$GP.broken" --quiet >/dev/null 2>&1;     check "接口 §一 有 / §四 缺 → 被拦（B3 有牙）" $? 1

# ════════ F. 跑后残留自检（含 out-of-tree temp） ════════
echo "F. 残留自检"
cleanup
LEFT=0
[ -e "$FAKE" ] && LEFT=$((LEFT+1))
for d in "${TMPS[@]:-}"; do [ -n "$d" ] && [ -e "$d" ] && LEFT=$((LEFT+1)); done
check "沙箱包 + 所有 temp 已清（零残留 · 含 out-of-tree）" "$LEFT" 0

echo "────────────────────────────────────────"
if [ "$FAIL" -gt 0 ]; then echo "❌ selftest: $PASS 过 / $FAIL 失败"; exit 1; fi
echo "✅ selftest 全过（$PASS 项 · 确定性层在合成沙箱端到端通过 · 零残留）"
exit 0
