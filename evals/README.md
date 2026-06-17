# evals/ · 流水线信号层

> 本目录是 8-agent 流水线的**量化信号源**。回答两个问题：①每个 agent 跑得好不好？②整条流水线最近趋势如何？

---

## 一、目录构成

| 路径 | 谁写 | 谁读 | 频率 |
|---|---|---|---|
| `runs.csv` | `/new-feature` 第 9 步自动追加 | `pipeline-evaluator` / PM | 每个 `.done` 包 1 行（append-only） |
| `_runs字段说明.md` | PM 维护 | 任何要解读 runs.csv 的人 | 字段调整时手改 |
| `loops.csv` + `_loops字段说明.md` | `pipeline-retrospector`（从 loop-trace 块抽取） | `pipeline-evaluator`（周报 四B Loop 收敛仪表） | 每个 `.done` 包 0~N 行（patch-012） |
| `escapes.csv` + `_escapes字段说明.md` | 主对话当场登记（P013 灰度 / hotfix 立项 / DIFF 登记 / 紧急 patch 四 Hook） | `pipeline-evaluator`（周报 四A 拦截漏斗） | 逃逸事件时 1 行（patch-012） |
| `rubrics/_rubric模板.md` | PM 维护 | PM 抽样时复制 | 模板调整时手改 |
| `rubrics/<YYYY-MM-DD>-<CHG>-<short>.md` | PM 手填（10 分钟/包） | `pipeline-evaluator` | 每周 5 包抽样 |
| `weekly/<YYYY-WW>-周报.md` | `pipeline-evaluator` agent | PM | 每周一次（`/pipeline-review`） |
| `regression-set/cases.csv` | PM 手选 | `/optimize-prompts` | 每季度刷新 |
| `regression-set/expected/<case_id>/<agent>/...` | PM 从历史 `.done` 包复制 | `/optimize-prompts` 跑回归时 | 每季度刷新 |

---

## 二、数据生命周期

```
.draft → .active → .done
                     │
                     ▼  /new-feature 第 9 步
              evals/runs.csv +1 行（自动）
                     │
                     ▼  PM 每周
              /pipeline-review
                     │
              evals/weekly/<YYYY-WW>-周报.md
              evals/rubrics/<本周抽 5 包>.md（PM 手填）
                     │
                     ▼  PM 每月
              /optimize-prompts 读 runs.csv + rubrics 决定改哪个 agent
```

---

## 三、不允许的事

- ❌ **删除 `runs.csv` 任何一行**——回归只能靠 append 修正记录
- ❌ **手改 `runs.csv`**（除非修字段拼写错误，且必须同步更新 `_runs字段说明.md` 的版本号）
- ❌ **跳过 rubric 抽样直接出周报**——PM 主观分是周报"质量趋势"列的唯一来源

---

## 四、与其他目录的咬合

- `runs.csv` 行 ↔ `knowledge/cases.csv` 行：1:1 对应同一个 `.done` 包，但字段不同（runs 看过程指标，cases 看业务标签）
- 周报里若发现某 agent 频繁打回 → PM 在 `/optimize-prompts` 时优先审 `optimization/patches-pending/` 中针对该 agent 的补丁
- `regression-set/` 是 `/optimize-prompts` 合并补丁前后的"prompt 不退步"兜底，与本目录其他文件无直接联动
