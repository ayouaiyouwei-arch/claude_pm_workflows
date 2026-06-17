---
description: 存量文档基建流水线（项目接入后跑一次，可分批续跑）。把无文档的存量系统反向沉淀为：产品全景 + 角色权限矩阵 + 每模块 6 件套 + test-cases/<模块>.csv 用例库，供 /new-feature 流水线引用与回流。
argument-hint: 留空 = 从头开始（模块拆分提案）；或 <模块编号列表，如 M06,M07> = 续跑指定模块
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion
---

# /init-docs · 存量文档基建流水线（反向沉淀）

> 用户已输入：$ARGUMENTS
>
> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md
>
> **定位**：`/init-project` 解决"项目怎么接进来"（配置），本命令解决"存量系统的产品事实怎么沉淀下来"（文档+用例底座）。产物是 `/new-feature` 流水线的上游事实源（A1 必读 / A6 fe_ref）与下游回流目标（.done 三件回流）。

## ⚠️ 立场（每次启动重申）

- **现状即事实**：反向 PRD 只写系统实际行为（P007 实证 · 出处带 `文件@SHA`）。"觉得不该这样"的，进 07-待裁决 / 升 DIFF，**严禁写进 01-功能说明**
- 从不修改 `code/`（只读快照）
- 三个编号命名空间并存靠路径隔离：`product-docs/modules/`（存量现状·长期演进）≠ `product-docs/_drafts/`（单需求过程稿）≠ `deliverables/*/`（交付包快照）。**引用文档必须带路径，禁止裸说"06 文档"**
- 用例落 `test/test-cases/<模块>.csv`（与 /new-feature 包 snapshot 同一个库）：19 列冻结表头（schema v2 · 含 chg_ref）· 方法标签 · P0:P1:P2≈30:50:20 · 5 态 100%（见 `test/test-cases/_用例字段说明.md`）

---

## 第 0 步：前置检查（必做）

```bash
grep -q "未初始化 · 待 /init-project" PROJECT-PROFILE.md && echo "❌ 先跑 /init-project" || echo "✅ PROFILE READY"
ls code/*/ >/dev/null 2>&1 && echo "✅ code/ 有快照" || echo "❌ 先 sync-research-code"
ls product-docs/modules/_template/ >/dev/null 2>&1 && echo "✅ 模块模板在" || echo "❌ 骨架缺 modules/_template"
```

- 任一 ❌ → 停下，先补前置
- 记录当前快照点：`cd code/<仓库> && git rev-parse --short HEAD`（本轮所有出处统一用这个 SHA）
- 若 `$ARGUMENTS` 指定了模块编号 → 跳到第 3 步续跑该模块（前提：第 1 步的冻结产物已存在）

---

## 第 1 步：模块拆分提案 → 🚦 Gate D1（PM 确认后冻结）

主对话**自己做**（轻量扫描，不调 agent）：

1. 证据扫描：前端路由表（如 `routes/config.tsx`）/ 后端业务域目录（`modules/domains/` 或等价物）/ schema 模型 / 仓库 docs 索引
2. 产出**模块拆分提案表**：`编号 M0X | 模块名 | 缩写（用例 case_id 用）| 覆盖页面/路由 | 对应代码域 | 沉淀批次 P0/P1/P2`
   - 拆分原则：按**用户可感知的功能域**拆（页面群 + 其背后的业务域），不按技术分层拆；每模块 6 件套的量 ≈ 1 个拆解回合能产完；横切面（角色权限/导航）归总览层不单设模块
   - 批次原则：P0 = 当前活跃改动区 + 架构黑名单覆盖区；P1 = 产品主链路闭环；P2 = 稳定支撑面
3. **🚦 Gate D1**：用 AskUserQuestion 让 PM 确认/增删改模块表与批次（P015 业务语言）
4. PM 确认后**冻结三样**：
   - `test/test-cases/_用例字段说明.md § 四` 缩写表按确认稿回填
   - `product-docs/modules/M0X-<模块名>/` 目录骨架（从 `_template` 拷 6 件套空模板）
   - `product-docs/00-产品全景.md` 骨架（模块索引表先就位）

