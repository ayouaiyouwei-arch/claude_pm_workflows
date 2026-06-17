#!/usr/bin/env bash
# deliverable-final-check.sh · 交付包终审 · 跨产物一致性勾稽（轻量版 · 零新增 agent）
# ───────────────────────────────────────────────────────────────
# 定位：补流水线唯一的结构性盲区——没有任何环节审"这一包 11 个文件拼在一起是否自洽、
#       够不够 Codex 直接开工"。A2/A4/A7 各审一份产物；本脚本只查【产物之间的接缝】。
# 拦的是 escapes.csv 里"全过仍漏"那一档（跨产物/集成级缺陷），把它从 PM 灰度（交付后）
#       左移到打包前（便宜得多）。对齐 P007 实证驱动：只做客观可机检的交叉勾稽，不打主观质量分。
#
# 与现有环节的边界（避免重叠 = 避免纯成本）：
#   - ≠ A2/A4/A7：不重审单份产物内容，只查产物间的勾稽关系
#   - ≠ pipeline-evaluator：那是只读、事后、PM rubric 打分的周报；这是交付前的同步闸
#   - ≠ dev-verify(P005)/PM 灰度(P013)：那俩审"代码照做没"；本脚本审"材料本身说清楚没"
#   - ≠ promote.sh 三闸：那是 .draft→.active→.done 状态机闸；本脚本审包内材料质量
#
# 用法:
#   bash scripts/deliverable-final-check.sh <交付包目录>        # 例 deliverables/2026-06-16-CHG-042-x.draft
#   bash scripts/deliverable-final-check.sh <交付包目录> --quiet # 仅打印 ❌/⚠️ + 汇总
#   bash scripts/deliverable-final-check.sh                     # 不给参数：列出候选 .draft 包后退出
#
# 定位同 validate-pipeline-state.sh：best-effort，**故意不接 PostToolUse hook**——包是逐文件
#   增量构造的，always-on 会在打包途中误报。打包收尾（new-feature 第 8.6b 步）或 Gate 3 前手动跑。
#
# exit 0 = 无 BLOCKER（可能有 ⚠️ WARN，PM 自行判断）；exit 1 = 有 BLOCKER（材料未就绪，别交 Codex）。
# 注：dev=macOS(bash 3.2/BSD grep/awk) · CI=ubuntu(bash 5/GNU)；只用两者交集语义
#     （ERE / [0-9] / [[:space:]]，不用 grep -P / \d / 关联数组）。
# ───────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.."

QUIET=""
PKG=""
for a in "$@"; do
  case "$a" in
    --quiet) QUIET="--quiet" ;;
    *) [ -z "$PKG" ] && PKG="$a" ;;
  esac
done

