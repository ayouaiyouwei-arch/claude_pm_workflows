#!/usr/bin/env bash
# lint-skeleton.sh · 骨架引用完整性静态检查器（UPGRADE Track A · 开源 CI 闸）
# ───────────────────────────────────────────────────────────────
# 这套流水线的价值 = 引用密度（11 agent × 调用点、34 卡 × 多映射表、20 pattern × 数十处 P0xx 引用）。
# 一次重命名就能静默断链，直到真跑才炸。本脚本把这些不变量变成 1 秒 CI 闸。
# 纯 bash + grep + awk（+ python3 解析 JSON，CI 已确认其存在），便于 GitHub Actions / pre-push 直接跑。
# 用法: bash scripts/lint-skeleton.sh [--quiet]
# exit 0 = 全过（可能有 ⚠️ WARN）；exit 1 = 有 ❌ ERROR。
# 注：dev 机为 macOS(大小写不敏感 FS) / CI 为 Linux(敏感) —— 文件名检查一律 case-sensitive 比对。
# ───────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.."

ERR=0; WARN=0
QUIET="${1:-}"
err()  { ERR=$((ERR+1));  echo "❌ $*"; }
warn() { WARN=$((WARN+1)); echo "⚠️  $*"; }
ok()   { [ "$QUIET" = "--quiet" ] || echo "✓ $*"; }
pass() { [ "$ERR" -eq "$1" ] && ok "$2"; }            # 仅当本 check 未新增 ERROR 才 ✓
passw(){ [ "$WARN" -eq "$1" ] && ok "$2"; }

AGENT_NAMES=$(ls .claude/agents | grep -E '\.md$' | sed 's/\.md$//')   # case-sensitive 真实名集
have_agent() { printf '%s\n' "$AGENT_NAMES" | grep -qx "$1"; }         # 精确(大小写敏感)存在

# ── Check 1: 每个 subagent_type="X" 必须解析到一个真实 agent 文件（大小写敏感） ──
b=$ERR
while IFS= read -r name; do
  loc=$(grep -rl "subagent_type=\"$name\"" .claude/commands/ | head -1)
  have_agent "$name" || err "subagent_type=\"$name\"（$loc）无对应 .claude/agents/$name.md（注意大小写）"
done < <(grep -rhoE 'subagent_type="[a-z-]+"' .claude/commands/ | sed -E 's/.*"([a-z-]+)".*/\1/' | sort -u)
pass "$b" "Check1 subagent_type → agent 全解析"

