# CLAUDE.md · 主对话开场必读（项目无关骨架版）

> 此文件由 Claude Code 在工作空间根目录自动加载到主对话上下文。每次启动新对话**必读**。
> 本文件是**骨架模板**：项目专属经验（LOCKED 段）初始为空，由 `/init-project` 梳理后逐步填入。

---

## 🔰 首次使用检测（每次开场先做这一步）

主对话开场先快速判断本工作空间是否已初始化：

```bash
grep -q "未初始化 · 待 /init-project" PROJECT-PROFILE.md && echo "FRESH" || echo "READY"
```

- 结果 = `FRESH`（`PROJECT-PROFILE.md` 还是占位）→ **这是一套没接项目的空白骨架**。主对话**必须先停下**，对用户说：

  > "检测到这是一套全新的流水线骨架，还没接入任何项目。在开始之前，我需要你提供一些**前置准备信息**：
  >  1. **代码仓库地址**（git URL）+ 凭据方式（SSH / token / 已配好）
  >  2. **拉取分支**（我从哪条分支拉只读快照，例 `main` 或 `release/*`）
  >  3. 是否需要**双向分支隔离**（拉一条分支、推另一条，只推交付包；不需要就直接推 / 不推）
  >  4. 项目名 + 一句话定位
  >  5.（可选）验收环境：前端/后端地址、测试账号、是否可写库
  >
  >  把以上信息给我后，我会运行 `/init-project`：先把代码拉到 `code/`，**主动梳理**出你项目的【核心架构黑名单】【领域术语表】【技术栈/端结构】候选，然后**逐项问你确认**，确认后才写入 `PROJECT-PROFILE.md`。
  >
  >  现在请先提供上面 1~4 项（5 可稍后）。"

  **未初始化前，不允许直接跑 `/new-feature`**（agent 会因 PROJECT-PROFILE 是占位而无法判定核心架构/领域术语）。

- 结果 = `READY` → 正常进入工作，按下方约束执行。

---

## ⚠️ 立场（每次启动重申）

- 本工作空间**从不修改 `code/`**——code/ 是从研发拉的**只读快照**
- 流水线最终产物是 **`deliverables/.draft/` 包**——给研发/Codex 的施工图
- **巡检范围 = 全端**（端清单见 `PROJECT-PROFILE.md § 五`）
- 黑名单 = **核心技术架构**（清单见 `PROJECT-PROFILE.md § 三`，动这些必须走变更登记）
- 流水线 **8 个 agent**：A1 产品 / A1.5 视觉规范（仅 UI 类）/ A2 需求审 / A3 技术 / A4 范围审 / A5 二次校验（仅 A4 触发）/ A6 用例 / A7 用例审

---

## ⚠️ P007 · 约定必须实证驱动（通用铁律 · 骨架自带）

> ⚠️ 编号澄清（patch-011）：本段的 "P007" 沿用主仓编号，与本骨架 `knowledge/patterns/P007-Codex派活提示词必生成.md` 是**两条不同规则**（历史撞号）。两套编号互译以 `knowledge/patterns/_编号映射.md` 为唯一权威。

**核心约束**：任何"代码相关的约定 / 实体命名 / 字段命名 / 架构假设"必须三选一：

| 选项 | 适用 | 落地要求 |
|---|---|---|
| **A. 实证驱动**（推荐）| 已 sync code/ | 先 grep 真实代码 + 标 commit SHA → 写入约定 |
| **B. 标推测** | 还没 sync / 没接触实物 | 约定文本显式标 `🔍 推测 · 待 sync 后回填` · 不写"严禁/必须"强约束 |
| **C. 触发差异登记** | 已发现差异 | 立即登记 + 标优先级 + 裁决截止 ≤ 14 天 |

> 这是某历史项目实战提炼的**通用方法论**，保留在骨架里。它的反面教训（凭经验划等号导致返工）适用于任何项目。

---

## 🗂 工作空间结构速览