# 不给参数 → 列候选 .draft 帮 PM 选（不猜，避免多包并行选错）
if [ -z "$PKG" ]; then
  echo "用法: bash scripts/deliverable-final-check.sh <交付包目录> [--quiet]" >&2
  CANDS=$(ls -d deliverables/*.draft 2>/dev/null || true)
  if [ -n "$CANDS" ]; then
    echo "当前在飞的 .draft 候选包：" >&2
    echo "$CANDS" | sed 's/^/  /' >&2
  fi
  exit 1
fi

PKG="${PKG%/}"   # 去掉结尾斜杠，basename 才取得到 CHG token
[ -d "$PKG" ] || { echo "❌ 交付包目录不存在: $PKG" >&2; exit 1; }

BLOCK=0; WARN=0
block() { BLOCK=$((BLOCK+1)); echo "❌ [BLOCKER] $*"; }
warn()  { WARN=$((WARN+1));  echo "⚠️  [WARN] $*"; }
ok()    { [ "$QUIET" = "--quiet" ] || echo "✓ $*"; }
note()  { [ "$QUIET" = "--quiet" ] || echo "  · $*"; }

# section <file> <start_ERE> <end_ERE> —— 打印 [start 行之后, end 行之前) 的正文（不含两个 header 行）
# start/end 同为 markdown 标题时也安全：先判 end 再判 start，header 行本身不进正文
section() {
  awk -v s="$2" -v e="$3" '
    $0 ~ e && on { on=0 }
    on { print }
    $0 ~ s { on=1 }
  ' "$1"
}

# 取 markdown 表格第一列里的 id（行首 |，$2 为首格；兼容反引号/尖括号包裹）
firstcol_ids() {  # firstcol_ids <pattern>  (stdin = 表格文本)
  awk -F'|' '/^\|/{print $2}' | grep -oE "$1" | sort -u
}

# ── 共享 id 文法与占位 token（两侧提取必须用同一文法，避免一处锚定一处不锚定） ──
# case_id：允许多段连字符（TC-ORD-001 / MOD-LIST-002），结尾必是 ≥2 位数字
CASE_PAT='[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-[0-9]{2,}'
# 接口编号：API-01 形（前缀大写 ≥2 + 连字符 + 字母数字）
IFACE_PAT='[A-Z]{2,}-[0-9A-Za-z]+'
# 必替换的纯脚手架占位（真包绝不合法留存）→ BLOCKER。
#   ·不用泛 <.*>（会误伤 <int>/List<Order>/<https://…>）；只列模板真实出现的脚手架形
#   ·TODO/TBD 加非字母数字边界，防误伤 MTODO/产品功能名 "Kanban TODO"
HARD_TOK='<填写|<模块>|<仓库名>|<前端包>|<后端>|<CHG-XXX>|<DIFF-[A-Z]|<B[0-9][^>]*>|<YYYY|<git [^>]*>|<拉取[^>]*>|<commit[^>]*>|<N>|<result_[a-d]>|<value_[a-c]>|<结论[A-D]>|(^|[^A-Za-z0-9])TODO([^A-Za-z0-9]|$)|(^|[^A-Za-z0-9])TBD([^A-Za-z0-9]|$)'
# 疑似模板残留（可能是合法文档示例/出处标识）→ WARN，不阻断
SOFT_TOK='🔧 项目无关骨架版|示例均为占位|占位示例|<示例|<某[^>]*>|<角色[^>]*>|<待[^>]*>'

echo "════════ 交付包终审 · 交叉勾稽 ════════"
echo "包：$PKG"
HAS_VISUAL=0; [ -f "$PKG/01.5-视觉规范.md" ] && HAS_VISUAL=1
note "类型：$([ "$HAS_VISUAL" = 1 ] && echo 'UI 类（含 01.5-视觉规范.md）' || echo '非 UI 类')"

# ════════ B1 · 机械完整性（移植并扩展 new-feature 8.6） ════════
echo "── B1 机械完整性 ──"
ROOTMD=$(find "$PKG" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
if [ "$ROOTMD" -ge 11 ]; then ok "根目录 .md = $ROOTMD（≥ 11：10 个数字命名 + AGENTS.md）"
else block "根目录 .md 仅 $ROOTMD 个（应 ≥ 11：00-08/99 + AGENTS.md）"; fi
[ -f "$PKG/AGENTS.md" ] && ok "AGENTS.md 存在" || block "缺 AGENTS.md（包级铁律）"
[ -f "$PKG/00-给Codex的导读.md" ] && ok "00-给Codex的导读.md 存在" || block "缺 00-给Codex的导读.md"
SNAP_CSV=$(ls "$PKG"/test-cases-snapshot/*.csv 2>/dev/null | wc -l | tr -d ' ')
if [ "$SNAP_CSV" -ge 1 ]; then ok "test-cases-snapshot/ 含 $SNAP_CSV 个 .csv"
else block "test-cases-snapshot/ 无 .csv（用例快照未冻结，见 8.5）"; fi
if [ -f "$PKG/02-基线快照.md" ]; then
  if grep -qE "$HARD_TOK" "$PKG/02-基线快照.md"; then
    block "02-基线快照.md 仍含脚手架占位——基线 SHA/版本未填实"
  else ok "02-基线快照.md 已填实（无脚手架占位）"; fi
else block "缺 02-基线快照.md"; fi

# ════════ B2 · 骨架占位残留（冻结契约文件不得仍是模板） ════════
echo "── B2 骨架占位残留 ──"
FROZEN="01-需求范围与边界.md 03-PRD片段.md 04-接口契约.md 05-用例清单.md 06-验收标准.md"
[ "$HAS_VISUAL" = 1 ] && FROZEN="$FROZEN 01.5-视觉规范.md"
for f in $FROZEN; do
  fp="$PKG/$f"
  [ -f "$fp" ] || { block "缺冻结契约文件 $f"; continue; }
  HITS=$(grep -nE "$HARD_TOK" "$fp" || true)
  if [ -n "$HITS" ]; then
    block "$f 仍含脚手架占位（未填实）："
    echo "$HITS" | head -4 | sed 's/^/      /'
    N=$(echo "$HITS" | wc -l | tr -d ' '); [ "$N" -gt 4 ] && echo "      …共 $N 处"
  else ok "$f 无脚手架硬占位"; fi
  SHITS=$(grep -cE "$SOFT_TOK" "$fp" || true)
  [ "${SHITS:-0}" -gt 0 ] && warn "$f 仍含 $SHITS 处疑似模板残留（示例/占位措辞，请确认已替换）"
done

# ════════ B3 · 接口契约自洽（04 §一 接口清单 ⟺ §四 详细契约） ════════
echo "── B3 接口契约自洽 ──"
C04="$PKG/04-接口契约.md"
if [ -f "$C04" ]; then
  LIST_IDS=$(section "$C04" '^## 一' '^## 二' | firstcol_ids "$IFACE_PAT")
  # 详细契约编号：只取 ### 标题里【开头第一个】token，否则路径段（/api/AOI-RESULT）会被误当接口
  DETAIL_IDS=$(section "$C04" '^## 四' '^## 五' | grep -E '^### ' | sed -E 's/^###[[:space:]]+//' | grep -oE "^$IFACE_PAT" | sort -u)
  if [ -z "$LIST_IDS" ] && [ -z "$DETAIL_IDS" ]; then
    note "04 未发现接口编号（前端/无接口类需求）→ 跳过自洽勾稽"
  else
    MISS_DETAIL=$(comm -23 <(echo "$LIST_IDS") <(echo "$DETAIL_IDS") | grep -v '^$' || true)
    MISS_LIST=$(comm -13 <(echo "$LIST_IDS") <(echo "$DETAIL_IDS") | grep -v '^$' || true)
    if [ -n "$MISS_DETAIL" ]; then
      block "04 §一 接口清单有，但 §四 缺详细契约：$(echo $MISS_DETAIL | tr '\n' ' ')"
    fi
    if [ -n "$MISS_LIST" ]; then
      block "04 §四 有详细契约，但 §一 接口清单未登记：$(echo $MISS_LIST | tr '\n' ' ')"
    fi
    [ -z "$MISS_DETAIL" ] && [ -z "$MISS_LIST" ] && \
      ok "04 接口清单 ⟺ 详细契约 双向一致（$(echo "$LIST_IDS" | grep -c . ) 个接口）"
  fi
  # 死引用 WARN：06/05 引用了 04 §一 未登记的接口编号（接口改名/删除后未同步门槛/用例）
  if [ -n "$LIST_IDS" ]; then
    PREFIXES=$(echo "$LIST_IDS" | sed -E 's/-[0-9A-Za-z]+$//' | sort -u | grep -v '^$' || true)
    PREF_RE=$(echo "$PREFIXES" | tr '\n' '|' | sed 's/|$//')
    if [ -n "$PREF_RE" ]; then
      REFD=$( (grep -hoE "($PREF_RE)-[0-9A-Za-z]+" "$PKG/06-验收标准.md" "$PKG/05-用例清单.md" 2>/dev/null || true) | sort -u | grep -v '^$' || true)
      DEAD=$(comm -23 <(echo "$REFD") <(echo "$LIST_IDS") | grep -v '^$' || true)
      [ -n "$DEAD" ] && warn "06/05 引用了 04 §一 未登记的接口编号（疑似接口改名/删除后未同步）：$(echo $DEAD | tr '\n' ' ')"
    fi
  fi
else block "缺 04-接口契约.md"; fi

# ════════ B4 · 用例 case_id 勾稽（05 §二 必过 ⟺ snapshot / §四 登记） ════════
# 实现 05 § 4.5 自检的意图：本期必过用例不能"既不在 snapshot 也未登记"——否则 Codex 按新老两版做
echo "── B4 用例 case_id 勾稽 ──"
C05="$PKG/05-用例清单.md"
if [ -f "$C05" ]; then
  MUST_IDS=$(section "$C05" '^## 二' '^## 三' | firstcol_ids "$CASE_PAT")
  REGR_IDS=$(section "$C05" '^## 三' '^## 四' | firstcol_ids "$CASE_PAT")
  DEPREC_IDS=$(section "$C05" '^### 4.1' '^### 4.2|^### 4.3|^### 4.4|^## 五' | firstcol_ids "$CASE_PAT")
  MODIFY_IDS=$(section "$C05" '^### 4.2' '^### 4.3|^### 4.4|^## 五' | firstcol_ids "$CASE_PAT")
  NEW_IDS=$(section "$C05" '^### 4.3' '^### 4.4|^## 五' | firstcol_ids "$CASE_PAT")
  # snapshot 取第一列再抽 id（field-aware）：兼容引号包裹 "TC-001"、BOM、TC-/多段前缀；与表格侧同用 CASE_PAT
  SNAP_IDS=$( (awk -F',' 'NF{print $1}' "$PKG"/test-cases-snapshot/*.csv 2>/dev/null || true) | grep -oE "$CASE_PAT" | sort -u)
  # 合法出处 = snapshot ∪ 本期修改(4.2) ∪ 本期新增(4.3)；4.1 已作废 不算合法出处
  KNOWN_IDS=$( (echo "$SNAP_IDS"; echo "$MODIFY_IDS"; echo "$NEW_IDS") | grep -v '^$' | sort -u)
  if [ -z "$MUST_IDS" ]; then
    warn "05 § 二 未解析到任何 case_id（用例清单可能为空或格式异常）"
  else
    DRIFT=$(comm -23 <(echo "$MUST_IDS") <(echo "$KNOWN_IDS") | grep -v '^$' || true)
    if [ -n "$DRIFT" ]; then
      block "05 § 二 必过用例既不在 snapshot 也未在 § 4.2/4.3 登记（用例漂移）：$(echo $DRIFT | tr '\n' ' ')"
    else
      ok "05 § 二 必过用例全部可勾稽（snapshot 或 § 四 登记 · 共 $(echo "$MUST_IDS" | grep -c .) 条）"
    fi
  fi
  # BLOCKER：必过/回归用例同时被 §4.1 标"已作废" = 自相矛盾（既要求必过又要求跳过）
  if [ -n "$DEPREC_IDS" ]; then
    ACTIVE=$( (echo "$MUST_IDS"; echo "$REGR_IDS") | grep -v '^$' | sort -u)
    CONTRA=$(comm -12 <(echo "$ACTIVE") <(echo "$DEPREC_IDS") | grep -v '^$' || true)
    [ -n "$CONTRA" ] && block "05 § 二/§ 三 用例同时被 § 4.1 标为已作废（自相矛盾 · Codex 既被要求必过又被要求跳过）：$(echo $CONTRA | tr '\n' ' ')"
  fi
  # WARN：§三 回归用例不在本包 snapshot（跨模块属正常，仅提示）
  if [ -n "$REGR_IDS" ]; then
    RMISS=$(comm -23 <(echo "$REGR_IDS") <(echo "$SNAP_IDS") | grep -v '^$' || true)
    [ -n "$RMISS" ] && warn "05 § 三 回归用例不在本包 snapshot（属其他模块则正常）：$(echo $RMISS | tr '\n' ' ')"
  fi
  # WARN：§4.3 登记为"本期新增"但未出现在 §二/§三
  if [ -n "$NEW_IDS" ]; then
    APPEARED=$( (echo "$MUST_IDS"; echo "$REGR_IDS") | grep -v '^$' | sort -u)
    NMISS=$(comm -23 <(echo "$NEW_IDS") <(echo "$APPEARED") | grep -v '^$' || true)
    [ -n "$NMISS" ] && warn "05 § 4.3 登记为本期新增、但 § 二/§ 三 未出现：$(echo $NMISS | tr '\n' ' ')"
  fi
else block "缺 05-用例清单.md"; fi

# ════════ B5 · UI 一致性（01.5 存在性 ⟺ 06 视觉门槛段 ⟺ demo） ════════
# 打包 8.4 映射表最易错处：非 UI 包忘删 V 门槛 / UI 包忘留 V 门槛 / UI 包漏 demo
echo "── B5 UI 一致性 ──"
C06="$PKG/06-验收标准.md"
if [ -f "$C06" ]; then
  # 注意：不能用裸 V1（会误命中版本号 "V1.0"/协议名）——视觉段稳定标识只有 六.5 与"视觉门槛"
  HAS_V=0; grep -qE '六\.5|视觉门槛' "$C06" && HAS_V=1
  if [ "$HAS_VISUAL" = 1 ] && [ "$HAS_V" = 0 ]; then
    block "UI 包（有 01.5-视觉规范.md）但 06 缺 V 视觉门槛段（§六.5 / V1-V5）"
  elif [ "$HAS_VISUAL" = 0 ] && [ "$HAS_V" = 1 ]; then
    block "非 UI 包但 06 仍残留 V 视觉门槛段（打包 8.4 漏删 §六.5 / §七 V1-V5）"
  else
    ok "06 视觉门槛段与包类型一致（$([ "$HAS_VISUAL" = 1 ] && echo 'UI·保留' || echo '非UI·已删')）"
  fi
else block "缺 06-验收标准.md"; fi
if [ "$HAS_VISUAL" = 1 ]; then
  [ -f "$PKG/attachments/demo/index.html" ] && ok "UI 包含 demo/index.html（视觉事实源）" \
    || block "UI 包但缺 attachments/demo/index.html（V1 截图比对无基准）"
  SHOTS=$(ls "$PKG"/attachments/demo/screenshots/baseline-*.png 2>/dev/null | wc -l | tr -d ' ')
  [ "$SHOTS" -ge 1 ] && ok "demo 含 $SHOTS 张 baseline 截图" \
    || warn "UI 包但 demo/screenshots 无 baseline-*.png（A1.5 自检截图缺失）"
fi

# ════════ B6 · CHG 编号三处一致（包名 ⟺ 01 ⟺ 99） ════════
echo "── B6 CHG 编号一致 ──"
BASE=$(basename "$PKG")
# 取完整编号含修订后缀（CHG-042-A），且数字段后只接单字母修订，避免吞掉 -slug
TOKEN=$(echo "$BASE" | grep -oE '(CHG|OPT|FIX|AGENT)-[0-9]+(-[A-Z])?' | head -1 || true)
# 词边界匹配：防 CHG-4 子串命中 CHG-42（掩盖真实编号漂移）
ref_has() { grep -qE "(^|[^0-9A-Za-z])$1([^0-9A-Za-z]|$)" "$2"; }
if [ -z "$TOKEN" ]; then
  warn "包名未含 CHG/OPT/FIX 编号（$BASE）——无法核对编号一致性"
else
  note "包名编号 = $TOKEN"
  C01="$PKG/01-需求范围与边界.md"; C99="$PKG/99-状态.md"
  if [ -f "$C01" ]; then
    ref_has "$TOKEN" "$C01" && ok "01-需求范围与边界.md 已引用 $TOKEN" \
      || block "包名编号 $TOKEN 未在 01-需求范围与边界.md § 二 关联（编号漂移）"
  else block "缺 01-需求范围与边界.md"; fi
  if [ -f "$C99" ]; then
    ref_has "$TOKEN" "$C99" && ok "99-状态.md 已引用 $TOKEN" \
      || warn "包名编号 $TOKEN 未在 99-状态.md § 五 关联（建议回填）"
  fi
fi

# ════════ 汇总 ════════
echo "────────────────────────────────────────"
if [ "$BLOCK" -gt 0 ]; then
  echo "❌ 终审未通过：$BLOCK 个 BLOCKER, $WARN 个 WARN —— 材料未就绪，修复 BLOCKER 后再交 Codex / 升 .active"
  exit 1
fi
echo "✅ 终审通过：0 BLOCKER, $WARN 个 WARN（WARN 由 PM 自行判断）—— 跨产物勾稽自洽，材料可交付"
exit 0
