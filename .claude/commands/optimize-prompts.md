---
description: prompt 月更入口。读 optimization/patches-pending 全部条目，按"被独立提出次数"排序，逐条与 PM 决策合并/拒绝/改写后合并，每次合并跑 regression-set 兜底，最终 bump agent 版本号 + 追加 PROMPT-CHANGELOG.md。
argument-hint: 留空（自动扫所有 pending）或 <agent-name>（仅审针对该 agent 的补丁）
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# /optimize-prompts · prompt 月更

> 用户已输入：$ARGUMENTS

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

## 你（主对话）的职责

你是 prompt 演进编排者。整个命令是 6 步，**每个补丁都必须与 PM 1v1 决策**，**禁止批量合并**。

---

## 第 0 步：前置检查

```bash
# 1. patches-pending 是否非空
PENDING_COUNT=$(ls optimization/patches-pending/*.md 2>/dev/null | wc -l)
[ "$PENDING_COUNT" -eq 0 ] && echo "无待审补丁，本次不需要跑" && exit 0

# 2. regression-set 是否就绪（至少 2 个 case）
REGRESSION_COUNT=$(awk -F',' 'NR>1' evals/regression-set/cases.csv | wc -l)
[ "$REGRESSION_COUNT" -lt 2 ] && echo "⚠️ regression-set 不足 2 个 case，建议先去 evals/regression-set/ 补齐" && \
  echo "  (允许 PM 显式选择 'B. 跳过回归' 继续，但本次合并的补丁后续要人工抽查)"

# 3. 当前 agent 版本一览
cat optimization/agent-versions.json
```

把以上信息汇总告知 PM：

> "本次月更前置：
>  - patches-pending: <N> 条
>  - regression-set: <M> 个 case
>  - 上次合并：<上次 patches-applied 最新一条 + 日期>
>  
>  开始跑回复 `开始`，否则结束。"

等 PM 回 `开始`。

---

## 第 0.5 步：pattern 生命周期检查（patch-011 · 月更必跑）

> 规则见 `knowledge/README.md § 一.5`。降级 ≠ 删除；一切状态变更 PM 拍板。

```bash
# 取最近 5 个 .done 的关联 patterns 并集
RECENT_P=$(tail -5 knowledge/cases.csv | awk -F',' '{print $8}' | tr ';' '\n' | sort -u)
# 逐 active pattern 看是否在并集里
for f in knowledge/patterns/P*.md; do
  PID=$(basename "$f" | cut -d- -f1)
  STATUS=$(awk -F': ' '/^状态:/ {print $2; exit}' "$f")
  case "$STATUS" in *dormant*|*已规避*) continue;; esac
  echo "$RECENT_P" | grep -q "$PID" || echo "dormant 候选: $PID（最近 5 包未复现）"
done
```

- dormant 候选逐条给 PM 三选一：**转 dormant**（改 frontmatter 状态 + 出现次数保留）/ **保持 active**（PM 认为仍高风险，备注理由）/ **撤热层内联**（pattern 已 dormant 且 agent 内 LOCKED 段也评估撤回——单独走 2.2 LOCKED 锚点检查流程）
- 每月转 dormant / 复活的清单写入本次 CHANGELOG 条目

## 第 1 步：聚合 pending 条目

读所有 `optimization/patches-pending/*.md`，按**目标 agent + 改动锚点**聚合，按**独立来源数量**降序排列：

```bash
# 简易聚合：grep 出每条补丁的 target agent + section
grep -hE "^### 补丁 P-" optimization/patches-pending/*.md | sort | uniq -c | sort -rn
```

输出形如：

```
3   ### 补丁 P-001: agents/product-expert.md § 三 Q&A 清单
2   ### 补丁 P-002: agents/tech-architect.md § 五定量指标
1   ### 补丁 P-003: agents/scope-reviewer.md § 阈值表
...
```

把这个排序表给 PM，问：

> "本次共 <N> 条候选补丁，重复 ≥ 2 次的有 <M> 条。
>  - A. 按建议顺序逐条审（重复多的先）
>  - B. 只审重复 ≥ 2 次的（≤ 1 次的全转 patches-rejected/，原因：'样本不足'）
>  - C. 只审针对 <某 agent> 的（请指定）
>
> 选 A / B / C？"

---

## 第 2 步：逐条决策（每条 1 个微 gate）

对每条候选补丁：

### 2.1 收集证据

读所有提到这条补丁的 `patches-pending/*.md`，把每个出处的：
- 来自包名
- 触发理由段
- 优先级标签
- 是否曾被拒过（grep `patches-rejected/`）

汇总成一段简报。

### 2.2 LOCKED 锚点检查（**硬阻断**）