---

## 第 2 步：总览层（主对话做 · 与首个模块同回合）

证据来源：路由配置 + 全局守卫/角色枚举 + 侧边栏可见性逻辑。产两份：

1. `product-docs/00-产品全景.md`：一句话定位 / 信息架构图（路由树）/ 端到端主流程（业务语言）/ 模块索引（M0X ↔ 页面 ↔ 批次 ↔ 沉淀状态）
2. `product-docs/01-角色权限矩阵.md`：角色 × 页面/操作 矩阵（每格：可见/可操作/只读/不可见 + 代码出处）。**这是 acceptance-regression 验收框架与 [DT] 权限用例的直接输入**

总览层随首个模块的 Gate D2 一并给 PM 过目（不单开 gate）。

---

## 第 3 步：模块拆解（每模块一轮 · 调 legacy-excavator agent）

```
Agent(subagent_type="legacy-excavator", prompt="
阶段：DOCS
模块：M0X <模块名>（缩写 <ABBR>）
代码快照：code/<仓库>/ @ <SHA>
模块范围：页面/路由 = <...>；代码域 = <...>；边界备注 = <与相邻模块的切分线>
可回收材料：<repo docs/ 对应文档、历史 PRD 残料路径，注明版本日期与可信度>
输出目录:product-docs/modules/M0X-<模块名>/
请按 agent 定义流程产 6 件套（01/02/03/04/06/07），P007 每个断言带出处，07 用业务语言。
")
```

agent 返回 `[excavate-docs 完成] M0X=<名> · 6件套已落 · FE=<n>条 · 待裁决=<m>条`。

> **兼容写法（实战验证 2026-06-12）**：若运行环境的 Agent 注册表未加载自定义 agent（按 `legacy-excavator` 调用报错/找不到），改派 **general-purpose 子代理**，prompt 首行写明「先读 agent 定义 `.claude/agents/legacy-excavator.md`，严格按其流程与红线执行」，效果等同。
> **中断防御**：批次并行建议 ≤3 个**前台**子代理 + prompt 内要求「尽早落盘——每完成一件立即 Write，不攒到最后」（后台代理遇会话额度/限流中断会整批丢产出）。

### 🚦 Gate D2 · PM 裁决（每模块一次 · 强制）

主对话把该模块的 `07-待裁决问题.md` 全部条目 + `03-页面交互问题清单.md` 中严重度 ≥ 高 的条目**用业务语言**呈现给 PM（P015 四条全守），逐条三分流：

| PM 裁决 | 回写动作 |
|---|---|
| "这是有意设计" | 该行为转写进 01-功能说明/04-业务规则（成为事实基线），07 该条关闭 |
| "这是问题" | 调 `log-diff-entry` 升 DIFF-XXX 进差异台账（走既有裁决/修复流程），03/07 标去向 |
| "暂不确定" | 07 挂起（保留 Q 编号），相关用例照常生成但 `diff_ref` 留空、备注挂起编号 |

**严禁跳过 Gate D2 把 6 件套直接当"已确认基线"用。**

---

## 第 4 步：用例生成（每模块一轮 · Gate D2 后调）

```
Agent(subagent_type="legacy-excavator", prompt="
阶段：CASES
模块：M0X <模块名>（缩写 <ABBR>）
模块文档：product-docs/modules/M0X-<模块名>/（Gate D2 已裁决，07 残留挂起项见文件）
用例规范：test/test-cases/_测试设计方法.md + _用例字段说明.md（19 列冻结表头 · schema v2 含 chg_ref）
baseline_version 填当前生效基线（见 product-docs/baseline/01-基线版本登记表.md）
输出：test/test-cases/M0X-<模块名>.csv
")
```

agent 返回 `[excavate-cases 完成] M0X=<名> · N 条（P0/P1/P2=a/b/c）· [ST]/[DT]/[EG] 达标 · 挂起 k 条`。

> **CASES 产出硬化（实战教训）**：① CSV 字段内**禁用英文逗号**（用中文逗号/分号替代，否则错列）② 分批落盘（先表头+前 20 条再追加）③ 兼容写法同第 3 步——CASES 亦可由主对话直接分批写盘。

