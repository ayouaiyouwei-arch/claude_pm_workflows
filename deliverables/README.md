# deliverables · 研发交付包轨（第 4 轨）

> 一句话定位：本目录是工作空间的**第 4 轨**——平行于 `product-docs/`（产品轨）/ `code/`（代码轨）/ `test/`（测试轨）。每一次产品需求或功能优化都建一个**自包含 + 带时间戳 + 带状态后缀**的研发交付包，目的是**物理隔离 Codex 视野**，确保它每次只看一份"最新且唯一"的需求材料，不被历史文件干扰。

---

## 一、为什么要有第 4 轨

| 痛点（无交付包） | 治理（有交付包） |
|---|---|
| Codex 全工作空间可读，会"顺手"修非本次范围的页面 | 物理隔离到单个交付包，白名单外动一行就违规 |
| 02 矩阵 / 02 差异台账 / 03 变更登记里**已关闭 / 待裁决 / 不通过** 状态混在一起，Codex 不读状态字段就动手 | 包内只摘录本次相关条目，状态干净 |
| 大 PRD 含全模块，Codex 容易"主动补全"非本次需求 | 包内 `03-PRD片段.md` 是冻结快照，PRD 主文档后续更新不影响包内 |
| 多需求并行时 Codex 混淆 | 同一时刻全工作空间最多 1 个 `.active` 包；多需求按代码区域拆包并行 |
| 验收 / 复盘要翻多处文档 | 包内 `08-修复历史.md` + `06-验收标准.md` 自包含可追溯 |

---

## 二、目录结构（M1.8 升级版）

```
deliverables/
├── README.md                                            ← 本文件
├── _template/                                           ← 模板交付包（复制后改名即可用）
│   ├── AGENTS.md                                        ← 【M1.8 D1】Codex 自动加载，5 铁律 + 阅读顺序
│   ├── 00-给Codex的导读.md                              ← 详细操作手册
│   ├── 01-需求范围与边界.md                              ← 含 § 五 读权限白名单（test/tools/ 等）
│   ├── 02-基线快照.md
│   ├── 03-PRD片段.md
│   ├── 04-接口契约.md
│   ├── 05-用例清单.md                                   ← 【M1.8 D2】§ 一.5 + § 四 本期增删改登记
│   ├── 06-验收标准.md
│   ├── 07-时间与里程碑.md
│   ├── 08-修复历史.md
│   ├── 99-状态.md
│   ├── attachments/
│   └── test-cases-snapshot/                             ← 【M1.8 D2】全量 CSV + 元数据 + 方法论冻结快照
│       ├── README.md                                    ← snapshot 与 § 四的优先级关系
│       └── _快照元数据.md                                ← 起包时间 / commit / SHA 校验
├── <YYYY-MM-DD>-<CHG编号>-<中文短名>.<状态>/            ← 实际交付包（同样的内部结构）
└── archive/                                             ← 归档目录（已 done 的包）
```

> 同时**工作空间根**有 `AGENTS.md`（导航到唯一 active 包），与每包 `AGENTS.md`（铁律细节）形成"两层 AGENTS.md"机制——这是为了 Codex（OpenAI 的研发 AI）能自动加载约束，而不是只对 Cursor 内置 AI 生效。

---

## 三、命名规范（强制）

格式：

```
<YYYY-MM-DD>-<CHG编号>-<中文短名>.<状态>
```

| 段 | 说明 | 示例 |
|---|---|---|
| `YYYY-MM-DD` | 包创建日期（不要 `YYYYMMDD`，可读 + 排序友好） | `2026-05-12` |
| `CHG编号` | 与 `product-docs/.../baseline/03-产品变更登记.md` 一致 | `CHG-001` |
| 中文短名 | ≤ 12 字，体现核心需求 | `<示例模块>闭环` |
| 状态后缀 | `.draft` / `.active` / `.done` / `.superseded` / `.hotfix` | `.active` |

**完整示例**：

```
2026-05-12-CHG-001-<模块A>闭环.active
2026-05-15-CHG-002-<模块B>调整.active                ← 不允许（违反 § 五同时性约束）
2026-05-18-HOTFIX-001-<某页>崩溃.hotfix              ← 紧急修复，可与 .active 共存
```

**同日多包**：加 `-T01` / `-T02` 后缀避免冲突，例：`2026-05-12-T02-CHG-003-xxx.draft`

---

## 四、状态机