```bash
TARGET=".claude/agents/<目标agent>.md"
# 找出补丁建议改的段落起止行号（PM 在 patches-pending 里给的）
# 检查这段是否被 LOCKED 包裹
awk '/<!-- LOCKED:START/,/<!-- LOCKED:END/' "$TARGET" | grep -q "<改动锚点关键字>" && \
  echo "❌ 该补丁触碰 LOCKED 段，自动转 patches-rejected/"
```

若触碰 LOCKED：直接生成 `patches-rejected/<日期>-rejected-<NNN>.md`（理由："触碰 LOCKED 锚点 - <段落>"），跳到下一条。

### 2.3 与 PM 决策

```
候选补丁: <编号>
目标: .claude/agents/<agent>.md § <锚点>
独立来源: <N> 个包
原因摘要: <聚合后的触发理由，3 行内>
建议 diff:
  <从 patches-pending 摘出的 diff>
LOCKED 检查: ✅ 通过

PM 决策:
  M. 直接合并（按建议 diff）
  R. 拒绝（请说明理由 → 写入 patches-rejected）
  E. 改写后合并（请粘贴你想要的最终 diff）
  S. 跳过（保留在 patches-pending，下月再看）
```

### 2.4 合并执行（PM 选 M 或 E）

```bash
# 1) 快照旧版到 regression-baseline
AGENT="<agent>"
OLD_VER=$(jq -r ".agents.\"$AGENT\".version" optimization/agent-versions.json)
mkdir -p "optimization/regression-baseline/${AGENT}-v${OLD_VER}"
cp ".claude/agents/${AGENT}.md" "optimization/regression-baseline/${AGENT}-v${OLD_VER}/${AGENT}.md.snapshot"

# 2) 用 Edit 工具应用 diff（不要 sed，要走 Edit 让用户能看到 diff）
# Edit(.claude/agents/${AGENT}.md, old_string=<diff -段>, new_string=<diff +段>)

# 3) bump 版本号（minor）
NEW_VER="<OLD_VER + 0.1>"   # 1.0 → 1.1, 1.1 → 1.2
# Edit frontmatter version 字段
# Edit agent-versions.json 中该 agent 的 version + last_patch + last_updated
```

### 2.5 跑回归（regression-set）

```
Task(subagent_type="<目标agent>", prompt="
回归测试模式。
对 evals/regression-set/expected/<case_id_1>/ 下的输入跑你的标准流程，
把结论与 expected/<case_id>/<agent>/<报告>-期望.md 对比，给出：
- 二元结论是否一致（pass/fail）
- 不一致的原因（如果 fail）
不要写任何文件，只回结论。
")
```

对 regression-set 中**所有针对该 agent 的 case** 跑一遍。任意一个 fail：

```bash
# 自动回滚
cp "optimization/regression-baseline/${AGENT}-v${OLD_VER}/${AGENT}.md.snapshot" ".claude/agents/${AGENT}.md"
# 回滚 agent-versions.json
```

把这条补丁转 `patches-rejected/`（理由："regression-set 失败 - case <X> 结论变化"）。

### 2.6 落盘 patches-applied + CHANGELOG

```bash
# 编号递增
NEXT_NUM=$(ls optimization/patches-applied/*.md 2>/dev/null | wc -l | xargs -I{} expr {} + 1)
PATCH_ID="patch-$(printf %03d $NEXT_NUM)"

# 写 patches-applied/<日期>-<patch-id>.md（按 optimization/README.md § 四 格式）
# Append 到 PROMPT-CHANGELOG.md
```

### 2.7 处理 patches-pending

合并/拒绝完成后，**移走** `patches-pending/` 中所有提及该补丁的文件中的对应段落。

> ⚠️ 如果一个 `patches-pending/<包名>.md` 文件有多条补丁，本次只处理了一部分，**保留文件 + 给已处理的补丁段加标记**：`已合并: patch-007` 或 `已拒绝: rejected-005`。

---

## 第 3 步：合并完所有候选后的总结

```
✅ 本次 /optimize-prompts 完成

合并: <N> 条 → patches-applied/
拒绝: <M> 条 → patches-rejected/
跳过: <K> 条 → 保留在 patches-pending/

agent 版本变更:
  - product-expert: v1.0 → v1.1
  - ...

回归结果: <X>/<X> case 通过

下一步建议:
  - 跑过 1-2 个新需求看 prompt 改动是否真的解决问题
  - 累积 ≥ 2 次合并的同类补丁 → 在 knowledge/patterns/ 提炼模式
```

---

## 不允许的事

- ❌ 跳过 LOCKED 锚点检查
- ❌ 跳过 regression-set 回归（除非 PM 显式选 B 且 regression-set 不足 2 case）
- ❌ 一次性批量合并所有补丁（必须逐条 1v1 决策）
- ❌ 删除 patches-rejected/ 历史条目
- ❌ 改 LOCKED 段（即使 PM 要求也必须先去掉 LOCKED 标记 = 走单独 PR 改而不是 /optimize-prompts）
- ❌ 让 retrospector 或任何其他 agent 来跑这个命令——只有主对话编排