| 目录 | 用途 |
|---|---|
| `PROJECT-PROFILE.md` | **项目唯一配置源**（git/技术栈/核心架构黑名单/领域术语/验收环境）|
| `product-docs/` | PRD + baseline（变更/差异/版本登记）+ `_drafts/` 流水线中间产物 |
| `code/<仓库>/` | **只读快照**（不修改 · git 仅 fetch/checkout/diff）|
| `deliverables/` | `.draft` / `.active` / `.done` / `archive/` 包 + 提交记录 |
| `test/` | 测试用例 / 自动化资产 / 执行记录 |
| `knowledge/` | patterns / cases / graph（知识图谱沉淀）|
| `optimization/` | patches-pending/applied + agent-versions.json |
| `evals/` | runs.csv / regression-set / weekly 周报 |
| `.claude/` | agents（11）/ skills（23）/ commands（9）/ **workflows**（命名动态工作流 `gen-cases`·`gen-cases-spec`·`coverage-audit`，由 /init-docs、publish-baseline 调用）+ settings.json（deny + hooks 三件套）|
| `product-docs/modules/` | **存量现状文档**（每模块 6 件套 · /init-docs 产出 · 长期演进）|

---

## 🚦 关键流水线入口

- **初始化新项目**：`/init-project`（首次接入用 · 收集前置信息 + 梳理代码 + 确认后写 PROJECT-PROFILE）
- **存量文档基建**：`/init-docs`（接入后跑一次，可分批续跑 · 模块拆分 Gate D1 → 每模块 6 件套 + Gate D2 裁决 → test-cases/<模块>.csv · 产物是 /new-feature 的上游事实源 · 收口走 publish-baseline《场景 B · docs-only》）
- **新需求**：`/new-feature <一句话>` → 8 agent 流水线 + 5~6 Gate
- **包升级**：`promote-deliverable`（.draft → .active → .done → archive）
- **周报**：`/pipeline-review`
- **prompt 月更**：`/optimize-prompts`（合并 patches-pending → agent .md）
- **巡检 active 包**：`/babysit-active`

---

## 📌 关键约束（项目无关，初始化后生效）

1. **从不修改 `code/`**（只读快照）
2. **并行规则 · D1-D5 冲突自检**（多 .draft 并行无上限 · 命中 D1-D4 任一 = 禁并行）：
   - **D5 single-active 闸保留**：同一时刻最多 1 个 .active 包（hotfix 独立）· dev-verify smoke（P005）/ 用户灰度主观体验（P013）独占灰度环境 · 多 .active 同时验收会互相污染
   - **多 .draft 并行无上限**（前提：通过 D1-D4 冲突自检）
   - **D1-D4 任一命中 = 禁并行**：D1 修改白名单文件交集 / D2 核心架构同项触动（见 PROJECT-PROFILE.md § 三）/ D3 schema 同表 / D4 OpenAPI 同路径
   - **判定流程**：开新对话前必跑 `pre-parallel-check` skill · 5 维度自检后输出 ✅ 完全独立 / 🟡 仅 D5 排队 / ⛔ 禁并行 三档
   - 完整模式见 `knowledge/patterns/P019-多包并行D1-D5冲突自检.md`