```
[draft]   产品 PM 起草中，Codex 不可见
   │ PM 完成 + 评审通过 + 调 promote-deliverable
   ▼
[active]  Codex 工作中，全工作空间唯一
   │ 验收通过（执行清单全 pass + 退出标准 9 项达标）
   ▼
[done]    待归档（建议 7 天冷却期，避免立即归档影响追溯）
   │ 调 promote-deliverable
   ▼
[archive/<同名包>.done]  归档目录，Codex 默认不读
```

**额外状态**：

| 状态 | 用途 |
|---|---|
| `.superseded` | 包被新包替代（罕见）；旧包不再有效，需立即归档 |
| `.hotfix` | 紧急线上修复，可与 `.active` 共存；自包名必须 ≤ 24h 内 `.done` |

---

## 五、并发约束（硬性）

| 状态 | 全工作空间允许数量 |
|---|---|
| `.draft` | 多个（PM 可并行起草） |
| **`.active`** | **最多 1 个**（违反即 CI 阻断） |
| `.hotfix` | 1 个（独立通道，可与 `.active` 共存） |
| `.done` | 多个（待归档） |
| `.superseded` | 0（一旦标记必须立即归档） |

> 检测命令：`ls deliverables/ | grep -c '\.active$'` 必须 ≤ 1。

并行需求处理方式：

- ✅ 按"互不重叠的代码区域"拆包（白/黑名单不交集），任一时刻仍只 1 个 `.active`
- ✅ 第二个需求先放 `.draft`；第一个 `.done` 后再 `.active`
- ❌ 不允许两个 `.active` 同存（除非一个是 `.hotfix`）

---

## 六、与其他 3 轨的关系

```
        ┌──────────────────────┐
        │  product-docs/       │ PRD + 矩阵 + 问题清单 + baseline
        │  (长期事实源)        │
        └──────────┬───────────┘
                   │ 摘录冻结快照
                   ▼
        ┌──────────────────────┐
        │  deliverables/<active>│ 单需求自包含包（短期任务包）
        │  (Codex 唯一视野)    │
        └──────────┬───────────┘
                   │ 派活 + 修改边界白名单
                   ▼
        ┌──────────────────────┐         ┌──────────────────────┐
        │  code/<仓库名>/      │  ←────→ │  test/               │
        │  (实际代码)          │  跑批   │  (用例 + 报告)       │
        └──────────────────────┘         └──────────────────────┘
                                                   │
                   ┌───────────────────────────────┘
                   ▼ 验收结果回写
        ┌──────────────────────┐
        │  deliverables/<active>│
        │  → 06-验收标准.md     │
        │  → 99-状态.md         │
        └──────────┬───────────┘
                   │ 状态 .active → .done → archive/
                   ▼
        ┌──────────────────────┐
        │  product-docs/baseline│ DIFF / CHG 状态回写 + 升 B1.0.x
        └──────────────────────┘
```

---

## 七、关键命令速查

```bash
# 1. 起草新包（产品 PM）
#    调 generate-research-deliverable skill，自动从 baseline + PRD + 用例摘出 .draft 包
#    输入：CHG 编号 / 模块 / 截止日期 → 输出：deliverables/<日期>-<CHG>-<短名>.draft/

# 2. 状态变更（产品 PM）
#    调 promote-deliverable skill：
#      .draft  → .active   （前置校验：当前无其他 .active）
#      .active → .done     （前置校验：执行清单全 pass + 退出标准达标）
#      .done   → archive/  （前置校验：冷却期已到）

# 3. 给 Codex 派活
#    调 write-fix-prompt skill，输出指向当前 .active 包的提示词
#    Codex 启动后自动遵循 .cursor/rules/07-研发交付包规范.mdc 约束

# 4. 校验同时性约束
ls deliverables/ | grep '\.active$' | wc -l     # 必须 ≤ 1

# 5. 翻历史包
ls deliverables/archive/

# 6. 看当前 active 包内修复历史
cat deliverables/*.active/08-修复历史.md
```

---

## 八、五种角色的最短路径

| 角色 | 路径 |
|---|---|
| **产品 PM** | 登记 `CHG-XXX` → 调 `generate-research-deliverable` 起 `.draft` → 补完 01/03/06 → 调 `promote-deliverable` 升 `.active` |
| **Codex（研发 AI）** | 启动时扫 `deliverables/*.active/` 找唯一包 → 强制读 `00-给Codex的导读.md` → 全程不读其他 |
| **测试** | `05-用例清单.md` 拿 `case_id` 子集 → 跑 Bruno + Playwright + cursor-ide-browser → 结果回写 `06-验收标准.md` |
| **后端 AI** | 同 Codex；接口契约见 `04-接口契约.md` |
| **复盘** | `archive/` 找历史包；每个 `.done` 包是一份完整快照 |

