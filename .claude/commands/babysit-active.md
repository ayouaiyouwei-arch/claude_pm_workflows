---
description: 巡检当前唯一 .active 包的 14 项硬检查 + 修复历史进度 + 风险，每 30 分钟一次。配合 /loop 30m /babysit-active 使用，PM 不必盯着 Codex。
argument-hint: 留空（自动读 deliverables/ 下唯一 .active 包）
allowed-tools: Read, Bash, Grep, Glob
---

# /babysit-active · 巡检 .active 交付包进度

> 用户已输入：$ARGUMENTS

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

## 适用场景

Codex 在 `.active` 阶段干活时，PM 不必每分钟去看 `08-修复历史.md` 与 `06-验收标准.md § 七 9/14 项硬检查`。调本命令一次性巡检：

- 单 active 同时性
- 14 项硬检查通过几个（UI 类需求 14 项 / 非 UI 类需求 9 项）
- 修复历史最新轮次（[ROUND-N] / [BUG-N] / [QUESTION-N] 等）
- 视觉门槛 V1-V5 进度（仅 UI 类）
- 风险点：超期 / 越界 / 契约漂移 / 基线漂移

配合 `/loop 30m /babysit-active` 用，每 30 分钟跑一次（默认间隔 — 与 Codex 单轮交付节奏对齐 + 缓存友好）。

## 第 0 步：定位 active 包

```bash
ACTIVE_COUNT=$(ls deliverables/ | grep '\.active$' | wc -l | tr -d ' ')
case "$ACTIVE_COUNT" in
  0) echo "ℹ️ 当前无 .active 包，无需巡检（流水线在 .draft 阶段或包已 .done）"; exit 0 ;;
  1) PKG=$(ls deliverables/ | grep '\.active$' | head -1)
     PKG_DIR="deliverables/$PKG"
     echo "📦 巡检对象：$PKG" ;;
  *) echo "❌ 违反单 active 约束（同时存在 $ACTIVE_COUNT 个 .active 包）"
     ls deliverables/ | grep '\.active$'
     echo "立即停下让 PM 裁决，不继续巡检"
     exit 1 ;;
esac
```

## 第 1 步：14 项硬检查统计

读 `$PKG_DIR/06-验收标准.md § 七`，统计 `[ ]` 与 `[x]` / `[X]` 的分布：

```bash
SECTION=$(awk '/^## 七、退出/,/^## 八/' "$PKG_DIR/06-验收标准.md")
TOTAL_CHECK=$(echo "$SECTION" | grep -cE '^- \[[ xX]\]')
DONE_CHECK=$(echo "$SECTION" | grep -cE '^- \[[xX]\]')
echo "硬检查进度：$DONE_CHECK / $TOTAL_CHECK"
```

判断是 UI 类（14 项）还是非 UI 类（9 项）：

```bash
[ -f "$PKG_DIR/01.5-视觉规范.md" ] && IS_UI=1 || IS_UI=0
```

## 第 2 步：修复历史最新动态

```bash
# 取末尾 2 段（最近的 ROUND / BUG / FIX / QUESTION / ANSWER）
tail -60 "$PKG_DIR/08-修复历史.md"
```

提取关键信息：

- 最新 `[ROUND-N]` 时间戳与摘要
- 是否有未答的 `[QUESTION-N]`（无对应 `[ANSWER-N]` = 等 PM 答复中）
- 是否有未修的 `[BUG-N]`（无对应 `[FIX-N]`）
- 是否有 `[CONTRACT-DRIFT-N]` / `[BASELINE-DRIFT-N]` / `[VIOLATION-N]`（**红色风险**）
- 是否有 `[DELAY-N]`（**黄色风险**）

## 第 3 步：视觉门槛 V1-V5（仅 UI 类）

```bash
if [ "$IS_UI" = "1" ]; then
  V_SECTION=$(awk '/^## 六.5/,/^## 七/' "$PKG_DIR/06-验收标准.md")
  V_DONE=$(echo "$V_SECTION" | grep -cE '✅|已通过|pass')
  echo "视觉门槛 V1-V5 通过：$V_DONE / 5"
fi
```

## 第 4 步：状态机一致性

