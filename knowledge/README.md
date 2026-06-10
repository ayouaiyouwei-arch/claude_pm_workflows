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

## 一.5、知识生命周期（patch-011 · 热 / 温 / 冷三层 + 晋升降级规则）

> 解决的问题：知识只增不减——pattern 全部 active 平铺、agent 必读越来越长、出现 1 次和 4 次的同权重。

| 层 | 落点 | 进入标准（晋升） | 消费方式 | 离开标准（降级） |
|---|---|---|---|---|
| **热** | agent prompt 内联 LOCKED 段 + CLAUDE.md 一行指针 | **≥ 2 次实战命中** 且规则**可机械执行**（grep 自检 / 表格模板 / 禁用词），或 PM 显式决议紧急合并 | 每次执行强制走 | 对应 pattern 转 dormant 后，下次 /optimize-prompts 评估撤回内联段（保留 pattern 文件） |
| **温** | `patterns/Pxxx.md`（状态 = active） | 1 次实战命中即可立文件 | query-knowledge 按需检索 + agent 必读触发式引用 | **连续 5 个 .done 包未复现** → 月更时标 dormant |
| **冷** | `cases.csv` + `.done` 包 + `architecture/` `research/` 长文 | 自动（retrospector 每包写入） | query-knowledge 检索可达 | 永不删除（append-only） |

**状态机**：`active`（温/热 · 检索返回）→ `dormant`（休眠 · 检索不返回 · 文件保留可追溯）→ 复发时改回 `active` 并把"出现次数 +1"。旧值 `已规避` 等同 dormant。

**执行点**（谁来转状态）：
- 降级：`/optimize-prompts` 月更第 0.5 步逐 pattern 对照最近 5 个 .done 包（runs.csv / cases.csv 的"关联patterns"列）→ 未复现的列 dormant 候选 → **PM 确认后**改 frontmatter 状态（不自动改）
- 预警：`pipeline-evaluator` 周报"补丁堆积"节附 dormant 候选提示（只提示不动手）
- 晋升：温 → 热 仍走既有 patch 机制（/optimize-prompts 或 PM 决议紧急合并）

**铁律**：降级 ≠ 删除。pattern 文件与 agent 内 LOCKED 段的撤回都要 PM 拍板，CHANGELOG 留痕。

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
