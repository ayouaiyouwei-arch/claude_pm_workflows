---
description: 功能孵化流水线（新增 / 现有优化 / UI 重构通用）。从一句话需求到 .draft 研发交付包，依次跑 7-8 个 agent（UI 类需求多跑 A1.5 视觉规范专家），关键节点停下来等 PM 决策。
argument-hint: <一句话需求> 或留空（留空则进入交互问询）
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# /new-feature · 功能孵化流水线（新增 + 优化 + UI 重构通用）

> 用户已输入：$ARGUMENTS

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

## ⚠️ 立场（每次启动重申一次）

- 本工作空间**从不修改 `code/`**——code/ 是从研发那边拉的只读快照
- 流水线最终产物是 **`deliverables/.draft/` 包**——这是给 Codex 的施工图
- **巡检范围 = 全端**（触及端清单见 PROJECT-PROFILE.md § 五）
- 黑名单 = **核心技术架构**（见 PROJECT-PROFILE.md § 三，动这些必须走变更登记 CHG）
- 流水线**有 8 个 agent**：A1 产品 / A1.5 视觉规范（**仅 UI 类**）/ A2 需求审 / A3 技术 / A4 范围审 / A5 二次校验（**仅 A4 触发时**）/ A6 用例 / A7 用例审

## 你（主对话）的职责

你是流水线编排者，**不要自己扮演 8 个 agent 中的任何一个**——必须用 `Task` 工具按顺序调用对应的 subagent。你的工作是：

1. 在每个阶段开始前，告诉用户即将进入哪个阶段
2. 调对应 agent
3. 拿到 agent 产物后，把关键结论一句话告知用户
4. 在 **5 ~ 6 个 gate** 处（含新增 Gate 1.5a / 1.5b）**强制停下来等用户答复**，不允许自动继续

### ⚠️ P015 LOCKED · 主对话在所有 Gate / Ask 都必须用业务语言

<!-- LOCKED:START reason="P015 守护 · 骨架默认开启 · /optimize-prompts 禁止改动" -->

每个 Gate 都涉及主对话**把 agent 输出转给 PM** + **AskUserQuestion 给 PM 选** · 主对话必须满足 4 条（详见 `knowledge/patterns/P015-问PM必用业务语言.md`）：

1. **业务影响必先说**：把 agent 产物（特别是 A2 打回 / A4 触发 A5 / A5 加固 / A7 打回）转给 PM 时**第一段必须用业务语言重新讲述"为什么 PM 应该关注 / 不修会发生什么"**
2. **技术词必括号翻译 / 替换**：agent 产物里的 `import.meta.env.PROD` / `interceptor` / `hostname` 等技术词 · 主对话**必须翻译**才转给 PM（参考 `knowledge/patterns/P015 § 强约束 2` 的 30 词翻译表）
3. **AskUserQuestion 每个 option 的 description 必含业务后果**："如果选 A · 用户 / 客户 / 演示场景会看到/经历什么"
4. **返回 PM 前 grep 自检**：每条问题清单跑一遍 30 词黑名单 · 命中即重写

例外：① 文件名 / 路径 / commit SHA ② PM 自己先用过的术语 ③ 选项 label（label 短 · 详细业务后果放 description）

<!-- LOCKED:END -->

---

## 第 0 步：准备工作目录

1. 如果 `$ARGUMENTS` 为空 → 问用户："请用一句话描述你想加的新功能"
2. 拿到一句话需求后，与用户确认一个 **kebab-case 英文短名**（如 `driver-shift-export`）
3. 创建工作目录：
   ```bash
   TODAY=$(date +%Y-%m-%d)
   SLUG="<用户确认的短名>"
   mkdir -p "product-docs/_drafts/${TODAY}-${SLUG}"
   echo "${TODAY}-${SLUG}" > /tmp/new-feature-current.txt
   ```
4. 在 `product-docs/_drafts/${TODAY}-${SLUG}/00-原始需求.md` 写入用户的一句话原文 + 创建时间（**patch-012：精确到分钟** `date '+%F %H:%M'`——retrospector 算 `包周期_小时` 的起点锚，只写日期则该包周期记 `-`）

---

## 第 1 步：A1 产品专家

调用：
```
Task(subagent_type="product-expert", prompt="
新功能需求：<用户一句话>
工作目录：product-docs/_drafts/<日期>-<短名>/
请按 agent 定义流程：先必读、再现状梳理、再列缺口问题。把缺口问题先返回给我（不要写 v1）。
")
```

