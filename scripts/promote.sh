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
    ;;
  done)
    # 闸门：runs.csv 先落账（宽松匹配 OPT-046 / OPT046 两种写法）
    LOOSE=$(echo "$PKG_ID" | sed 's/\(OPT\|AGENT\)/\1-\\?/')
    if ! grep -qiE "$LOOSE" evals/runs.csv 2>/dev/null && [ "$FORCE" != "--force" ]; then
      echo "❌ [GATE-RETRO] evals/runs.csv 中没有本包（${PKG_ID:-$BASE}）的行" >&2
      echo "原因：retrospect（P004） 必须先落账再升 .done（2026-05-25 曾漏 11 包致周报瘫痪）" >&2
      echo "下一步：先跑 retrospect（runs.csv +1 行 · 22 列）+ cases.csv +1 行，再重新 promote" >&2
      exit 2
    fi
    mv "$CUR" "deliverables/${BASE}.done"
    echo "✅ ${BASE}: .${CUR_STATE} → .done"
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
    ;;
  *)
    echo "❌ 未知目标状态：$TARGET（可选 active|done|archive）" >&2
    exit 1
    ;;
esac
[ "$FORCE" = "--force" ] && echo "⚠️ 本次使用了 --force 跳闸 · 请在 08-修复历史.md 留痕理由" >&2
exit 0
