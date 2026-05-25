# 00 · 给 Codex 的导读（强制阅读 · 优先级 P0）

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> ⚠️ 你（Codex）启动时**必须**先完整读完这一份文件，再决定动手。**违反任意一条铁律，本次任务作废。**
>
> 本文件是 `AGENTS.md` 的细化版本。`AGENTS.md` 是 Codex 自动加载的"项目宪法"；本文件是开干前必读的"详细操作手册"。

---

## 一、五条铁律（不允许任何例外）

1. **物理隔离（D3 升级 · 三层权限）**
   - **可读 + 可写**：本交付包目录内全部文件（除 § 五冻结快照清单）+ `code/` 在 `01 § 三` 的白名单文件。
   - **可读 + 不可写**（M1.8 新增白名单）：
     - `test/tools/api-collection/`（Bruno 集合，跑测试用）
     - `test/tools/e2e-scripts/`（Playwright 项目，跑测试用）
     - `test/test-cases/<模块>.csv` 与 `test/test-cases/_*.md`（仅作上游兜底参考；优先用本包内 `test-cases-snapshot/`）
   - **禁止主动 read / grep / find**：
     - `product-docs/` 任意路径
     - `test/test-data/`、`test/execution/`、`test/reports/`、`test/evidence/`
     - `deliverables/_template/`、`deliverables/archive/`、其他 `*.draft/.done/.superseded` 包
   - 包内若引用了外部链接（如 baseline 文件路径、PRD 章节号），仅作为"出处标注"，**不要去打开**。需要的内容已被 PM 摘录到本包内（`02 / 03 / 04 / 05 / test-cases-snapshot/`）。

2. **唯一性校验**
   - 启动时执行：`ls deliverables/ | grep '\.active$' | wc -l`，结果必须为 `1`，且就是你所在的这个包。
   - 如果 ≥ 2，立即停止，向 PM 汇报"工作空间存在多个 active 交付包，违反同时性约束"，等待裁决。

3. **白名单 + 黑名单**
   - 修改 `code/` 必须严格在 `01-需求范围与边界.md § 三` 的白名单内；
   - 命中 `01-需求范围与边界.md § 四` 黑名单的任何文件，**一行都不能动**；
   - 拿不准时**先问**，不要自行扩大范围。

4. **修复留痕**
   - 每次修改 `code/` 后，必须在 `08-修复历史.md` 末尾追加一条记录，含：时间、修改文件清单、修改原因、关联用例 `case_id`。
   - 不写 `08-修复历史.md` 的 commit 视为无效。

5. **以本包为准（D2 升级 · 五份冻结快照）**
   - 包内 `02-基线快照.md` / `03-PRD片段.md` / `04-接口契约.md` / `05-用例清单.md` / `test-cases-snapshot/` 都是**冻结快照**；
   - 即使你"觉得" `product-docs/` 或 `test/test-cases/` 里有更新，也以本包为准；
   - 真有上游变更需要应用，必须先由 PM 调 `promote-deliverable` 把本包升 `.superseded`，再起新包，**严禁本包内偷改**。

---

## 二、本包阅读顺序（强制）

按下列顺序逐份读完后再开始动手（M1.8 升级：在原 9 步前加 `AGENTS.md`，并在 § 5.5 加 snapshot 元数据扫读）：