A1 会返回缺口问题清单。

### 🚦 Gate 1：与用户多轮 Q&A

主对话把 A1 的问题清单**完整、原样**呈现给用户。等用户答完一轮后：
- 如果还有问题没答清楚 → 再问，不要自己脑补
- 全部答完后，再调一次 A1，传入 Q&A 完整结果，让 A1 写 `01-需求细化.md`

A1 第二次返回时应是 `[A1 完成] 已写入 .../01-需求细化.md`

---

## 第 1.5 步：UI 类需求识别 + A1.5 视觉规范专家（条件性）

### 1.5.0 类型识别（主对话做）

读 A1 产出的 `01-需求细化.md § 〇 需求类型与触及端`：

| 情况 | 触发 A1.5？ |
|---|---|
| 新增页面 / 整页布局重构 | **必触发** |
| 单组件视觉重构（颜色 / 字号 / 间距 / 圆角 / 阴影任一项的非微调改动） | **触发** |
| 纯逻辑改动 + 微视觉修复（< 3 处样式行的局部联动属此类） | **不触发** → 直接进第 2 步 A2 |

A1 § 〇 没显式声明则主对话**主动追问 A1**："本期是否含视觉重构？标准见 § 1.5.0"。

### 1.5.1 PM 提供 demo 原始材料（Gate 1.5 入口）

主对话告知 PM：

> "本期识别为 UI 类需求，需要进入 A1.5 视觉规范专家轮次。请你提供以下任一种原始材料：
> - **A**. 详细文字描述（推荐——最容易反复对齐）
> - **B**. 截图（手画 / Figma 截屏 / 竞品截图，附文字补充）
> - **C**. 高保真链接（v0.dev / lovable / Figma 公开链接）
>
> 提供后我立刻调 A1.5。提不出则**本期改走"不触发 A1.5"路径**，但视觉决策需要在 .active 阶段实时与你拍板（不推荐）。"

### 1.5.2 调 A1.5 第 1 轮（含糊点 + 自行发挥点）

PM 提供材料后：

```
Task(subagent_type="visual-spec-author", prompt="
工作目录：product-docs/_drafts/<日期>-<短名>/
需求方提供的原始材料：<PM 给的文字 / 截图路径 / Figma URL / v0 URL>

请按 agent 定义流程跑【第 1 轮】：
- 必读 visual-baseline/06-token-候选推导.md 等 6 份基线
- 列含糊点 + 自行发挥点清单
- 不要写 HTML，不要写视觉规范
- 第 1 句话用 agent 定义里的标准格式回我
")
```

A1.5 返回含糊点 + 自行发挥点清单。

### 🚦 Gate 1.5a · PM 答疑

主对话把 A1.5 的清单**完整、原样**呈现给 PM。等 PM 答完后，调 A1.5 第 2 轮：

```
Task(subagent_type="visual-spec-author", prompt="
工作目录：product-docs/_drafts/<日期>-<短名>/
PM 答疑结果：<完整答疑列表>

请按 agent 定义流程跑【第 2 轮】：
- 产 attachments/demo/index.html（单文件零依赖）
- 产 01.5-视觉规范.md（10 张表 + 5 条自检）
- 用 mcp__playwright__browser_take_screenshot 自检截图到 attachments/demo/screenshots/baseline-default.png
- 把 Q&A 归档到 attachments/demo/qa-log.md
- 第 1 句话用 agent 定义里的标准格式回我（含截图路径）
")
```

### 🚦 Gate 1.5b · PM 看截图确认

主对话把 `attachments/demo/screenshots/baseline-default.png` 展示给 PM（用 Read 把图本体转给主对话即可），**并附 Loop-3 自评摘要**（patch-009：A1.5 第 2 轮完成句里的"自评 = X 轮收敛 / minor 清单 / major 转含糊点"+ self-critique.md 里的 minor 要点，让 PM 知道截图已过 4 lens 预审、还剩哪些小瑕疵），问：

> "A1.5 已产 demo + 视觉规范，截图见上（已过视觉层级/构图/排版/打磨 4 维自评，自评摘要见上）。
>  - **A**. 通过 → 进入 A2
>  - **B**. 改 X（请具体说明改动点）→ 我让 A1.5 按反馈改完截图 + 产改前/改后对比图（Loop-4），再走一次 Gate 1.5b
>  - **C**. 重做（解读偏离太多）→ 退回 Gate 1.5a 重列含糊点"