3. **核心架构黑名单**（见 `PROJECT-PROFILE.md § 三` · 动这些必须走变更登记）
4. **业务侧提交流程**（见 `PROJECT-PROFILE.md § 二` · 是否双向隔离按项目定）
5. **append-only**（deliverables/提交记录.md / 各包 08-修复历史.md / evals/runs.csv / knowledge 各 csv 只追加）
6. **升 .done 必同步 retrospect 落 runs.csv + loops.csv + cases.csv（默认执行）**：任何包升 `.done`（含 /new-feature 第 9 步 / promote-deliverable B-后置 / 手动追认）都必须当场补 runs.csv **22 列（v1.1 · `交付路径` 必填 · append 后跑 `scripts/validate-evals-csv.sh`）** + loop-trace 块逐条落 loops.csv + cases.csv 9 列 · 缺它 = 周报漏审 · `/pipeline-review` 第 1.5 步 + pipeline-evaluator 必检项兜底；**灰度/线上发现已交付包缺陷 → 当场登 `evals/escapes.csv`**（patch-012 双账本 · 详见 `evals/_escapes字段说明.md` + `_loops字段说明.md`）
7. **升 .done 后跑 dev 灰度 smoke 验证（默认执行 · best-effort 不阻断）**：任何包升 `.done` 都应跑 `/dev-verify <PKG>` 确认 dev 灰度功能真落地 · 用 `dev-gray-deep-verify` skill（自动 captcha + UI 登录 + 截图）· 失败 ⚠️ 写入 99-状态 § 验收痕迹但不回滚 · 完整模式见 `knowledge/patterns/P005-dev灰度smoke验证.md`
8. **P013 LOCKED · PM 灰度主观体验 5 分钟过一遍（默认建议 · 与 P005 并列）**：任何包升 `.done` 后 · 即使 P005 dev-verify 通过 + 全量回归 100% + 0 blocker · PM 仍应**亲自在 dev 灰度环境 5 分钟体验核心场景**（小屏 + 大屏各开一次 · 切换 2 个常见过滤态 · 触发 1 个边界态）· 写主观体验摘要到 99-状态 § 五（✅ / ⚠️ / 🚨 三档）· 发现 P0 阻断 → 立即开 followup · 主对话在 `.done` 升级后**主动提醒** PM 跑 P013。教训：自动化 100% PASS · 但 PM 灰度实拍发现新问题（流水线"自进化"的根本输入）· 完整模式见 `knowledge/patterns/P013-PM灰度主观体验5分钟过一遍.md`
9. **P010/P011/P012 LOCKED · 流水线深层防御（通用方法论 · 2026-05-27 新增）**：
   - **P010**（A1+A3+A6+A7）· 硬编码 fallback 数据源 grep 自检（`_DATA / MOCK_ / FALLBACK_ / DEFAULT_` 模式）+ `[REGRESSION-REVERSE]` 反向回归用例（A→B→A 模式）
   - **P011**（A1.5+A6+A7）· 视觉规范禁用模糊形容词（胶囊/气泡/椭圆/...）+ BAD vs GOOD 对比图 + 整页 2 断点 demo
   - **P012**（A1）· 数据层过滤需求必有 UI 联动 4 要素（标题/placeholder/视觉标识/聚焦）
   触发包：实战中"8 agent 全过 + 全量回归 100% + 但 PM 实拍发现新问题"反思 · 5 agent prompt 新增 7 处 LOCKED 段
10. **P014 LOCKED · UI 文案语义一致性校验（通用方法论 · 2026-05-28 新增 · 灰度首次实战触发类 BUG 防护）**：
    - **P014**（A1+A6+A7）· UI 文案 "近 N 天" / "Last N days" / "本周" / "Top N" 等含数字 / 范围的预设按钮 · A1 § 4.3.x 必产 LOCKED 表（4 列 · 含 semantic 类型 rolling/calendar/point-in-time/event-based · 行业事实标准）· A6 必产 `[BV-LABEL]` 用例 ≥ 3（与 [BV] 区别：UI 文案语义边界 vs 经典边界值）· A7 Pass2 触发判定 + property-based test (`@fast-check/vitest`) INFO 推荐
    - **触发包**：实战中"8 agent 全过 + 25 用例全过 + dev-verify 通过 + 9 硬检查通过 + 全量回归 100% PASS → 仍漏 30+ 天"反思 · PM 灰度 5 分钟主观体验首次点 preset 按钮才触发
    - **长期工程方案**（推荐 · 不在 prompt LOCKED 内）：L1 工程层 TypeScript discriminated union + readonly const PRESETS[] · L2 测试层 @fast-check/vitest property-based test 覆盖 4000+ 边界日 · 工程层落地后 A7 P014 LOCKED 可降级为 INFO 提醒
11. **P017+P018 LOCKED · "验证冲突写 PRD" 反模式防护（通用方法论 · 2026-05-28 新增 · A1 阶段实证驱动 + 信息冗余检测）**：
    - **P017**（A1 § 2.y）· **PRD 假设实证驱动** · A1 拿到 PM 原始 PRD 后必跑 4 步：提取假设句（"复用 X" / "X 字段已存在" / "X 直接复用 Y"等）→ grep 验证 → 产"PRD 假设核验"表 → 任一冲突 Gate 1 抓出来让 PM 拍板。**严禁照抄 PM PRD 描述就开始写需求细化**
    - **P018**（A1 § 2.z）· **信息冗余检测** · 凡 PM 描述含"列表+时间线" / "卡片+抽屉" / "概览+详情" / "主区+底部辅助区" / "多 Tab 同数据集" 5 类组合 · A1 必产"数据流冗余核验"表 · 是否同源=是 → Gate 1 必问"PM 是否真要保留两份渲染"
    - **触发场景**：流水线 8 agent 全过 + 自动化 100% PASS · 但 PM PRD 中的假设与代码现状漂移时 / PM 默认"两份都保留"+ 研发默认"按 PRD 实现两份" → BUG / 信息冗余流到生产
    - **与之前 LOCKED 关系**：P017 是 P007（通用铁律）在 A1 阶段的执行步骤本地化 · P018 与 P012/P014 共构 UI 类需求三层防御
    - **行业最佳实践对照**：Hypothesis-Driven Development（Etsy/Spotify）· Information Architecture Audit（Nielsen Norman Group）