主对话**抽查自检**（不放行不进下一模块）：
```bash
head -1 test/test-cases/M0X-*.csv          # 表头与冻结表头逐字一致
awk -F',' 'NR>1{print $8}' test/test-cases/M0X-*.csv | sort | uniq -c   # 配比 30:50:20 ±20pt
grep -c "five_states" 略——抽 5 条人工看场景化（Given/When/Then 可还原、方法标签在）
node test/tools/lint-cases.js   # 🚦 G1 静态门禁：表头/19列/case_id 唯一/标签/配比/fe_ref·diff_ref·chg_ref 可追溯（退出码≠0 不放行）
```

### 可选 B · 批量并行（`gen-cases` 工作流 · 推荐用于多模块批次）

一批要生成/补多个模块用例时，Gate D2 逐模块裁决后，可用命名工作流一次性扇出（**闭环驱动**：先枚举覆盖义务分母再逐条覆盖；内建 **G2 读码对抗复核**，治"自动生成用例约 11% 断言不贴代码现状"；**S1 结构化 obligations + S2 AutoFix** 见 patch-022）：

1. 主对话先列模块：`ls product-docs/modules/` → 构造 `[{code,name,start:"TC-<ABBR>-0NN",mode:"full"}]`（`start`=该模块下一可用号；`mode=full` 全量 / `gap` 补缺带 `gaps` / `scn` 跨模块链路）。
2. 调 `Workflow({name:"gen-cases", args:{root:"<工作空间绝对路径>", sha:"<当前快照 SHA>", modules:[...]}})`。
3. 工作流返回 `{groups:[{code, gen.cases, gen.obligations, review.mustFix, fixedCount}]}`：S2 已自动修 `mustFix`；主对话用 `obligations` 渲染 `coverage-matrix.md`（render-coverage-matrix.mjs），**再过 G1（lint-cases.js `--dir`/`--obligations`）后写盘**。

> 何时**不**用工作流：单模块 / 几条用例（如 /new-feature A6 增量）→ 直接 agent/主对话写盘更省。工作流只在「≥多模块批量扇出 + 要可复现/可 resume」时起。目标态/方案文档用例用 `gen-cases-spec`。脚本与入参见 `.claude/workflows/gen-cases.js` 头注。

---

## 第 5 步：批次收口

- 每模块完成 → `说明文档.md` 第三节登记一行（模块/文档数/用例数/挂起数）
- 00-产品全景 模块索引表更新沉淀状态
- **全部模块完成后**：走 `publish-baseline` 升 minor（如 B1.0.0 → B1.1.0「存量文档基建完成」），**按其《场景 B · docs-only 文档基建基线》特例执行**——存量拆解新立的 DIFF/CHG（已完成 Gate D2 裁决、登记齐全带截止日期）不阻塞发布且不回写状态，测试轨按 N/A 豁免并在版本行备注 `docs-only`（否则会死锁：反向拆解的天然产物就是一批待联合裁决的 DIFF）。同时确认 CLAUDE.md「.done 三件回流」约束已挂上（此后 /new-feature 包升 .done 时：用例合并回库 / 模块 01+04 现状回写 / 02 矩阵补行）

---

## 并行说明

- 模块间 6 件套互不冲突，**可多对话并行拆解**（不动 code/，D1-D4 天然不命中；无 .active 占用问题）
- 同一模块内 DOCS → Gate D2 → CASES 必须串行
- 建议同批次并行 ≤ 3，保 Gate D2 的 PM 注意力

## 不允许的事

- ❌ 把"理想态/应该如何"写进 01-功能说明（那是 CHG 的事；现状即事实）
- ❌ 凭印象写规则不标出处（P007；拿不准 = 🔍 进 07，不脑补）
- ❌ 跳过 Gate D1/D2 冻结或转正
- ❌ 用例无方法标签 / 表头偏离冻结 19 列 / 配比超 ±20pt 不返工 / 未过 G1 lint 就写盘
- ❌ 修改 code/ 任何文件
- ❌ 一次 Agent 让 agent 同时干 DOCS + CASES（裁决前后是两个世界）