可能多轮迭代，直到 PM 选 A。PM 选 B 的后续轮次：A1.5 必须随新截图附 `baseline-<N>-revision-before-after.png` 对比图（PM 一眼复核改没改到位）。

**（patch-012）Gate 1.5b 留痕两件事**：① PM 每轮选 B 后，主对话在 `attachments/demo/qa-log.md` 追加一行 `Gate 1.5b 第 <N> 轮（YYYY-MM-DD HH:mm）：B 改 <要点>`；② PM 选 A 收口时，主对话在 qa-log.md 末尾写 loop-trace 块（`loop_id: Gate1.5b改图`，`轮数` = 选 B 的总次数，0 轮一遍过也要写；式样见 `evals/_loops字段说明.md § 二`）。

### 1.5.3 A1.5 完成后 → 进第 2 步 A2

A2 此时需多审一项："`01.5-视觉规范.md § 一/二/三` 表是否与 `01-需求细化.md § 五 UI 要求` 一致"——主对话在调 A2 时把这项加进 prompt。

---

## 第 2 步：A2 需求逻辑审核

```
Task(subagent_type="requirement-reviewer", prompt="
审核对象：product-docs/_drafts/<日期>-<短名>/01-需求细化.md
请按 10 项硬性清单 + 第 11 项可用性启发式快扫（软闸）审，输出 02-A2-审核报告.md。
")
```

- 结论 = 打回 → 把打回原因告知用户（P1 项按报告里的分诊标注分两类念给用户）：
  - 打回项**全部为【形式类·可自动修】** → 推荐用户跑 `/iterate-A2 <短名>`（A1 修 → A2 重审自动闭环 · 最多 2 轮），用户同意即调
  - 含【决策类·需 PM 拍板】 → 先把决策类问题逐条问用户拍板，拍板结果连同形式类一起回到第 1 步让 A1 重写
- 结论 = 通过（⚠️ 附 N 条可用性警告）→ **【patch-009 强制 · 软闸升 PM】把第 11 项严重度 ≥ 3 的警告原样亮给用户**（每条含：用户会经历什么 + 建议），问用户逐条三选一：
  - **回炉** → 把该条作为修改要求回到第 1 步让 A1 改
  - **我故意的** → 在 02-A2-审核报告.md 该条"建议"列回填"PM 拍板保留 + 理由"，放行
  - **降为 A3 注意事项** → 移入"给 A3 的注意事项"段随包流转
  全部处置完才进第 3 步。**严禁**主对话自行吞掉警告不亮给用户。
  **（patch-012）裁决回填 trace**：处置完后，主对话把 02-A2-审核报告.md 里 A2-软闸 loop-trace 块的 `备注:` 行从"待PM裁决"改为 `回炉<N>/接受<M>`（retrospector 抽进 loops.csv，软闸校准指标的数据源）。
- 结论 = 通过（0 警告）→ 进入第 3 步

---

## 第 3 步：A3 技术方案专家

```
Task(subagent_type="tech-architect", prompt="
工作目录：product-docs/_drafts/<日期>-<短名>/
请先完成 5 项复用扫描，再产出 03-技术方案.md，必须填齐 § 五定量指标。
")
```

A3 返回 `[A3 完成] ... 定量指标：改动 N 文件 / 新增 M 接口 / schema=...`

---

## 第 4 步：A4 范围审核

```
Task(subagent_type="scope-reviewer", prompt="
审核对象：product-docs/_drafts/<日期>-<短名>/03-技术方案.md
请按阈值规则机械判定，输出 04-A4-范围审核报告.md。
")
```

A4 返回三种结论之一：

- ❌ **打回** → 告知用户阻塞原因，问是否回到 A3 重做。回到第 3 步
- 🟡 **触发 A5** → 进入第 5 步
- ✅ **通过** → 跳过第 5 步，直接到第 6 步

---

## 第 5 步：A5 二次校验（条件性）

```
Task(subagent_type="secondary-reviewer", prompt="
触发原因见 04-A4-范围审核报告.md。
请跑 3 条质询路径，输出 05-A5-二次校验报告.md。
")
```

A5 返回三种建议：通过原方案 / 拆分 / 延后。

### 🚦 Gate 2：A5 后必须停下等 PM 决策

主对话把 A5 的"最终建议 + 给 PM 的决策提示"**完整呈现**给用户，问：