12. **P020+P021 LOCKED · 可渲染必可验证 + 跨端数据流契约（通用方法论 · 2026-06-05 新增 · 地图/canvas 渲染缺陷复盘）**：
    - **核心立场**：渲染缺陷（如脊线没画出来）是**验收盲区，不是需求没写清** → 防御火力在**测试用例 + 验收流水线**，**不在 A1/A3 拦截需求/方案设计**
    - **P020 可渲染必可验证**（火力重心 = A6 + 验收框架）· A6 对每个 overlay 产 `[MAP]` 用例（存在+数量+几何坐标 · **严禁 `[VR]` 截图替代**）· 独立验收框架 `acceptance-regression` 加 `@map` 断言能力（真实 DOM `data-*` 钩子）· 钩子缺失 = **test-blocker**（测试前置条件/验收对接项 · **非设计否决**）· A1 §2.u 仅"渲染元素清单"轻量输入 · A1.5 demo 落 data 钩子 · P013 M1~M5 灰度兜底
    - **P021 跨端数据流契约** · A1 §2.v 识别写入端↔读取端 · "非同源(重建)"→ **唯一保留的设计动作 = Gate 1 问 PM"两端是否应一致"（产品决策）**· 一致性靠 A6 round-trip 用例兜，**A3 不设方案硬闸**
    - **分工铁律**：设计阶段"想清楚要什么"，测试/验收阶段"确认做对没有"。渲染缺陷属后者
    - **改动**：P020/P021 pattern + A1 v1.3（撤硬闸只留跨端问 PM）+ A3 v1.2（撤硬闸改建议）+ A6 v1.2（加厚 [MAP]+round-trip）+ A1.5 v1.1 + P013 M1~M5 + L2 skill `acceptance-regression` § 九 `@map` 断言
13. **文档命名空间引用规则（通用方法论 · 2026-06-11 新增 · /init-docs 上线随附）**：`product-docs/modules/`（存量现状 · 长期演进）≠ `product-docs/_drafts/`（单需求过程稿）≠ `deliverables/*/`（交付包冻结快照）——三套编号各自独立，**引用文档必须带路径，禁止裸说"06 文档"**。
14. **升 .done 三件回流（通用方法论 · 2026-06-11 新增 · 与 P004 retrospect 并列执行 · promote-deliverable 后置）**：任何包升 `.done` 时必须同步 ① 包内用例增删改合并回 `test/test-cases/<模块>.csv`（`baseline_version` 标记来源）② 行为变化回写 `modules/M0X/01-功能说明 § 演进记录` + `04-业务规则` 现状 ③ 新页面/路由/接口补 `modules/M0X/02-对照矩阵`。**缺任一 = 存量基线开始漂移，下个需求 A1 读到旧事实**。
15. **P015 LOCKED · 问 PM 必用业务语言（通用方法论 · 2026-05-28 新增 · 骨架默认开启 · 原误标 11 与 P017+P018 条撞号 · patch-014 修正）**：
    - **P015**（A1 + A1.5 + A2 + A3 + A4 + A5 + A7 + 主对话）· agent 向 PM 提任何问题清单 / 打回原因 / Gate 决策必满足 4 条：① 业务影响必先说（"用户/客户/演示场景会看到/经历什么"）② 技术词必括号翻译（30 词黑名单翻译表）③ A/B/C 选项必各带业务后果 ④ 返回前 30 词技术黑名单 grep 自检 ≤ 0
    - **触发包**：实战中"agent 给 PM 的问题清单大量塞 `import.meta.env.PROD` / `interceptor` / `hostname` 等技术黑话 · PM 看不懂 · 决策卡住或拍错"反思 · 7 agent prompt + new-feature command 全部加 LOCKED 段
    - **覆盖范围**：骨架默认开启 · 所有新项目无需 init 即生效