```bash
# 99-状态.md 当前状态应该是 active
CURRENT_STATE=$(grep -E "当前状态.*\`(active|draft|done|hotfix|superseded)\`" "$PKG_DIR/99-状态.md" | head -1)
echo "$CURRENT_STATE"

# 目录后缀与文档声明应一致
DOC_SUFFIX=$(echo "$CURRENT_STATE" | grep -oE '(active|draft|done|hotfix|superseded)' | head -1)
DIR_SUFFIX=$(echo "$PKG" | grep -oE '\.(active|draft|done|hotfix|superseded)$' | sed 's/^.//')
[ "$DOC_SUFFIX" = "$DIR_SUFFIX" ] && echo "✅ 状态一致" || echo "❌ 文档声明 $DOC_SUFFIX 但目录后缀 $DIR_SUFFIX"
```

## 第 5 步：综合产出报告

把以上 4 步结果汇总成一份**简短**报告（不超过 30 行）告知用户：

```
🕒 /babysit-active · 巡检报告（YYYY-MM-DD HH:mm）

📦 包：<PKG_NAME>
📊 类型：<UI 类 14 项 / 非 UI 类 9 项>

—— 硬检查 ——
进度：N / 14（或 9）
已过：[1, 2, 3, 5, 6]
未过：[4, 7, 8, 9, 10-14]

—— 修复历史 ——
最新轮次：[ROUND-3] 2026-05-15 14:00（K 文件改动）
未答问题：1 个（[QUESTION-2] 等 PM 答 alertId 跨筛选行为）
未修缺陷：0 个
红色风险：0 个
黄色风险：1 个（[DELAY-1] 后端 mock 数据延后 1 天）

—— 视觉门槛（仅 UI 类）——
V1-V5 进度：3 / 5
未过：V4 间距偏差 / V5 暗色模式

—— 状态机 ——
✅ 单 active 自检 = 1
✅ 99-状态.md 与目录后缀一致 = active

—— 待 PM 处理 ——
1. [QUESTION-2] alertId 被既有筛选过滤时是否自动重置筛选？（Codex 等答中）
2. V4 间距偏差超 2px（建议让 Codex 再扫一遍 padding 类）
3. [DELAY-1] 后端 mock 数据延后 → 是否调整 07-时间与里程碑.md
```

> 报告**末尾**必须列"待 PM 处理"清单（即便为空也要明确写"无待处理"）—— 这是巡检的核心价值。

## 第 6 步：退出条件（用 /loop 时控制何时停止 loop）

| 状态 | 处置 |
|---|---|
| 包已升 `.done`（巡检发现） | 输出"包已 done，loop 终止"；不再调度下一次 |
| 14 项全过 + 无未答问题 + 无未修缺陷 | 输出"包就绪，可走 promote-deliverable .active → .done"；建议用户终止 loop |
| 出现红色风险（`[VIOLATION-N]` / `[CONTRACT-DRIFT-N]` / `[BASELINE-DRIFT-N]`）| 显著标注；建议用户**立即手动介入**，但 loop 仍可继续 |
| 进度连续 3 次（90 分钟）无变化 | 输出"⚠ 90 分钟无新增 ROUND/BUG/FIX，是否 Codex 卡住？建议人工查看" |
| 其他常态 | 输出报告，等下一次 /loop 触发 |

## 与 /loop 的配合

推荐调用方式：

```
/loop 30m /babysit-active
```

- **间隔 30 分钟**：与 Codex 单轮 ROUND 交付节奏对齐 + 在 Anthropic prompt 缓存 5 分钟 TTL 之外（每次都付一次缓存 miss，但 30 分钟一次合算）
- **替代选项**：1h 间隔（更省 token，但风险发现延迟）；15m 间隔（更密但更费 token）
- **不推荐**：< 5 分钟间隔（缓存友好但巡检意义不大）；自适应（idle tick 价值低）

主对话用 ScheduleWakeup 实现（如可用）或 /loop 实现。

## 不允许的事

- ❌ 修改包内任何文件（**只读巡检**）
- ❌ 主动触发 promote-deliverable —— 状态切换是 PM 决定，不自动
- ❌ 跨包巡检 —— 一次只看唯一 active 包
- ❌ 报告超过 50 行 —— 巡检要"一眼看完"，否则 PM 看不下去
- ❌ 在巡检里调用任何 subagent —— 这是只读检查，不调度