> "A5 建议 = <X>，你倾向哪条？
>  A. 接受 A5 建议（拆分 / 延后）
>  B. 坚持原方案（请说明业务上为什么必须这样）
>  C. 让 A3 按 A5 拆分建议重写一版"

等用户明确选择后再继续。如选 A 或 C → 回到第 3 步重跑 A3；如选 B → 进入第 6 步。

---

## 第 6 步：A6 测试用例专家

```
Task(subagent_type="test-case-author", prompt="
工作目录：product-docs/_drafts/<日期>-<短名>/
请基于 01 + 03（或 A5 调整后版本）产出 06-用例.csv 与 06-用例说明.md。

【UI 类需求附加】（仅当 _drafts 目录存在 01.5-视觉规范.md 时）：
- 多读 01.5-视觉规范.md § 〇/一/二/三/四/五/六/八/十一
- 多读 attachments/demo/qa-log.md（理解视觉决议背景）
- 用 mcp__playwright__browser_navigate 跑 attachments/demo/index.html 确认实际渲染
- 06-用例.csv 必含 [VR] 视觉回归用例 ≥ 30%
- [VR] 子类必齐：主流程截图 + 5 态截图（success/loading/empty/error/permission）+ token 一致性 + 多断点（如 § 五 登记）
- 完成后第 1 句话格式：[A6 完成 · UI类] CSV = ...，[VR]=M 占 X%，demo 渲染验证 ✅
")
```

---

## 第 7 步：A7 用例审核

```
Task(subagent_type="test-case-reviewer", prompt="
审核对象：06-用例.csv + 06-用例说明.md
工作目录：product-docs/_drafts/<日期>-<短名>/

请按 12 项清单审 Pass1 + Pass2 + Pass3，输出 07-A7-用例审核报告.md。

【UI 类需求附加】（仅当 _drafts 目录存在 01.5-视觉规范.md 时）：
- 多审 Pass4 视觉规范对齐（[VR] 用例与 attachments/demo/screenshots/baseline-*.png + 01.5 § 一/二/三/八 一致性）
- [VR] 占比 ≥ 30% 是 Pass2 硬指标
- [VR] 用例 evidence_required 必含 screenshot
- 完成后第 1 句话格式：[A7 完成 · UI类] ... Pass4=✅/❌，[VR] 占比 = X%
")
```

- 打回 → 回到第 6 步
- 通过 → 进入打包前 gate

---

## 🚦 Gate 3：PM 最终确认

把 `_drafts/<日期>-<短名>/` 目录树列给用户：

```bash
ls -la product-docs/_drafts/<日期>-<短名>/
```

然后告诉用户：

> "7 个 agent 全部通过。即将调 `.claude/skills/generate-research-deliverable/SKILL.md` 把这些产物落地为 .draft 交付包。
>  - 是否需要先创建一个 CHG-XXX 变更登记？（新接口 ≥ 1 通常需要）
>  - 是否使用今天的日期作为 .draft 包前缀？
>  - 确认后回复 `打包`，我会调 skill 落盘。"

等用户回复 `打包` 之后再进入第 8 步。

---

## 第 8 步：打包为 .draft 研发交付包（最终交付物）

> ⚠️ 这一步是流水线的**唯一目的**：把前 7 步的所有产物聚合成 Codex 拿到就能干活的 `.draft` 包。

主对话**手动**按 `.claude/skills/generate-research-deliverable/SKILL.md` 的步骤执行：

### 8.1 读 skill 与模板
```bash
cat .claude/skills/generate-research-deliverable/SKILL.md
ls deliverables/_template/    # 12 个根文件 + test-cases-snapshot/ + attachments/
```

### 8.2 单 active 同时性预检
```bash
ls deliverables/ | grep '\.active$' | wc -l    # 必须 ≤ 1（hotfix 独立）
```
若已有 active 包 → 提示用户："当前有 active 包 `<名>`，本次只能做成 `.draft`，待其 done 后才能 promote。"

### 8.3 创建 .draft 包
```bash
SLUG="<同 _drafts 目录的短名>"
CHG="<CHG-XXX 编号，无变更则用 OPT-XXX/FIX-XXX>"
TODAY=$(date +%Y-%m-%d)
PKG="deliverables/${TODAY}-${CHG}-${SLUG}.draft"
cp -R deliverables/_template "$PKG"
```

### 8.4 内容映射（5 类输出物 → 12 个根文件 + UI 类附加 1.5 类）

