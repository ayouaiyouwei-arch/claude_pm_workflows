# test-cases-snapshot · 全量用例冻结快照

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> 本目录是**包创建瞬间**从 `test/test-cases/` 整体复制的**冻结快照**。给 Codex / 测试 AI 提供"全局视野"，使其在不打破物理隔离的前提下了解全工作空间所有已知用例。

---

## 一、为什么需要这个 snapshot

| 不放 snapshot 的代价 | 放了 snapshot 的好处 |
|---|---|
| Codex 只看 `05-用例清单.md` 子集，可能改坏未列入子集的功能 | Codex 全局可见，避免回归伤害 |
| 想跑回归用例时要去包外读 `test/test-cases/`，破坏物理隔离 | snapshot 内即可读 |
| 上游 CSV 后续修改会影响本包认知 | snapshot 起包瞬间冻结，上游变更不污染本包 |

---

## 二、snapshot 与 `05-用例清单.md` 的关系（**关键**）

| 文件 | 内容 | 优先级 |
|---|---|---|
| `05-用例清单.md § 二` 必过用例 | 本期必须 pass 的 case_id 子集 | **最高** |
| `05-用例清单.md § 三` 回归用例 | 防退化 | 高 |
| `05-用例清单.md § 四` **本期用例增删改登记** | 本期作废 / 修改 / 新增哪些 case | **覆盖 snapshot** |
| `test-cases-snapshot/<模块>.csv` | 起包瞬间的全量 case 元数据 | 仅 § 四未覆盖的部分有效 |

> ⚠️ **冲突治理铁律**：
>
> 当 `05 § 四` 标某 case_id 为 `已作废 / 本期修改` 时，snapshot 里的对应行**自动失效** —— 哪怕 snapshot 还摆在那里，Codex / 测试都**只**看 `05 § 二/三`。

---

## 三、目录约定

```
test-cases-snapshot/
├── README.md                    ← 本文件（说明 + 冲突治理）
├── _快照元数据.md                ← 起包时的版本/时间/源 hash（必填）
├── _用例字段说明.md              ← 从 test/test-cases/_用例字段说明.md 复制（冻结）
├── _测试设计方法.md              ← 从 test/test-cases/_测试设计方法.md 复制（冻结）
├── <模块A>.csv
├── <模块B>.csv
├── <模块C>.csv
└── <...每个模块一份 CSV，模块清单见 PROJECT-PROFILE.md § 四 / PRD>
```

> 实际起包时由 `generate-research-deliverable` skill 自动从 `test/test-cases/` 整体复制；`_template/` 内只有 `.gitkeep` 占位。

---

## 四、Codex / 测试 AI 的读取规则

| 想做什么 | 应该读哪里 |
|---|---|
| 看本期"必须 pass"用例 | `05-用例清单.md § 二` |
| 看本期"防退化"回归用例 | `05-用例清单.md § 三` |
| 看本期对老用例的"作废 / 修改 / 新增"动作 | `05-用例清单.md § 四`（**先读这个**） |
| 看与本期相关模块的全量用例（含未列入 § 二/三 的旁路 case） | `test-cases-snapshot/<模块>.csv` |
| 理解 scenario 字段的 `[<方法标签>]` 含义 | `test-cases-snapshot/_测试设计方法.md` |
| 理解 CSV 列含义 | `test-cases-snapshot/_用例字段说明.md` |
| 跑实际自动化 | `test/tools/api-collection/` 与 `test/tools/e2e-scripts/`（不在 snapshot，是包外）|

---

## 五、snapshot 不可变约束

- ❌ Codex 不允许修改 snapshot 内任何文件
- ❌ Codex 不允许新增 snapshot 内文件
- ❌ Codex 不允许删除 snapshot 内文件
- ✅ 想"补 case"或"改 case 元数据"？先在 `05-用例清单.md § 四`登记本期变更动作；再写到 `08-修复历史.md` 的 `[QUESTION-N]`，等 PM 走另起 CHG 流程
- 违例处理：当次 commit 退回 + 在 `08` 标 `[VIOLATION-N]`

---

## 六、snapshot 与上游 `test/test-cases/` 的同步策略

| 场景 | 处置 |
|---|---|
| 包升 `.active` 后，上游 `test/test-cases/<模块>.csv` 又被改了 | 本包 snapshot 不动；上游变更**不影响**本包认知 |
| 本包发现 snapshot 与上游真实情况冲突 | 在 `08-修复历史.md` 标 `[BASELINE-DRIFT-N]`，PM 评估是否 `.superseded` + 起新包 |
| 包 `.active → .done → archive/` 后 | snapshot 永久保留，作为该期需求的历史快照 |

---

## 七、相关文件

- 起包技能：`.claude/skills/generate-research-deliverable/SKILL.md`（自动复制 + 填元数据）
- 冲突治理：`05-用例清单.md § 四 + § 一.5`、本包 `AGENTS.md § 五`
- AI 行为约束：`.cursor/rules/07-研发交付包规范.mdc § 一.2`
