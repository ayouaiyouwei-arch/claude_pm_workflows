# loops.csv · 循环账本字段说明

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md
>
> **当前版本：v1.0（2026-06-11 · patch-012）**
>
> 给 patch-009 Loop 工程五原则配指标：每次 loop/判审点调用一行。回答：**loop 收敛了吗、cap 定对了吗、软闸是噪音还是该升硬闸、Gate 1.5b 的 PM 人肉来回降了吗**。

---

## 〇、约定

- append-only；从项目首个 .done 包开始积累
- **唯一写入者 = pipeline-retrospector**（.done retrospect 时从 _drafts 各产物的 loop-trace 块批量抽取）
- 追加后跑 `bash scripts/validate-evals-csv.sh loops --last`

---

## 一、字段表（11 列）

| 序 | 字段名 | 值域 | 说明 |
|---|---|---|---|
| 1 | `run_id` | 包名 | retrospect 时由 _drafts 短名映射回填 |
| 2 | `loop_id` | `Loop-1` / `A2-软闸` / `Loop-2` / `Loop-3` / `Gate1.5b改图` / `iterate-A7` | 6 种循环/判审点 |
| 3 | `触发` | `是` / `否` | Loop-1 / A2-软闸 凡走流水线必有行；Loop-3 / Gate1.5b改图 仅 UI 类；Loop-2 / iterate-A7 仅打回时 |
| 4 | `轮数` | int / `-` | 实际修订轮数（Loop-1 恒 1；`Gate1.5b改图` = PM"B 改 X"来回次数） |
| 5 | `检出数` | int / `-` | 累计检出问题数（Loop-3 = 4 lens major+minor 合计；A2-软闸 = 严重度 ≥ 3 警告数） |
| 6 | `自修数` | int / `-` | loop 内自己修掉的 |
| 7 | `升级PM数` | int / `-` | 分诊决策类 + 超限升级 + 残留表条目 |
| 8 | `残留数` | int / `-` | 带病提 Gate 的 major/警告数（原则 2"收敛判据显式"的落数） |
| 9 | `新问题即停` | `是` / `否` / `-` | 原则 4 事件 = 改坏率分子 |
| 10 | `超限` | `是` / `否` / `-` | 触顶 cap 升级 PM（cap 穿透监控） |
| 11 | `备注` | 文本 | Loop-2 记分诊比 `形式K:决策M`；A2-软闸记 PM 裁决 `回炉N/接受M`（主对话 Gate 1 回写 02 报告后由 retrospector 抽） |

---

## 二、loop-trace 块（数据源 · 各产物尾部统一式样）

```yaml
# === loop-trace v1 ===
loop_id: Loop-3
轮数: 1
检出数: 5
自修数: 4
升级PM数: 1
残留数: 0
新问题即停: 否
超限: 否
备注: -
# === loop-trace end ===
```

| loop_id | trace 块落点 | 谁写 |
|---|---|---|
| `Loop-1` | `01-需求细化.md` § 〇.7 自评残留表尾 | A1 product-expert |
| `A2-软闸` | `02-A2-审核报告.md` 尾（PM 裁决由主对话 Gate 1 后追加一行） | A2 requirement-reviewer + 主对话 |
| `Loop-2` | `02-A2-审核报告.md` 尾（闭环结束时） | /iterate-A2 主对话 |
| `Loop-3` | `attachments/demo/self-critique.md` 尾 | A1.5 visual-spec-author |
| `Gate1.5b改图` | `attachments/demo/qa-log.md` 尾（Gate 1.5b 收口时） | 主对话 |
| `iterate-A7` | `07-A7-用例审核报告.md` 尾（闭环结束时） | /iterate-A7 主对话 |

**防走过场兜底**：evaluator 周报必检"trace 存在率"（流水线包应 ≥ 2 行：Loop-1 + A2-软闸；UI 包应 ≥ 4 行：再 + Loop-3 + Gate1.5b改图）。缺失即点名——复用"retrospect 滞后必检"模式。

---

## 三、派生指标（evaluator 周报「Loop 收敛仪表」节消费 · 对应五原则）

| 指标 | 公式 | 回答（原则） |
|---|---|---|
| 轮数分布 / 首轮修复率 | 按 loop_id 分桶 | cap 定对没有 · Self-Refine 边际递减实证（原则 1） |
| 超限升级率 | `超限=是 ÷ 触发数` | cap 太低还是判据与 PM 审美错位（原则 1） |
| 残留趋势 | 残留数周均 | 带病提 Gate 是否收敛（原则 2） |
| trace 存在率 | 实有行 ÷ 应有行 | 留痕健康度·防走过场（原则 3） |
| 改坏率 | `新问题即停=是` 计数 | 修一个坏一个的频率（原则 4） |
| **Gate1.5b 轮数趋势** | `Gate1.5b改图`.轮数 周均 | **Loop-3 唯一直接成功指标**：不降 = 4-lens 预审在演戏（原则 5） |
| **软闸校准** | A2-软闸 警告数 × PM 回炉率 | 常年 0 回炉 = 噪音降丙档；回炉率高 = 升甲硬闸——patch-009 决议 2 的数据复议依据 |
| 分诊比 | Loop-2 备注聚合 | 形式类多 → 修模板/自检；决策类多 → 修 Gate 提问/方法论卡 |