| 来源（`product-docs/_drafts/<日期>-<短名>/`）| 目标（`.draft/`）|
|---|---|
| `00-原始需求.md` | `attachments/00-原始需求.md` |
| `01-需求细化.md` § 〇/一/四/五 | `03-PRD片段.md`（冻结）|
| `01-需求细化.md` § 〇 触及端 + 类型 + 是否触动核心架构 | `01-需求范围与边界.md` § 一/二 |
| `03-技术方案.md` § 〇 级别 + § 三 白黑名单建议 | `01-需求范围与边界.md` § 三/四（白黑名单）|
| `03-技术方案.md` § 一/二/六（按 L1/L2/L3 不同深度）| `04-接口契约.md`（接口部分）+ `01-需求范围与边界.md` § 五（施工注意）|
| `03-技术方案.md` § 五 子仓 AGENTS.md 约束 | `01-需求范围与边界.md` § 六（研发施工注意）|
| `04-A4-范围审核报告.md` | `attachments/04-A4-范围审核报告.md`（备查）|
| `05-A5-二次校验报告.md`（如有）| `attachments/05-A5-二次校验报告.md`（备查）|
| `06-用例.csv` | `test-cases-snapshot/<本期模块>.csv`（按模块分文件）+ 在 `05-用例清单.md` § 二/三引用 |
| `06-用例.csv` 与现有 CSV 的"作废 / 修改 / 新增" | `05-用例清单.md` § 四（本期增删改登记）|
| `06-用例说明.md` § 四 关键证据 | `06-验收标准.md`（5 类门槛 + 9 项硬检查的证据要求段）|
| `07-A7-用例审核报告.md`「通过时提示」| `06-验收标准.md`（补充提示段）|
| 当前生效基线版本 + commit SHA | `02-基线快照.md` |
| 用户输入的里程碑 / 期望日期 | `07-时间与里程碑.md` |
| `99-状态.md` | 初始化为 `draft` 状态 |
| `08-修复历史.md` | 保持空 append-only 文件 |
| `AGENTS.md`（包级铁律 from _template）| 不动 |
| `00-给Codex的导读.md`（详细操作手册 from _template）| 不动 |
| **UI 类附加（仅 _drafts 含 01.5 时）** | |
| `01.5-视觉规范.md` | `01.5-视觉规范.md`（包根；冻结）|
| `attachments/demo/index.html`（+ 多断点 / 多态 .html） | `attachments/demo/index.html`（包内整目录复制）|
| `attachments/demo/screenshots/baseline-*.png` | `attachments/demo/screenshots/baseline-*.png`（保持文件名）|
| `attachments/demo/qa-log.md` | `attachments/demo/qa-log.md`（视觉决议归档）|
| 06-验收标准.md V1-V5 视觉门槛 + 14 项硬检查 | 由 _template/06 模板自带，UI 类需求不删 V1-V5 段 |
| 非 UI 类需求（_drafts 无 01.5）打包时 | **删除** `.draft/01.5-视觉规范.md`（_template 自带的空模板）+ **删除** `.draft/06-验收标准.md § 六.5 / § 七 V1-V5` 段 |

### 8.5 snapshot 元数据
```bash
cd "$PKG/test-cases-snapshot"
echo "起包时间: $(date -Iseconds)"        > _快照元数据.md
echo "源 commit: $(cd ../../code/<仓库名> && git rev-parse HEAD)" >> _快照元数据.md
shasum -a 256 *.csv | cut -c1-12  >> _快照元数据.md
```

### 8.6 完整性自检（缺一项不允许收尾）

```bash
# 12 个根文件齐
ls "$PKG"/*.md | wc -l    # 应 ≥ 11（10 个数字命名 + AGENTS.md + 99-状态.md）

# AGENTS.md 与导读存在
[ -f "$PKG/AGENTS.md" ] && echo "✅ AGENTS.md"
[ -f "$PKG/00-给Codex的导读.md" ] && echo "✅ 导读"

# snapshot 非空
ls "$PKG/test-cases-snapshot"/*.csv

# 02 基线快照已填实际值（非占位）
grep -q "TODO\|TBD\|<.*>" "$PKG/02-基线快照.md" && echo "❌ 02 还有占位" || echo "✅ 02 已填"
```