| 序 | 文件 | 你需要带走的关键信息 |
|---|---|---|
| 0 | `AGENTS.md`（本包根） | 5 铁律 + 阅读顺序 + 用例冲突治理 |
| 1 | `99-状态.md` | 当前是否真的 `.active`、谁在跟进、最后状态变更时间 |
| 2 | `01-需求范围与边界.md` | 改什么、不改什么、为什么 + § 五 读权限白名单 |
| 3 | `02-基线快照.md` | 基于哪个 `B1.0.x` + 代码 commit + PRD 版本干活 |
| 4 | `03-PRD片段.md` | 本次需求的产品语言描述（**这是事实源**，不去看主 PRD） |
| 5 | `04-接口契约.md` | 涉及哪些 API、字段、状态码、鉴权 |
| 5.5 | `test-cases-snapshot/_快照元数据.md` + `README.md` | snapshot 起包时间 + SHA + 与 `05 § 四` 的优先级关系 |
| 6 | `05-用例清单.md` § 一/一.5/二/三/**四** | `case_id` 必过子集 + **本期增删改登记** + snapshot 指引 |
| 7 | `06-验收标准.md` | 退出条件 + 5-state 覆盖 + 证据要求 |
| 8 | `07-时间与里程碑.md` | 截止日期、关键节点 |
| 9 | `08-修复历史.md` | 看是否已有前序修复轮次（增量需求场景） |

---

## 三、产出要求

每一轮交付（含首轮）必须包含：

1. **代码改动**（仅限白名单文件）
2. **`08-修复历史.md` 追加** 一条新记录（格式见该文件示例）
3. **测试自查反馈**：跑通 `05-用例清单.md` 中标记 `auto:Y` 的用例（Bruno + Playwright），跑不通要写明原因
4. **风险声明**：本轮是否有未覆盖场景、是否触碰边界、是否有性能/兼容隐患

输出格式建议：

```markdown
## 第 N 轮交付（YYYY-MM-DD HH:mm）

### 1. 修改文件清单
- code/<仓库名>/<前端包>/src/pages/xxx.tsx  （新增）
- ...

### 2. 关键改动说明
- ...

### 3. 自动化用例运行结果
- Bruno：6/6 pass
- Playwright：3/3 pass

### 4. 5-state 覆盖
- empty / loading / data / error / partial: ...

### 5. 风险与未尽事宜
- ...
```

---

## 四、提问规则

- 任何范围外 / 措辞模糊 / 设计冲突的疑问，**直接停下来问 PM**，不要"拍脑袋自行决定"。
- 提问写到 `08-修复历史.md` 的 `[QUESTION-N]` 段，PM 在 `[ANSWER-N]` 段回复。
- 没有 `[ANSWER-N]` 之前，相关代码不要动。

---

## 五、冻结快照清单（D2 升级 · 严禁修改）

下列文件 / 目录是 PM 起包瞬间冻结的事实快照，**严禁**你修改 / 新增 / 删除：

| 文件 / 目录 | 性质 | 发现冲突怎么办 |
|---|---|---|
| `02-基线快照.md` | 基线 + commit + DIFF/CHG 摘录 | 写 `08-修复历史.md` `[BASELINE-DRIFT-N]` |
| `03-PRD片段.md` | 产品语言 | 写 `[CONTRACT-DRIFT-N]` 或 `[QUESTION-N]` |
| `04-接口契约.md` | API 契约 | 写 `[CONTRACT-DRIFT-N]` |
| `05-用例清单.md` § 一/二/三/四 | 用例子集 + 本期增删改 | 写 `[QUESTION-N]` |
| `test-cases-snapshot/` 整个子目录 | 全量 CSV + 字段说明 + 方法论 + 元数据 | 写 `[BASELINE-DRIFT-N]` |

> 严禁包内偷改快照。要更新 → PM 调 `promote-deliverable` 升 `.superseded` + 起新包。

---

## 六、跑测试时的工作目录约定

| 测试类型 | 工作目录（在工作空间根） | 命令 |
|---|---|---|
| Bruno API | `cd test/tools/api-collection` | `bru run --env Local <本期模块>` |
| Playwright E2E | `cd test/tools/e2e-scripts` | `pnpm playwright test tests/regression/<本期模块>` |

> 跑完后把 stdout/stderr 摘要追加到 `08-修复历史.md` 的 `[ROUND-N] § 自动化用例运行结果` 段。
> 不许修改 `test/tools/` 任何文件（要新增 `.bru` / `.spec.ts` 请 PM 另起 CHG）。

---

## 七、用例冲突处置（D2 升级 · **关键**，新功能可能作废老用例）

snapshot 全量用例与本期 `05-用例清单.md § 二/三` 共存，处理优先级：

```
05-用例清单.md § 四（本期增删改登记）       ← 最高，覆盖一切
  ├─ § 4.1 已作废 → snapshot 行完全失效，不写实现、不写断言、不跑测试
  ├─ § 4.2 本期修改 → 只看 § 二/三 的新断言，snapshot 旧断言仅历史参考
  ├─ § 4.3 本期新增 → 只看 § 二/三（snapshot 里没有）
  └─ § 4.4 不变 → snapshot 即最新版

case_id 不在 § 四里 → snapshot 即最新版
```

**严禁**同时按 snapshot 老版 + § 二/三 新版做（会出现"两个用例都 pass 但功能矛盾"的情况）。

每次写代码 / 写测试断言前，先扫一遍 `05-用例清单.md § 四`，确认你正在动的 case_id 不在 `已作废 / 本期修改` 列。

---

## 八、安全基线

- 不要 commit 任何 secret / token / 密码 / `.env`；
- 不要修改 `.gitignore` 以"绕过"上一条；
- 不要修改 git remote、不要 push 到非 `release/*` 分支（除非 `01-需求范围与边界.md` 明示）；
- 不要 `git reset --hard` 已推送的 commit。

---

## 九、本包元信息

| 字段 | 值 |
|---|---|
| 交付包名 | `<YYYY-MM-DD>-<CHG-XXX>-<中文短名>` |
| 当前状态 | 见 `99-状态.md` |
| 关联变更 | `<CHG-XXX>` ↔ `product-docs/.../baseline/03-产品变更登记.md` |
| 创建人（PM） | `<姓名>` |
| 当前 owner（研发） | `<姓名 / Codex>` |
| 截止日期 | 见 `07-时间与里程碑.md` |

---

> 读完本文件，请回复 PM **「AGENTS.md 已读 + 单 active 自检 = 1，导读已读，开始读 01-需求范围与边界.md」**（M1.8 升级），然后再继续。
