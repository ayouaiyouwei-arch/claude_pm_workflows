---
模式编号: P004
标题: retrospect 滞后导致周报漏审（升 .done 未落 runs.csv）
首次发现: <项目实战中首次出现时填>
出现次数: 0（骨架自带 · 防护已内置 · 尚未在本项目复现）
最近出现: -
关联agent: pipeline-retrospector / pipeline-evaluator
状态: active（防护已内置 · 待本项目验证）
---

# P004 · retrospect 滞后导致周报漏审

> 🔧 骨架自带通用方法论。这是一条"流程健康"模式——与 P001/P002/P003（产物质量模式）不同，它讲的是**数据沉淀链路断裂**。新项目从第一天就带着对策（三层防护），本文件记录"为什么有这些防护"。

## 描述

交付包从 `.active → .done`（尤其是**批量追认 / 手动 mv / 历史回填**这几种**绕过 `/new-feature` 全流水线**的路径）时，如果只做了状态/文档同步、**跳过了 retrospect 落 `evals/runs.csv`**，就会出现：

- 磁盘上有 N 个 `.done` 包，但 `runs.csv` 只有 M 行（M < N）
- `/pipeline-review` 按 `runs.csv` 算本周交付 → **误判"本周 0 done 包"** → 周报跑不起来 / 数据残缺
- 本质：**复盘的数据源（runs.csv）落后于事实（.done 目录）**，复盘形同虚设

**核心机制**：retrospect 在"全流水线路径"里是自动的（`/new-feature` 第 9 步），但在"手动/批量/追认路径"里**容易被当成可选步骤跳过**。一旦攒着不补，越漏越多，直到某次出周报才暴露。

## 典型表现（实战教训来源）

某项目一次性批量追认 11 个 `.done` 包，全部只做了状态同步、跳过 retrospect → `runs.csv` 停在 6 行而磁盘已有 17 个 `.done` → 那一周的复盘直接跑不起来（误判 0 done 包），且滞后是悄无声息累积的，没有任何告警。

## 出现过的包（按时间倒序）

| case_id | 触发节点 | 表现 |
|---|---|---|
| `<本项目若复现，在此登记>` | 升 .done 时 | runs.csv 行数 < .done 目录数 |

## 已采取的对策（骨架内置 · 三层防护）

| 层 | 对策 | 落点 |
|---|---|---|
| **L1 根本预防** | 升 .done 后**强制**补 runs.csv + cases.csv（不可跳过）| `.claude/skills/promote-deliverable/SKILL.md` § B-后置 + `CLAUDE.md` 关键约束 #6（默认执行）|
| **L2 主动发现** | 出周报前全量比对 `.done` 目录数 vs runs.csv 行数，有差就停下告警 | `.claude/commands/pipeline-review.md` 第 1.5 步 |
| **L3 兜底** | 周报必检项：retrospect 滞后写进 § 六（≥5 包 = 🆘 阻塞）| `.claude/agents/pipeline-evaluator.md` retrospect 滞后检测段 |

**自检命令**（任何时候可手动跑）：
```bash
comm -23 <(ls -d deliverables/*.done 2>/dev/null | sed 's#.*/##;s#\.done$##' | sort) \
         <(awk -F, 'NR>1 && $1!="run_id"{print $1}' evals/runs.csv | sort)
# 输出为空 = 无滞后；有内容 = 这些 .done 包漏登 runs.csv
```

## 残余风险 / 仍未解决的子情况

- 三层防护靠"流程自觉 + 出周报时兜底"，**不是硬阻断**（promote-deliverable 是文档约定不是代码 gate）。若长期没人跑 `/pipeline-review`，滞后仍会悄悄累积——建议配合 `/loop` 定期跑周报，让 L2 告警有机会触发。
- 若项目有 `.done` 之外的"已交付"状态（如 `.hotfix → .done`），需确认那条路径也走 L1。

## 升格 / 降格条件

- **升格为 LOCKED**：连续 5 个 `.done` 包升级时都正确落了 runs.csv（L1 真正成为肌肉记忆）→ 把"升 .done 必落 runs.csv"写进 promote-deliverable 的 LOCKED 段
- **降格为已规避**：L1/L2/L3 上线后连续 3 次 `/pipeline-review` 比对差集为空
- **降格为已废弃**：项目改用"`.done` 即自动触发 CI 落库"的硬 gate 后（人工跳过不再可能）

## 给新项目的提示

本模式的三层防护**骨架已内置**，你不需要重新搭。`/init-project` 后正常用 `/new-feature` + `promote-deliverable` 即可享受 L1/L2/L3。唯一要养成的习惯：**升 .done 时别图省事跳过 retrospect**，以及**定期跑 `/pipeline-review` 让 L2 有机会告警**。