### 8.7 状态机初始化
打开 `$PKG/99-状态.md` 写入：
```md
- 当前状态：draft
- 创建时间：<TODAY>
- 创建人：产品方（via /new-feature）
- 关联 _drafts：product-docs/_drafts/<日期>-<短名>/
- 7 agent 通过情况：A1✅ A2✅ A3✅ A4✅ A5(✅/跳过) A6✅ A7✅
```

### 8.8 收尾告知用户

```
✅ .draft 研发交付包已生成：deliverables/<TODAY>-<CHG>-<短名>.draft/

包内容映射（5 类输出物全部就位）：
1. 产品方案 / 需求细化     → 03-PRD片段.md + 01-需求范围与边界.md
2. 详细技术方案（L<X>）    → 04-接口契约.md + 01 § 五施工注意
3. 测试用例                → 05-用例清单.md + test-cases-snapshot/*.csv
4. 巡检报告 / 复用扫描     → attachments/04-A4-范围审核报告.md（+ A5 如有）
5. 给 Codex 的施工图       → AGENTS.md + 00-给Codex的导读.md（_template 自带）

下一步：
1. PM 检查包内容，特别是 03-PRD片段.md / 04-接口契约.md
2. 如需修补：直接编辑 .draft 包内文件（不要回到 _drafts 目录改）
3. 检查通过 → 调 .claude/skills/promote-deliverable/SKILL.md 升 .draft → .active
4. 然后调 .claude/skills/write-fix-prompt/SKILL.md 生成给 Codex 的派活提示词
```

---

## 第 9 步：retrospect & 沉淀（仅当本次是从 .active → .done promote 后触发）

> ⚠️ 本步骤**不在打包阶段触发**——`/new-feature` 主流程在第 8 步 `.draft` 创建后即结束。
> 第 9 步在 **PM 把 `.active` 升 `.done`** 时由 `promote-deliverable` skill 调起，或 PM 手动跑 `/retrospect <包名>`。
>
> 流水线只有跑到 `.done` 才能拿到 `Codex_轮次` / `Codex_QUESTION数` / `实际改动文件数` 等下游指标，所以 retrospect 必须延后到 `.done`。

执行内容（由 `pipeline-retrospector` agent 完成，主对话只调一次 Task）：

```
Task(subagent_type="pipeline-retrospector", prompt="
本次刚 promote 到 .done 的包：deliverables/<日期>-<CHG>-<短名>.done/
关联 _drafts 目录：product-docs/_drafts/<日期>-<短名>/

请按 agent 定义流程：
1. 抽取 22 列指标（v1.1 · 含 交付路径/A5_PM裁决/包周期_小时/patch水位），写到 .done 包内 99-状态.md § 六（机器可读 yaml 段）
2. 追加 1 行到 evals/runs.csv，并跑 bash scripts/validate-evals-csv.sh runs --last
3. grep _drafts 全部 loop-trace 块 → 逐块追加到 evals/loops.csv（缺失的在反思报告记录），并跑 validate loops --last
4. 追加 1 行到 knowledge/cases.csv
5. 产出 1 份 optimization/patches-pending/<包名>.md（反思 + 候选补丁 + 候选范例）
6. 第 1 句话格式：[retrospect 完成] 包=<包名>，runs.csv=+1（22列校验✅），loops.csv=+N，cases.csv=+1，patches-pending=+1
")
```

retrospector 完成后告知 PM：

> "本期 retrospect 完成。已沉淀：
>  - 1 行 evals/runs.csv（22 列指标 · 校验通过）
>  - N 行 evals/loops.csv（Loop 收敛留痕）
>  - 1 行 knowledge/cases.csv（业务标签 + 决策摘要）
>  - 1 份 optimization/patches-pending/<包名>.md（待 /optimize-prompts 月更时审）
>  
>  下一步建议：
>  - 周末跑 `/pipeline-review` 看本周累积趋势
>  - 累积 ≥ 5 个 patches-pending 后跑 `/optimize-prompts` 改 agent prompt"

---

## 中断与恢复

- 任何阶段用户说"停" → 立即停下，告知当前 `/tmp/new-feature-current.txt` 里记录的工作目录，下次可以从该目录继续
- 任何 agent 报错 → 把错误原文告知用户，问是重试还是回退一步

## 不允许的事

- ❌ 跳过任何 gate 自动继续
- ❌ 把多个 agent 合并到一次 Task 调用
- ❌ 自己写 agent 该写的产物
- ❌ A4 触发 A5 时自己尝试做 A5 的活