16. **结构性收口 + 防御栈（patch-014 · 主仓 harness 加固同步 · 2026-06-12）**：编号一律 `bash scripts/next-id.sh`（禁自算 · 主仓撞号 5 案例后机器化）；包状态变更一律 `bash scripts/promote.sh`（禁直接 mv · GATE-D5/GATE-RETRO/GATE-ARCHIVE 三闸 · **runs.csv 先落账后升 .done** · mv 后自动 append 99-状态 § 二 机器时间戳留痕）；业务侧推送一律 `bash scripts/git-biz-push.sh`（五项自检内置）；密钥一律 `source scripts/load-secrets.sh`（仓内禁写密码本体）。三层防御：① 收口脚本（L1 结构性消除）② `scripts/git-hooks/pre-push` 硬闸（L2 · `/init-project` 时 `git -C code/<仓> config core.hooksPath <工作空间>/scripts/git-hooks` 挂入**双向隔离仓**（可直推 main 的仓不挂）· G1 推送分支白名单制 / G2 镜像路径白名单 / G3 派活提示词存在性 · 对本机所有 push 主体生效）③ `.claude/settings.json` deny 11 条 + CC hooks 三件套（L4 · guard-bash 拦绕过收口的 mv/mkdir / post-csv-validate 写后 schema 校验 / session-start-brief 开场简报 + .done↔runs.csv 名字级对账）。**hooks 是必然执行，CLAUDE.md 是大概率听话——机械约束一律下沉到脚本层，prose 只留判断型约束**；脚本头部 ⚙️ 参数区由 `/init-project` 按 PROJECT-PROFILE § 二 填充
17. **打包 / 升 .active 前跑交付包终审（通用方法论 · 2026-06-16 新增 · best-effort 不接 hook）**：`.draft` 包打完（new-feature 第 8.6b 步）及升 `.active` 前，跑 `bash scripts/deliverable-final-check.sh <包目录>` 做**跨产物勾稽**——补流水线唯一结构性盲区：A2/A4/A7 各审一份产物、8.6 只机械查文件齐不齐，**没人审 11 个文件拼一起是否自洽**（接口清单↔详细契约、必过用例↔snapshot/登记、视觉门槛↔包类型、CHG 编号三处一致）。拦的是 `evals/escapes.csv`"全过仍漏"那一档（跨产物/集成级缺陷），把它从 PM 灰度左移到打包前。对齐 P007 只做客观勾稽不打主观分；与 dev-verify(P005)/PM 灰度(P013) 不重叠（那俩审"代码照做没"，本闸审"材料说清楚没"）。`exit 1` = 有 BLOCKER 别交 Codex；检查项见 `deliverables/_交付包终审清单.md`，自测在 `scripts/selftest.sh § G`

---

## 📎 本项目专属 LOCKED 经验（初始为空 · 越用越多）

> `/init-project` 完成后，把本项目实战沉淀的 LOCKED 经验追加到这里（对齐某历史项目工作空间 CLAUDE.md 的 P004/P006/P008/P015 等做法）。
> 通用方法论 P007（上方）+ P001/P002/P003/P004/P005/P006（见 knowledge/patterns/）随骨架自带，其余由本项目长出。

> 以下为**占位示例**一条，演示条目格式；接入后由本项目 `/init-project` / `/init-docs` 实际填充，多条按时间追加（append-only）。

- **<日期> 项目接入完成（示例）**：`<项目名>`（`<一句话定位>`）@ `<SHA>`（`<拉取分支>`）。git 约定 = **<只拉不推 / 双向隔离>**（PM 确认）；凭据在 `<凭据方式>`，**密码不落任何文件**。核心架构黑名单 `<N>` 项 / 领域术语 `<N>` 对（如 `<角色1>`/`<角色2>`/`<角色3>` 三角色）/ 视觉基线（`<白名单色系>` · `<密度风格>` · `<组件库取舍>`）均经 PM Gate 确认，见 `PROJECT-PROFILE.md` 与 `product-docs/visual-baseline/`。<台账新增 DIFF-00x / CHG-00x、PROJECT-PROFILE § x LOCKED 留痕修订（`<裁决项>`）、遗留观察留册待裁等，按本项目实际填充。>