---

## 九、违规判定

| 行为 | 判定 |
|---|---|
| Codex 主动 grep / read `product-docs/` 或 `test/` 其他文件（非本包指引） | 当次任务作废 |
| 全工作空间 ≥ 2 个 `.active` 包同存（非 `.hotfix`） | CI 阻断 + 立即降级一个为 `.draft` |
| `.active` 包 `.done` 前不归档 / 强行归档 | 归档动作回滚 |
| `.archive` 里的 `.done` 包被改回 `.active` | 直接拒绝（必须新建包） |
| Codex 修改 `code/` 不在 `08-修复历史.md` 留痕 | 当次提交退回 |
| Codex 修改超出 `01-需求范围与边界.md` 白名单 | 当次提交退回 + 在 `08` 标 [VIOLATION-N] |

---

## 十、关联资源

| 资源 | 入口 |
|---|---|
| **模板交付包** | `_template/`（复制后改名即可用） |
| **规则约束（Cursor 端）** | `.cursor/rules/07-研发交付包规范.mdc` |
| **AI 行为约束（Codex 端，M1.8 D1 新增）** | 工作空间根 `AGENTS.md` + 每包 `AGENTS.md` |
| **起包技能** | `.claude/skills/generate-research-deliverable/SKILL.md`（已升级，含 snapshot 复制 + 元数据） |
| **状态机技能** | `.claude/skills/promote-deliverable/SKILL.md` |
| **派活技能** | `.claude/skills/write-fix-prompt/SKILL.md`（已升级） |
| **变更登记联动** | `product-docs/ai-page-interaction-audit/baseline/03-产品变更登记.md`（含「关联交付包」列） |
| **用例 snapshot 说明** | 任意包内 `test-cases-snapshot/README.md`（M1.8 D2 新增） |

---

## 十一、M1.8 升级要点（D1 + D2 + D3 + D4）

### 11.1 D1 · 双层 `AGENTS.md` 机制

| 层 | 文件 | 作用 |
|---|---|---|
| 工作空间根 | `/AGENTS.md` | Codex 启动时自动加载；导航到唯一 `.active` 包 |
| 每个交付包根 | `<包>/AGENTS.md` | Codex `cd` 进包后自动加载；本包 5 铁律 + 阅读顺序 + 用例冲突治理 |

> 为什么需要：`.cursor/rules/` 只对 Cursor 内置 AI 生效，对 Codex（OpenAI）**无效**。`AGENTS.md` 是 Codex 自动加载的标准入口。

### 11.2 D2 · 全量用例 snapshot + 冲突治理

| 机制 | 落点 |
|---|---|
| 全量 CSV 冻结 | 每包 `test-cases-snapshot/`（起包瞬间 `cp test/test-cases/*.csv`） |
| 起源元数据 | `test-cases-snapshot/_快照元数据.md`（commit + SHA 校验） |
| 优先级机制 | `05-用例清单.md § 四` 覆盖 `test-cases-snapshot/`；snapshot 覆盖上游 `test/test-cases/` |
| 本期增删改登记 | `05-用例清单.md § 四`（4 段：作废 / 修改 / 新增 / 不变） |

> 解决"新功能作废老用例时 Codex 不知道、按两版做导致冲突"的痛点。

### 11.3 D3 · 三层权限机制

| 路径 | 权限 |
|---|---|
| 包内（除冻结快照）+ `code/` 白名单 | 可读 + 可写 |
| `test/tools/` + `test/test-cases/` | 可读 + 可执行（跑测试）+ **不可改** |
| `product-docs/` / `test/test-data/` / `test/execution/` / `test/reports/` / `test/evidence/` / 其他包 | **禁止读取** |

> 解决"Codex 想跑测试就必须破坏物理隔离"的矛盾。

### 11.4 D4 · 方法论与字段说明随包冻结

`test-cases-snapshot/` 包含 `_用例字段说明.md` + `_测试设计方法.md`（上游变了不影响包），让 Codex 理解 `[<方法标签>] <角色> <动作>` 的 scenario 句式约束。
