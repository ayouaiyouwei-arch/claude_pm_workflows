# knowledge/ · 跨包沉淀层

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> 本目录是流水线的**长期记忆**。每个 `.done` 包都给这里贡献一行案例索引，反复出现的问题升格为"模式"，A1/A3/A6 的必读列表会主动 grep 这里。

---

## 一、目录构成（三层）

| 层级 | 路径 | 谁写 | 谁读 | 启用时机 |
|---|---|---|---|---|
| **Layer A**：案例索引 | `cases.csv` | `pipeline-retrospector` 自动 | A1/A3/A6 必读阶段 + `query-knowledge` skill | **立刻启用** |
| **Layer A**：案例索引字段说明 | `_cases字段说明.md` | PM 维护 | 任何人 | 立刻 |
| **Layer A.5**：问题模式 | `patterns/Pxxx-<标题>.md` | PM 在 `/optimize-prompts` 中提炼（≥ 2 次合并的同类补丁） | A1/A3/A6 必读 + retrospector 检测重复模式 | **第一次合并 ≥ 2 次同类补丁后启用** |
| **Layer B**：实体-关系图谱 | `graph.jsonl` + `_graph-schema.md` | （后续）专用 skill 自动抽取 | `query-knowledge` skill | **≥ 20 个 .done 包后启用** |

---

## 二、与 evals/ 的区别

| 维度 | `evals/runs.csv` | `knowledge/cases.csv` |
|---|---|---|
| 目的 | 量化"流水线跑得好不好" | 沉淀"这次干了什么、与什么相关" |
| 主键 | `run_id` | `case_id`（值相同，但是两张独立的表） |
| 字段焦点 | 过程 + 结果 + 衍生指标 | 业务标签 + 决策摘要 + 关联 patterns |
| 谁读得多 | `pipeline-evaluator` 周报 | A1 / A3 / A6 必读列表 + PM 检索 |
| 删除政策 | append-only | append-only |

---

## 三、A1 / A3 / A6 在必读阶段如何用

> 这一改动通过 `/optimize-prompts` 在 P5 阶段加入到对应 agent 的 `.md` 必读段（**非 LOCKED**，可演进）。

```bash
# A1/A3/A6 在必读阶段加一行
# 找触及端有重叠的最近 5 个 .done 包（端名按 PROJECT-PROFILE.md § 五）
grep -E "(<端A>|<端B>)" knowledge/cases.csv | tail -5

# 列出与本期触及端相关的 patterns
ls knowledge/patterns/ | head
```

---

## 四、Layer B graph.jsonl 是否值得做

- **门槛**：≥ 20 个 `.done` 包后才考虑
- **数据格式**：每行一个三元组 `{"subject": "<CHG-XXX>", "predicate": "改动", "object": "<端/模块路径>", "source": "<run_id>"}`
- **价值**：能回答"上次改 <某模块> 的是哪几个 CHG / 它们碰过哪些字段"
- **风险**：抽取脚本要写，PM 一个人维护成本高
- **决议**：**第 20 个 `.done` 包入库时再决定是否启用**，现在只占位放 schema

---

## 五、不允许的事

- ❌ 把 `cases.csv` 当成 `runs.csv` 用——前者是业务标签，后者是过程指标
- ❌ 在 Layer A 包数 < 5 时就提炼 `patterns/`——样本太少容易过拟合
- ❌ 让任何 agent 写 `graph.jsonl`——只能由专用 skill（待 P6 开发）写