# ── Check 2: agent frontmatter name == 文件名(大小写敏感) 且 version == agent-versions.json(python3 稳健解析) ──
b=$ERR
for f in .claude/agents/*.md; do
  a=$(basename "$f" .md)
  fm_name=$(awk -F': ' '/^name:/{print $2; exit}' "$f" | tr -d ' \r')
  fm_ver=$(awk -F': ' '/^version:/{print $2; exit}' "$f" | tr -d ' \r')
  have_agent "$fm_name" && [ "$fm_name" = "$a" ] || err "agent $f: frontmatter name='$fm_name' ≠ 文件名 '$a'（大小写敏感）"
  js_ver=$(python3 -c "import json;print(json.load(open('optimization/agent-versions.json'))['agents'].get('$a',{}).get('version',''))" 2>/dev/null)
  if [ -z "$js_ver" ]; then
    err "agent $a: agent-versions.json 无该 agent 或 version 不可解析"
  elif [ -n "$fm_ver" ] && [ "$fm_ver" != "$js_ver" ]; then
    err "agent $a: frontmatter version=$fm_ver ≠ agent-versions.json $js_ver（版本漂移）"
  fi
done
pass "$b" "Check2 agent name/version ↔ agent-versions.json 一致"

# ── Check 3: 方法论卡片计数一致（文件数 == methodology/README == 根 README 各处声明；宽松匹配多种措辞） ──
b=$ERR
ACTUAL=$(find knowledge/methodology -maxdepth 1 -name '*.md' ! -name 'README.md' | wc -l | tr -d ' ')
MREADME=$(grep -oE '清单[（(][0-9]+ ?个[)）]' knowledge/methodology/README.md | grep -oE '[0-9]+' | sort -u)
for n in $MREADME; do [ "$n" = "$ACTUAL" ] || err "methodology/README.md 清单数 $n ≠ 实际 $ACTUAL"; done
BAD=$(grep -hoE '[0-9]+ ?(张|个)? ?(设计)?方法论 ?(卡片|cards)|[0-9]+ ?(design[- ]?)?methodology[- ]?cards' README.md \
        | grep -oE '[0-9]+' | grep -vxc "$ACTUAL" || true)
[ "${BAD:-0}" -eq 0 ] || err "README.md 有 $BAD 处方法论卡片计数 ≠ 实际 $ACTUAL（应改为 $ACTUAL）"
pass "$b" "Check3 方法论卡片计数全一致（$ACTUAL）"

# ── Check 4: LOCKED:START 出现次数 == LOCKED:END 次数（按 occurrence 非 line） ──
b=$ERR
for f in .claude/agents/*.md .claude/commands/*.md; do
  s=$(grep -o 'LOCKED:START' "$f" | wc -l | tr -d ' '); e=$(grep -o 'LOCKED:END' "$f" | wc -l | tr -d ' ')
  [ "$s" = "$e" ] || err "LOCKED 锚点不配对: $f（START=$s, END=$e）"
done
pass "$b" "Check4 LOCKED 锚点全配对"

# ── Check 5a: 任意"方法论映射表"(按 markdown 分隔行识别 · 跨全部 agent)的读列卡片引用必须解析（ERR） ──
# ── Check 5b: 每张卡片至少被某 agent / methodology README 引用一次（孤儿/未接线 · WARN） ──
b=$ERR; bw=$WARN
CARDSET=$(find knowledge/methodology -maxdepth 1 -name '*.md' ! -name 'README.md' -exec basename {} .md \;)
for f in .claude/agents/*.md; do
  while IFS= read -r slug; do
    [ -z "$slug" ] && continue
    echo "$slug" | grep -qE '^[a-z][a-z0-9-]+$' || continue          # 仅卡名形 slug
    [ -f "knowledge/methodology/$slug.md" ] || err "映射表读列引用未解析: \`$slug\`（$f）→ 无 knowledge/methodology/$slug.md"
  done < <(awk -F'|' '
    # 分隔行(|---|)且上一行含 读/skill/卡 → 上一行是方法论表头；定位"读列"索引
    prev ~ /读|skill|卡/ && /^\|[-: ]+\|/ {
      np=split(prevline,P,"|"); readcol=0
      for(i=1;i<=np;i++) if(P[i] ~ /读|skill|卡/) readcol=i
      if(readcol>0){intable=1; next}
    }
    intable && /^\|/ { n=split($readcol,a,"`"); for(i=2;i<=n;i+=2) print a[i] }
    intable && !/^\|/ {intable=0}
    {prevline=$0; prev=$0}
  ' "$f" | sort -u)
done
pass "$b" "Check5a 映射表读列卡片引用全解析"
for c in $CARDSET; do
  grep -rqw "$c" .claude/agents/ || warn "卡片 $c.md 未被任何 agent 引用（孤儿/未接线）"
done
passw "$bw" "Check5b 卡片无孤儿（全部被某 agent 引用）"

# ── Check 6: P0NN 双向 —— (a)文件↔_编号映射.md(WARN)  (b)被引用的 P0NN 必须有文件(ERR) ──
b=$ERR; bw=$WARN
MAP=knowledge/patterns/_编号映射.md
for pf in knowledge/patterns/P*.md; do
  pid=$(basename "$pf" | grep -oE '^P[0-9]+')
  grep -qE "(^|[^0-9])$pid([^0-9]|$)" "$MAP" || warn "pattern $pid 在 _编号映射.md 无登记行"
done
passw "$bw" "Check6a P0NN 文件 ↔ _编号映射.md"
for pid in $(grep -rhoE 'P0[0-9]{2}' CLAUDE.md .claude/agents .claude/commands 2>/dev/null | sort -u); do
  case "$pid" in P016) continue;; esac    # P016 = 文档化的有意跳号(无文件)
  ls knowledge/patterns/$pid-*.md >/dev/null 2>&1 || err "引用的 $pid 无对应 knowledge/patterns/$pid-*.md（断链）"
done
pass "$b" "Check6b 被引用 P0NN 全解析"

# ── Check 7: 显式 knowledge/methodology/<name>.md 路径引用必须解析 ──
b=$ERR
while IFS= read -r path; do
  [ -f "$path" ] || err "显式方法论路径引用未解析: $path"
done < <(grep -rhoE 'knowledge/methodology/[a-z0-9-]+\.md' .claude/ CLAUDE.md 2>/dev/null | sort -u | grep -v '<name>')
pass "$b" "Check7 显式方法论路径引用全解析"

# ── Check 8: CLAUDE.md「命名动态工作流」列出的名字 ↔ .claude/workflows/*.js 双向（非硬编码白名单） ──
b=$ERR
WF_CITED=$(grep '命名动态工作流' CLAUDE.md | grep -oE '`[a-z-]+`' | tr -d '`' | sort -u)
WF_FILES=$(ls .claude/workflows/*.js 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.js$//' | sort -u)
for w in $WF_CITED; do [ -f ".claude/workflows/$w.js" ] || err "CLAUDE.md 命名工作流 '$w' 无 .claude/workflows/$w.js"; done
for w in $WF_FILES; do echo "$WF_CITED" | grep -qx "$w" || warn "工作流文件 $w.js 未在 CLAUDE.md「命名动态工作流」列出"; done
pass "$b" "Check8 命名动态工作流 ↔ .js 双向一致"

# ── Check 9: 项目内 .claude/skills/<name> 引用须有 SKILL.md（方法论卡名走 ~/.claude 兜底，跳过） ──
b=$WARN
while IFS= read -r name; do
  [ -f "knowledge/methodology/$name.md" ] && continue
  [ -f ".claude/skills/$name/SKILL.md" ] || warn "引用 .claude/skills/$name 但无 SKILL.md"
done < <(grep -rhoE '\.claude/skills/[a-z0-9-]+' .claude/agents/ .claude/commands/ 2>/dev/null | grep -oE '[a-z0-9-]+$' | sort -u)
passw "$b" "Check9 .claude/skills 项目引用全解析"

# ── Check 10: cases.csv 类型 enum 必须含 runs.csv 权威枚举(validate-evals-csv.sh)全部值（防共享主键账本枚举漂移） ──
b=$ERR
CASES_TYPELINE=$(grep -E '^\| *3 *\| *`类型`' knowledge/_cases字段说明.md)
if [ -z "$CASES_TYPELINE" ]; then warn "未找到 _cases字段说明.md 的 类型 行（无法核对枚举一致性）"; else
  for v in $(grep "('类型'," scripts/validate-evals-csv.sh | grep -oE "\{[^}]*\}" | grep -oE "'[^']+'" | tr -d "'"); do
    echo "$CASES_TYPELINE" | grep -q "$v" || err "cases.csv 类型 enum 缺值 '$v'（与 runs.csv 权威枚举漂移 · 二表共享 case_id==run_id）"
  done
fi
pass "$b" "Check10 cases/runs 类型 enum 一致"

echo "────────────────────────────────────────"
if [ "$ERR" -gt 0 ]; then
  echo "❌ lint-skeleton: $ERR 个 ERROR, $WARN 个 WARN → 修复 ERROR 后再合并"
  exit 1
fi
echo "✅ lint-skeleton 通过（0 ERROR, $WARN WARN）"
exit 0
