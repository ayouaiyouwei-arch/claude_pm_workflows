#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# promote.sh · 交付包状态机收口脚本（L1 结构性消除"漏 retrospect"）
# ───────────────────────────────────────────────────────────────
# 背景：2026-05-25 曾一次性漏 11 包 retrospect（mv .done 了但 runs.csv
#       没落行）→ W21 周报跑不起来。根因 = mv 和落账是两个独立动作，
#       靠提示词提醒"记得做第 6 步"。本脚本把闸门做进 mv 本身。
# 原则：所有 .draft/.active/.done/archive 状态变更一律走本脚本，
#       禁止直接 mv（promote-deliverable skill 的机械步骤由本脚本承担，
#       skill 继续负责语义检查与文档回写）。
# 用法：
#   bash scripts/promote.sh <包目录名> active    # .draft → .active
#   bash scripts/promote.sh <包目录名> done      # .active/.draft → .done
#   bash scripts/promote.sh <包目录名> archive   # .done → archive/
#   加 --force 跳过闸门（必须给理由，会打进 stderr 留痕）
# 闸门：
#   → active：单 active 闸（D5 · 已有 .active 则拒绝 · hotfix 例外手动 --force）
#   → done  ：runs.csv 必须已含本包编号的行（retrospect 先落账 · 后 mv），
#             mv 后自动跑 validate-evals-csv.sh runs --last
#   → archive：仅允许 .done 包进 archive/
# ═══════════════════════════════════════════════════════════════
set -uo pipefail
WS="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WS"

PKG="${1:?用法: promote.sh <包目录名> <active|done|archive> [--force]}"
TARGET="${2:?用法: promote.sh <包目录名> <active|done|archive> [--force]}"
FORCE="${3:-}"

# 容错：允许传带或不带状态后缀的包名
BASE=$(echo "$PKG" | sed 's/\.\(draft\|active\|done\|superseded\|hotfix\)$//')
CUR=$(ls -d deliverables/"${BASE}".* 2>/dev/null | head -1)
[ -z "$CUR" ] && { echo "❌ 找不到包：deliverables/${BASE}.*" >&2; exit 1; }
CUR_STATE="${CUR##*.}"
PKG_ID=$(echo "$BASE" | grep -oE "(OPT|AGENT)-?[0-9]{1,3}" | head -1 | sed 's/-//' )  # 归一成 OPT046 形式做宽松匹配

# § 二 状态变更历史自动留痕（机器时间戳 · 相邻行间隔 = 各阶段耗时 · "禁止手改"由此落实为机器写）
log_state_change() {  # $1=包新路径 $2=从 $3=到 $4=备注
  local ST="$1/99-状态.md"
  [ -f "$ST" ] || { echo "ℹ️ ${1}/99-状态.md 不存在 · 跳过 § 二 留痕"; return 0; }
  local NOW; NOW=$(date '+%F %H:%M')
  awk -v now="$NOW" -v from="$2" -v to="$3" -v note="$4" '
    /^## 二、/ { in2=1 }
    in2 && /^## / && !/^## 二、/ { in2=0 }
    { lines[NR]=$0 }
    in2 && /^\|/ { last=NR; n++ }
    END {
      seq = (n>=2 ? n-1 : 1)   # n 含表头+分隔行 → 数据行=n-2 · 新序号=n-1
      for (i=1; i<=NR; i++) {
        print lines[i]
        if (i==last) printf "| %d | %s | %s | %s | promote.sh | %s |\n", seq, now, from, to, note
      }
    }' "$ST" > "$ST.tmp" && mv "$ST.tmp" "$ST"
  echo "📝 § 二 留痕：${2} → ${3} @ ${NOW}"
}

case "$TARGET" in
  active)
    ACTIVE_COUNT=$(ls deliverables/ 2>/dev/null | grep -c '\.active$')
    if [ "$ACTIVE_COUNT" -ge 1 ] && [ "$FORCE" != "--force" ]; then
      echo "❌ [GATE-D5] 已存在 ${ACTIVE_COUNT} 个 .active 包：" >&2
      ls deliverables/ | grep '\.active$' >&2
      echo "下一步：等现有 .active 升 .done 后再 promote；hotfix 例外用 --force" >&2
      exit 2
    fi
    mv "$CUR" "deliverables/${BASE}.active"
    echo "✅ ${BASE}: .${CUR_STATE} → .active"
    log_state_change "deliverables/${BASE}.active" ".${CUR_STATE}" ".active" "${FORCE:+--force 跳闸}"
    ;;
  done)
    # 闸门：runs.csv 先落账（宽松匹配 OPT-046 / OPT046 两种写法 · 只认首列 run_id）
    LOOSE=$(printf '%s' "$PKG_ID" | sed -E 's/^(OPT|AGENT)/&-?/')   # BSD sed 的 BRE 不支持 \| 交替 · 必须 -E
    if ! grep -qiE "^[^,]*${LOOSE}" evals/runs.csv 2>/dev/null && [ "$FORCE" != "--force" ]; then
      echo "❌ [GATE-RETRO] evals/runs.csv 中没有本包（${PKG_ID:-$BASE}）的行" >&2
      echo "原因：retrospect（P004） 必须先落账再升 .done（2026-05-25 曾漏 11 包致周报瘫痪）" >&2
      echo "下一步：先跑 retrospect（runs.csv +1 行 · 22 列）+ cases.csv +1 行，再重新 promote" >&2
      exit 2
    fi
    mv "$CUR" "deliverables/${BASE}.done"
    echo "✅ ${BASE}: .${CUR_STATE} → .done"
    log_state_change "deliverables/${BASE}.done" ".${CUR_STATE}" ".done" "${FORCE:+--force 跳闸}"
    if [ -x scripts/validate-evals-csv.sh ] || [ -f scripts/validate-evals-csv.sh ]; then
      bash scripts/validate-evals-csv.sh runs --last || {
        echo "⚠️ runs.csv 末行校验未通过 · 包已 mv 但请立即修正 runs.csv（见上方违例明细）" >&2
        exit 1
      }
    fi
    echo "ℹ️ 提醒（脚本不代办的语义步骤）：99-状态.md 状态行 / 08-修复历史 [DONE-N] / 提交记录.md 摄取列 / baseline03 状态 → 见 P004 retrospect 滞后漏审 + 关键约束 #14 三件回流"
    ;;
  archive)
    if [ "$CUR_STATE" != "done" ] && [ "$FORCE" != "--force" ]; then
      echo "❌ [GATE-ARCHIVE] 仅 .done 包可归档，当前是 .${CUR_STATE}" >&2
      exit 2
    fi
    mkdir -p deliverables/archive
    mv "$CUR" "deliverables/archive/${BASE}.${CUR_STATE}"
    echo "✅ ${BASE}: .${CUR_STATE} → archive/"
    log_state_change "deliverables/archive/${BASE}.${CUR_STATE}" ".${CUR_STATE}" "archive/" "${FORCE:+--force 跳闸}"
    ;;
  *)
    echo "❌ 未知目标状态：$TARGET（可选 active|done|archive）" >&2
    exit 1
    ;;
esac
[ "$FORCE" = "--force" ] && echo "⚠️ 本次使用了 --force 跳闸 · 请在 08-修复历史.md 留痕理由" >&2
exit 0
