# 流水线优化方案 v1.1 · 可视化 / 双轴适配 / 产测分工

> **文档性质**:战略级优化路线图(roadmap)。**不是** `optimization/` 补丁生命周期里的 `patches-pending` 条目——本文规划的 agent prompt 改动,落地时仍**逐条走 `/optimize-prompts`**(版本 bump + LOCKED 锚点校验 + regression-set 回归 + CHANGELOG 留痕),非 prompt 的结构性改动(字段/脚本/看板)走常规变更登记。
>
> | 字段 | 值 |
> |---|---|
> | 版本 | **v1.1**(草案 · 待 PM 评审 · 在 v1.0 基础上经多代理交叉验证修订) |
> | 日期 | 2026-06-16 |
> | 作者 | PM(hyukminpark)· v1.1 修订基于专业评审 |
> | 前序版本 | `archive/UPGRADE-PLAN-v1.0.md`(v1.0 · 评审原始件 · 已归档,本 v1.1 取代) |
> | 适用骨架 | claude-product-pipeline(项目无关骨架版) |
> | 关联文件 | `CLAUDE.md` · `PROJECT-PROFILE.md` · `.claude/commands/init-project.md` · `.claude/commands/new-feature.md` · `.claude/agents/product-expert.md` · `.claude/agents/requirement-reviewer.md` · `.claude/agents/visual-spec-author.md` · `acceptance.config.template.json` · `.claude/skills/acceptance-regression/lib/acceptance-report.mjs` · `knowledge/methodology/` |
> | 编号约定 | 本文不自算编号;落地拆包时一律 `bash scripts/next-id.sh` 分配(遵守骨架"禁自算编号"铁律) |

---

## 0. v1.1 修订说明(相对 v1.0 的 delta · 评审留痕)

v1.0 方向专业、对骨架纹理理解到位,核心三决策(双轴正交 / 只读控制塔 / 逻辑拆-物理不拆)经核实**全部成立**。v1.1 不推翻方向,只做三件事:**修掉 3 个实质缺陷(M1–M3)、按"先便宜后贵、跟真实使用信号走"重排路线图、订正若干事实小错**。

| 编号 | v1.0 的问题 | v1.1 的修法 | 落在 |
|---|---|---|---|
| **M1** | §4.2.1 平台探测表是**无优先级平铺查表**,标"机械判定";RN 仓会同时命中 native-ios+native-android+rn,且 init-project 既有 web 探测(grep `react\|vue`+`.tsx`)对 RN 也触发——撞 §9 验收线 | 表降级为**提名信号(非机械判定)**+ 增一条**有序消解规则**(先判 `react-native`/`pubspec.yaml`,短路 native-* 与 legacy web) | §4.2.1 |
| **M2** | §4.3.2 把 Maestro→results.json 归一化器卖成"零重写",标"中"成本。实测引擎死耦合 Playwright 嵌套 suite/test 树 + 从路径/annotation 现编 module/layer/priority/role,Maestro 这些一个都不产 | 改述为**项目耦合的适配器工程**(须重建 PW 形状树 + 逐 flow 注入元数据),成本标号 **中→高**,路线图压到最后一波;能力矩阵订正 @map 原生不可承载格 | §4.3.2 · §6 · 附录A |
| **M3** | 看板把 Gate 1.5a/1.5b **渲染成瞎子**(`gates{}` 只种死 gate1/2/3);且看板/能力矩阵/agent→业务名映射无 owner/无测试/无版本,与骨架"机械约束下沉脚本"铁律相悖 | new-feature 种入 `gate1_5a/gate1_5b` 键 + 字段 validator;看板/映射表配 **owner + 快照测试 + 版本钉**;加一条 CI 断言(凡 orchestrator 会停的 gate 必在 `gates{}` 有键) | §3.4 · §3.5 · §7 |
| **S1(战略)** | 全文在一条**从未跑过一次**的流水线上做优化(零 `pipeline-state.json` 实例、三张 CSV 全是表头、`deliverables/` 空)。"数据 90% 已存在"实为"90% 的 schema 已存在" | TL;DR 与 §3 诚实重述就绪度;路线图为每一波加**「启动信号」列**——贵的部分(看板/归一化器/新卡片)必须等真实 run 数据 / 真实原生项目接入才做 | §0.1 · §3.2 · §6 |
| 小修1 | §3.5 时间戳 enrich 被误归"可选脚注",其实是 Tier-0 招牌功能("agent 耗时 vs PM 等待拆分")的**硬前置** | 提升为显式前置,进依赖图 | §3.5 · §6 |
| 小修2 | "6 张新卡片"约 50% 冗余(retention-loops/friction-reduction 与正在 cp 的 metrics-definition/onboarding-design/form-design 重;progressive-disclosure 已在 hicks/millers 卡内) | **砍到 3 张**(activation-funnel-dropoff、role-based-ia、power-user-efficiency 当薄附录),其余折进已 cp 卡片 | §4.5 |
| 小修3 | P1 slice ③ 在 §6/§4.5.2/§4.5.3 给了**3 份互不一致的卡片清单**,不可独立验证 | 统一为**唯一一份**:journey-map + experience-map + onboarding-design + metrics-definition | §4.5.2 · §6 |
| 小修4 | Tier-1 events hook 把"per-tool 子代理身份(哪个 A1..A7)"当**既成事实**;实测此字段未验证、依赖 CC 版本 | 改述为**未验证假设** + 落地前先 prototype-dump 一条 raw payload 确认;退路 = 按 `SubagentStop` 边界归因 | §3.3 |
| 小修5 | Vite 构建链与方案自身"可移植单文件配置"约束冲突,未裁决 | **裁决:单 HTML 文件、零构建**,守住可移植 | §3.3 |
| 小修6 | §5.3"独立验收命令入口"部分冗余——`run-acceptance-suite` skill 已提供按 baseline 跑的独立验收 | 订正为**只缺 slash-command 包装**,工作量比 v1.0 描述的小 | §5.3 |
| 事实订正 | (a) A2 第11项软闸是**两选处置**(回炉 / 带备注放行)非"三选一";(b) A1 映射表头是**"读哪个 skill"**非"读哪张卡";(c) **无顶层 `evals/cases.csv`**(metrics 集是 `{runs,loops,escapes}`);(d) A1.5 LOCKED 仅锁**单文件零依赖 index.html**,Playwright 截图在开放正文 | 全文措辞订正 | 各处 |
| 就绪盲点 | `evals/regression-set/cases.csv` **只有表头**——连 A2/A4/A7 这道回归闸当前都未上膛 | §6 Wave1 增"回归集填充"为前置兜底项 | §6 · §8 |

> 被评审**夸大、v1.1 不采纳**的两条(记录在案以免过度修正):① "regression-set 不覆盖 A1/A1.5 → §2 规则7 空闸"——实际 A1/A1.5 由**行为验收(§9 准则2-3)+ 人工 PROMPT-CHANGELOG 复核 + LOCKED 决议**把关,regression-set 的"100% 通过"明确只管"引擎层零退化",无自相矛盾。② "看板泄露 secrets"——`load-secrets.sh` 把密钥保持在仓外,看板数据源里没有凭据;真问题仅为自由文本(原始需求 / escapes 一句话)可能带产品名,处理 = 一行"Tier-2 托管前脱敏"注记(见 §8)。

## 0.05 执行进度(截至 2026-06-16)

| 批次 | 项 | 状态 | 证据 |
|---|---|---|---|
| Wave 1 | ① 双轴字段 · ② Gate 0.5(含 M1)· ③a cp 4 卡 | ✅ 已落地 | PROJECT-PROFILE §5.1 · init-project 第2.5步 · methodology(34卡) |
| Wave 1③b + Wave 2 | A1 受众门控行 + §4.8 产物 · A2 劝退 lens | ✅ 已合并进 agent | patch-001 · product-expert v1.7 · requirement-reviewer v1.3 |
| (验收) | W2 受众门控行为 smoke(toC/toB/web · A1/A2) | ✅ 5/5 通过 · 零仓内残留 | dry 探针 · 见 PROMPT-CHANGELOG 行为验收口径 |
| **Wave 3⑥(提前)** | pipeline-state 契约 enrich:种 gate1_5a/1_5b 键 + started_at/ended_at + validator | ✅ **已落地(从 Wave3 拎前 · 不依赖 run 数据)** | new-feature.md §4步 · `scripts/validate-pipeline-state.sh` |
| Wave 1⓪ | 填 regression-set | ⛔ **阻塞(修正:不可合成种子)** | regression-set 设计为收真实 .done 包(case_id=run_id · expected 从真包复制),无真实 run 无法播种 |
| Wave 3⑦⑧ / Wave 4 | 看板 Tier0/1 · 视觉轨分流 · 验收归一化器 · 新卡 | ⛔ 阻塞 | 启动信号 = 首条真实 run / 首个真实原生项目 |

> **关键瓶颈**:除 Wave 3⑥ 已提前做掉外,剩余全部(W3⑦⑧/W4/回归集)堵在**同一个信号**——这套流水线至今未在真实项目上跑过一次。下一步杠杆 = 接一个真实(最好带 toC 界面的)仓库跑 `/init-project` + 一个最小 `/new-feature`。

---

## 0.1 摘要(TL;DR)

本方案回应 PM 的三个改造方向,并补齐其中最关键的一条隐含轴。**v1.1 的总基调:小步、诚实、跟信号走。**

1. **可视化 / 产品化** → 建一座**只读控制塔**,渲染流水线**已经在产出**的 `pipeline-state.json` + `evals/*.csv`。**诚实前提:这条流水线至今一次都没跑过**——所有 CSV 只有表头、零 `pipeline-state.json` 实例。所以"数据 90% 已存在"应读作"**90% 的 schema 已存在**",看板的默认渲染是空表。因此可视化**整体压到 Wave 3**,等真有 ≥1 条 run 落了数据再做;推荐边界仍是 Tier 1。
2. **接入坑 + 多端/多受众适配** → 引入**两条正交轴**——`platform_profile`(技术:web/native)与 `audience_profile`(受众:toB/toC)——并在 `/init-project` 增设 **Gate 0.5 适配体检**(平台探测改为**提名信号 + 有序消解**,非机械判定)。两条 web 耦合轨改为可插拔适配器;**视觉轨分流与验收归一化器是项目耦合的重活,压到 Wave 4**,等真有原生项目接入再做。产品设计层按受众**门控引入**方法论卡片,并新增"用户体验路径 + 劝退点扫描"产物——**这是真正回答"会不会劝退"的机器,优先做(Wave 2)**。
3. **产测分工** → **逻辑拆分(推荐) / 物理拆仓(否决)**。A6/A7 必须留在 `/new-feature` 同一次 run 内(闭环驱动用例生成的事实源);独立验收轨的命令入口**大部分已由 `run-acceptance-suite` skill 提供**,只缺一个 slash-command 包装。

**一句话核心洞察(不变)**:`toB/toC`(受众)≠ `web/native`(技术),是正交的第二条轴;"会不会劝退 / 体验路径"挂在**受众轴**上,不在技术平台轴上。

**一句话落地次序(v1.1 新增)**:**先做不依赖任何 run 数据、近零成本的 Wave 1–2(双轴字段 + Gate 0.5 + 体验路径卡 + 劝退扫描),把贵的看板和原生适配器压到真有数据/真有项目时再做。**

---

## 1. 背景与问题陈述

### 1.1 当前流水线是什么

本工作空间不是一个传统"应用",而是一套 **Claude Code 工作空间**:
- **runtime = Claude Code 本身**;agent = `.claude/agents/*.md` 子代理;编排 = `/new-feature` 这个 markdown prompt;
- 8 个流水线 agent(A1 产品 → A1.5 视觉 → A2 需求审 → A3 技术 → A4 范围审 → A5 二次校验 → A6 用例 → A7 用例审)+ 2 个 meta agent + legacy-excavator;
- 5~6 个人工 Gate(含视觉环 Gate 1.5a/1.5b);状态落在 `pipeline-state.json`(**每包一份**)+ `deliverables/*.{draft,active,done}` 状态机;
- 指标落在 `evals/{runs,loops,escapes}.csv`(由 `pipeline-retrospector` 在升 `.done` 后写,且写时 schema 校验)。**注:无顶层 `evals/cases.csv`**;`cases.csv` 分别存在于 `knowledge/cases.csv`(业务台账)与 `evals/regression-set/cases.csv`(回归选入台账),都不是 metrics 流;
- 自进化闭环:retrospect → `/pipeline-review`(周)→ `/optimize-prompts`(月,把反复教训折回 agent prompt);
- 确定性防护:收口脚本(next-id/promote)+ git pre-push 硬闸 + CC hooks 三件套。

> **任何改造都要顺这个纹理**:不要做一个反过来驱动 agent 的后端(那是和 Claude Code 抢方向盘),而是**渲染/扩展流水线已产出的产物**。本原则贯穿全文。

### 1.1a 诚实的就绪度基线(v1.1 新增 · 必读)

落地前必须认清:**截至本文,这套骨架尚未完整跑过一次真实 run。** 实测——
- `find . -name pipeline-state.json` **零实例**(只有 schema 写在 new-feature.md 的 heredoc 里);
- `evals/{runs,loops,escapes}.csv` **全是表头**,`deliverables/` 只有模板;
- `evals/regression-set/cases.csv` **也只有表头**——意味着连 A2/A4/A7 的回归闸目前都**未上膛**。

**含义**:任何"渲染已有数据"的改造(尤其看板)在今天渲染的是**空契约**;任何"为多端多受众适配"的改造服务的是**一个今天服务 0 个项目、设计上一次只服务 1 个**的工作空间。这不否定方案——骨架的本职就是"项目来之前先备好能力"——但它**决定了落地次序**:先做不依赖 run 数据的结构性能力(Wave 1–2),把依赖数据/依赖真实项目的重活(Wave 3–4)押后到信号出现。

### 1.2 三个待解问题(PM 提出)

| # | 问题 | 本质 |
|---|---|---|
| Q1 | 抽象成产品 / 加可视化页面,让非技术人员看懂 agent 协作与工作过程 + 实时指标 | 露出问题 + 翻译问题(数据**结构**大多已定义,但实例尚空)|
| Q2 | 新项目接入会遇到的坑;框架解决不了时有无机制引导用户判断坑;C 端客户端能否适配 | 项目形态多样性 → 需要"早暴露 + 可绕过"机制 |
| Q3 | 产品和测试工作区放一起,拆分是否更好 | 闭环耦合 vs 角色/节奏分工 |

### 1.3 贯穿性洞察:两条正交轴

接入一个新项目时,影响流水线适配的是**两条相互独立的轴**:

- **`platform_profile`(技术轴)**:web / native-ios / native-android / flutter / rn / desktop / none / hybrid —— 决定**技术怎么落地**(demo 用 HTML 还是真机、验收用 Playwright 还是 Maestro)。
- **`audience_profile`(受众轴)**:toB / toC / both —— 决定**给谁用、体验路径长什么样、怎么算"劝退"**。

二者正交:toB 后台可以是 web 也可以是 native;toC app 同理。**Q1 的可视化主要受工程结构影响;Q2 的"坑"两轴都涉及;"劝退/体验路径"只受受众轴影响。** 把这两轴分清,是本方案不建错地方的前提。

> ⚠️ **正交性的边界(v1.1)**:两轴在**类型层**正交(一个 hybrid+both 项目合法),但在**检测层**会泄露——`platform` 的探测信号互相不互斥(RN 同时像 native+web)。这是 M1 要修的;正交性本身不受影响。

---

## 2. 设计总则(不可动摇的约束)

落地任何一块都必须守住下列约束,否则会破坏骨架的核心价值(可移植 + 自进化):

1. **只读层不驱动流水线**:看板/事件流只读文件,绝不反向编排 agent;它挂了流水线照跑。
2. **引擎通用 / 知识专属 / 数据从空长**(现有三层不变):新增的 `platform_profile`/`audience_profile` 属"知识层",收敛进 `PROJECT-PROFILE.md` 单一真理源,不在各 agent 里硬编码。
3. **双轴正交**:两个 profile 字段独立判定、独立门控,禁止合并成单枚举。
4. **方法论给"为什么",项目事实给"用什么"**(现有三条总则不变):新增卡片只供判断框架,**严禁**据此引入项目外色板/字号/组件库;与项目视觉基线冲突时以项目文件为准。
5. **门控读取,不全读**:平台/受众门控的卡片,不命中条件不读 —— web/toB 项目永不被 toC/native 卡片污染,零负担。
6. **机械约束下沉脚本,prose 只留判断型约束**(现有哲学):能用脚本/字段/hook 强制的,不靠 prompt 自觉;能判断的(如"劝退风险")交人工 Gate/软闸。**v1.1 强化:本方案新增的状态字段(`gates{}` 键、`started_at/ended_at`、双 profile)凡能校验的一律配 validator/CI 断言,不止配 prose。**
7. **prompt 改动走 `/optimize-prompts`**:不手改 `.claude/agents/*.md`,不触碰 LOCKED 锚点,改完跑 regression-set(对 A2/A4/A7 判断型 agent);**对 A1/A1.5/A6 这类生成型 agent,以人工 PROMPT-CHANGELOG 复核 + §9 行为验收为把关主力**(regression-set 设计上不覆盖它们)。
8. **P015 业务语言**:所有面向 PM/非技术人员的露出(看板标签、Gate 提示、能力矩阵)用业务语言,不堆技术黑话。
9. **(v1.1 新增)诚实就绪度 / 信号驱动落地**:不在没有数据的地方建渲染层,不在没有项目的地方建适配器。每一波改造在 §6 标明"启动信号",信号未到不开工。

---

## 3. 改造一:可视化 —— 只读控制塔

### 3.1 现状与缺口

- 当前唯一的"露出"是 `scripts/hooks/session-start-brief.sh`:开场注入 ≤15 行纯文字(在飞包 / 流水线进度 / 账本对账)——非技术人员看不懂、看不到实时协作、看不到趋势。
- 指标全在 CSV 里,结构化且 schema 校验过,但没有任何渲染,**且目前全是表头(无数据)**。

### 3.2 关键事实:数据的**结构** 90% 已定义,但**实例**几乎全空

| 想看的东西 | 数据源(schema 现成) | 缺口 |
|---|---|---|
| 当前在跑哪个 agent / 哪个 Gate 在等谁 | `pipeline-state.json`:`current_step` / `steps{}` / `gates{}` | 仅缺渲染;**但 `gates{}` 只种死 gate1/2/3——见 §3.4 M3** |
| "卡在 agent vs 卡在等 PM" | Gate 双时间戳 `asked_at` + `at`(见 `new-feature.md` 第 0 步)| 渲染 + **依赖 §3.5 enrich 才能补出 agent 自身耗时** |
| 指标趋势 / 拦截漏斗 / Loop 收敛 | `evals/{runs,loops,escapes}.csv` | 仅缺渲染 |
| agent 内部实时动作("此刻在干嘛")| 无结构化事件流 | **需新增**(见 Tier 1)|

> ⚠️ **诚实修正(v1.1)**:v1.0 的"数据 90% 已存在"对**快照/CSV 视图**成立,但**严重高估了时间线/实时故事**。两个真相:(1)`steps{}` 现在**只有 `verdict/rounds`、无时间戳**,所以招牌视图"agent 耗时 vs PM 等待拆分"的 agent-time 一半**今天是 0% 就绪**,要等 §3.5 enrich;(2)**零 `pipeline-state.json` 实例存在**,所以"90% 数据"实为"90% 的 schema"——看板默认渲染空表。**结论:Tier 0 的真实就绪度约 50%,且强依赖 §3.5,因此整体压到 Wave 3(等真有 run 数据)。**

### 3.3 三层方案

| 层 | 内容 | 成本 | 何时做 |
|---|---|---|---|
| **Tier 0** | 纯只读看板(**单 HTML 文件 · 零构建 · 零依赖**,见 §3.4 硬约束),watch **跨包**聚合的 `pipeline-state.json` + 三张 CSV,渲染:① 每条在飞流水线的流程图(哪个 agent 亮、哪个 Gate 等谁,**含 Gate 1.5a/1.5b**)② agent 耗时 vs PM 等待耗时拆分(依赖 §3.5)③ 指标趋势 | 中 | **Wave 3**(等 ≥1 条真实 run)|
| **Tier 1** | 加一个 Claude Code hook(PostToolUse / SubagentStop)把 `{ts, agent, tool, event}` 追加到 `evals/events.jsonl`;看板 tail 这个流 → 实时"agent 在干嘛"。**⚠️ `agent` 字段(哪个 A1..A7)未验证、依赖 CC 版本——落地前先 prototype-dump 一条 raw payload 确认;拿不到则退化为按 `SubagentStop` 边界归因** | 中 | **Wave 3 尾**(Tier 0 之后)|
| **Tier 2** | 用 Claude Agent SDK + 小服务包成多人托管产品 | 高 | **暂不做**,等真有外部用户需求 |

**推荐边界**:做到 Tier 1 即覆盖"让非技术人员看懂协作 + 实时 + 指标"的绝大部分。Tier 2 会把"个人工作空间"变成"托管产品",并危及"项目无关 + 单文件配置"的可移植性,需求未明朗前不碰。

### 3.4 三个硬约束(v1.1 从两个增至三个)

1. **看板永远只读**。一旦它开始驱动 agent,可移植性即崩。代码评审守住。
2. **"非技术人员可读"主要是翻译问题**:复用现有 P015 铁律——显示"产品细化 / 范围把关 / 用例生成",而不是"A4 scope-reviewer"。看板内置一张 `agent → 业务名` 映射表,**该表配快照测试 + owner**(见 §7)。
3. **(v1.1 · M3)看板必须覆盖全部会阻塞的 Gate**:`pipeline-state.json` 现在把 `gates{}` 种死成 `{gate1,gate2,gate3}`,但 Gate 1.5a/1.5b(视觉环,**往往是 PM 来回最久的环节**,见 new-feature.md:143/161)不是 `gates{}` 的键——看板若遍历 `gates{}` 会**静默漏掉视觉环**,正好打脸"10 秒看出在等谁"。**修法**:§3.5 在 new-feature 种入 `gate1_5a/gate1_5b` 键;并加 CI 断言"凡 orchestrator 会停的 gate 必在 `gates{}` 有键"。
4. **(v1.1 · 可移植)零构建栈**:Tier 0 用**单个 `index.html` + 内嵌脚本**实现,**不引 Vite/打包链**——与 A1.5 demo"零依赖单文件"同源哲学,守住"项目无关 + 单文件配置"的可移植承诺。

### 3.5 数据契约 enrich(v1.1:从"可选脚注"升为 **Tier-0 硬前置**)

`pipeline-state.json` 需补下列**非破坏性**字段(不改 retrospector 既有逻辑),**这是 Tier 0 招牌视图的前置,不是可选打磨**:
- `steps.<Ax>.started_at` / `ended_at`(目前只有 `verdict`/`rounds`)—— 否则"agent 耗时 vs PM 等待拆分"画不出;
- `steps.<Ax>.label`(业务名,可由看板侧映射表代替,二选一);
- **(M3)`gates{}` 种入 `gate1_5a` / `gate1_5b` 键**(初始 `{"resolved":false}`),与 gate1/2/3 并列;
- **(v1.1 · 规则6)给 `pipeline-state.json` 配一个轻量 schema validator**(类比 `post-csv-validate.sh` 之于 CSV):这些字段是主对话模型手写、目前无人校验;加一道 `Edit|Write` 后置校验,挡住"漏写时间戳/漏种 gate 键"。

---

## 4. 改造二:双轴适配 + 接入体检(核心)

### 4.1 两条正交轴的字段定义

写入 `PROJECT-PROFILE.md` § 五(技术栈 + 端结构)下,与现有字段并列:

```yaml
platform_profile:
  frontend_kind:       web | native-ios | native-android | flutter | rn | desktop-electron | none | hybrid
  visual_demo_mode:    html-demo | approximate-html | figma-ref | native-snapshot | none
  acceptance_driver:   playwright | maestro | appium | xcuitest | espresso | manual
  gray_env_kind:       web-url | testflight | internal-track | emulator | none
  design_token_source: css-hex | swiftui-tokens | compose-tokens | flutter-theme | none

audience_profile:
  primary: toB | toC | both
  surfaces:                              # primary=both 时按界面拆,分别分析
    - { name: "<界面名>", audience: toB | toC }
```

> 多轴而非单枚举的理由:一个 `hybrid` 项目可能 web 端走 Playwright、客户端走 Maestro;`visual_demo_mode` 与 `acceptance_driver` 必须能各自切。

### 4.2 `/init-project` 新增 Gate 0.5 适配体检

插在现有 `.claude/commands/init-project.md` **第 2 步(主动梳理)与第 4 步(确认 Gate)之间**,完全沿用现有"grep 提名 → PM 拍板"套路。

#### 4.2.1 平台探测信号(v1.1:**提名信号 + 有序消解**,不是机械判定)

> ⚠️ **M1 修正**:下表是**提名信号**,不是确定性分类。多个信号会同时命中(RN 仓同时像 native-ios + native-android + rn + web;Flutter 同时像 native-ios + native-android),因此**必须先跑有序消解,再交 PM 拍板**——否则会错误提名、撞 §9"原生 repo 正确提名 platform"的验收线。

**有序消解规则(先判,短路)**:
1. 见 `package.json` 含 `react-native` **或** `pubspec.yaml` → **先定 rn / flutter**,**短路掉** native-ios / native-android 的"壳目录信号"(它们的 `ios/` `android/` 是生成壳);
2. **同时排除 legacy web 探测**:`react-native` 存在时,init-project.md 既有的 web 探测(grep `"(react|vue|svelte|@angular/core)"` + `.tsx`,见 init-project.md:90-92)**不得**把 RN 误判成 web;
3. 仅当 1/2 未命中,才用下表壳目录/构建文件信号提名 native-*;
4. 多信号残留命中 → **全部作为候选提名升 PM**,PM 拍板定 `frontend_kind`(人工 Gate 是兜底,但消解规则让候选更干净)。

| frontend_kind | 探测信号(提名用) |
|---|---|
| rn | `package.json` 含 `react-native` + 存在 `ios/` `android/`(**最高优先,短路 native-***)|
| flutter | `pubspec.yaml` + `lib/**.dart`(**短路 native-***)|
| native-ios | `*.xcodeproj` / `Package.swift` / `Podfile`(且非 rn/flutter 壳)|
| native-android | `AndroidManifest.xml` + `build.gradle(.kts)` + `*.kt`(且非 rn/flutter 壳)|
| desktop | `package.json` 含 `electron` / 存在 `src-tauri/` |
| web | react/vue/svelte/angular(现有逻辑;`react-native` 存在时不触发)|
| none | 以上皆无 = 纯后端 |

#### 4.2.2 受众探测信号(代码只提名,PM 必拍板)

受众是**业务事实**,不像技术栈能从代码确凿推出 —— 代码只负责提名:

| | 代码/仓库信号(用来提名) |
|---|---|
| 倾向 **toB** | RBAC 角色权限体系 · 后台/工作台/admin 路由 · 多租户 · SSO/SAML · 审计日志 · 报表导出 · 席位计费 |
| 倾向 **toC** | 注册/引导流 · 社交登录 · 推送通知 · 内购/订阅(IAP) · 分享/裂变/邀请 · 应用商店配置 · 漏斗埋点 |
| = **both** | 两套都命中:典型 marketplace(C 端 app + B 端商家后台)、自助 SaaS(self-serve + 企业管理台) |

#### 4.2.3 产物:能力矩阵(这就是"引导用户判断坑"的机制)

体检的输出是一张交给 PM 的矩阵,逐子系统标 ✅可用 / 🟡需适配 / ⛔不适用 + 适配动作:

| 子系统 | web | C 端原生 | 适配动作 |
|---|---|---|---|
| 8-agent 流程 / Gate / evals 自进化 | ✅ | ✅ | 无 |
| 契约闸 **P021 跨端数据流 + schema 黑名单** | ✅ | ✅(更相关) | 无 |
| 契约闸 **P020 @map DOM 钩子断言** | ✅ | 🟡 | **原生无 DOM**,改用原生 UI 树断言(Maestro view-hierarchy / XCUITest accessibility id)|
| A1.5 视觉规范 **spec 表**(px 级) | ✅ | ✅ | 单位 px→pt/dp,组件名映射原生 |
| A1.5 **HTML demo** | ✅ | 🟡 | `visual_demo_mode=approximate-html` 或 `figma-ref` |
| 视觉基线扫描 `visual-baseline-scan.py` | ✅ | 🟡 | 改读原生 token 源 |
| dev-verify / 灰度 smoke | ✅ | 🟡 | 改 TestFlight/内测/模拟器 |
| acceptance-regression(Playwright) | ✅ | ⛔→🟡 | 换 driver(Maestro/Appium)+ **results 归一化器(成本=高 · 适配器工程,见 §4.3.2)**|
| P013 PM 灰度主观体验 | ✅ | ✅(真机更自然) | 无 |

> ⚠️ **v1.1 订正**:v1.0 把"契约闸 P020/P021"对原生整体标 ✅✅"更相关"。订正:**P021(跨端数据流契约 + schema 黑名单)对原生确实 ✅ 更相关;但 P020 的 `@map` 断言依赖真实 DOM `data-*` 钩子,原生没有 DOM,这一半是 🟡(须换原生 UI 树断言)**。

PM 确认后写入双 profile,**🟡/⛔ 的项当场登记为已知 deviation**(复用现有"登偏差"模式),不假装能跑。

> **定性结论**:C 端的后端/逻辑/契约层接得很顺,甚至比 web 更吃契约闸;漏的只有"视觉 demo"与"验收驱动"两条——但**"验收驱动"的归一化器是真重活(见 §4.3.2),不是一行映射**,这点 v1.0 低估了。

### 4.3 两条漏轨的适配器契约

#### 4.3.1 视觉轨(A1.5)

现 demo 形态在 `.claude/agents/visual-spec-author.md` 的核心立场段被 **LOCKED 死成"单个 `index.html` + 内嵌 `<style>` + 零依赖"**(LOCKED 仅锁这条;Playwright 截图步骤在开放正文,不在 LOCKED 内)。改为读 `visual_demo_mode` 分流:

| 模式 | 行为 |
|---|---|
| `html-demo`(web) | 照旧 |
| `approximate-html`(原生) | 产 HTML 近似预览 + spec 头部**强制写一行 deviation**:"此 demo 为近似预览,原生最终以真机/Figma 为准";4-lens 自评照跑(它评的是图,不在乎图怎么来) |
| `figma-ref`(有设计稿) | spec 引用 Figma frame,不产 HTML |

> 关键:A1.5 的 **px 级 spec 表对原生照样有价值**,只是换单位与组件名;漏的只有"零依赖 HTML"这一种载体,不是整条轨。改 LOCKED 段须走 `/optimize-prompts` 并 PM 决议留痕。**本项压到 Wave 4(等真有原生项目)。**

#### 4.3.2 验收轨(acceptance-regression)——v1.1:**承认这是适配器工程,不是零重写**

现 `acceptance.config.template.json` 写死 `resultsSubpath: playwright-results/results.json`。v1.0 称"报告引擎是 runner 无关的——它只读 `results.json`,全部复用零重写"。**这句话只对了一半,且误导:**

实测 `.claude/skills/acceptance-regression/lib/acceptance-report.mjs`:引擎确实只解析一个 JSON 文件、不驱动 Playwright;**但它死耦合 Playwright JSON reporter 的嵌套 `suites[].suites[].specs[].tests[].results[]` 结构,并从 spec 文件路径 + annotations 现编** module / layer / priority / role / page / expected(110-153 行)。L2 角色权限矩阵与 FAIL 明细表**全靠 annotation 驱动**。Maestro YAML flow 产出的是扁平的 per-flow pass/fail,**上述结构一个都不产**。SKILL.md 自己也标注:CSV→spec 的映射"目前停在 L1,因依赖项目专属 role/module/route 映射而无法抽象"——这正是归一化器要重造的元数据。

**因此归一化器不是"映射到现有 schema",而是要**:① 重建整棵 Playwright 形状的 suite/test 树;② 逐 flow 从**项目专属源**注入 case_id/priority/role/page/@module/@layer。这是**项目耦合的适配器工程**,成本=**高**,是全案最难、最该押后的一项。改法不变,但**诚实定级**:

- 加 `acceptance_driver` 字段 + 一个 **results 归一化器(项目耦合 · 高成本)**:任何 runner 输出**重建为** Playwright results 形状 + 注入元数据;
- 报告引擎、L0–L5 分层、P0 红线闸的**聚合/渲染半边**复用,**但元数据来源半边须逐项目重写**;
- C 端落地首选 **Maestro**(YAML 最轻),次选 Appium;视觉回归 = 原生截图 diff;
- **押到 Wave 4**,且在能力矩阵 + 路线图标"高成本"。

#### 4.3.3 降级总原则

能跑就跑,不能跑就**标 🟡/⛔ + 吐适配器契约桩 + 登 deviation,绝不阻断流水线**。引擎层(8 agent + evals + 契约闸 P021)在任何平台/受众下 100% 可用,这是底线。

### 4.4 受众驱动的产品设计(劝退 / 体验路径)—— **Wave 2 的核心**

#### 4.4.1 为什么受众一变,推理就全变

| | toC | toB |
|---|---|---|
| 用户怎么来 | 自愿,随时能走 | 公司分配,被迫用 |
| "劝退" = | 漏斗流失 / 首屏跳出 / 注册放弃 | 学不会 / 绕开用 / 影子 IT / 内部投诉 |
| 体验路径 | 拉新 → **Aha 时刻** → 留存习惯 | 角色 → 任务 → **完成效率** |
| 设计优先级 | 降摩擦、零困惑、即时价值、情绪 | 信息密度、可学习性、快捷、批量、可撤销 |
| 衡量信号 | 激活率/留存/漏斗转化 | 任务完成时长/采纳率/内部 NPS |

> 现流水线 A1 有 `jobs-to-be-done`、IA、Nielsen 启发式,但**没有任何环节显式产出"用户体验路径 + 劝退点"**——这是要补的缺口。

#### 4.4.2 A1 新增产物:「用户体验路径 + 劝退点扫描」(§ 4.x · 受众门控)

| audience | A1 必产 |
|---|---|
| toC | **激活漏斗图**(入口→Aha→留存)+ 标注每个**流失断崖**(注册摩擦/权限请求/空态/死胡同)+ 逐点缓解 |
| toB | **任务流程路径**(角色→任务→完成)+ 标注**学习/效率摩擦点**(要重学/功能藏太深/工作流断点)+ 按角色 IA |
| both | 上面两份,按 surface 分开画,**不合并** |

#### 4.4.3 A2 软闸扩展「劝退风险」维度(复用现有 plumbing)

A2 已有**第 11 项可用性软闸**(Nielsen 启发式快扫,严重度 0–4;**软闸不参与打回**;≥3 分原样升 PM,**两选处置**:PM 说"回炉"才回炉、说"我故意的"则带备注放行)。**这是放"劝退主观判断"的完美位置**(劝退天然主观,该升 PM 而非 agent 拍):
- toC 项目 → 软闸加 **drop-off severity** lens(这个交互会在漏斗哪一步吓走用户);
- toB 项目 → 软闸加 **效率/可学习性** lens(这个改动会不会让老用户重学)。

零新增 Gate,直接挂在已有软闸的两选处置上。

> ⚠️ **v1.1 订正**:v1.0 把 A2 软闸处置写成"三选一";实测是**两选**(回炉 / 带备注放行)。新 lens 挂在这两选上,不改处置结构。

#### 4.4.4(可选 · 高阶)让"劝退"可度量

A1 扫出的劝退点列成 risk register,喂给 **P013 PM 灰度主观体验**(现有最高信号输入)——PM 真机 5 分钟专门照劝退点走一遍;漏到灰度/线上的劝退问题关联进 `evals/escapes.csv`,让"劝退"从感觉变成账本。

### 4.5 知识卡片分层引入(v1.1:统一清单 + 砍冗余)

接入点 = A1 设计方法论库映射表(`.claude/agents/product-expert.md` 的"触发条件 → **读哪个 skill** → 用在哪"表,见 product-expert.md:99)+ 降级链。**只加卡 + 加门控触发列,不改机制。**

#### 4.5.0 第一步(唯一清单 · v1.1 统一)

> ⚠️ **小修3**:v1.0 在 §6/§4.5.2/§4.5.3 给了三份互不一致的"第一步卡片清单"。**v1.1 统一为唯一一份**——第一步 `cp` 进 `knowledge/methodology/` 并接 A1 的是这 **4 张已有用户级 skill**:`journey-map` · `experience-map` · `onboarding-design` · `metrics-definition`。它们是"体验路径"方法论的根,实测**不在 30 卡片快照内、也没接进 A1**——这正是体验路径推理缺位的根因。

#### 4.5.1 平台门控层(仅 `frontend_kind ∈ {native-*, flutter, rn, hybrid}` 读)

| 卡片 | 补的 C 端缺口 | 来源 |
|---|---|---|
| `gesture-patterns` | 手势/滑动/长按 | 已有用户级 skill,`cp` 快照 |
| `onboarding-first-run` | 首启引导/权限预热/空态 | 由 `onboarding-design` skill 改写(**Wave 4**)|
| `platform-hig` | iOS HIG / Material 约定 + 何时遵循 vs 突破品牌 | 需新写(**Wave 4**)|
| `permissions-priming` | 相机/定位/推送的请求时机与文案 | 需新写(**Wave 4**)|
| `notifications-reengagement` | 推送/召回/留存循环 | 需新写(**Wave 4**)|
| `offline-connectivity-states` | 弱网/离线态 | 需新写(**Wave 4**)|

#### 4.5.2 受众门控层(按 `audience_profile.primary` 读)

| 门控 | 卡片 | 已有/新写 |
|---|---|---|
| toC | `journey-map` · `experience-map` · `onboarding-design` · `metrics-definition` | **四张已有 skill,§4.5.0 第一步即 `cp`** |
| toB | `information-architecture` · `navigation-patterns` · `hicks-law` · `millers-law` · `data-visualization` · `form-design` | **全部已在 30 卡片内,直接门控复用** |
| **新写(v1.1 砍到 3 张)** | `activation-funnel-dropoff`(toC 劝退点扫描)· `role-based-ia`(toB 角色 IA)· `power-user-efficiency`(toB 快捷/批量,薄附录) | 需新写(3)|

> ⚠️ **小修2 · 砍冗余**:v1.0 列了 6 张新卡。实测 3 张冗余——`retention-loops` 与 `friction-reduction` 大量重叠正在 `cp` 的 `metrics-definition`/`onboarding-design`/`form-design`;`progressive-disclosure` 已是 `hicks-law`/`millers-law` 卡内的显式小节。**v1.1 砍到 3 张净新增,其余折进已 cp 卡片,覆盖不损。**

#### 4.5.3 接入 A1 映射表的样式(示例行)

```
| 触发条件 | 读哪个 skill | 用在哪 |
| audience=toC + 新增整页/新功能 | journey-map + onboarding-design | § 4.x 激活漏斗 + 劝退断崖 |
| audience=toC + 涉及系统能力(相机/定位/推送) | permissions-priming | § 4.x 权限请求时机 |
| audience=toB + 列表/批量/角色权限类 | role-based-ia + power-user-efficiency | § 4.x 角色 IA + 效率路径 |
| platform=native + 新增整页 | onboarding-first-run + platform-hig | § 4.x 首启流程 + 平台约定 |
```

> 铁律:`platform-hig` 的平台约定**不得覆盖项目视觉基线**;冲突时把"遵循平台约定 vs 保持品牌一致"作为**产品决策升 PM**(走 P015),不由 agent 自拍。

---

## 5. 改造三:产测分工 —— 逻辑拆 / 物理不拆

### 5.1 现状:已部分逻辑分

- 产品侧:`product-docs/` + `deliverables/`(A1–A5);测试侧:`test/`(A6/A7 + 验收引擎),连进度台账都分两个(`说明文档.md` vs `test/测试说明文档.md`);
- 验收**引擎本体已物理外置**在 `~/.claude/skills/acceptance-regression/`(用户级),项目里只留 specs + config —— 这本就是对的设计。

### 5.2 物理拆仓的代价(否决理由)

闭环耦合是这套的护城河,物理拆开会切断:
- `runs.csv` 一行把产品侧 A1–A5 与测试侧 A6/A7 指标**绑在同行**(由单写者 `pipeline-retrospector` 在 `.done` 时写)→ 拆开则自进化闭环断;
- 闭环驱动用例生成(A6)把**产品模块文档当"覆盖义务分母"**(test-case-author.md 必读 #5 强制 A6 读模块 01 FP 全集)→ 拆开则用例又"永远不全"(正是它要根治的病);
- 单一 `PROJECT-PROFILE` / `knowledge/` → 拆开则双份维护、必然漂移。

### 5.3 推荐:逻辑拆分强化,物理不拆(v1.1:订正"独立入口"的工作量)

| | 做法 |
|---|---|
| ✅ 该加强 | 给独立验收轨**独立命令入口**——⚠️ **v1.1 订正**:此能力**大部分已存在**(`run-acceptance-suite` skill 已能对任意 baseline 版本跑独立验收,按版本 keyed,不依赖 `/new-feature`),真正缺的只是一个 **slash-command 薄包装**;已有独立 report 目录与台账;多人/异节奏用 git worktree / 分支隔离 |
| ⛔ 绝不拆 | 流水线内 **A6/A7 必须与 A1–A5 留在同一次 run**;拆到另一工作空间 = 砍掉用例事实源 + 砍掉自进化闭环 |

**分界线**:拆的是"角色/节奏/轨道"(逻辑),不是"仓库/工作空间"(物理)。多人/异节奏的合理诉求由 worktree/分支隔离 + 已有的按-baseline 验收入口承接,不需要物理拆仓。

---

## 6. 落地路线图 v1.1(按"先便宜后贵 · 跟信号走"重排)

> **重排原则**:① 不依赖 run 数据、近零成本的结构能力**先做**(Wave 1–2);② 依赖真实数据的渲染(看板)**等有 run 再做**(Wave 3);③ 依赖真实原生项目、项目耦合的重活**等项目接入再做**(Wave 4)。每波标**启动信号**——信号未到不开工。

### Wave 1 — 现在做(无前置 · 自包含 · 可独立验证)

| 切片 | 内容 | 成本 | 启动信号 | 验证方式 |
|---|---|---|---|---|
| ① | `platform_profile` + `audience_profile` 双字段写进 PROJECT-PROFILE 模板 | 低 | 即刻 | 字段就位,grep 不到硬编码 |
| ② | `/init-project` 插入 Gate 0.5 双轴探测(**含 M1 有序消解**)+ 能力矩阵 | 中低 | 即刻 | 拿一个 **RN/Flutter repo** 跑,看消解后是否**只提名一个** frontend_kind、不误判 web |
| ③ | `cp` **journey-map + experience-map + onboarding-design + metrics-definition**(唯一清单)进 `knowledge/methodology/` + 接入 A1 映射表 | 高 ROI(近零成本) | 即刻 | A1 在 toC 需求上能读到路径卡片 |
| ⓪ | (兜底)填充 `evals/regression-set/cases.csv`(现仅表头 → A2/A4/A7 回归闸未上膛)| 低 | 即刻(任何 prompt 改动前)| 回归集非空,可跑 |

### Wave 2 — 现在做(依赖 ③ · 真正回答 Q2"会不会劝退"的机器)

| 切片 | 内容 | 成本 | 启动信号 | 验证方式 |
|---|---|---|---|---|
| ④ | A1 新增「体验路径 + 劝退点扫描」产物(受众门控)| 中 | ③ 完成 | 跑一个 toC + 一个 toB 需求,看产物分化正确、web 不触发 toC/native 卡 |
| ⑤ | A2 第 11 项软闸加 drop-off / 效率 lens(挂已有两选处置)| 中 | ③ 完成 | 高 drop-off 风险项被原样升 PM |
| ④b | (可选随附)若 ④ 的 drop-off 输出需加深,先写 1 张 `activation-funnel-dropoff` 卡 | 低 | ④ 暴露深度不足时 | 卡命中 toC 门控 |

### Wave 3 — 等真有 run 数据再做(可视化)

> **启动信号:≥1 条真实 `/new-feature` run 落了 `pipeline-state.json` + `runs.csv` 有行。** 信号未到,看板渲染空表,不开工。

| 切片 | 内容 | 成本 | 依赖 | 验证方式 |
|---|---|---|---|---|
| ⑥ | `pipeline-state` enrich:`started_at/ended_at/label` + **种入 `gate1_5a/gate1_5b` 键** + 配 schema validator(M3)| 低 | new-feature 改动 | 字段就位,validator 挡漏写 |
| ⑦ | 控制塔 Tier 0(**单 HTML 零构建**只读看板 + **跨包聚合** + **gate 全覆盖渲染** + agent→业务名映射快照测试 + owner)| 中 | ⑥ | 非技术同事 10 秒说出"卡在谁、等 agent 还是等 PM"(**含视觉环**)|
| ⑧ | 控制塔 Tier 1(events hook;**先 prototype-dump 验证 `agent` 身份字段**,拿不到则退化 SubagentStop 边界归因)| 中 | ⑦ | 看板有实时事件流;归因正确 |

### Wave 4 — 等真有原生/C 端项目接入再做(最贵 · 项目耦合 · 最高风险)

> **启动信号:能力矩阵里出现一个真实带 🟡/⛔ 的原生/C 端项目。**

| 切片 | 内容 | 成本 | 依赖 | 验证方式 |
|---|---|---|---|---|
| ⑨ | 视觉轨 `visual_demo_mode` 分流(解 A1.5 LOCKED,走 `/optimize-prompts` + PM 决议留痕)| 中 | ①② | 原生 repo 跑通近似 demo |
| ⑩ | 验收 results 归一化器 + `acceptance_driver` 字段(**成本=高 · 适配器工程,见 §4.3.2**)| **高** | ①② | Maestro 验收报告能套现有分层/P0 闸 |
| ⑪ | 新写 3 张受众/平台卡(`activation-funnel-dropoff` 若未在 ④b 写 + `role-based-ia` + `power-user-efficiency` 薄附录)+ 按需补平台门控卡 | 中 | ③④ | 卡命中门控触发 |

**关键路径**:**Wave 1 ① 是一切的锚点,先做;③ 近零成本立刻补"体验路径"方法论;Wave 2 ④⑤ 才是真正回答"会不会劝退"的机器。Wave 3–4 一律等信号。**

---

## 7. 改动清单(影响面 · v1.1 增治理项)

| 文件 / 资产 | 改动 | 走哪条流程 |
|---|---|---|
| `PROJECT-PROFILE.md`(模板)| 新增 `platform_profile` / `audience_profile` 段 | 常规变更 |
| `.claude/commands/init-project.md` | 插入 Gate 0.5(探测 + **有序消解 M1** + 能力矩阵 + 双轴提名)| 常规变更(command 非 agent)|
| `.claude/agents/product-expert.md`(A1) | 映射表加门控触发列 + 新增「体验路径/劝退」产物段 | **`/optimize-prompts`**(版本 bump v1.x→v1.x+1;A1/A6 生成型 → 人工 CHANGELOG 复核 + §9 行为验收为主)|
| `.claude/agents/requirement-reviewer.md`(A2) | 第 11 项软闸加 drop-off / 效率 lens(挂**两选**处置)| **`/optimize-prompts`**(A2 判断型 → 跑 regression-set)|
| `.claude/agents/visual-spec-author.md`(A1.5) | demo 形态读 `visual_demo_mode`(改 LOCKED 段需 PM 决议)| **`/optimize-prompts`** + LOCKED 决议(**Wave 4**)|
| `.claude/commands/new-feature.md` | `pipeline-state` 写入时种 `gate1_5a/1_5b` 键 + `started_at/ended_at`(M3 + §3.5)| 常规变更 |
| `acceptance.config.template.json` + 验收引擎 | 加 `acceptance_driver` + **results 归一化器(高成本适配器,Wave 4)**| 常规变更 |
| `knowledge/methodology/` | `cp` **4 张已有卡(统一清单)** + 新写 **3 张**;更新 README 清单 | 常规变更 + CHANGELOG |
| **`scripts/hooks/` 新增 `pipeline-state` validator** | 校验时间戳/gate 键齐全(规则6 下沉)| 接 `.claude/settings.json` PostToolUse |
| **CI 断言:凡 orchestrator 会停的 gate 必在 `gates{}` 有键**(M3)| 防看板漏渲染视觉环 | 脚本 + 评审 |
| 新增 `dashboard/`(**单 HTML 零构建**只读看板)+ owner + 快照测试 + 版本钉 | 新建(**Wave 3**)| 常规变更(附治理)|
| `scripts/hooks/`(可选 Tier 1)| 新增事件采集 hook(先 prototype-dump 验证)| 接 `.claude/settings.json`(**Wave 3 尾**)|
| slash-command 包装:独立验收入口(薄,复用 `run-acceptance-suite`)| 新建 | 常规变更 |

> 所有 agent prompt 改动遵守 `optimization/README.md` 生命周期:LOCKED 锚点校验 + regression-baseline 快照 + regression-set 回归(**A2/A4/A7 判断型**)+ **人工 PROMPT-CHANGELOG 复核(A1/A1.5/A6 生成型)** + PROMPT-CHANGELOG 留痕 + agent-versions.json bump。

---

## 8. 风险与回滚(v1.1 补 M1–M3 残留 + 结构回滚)

| 风险 | 缓解 |
|---|---|
| 看板演变成"驱动器",破坏可移植性 | 架构红线:看板只读,代码评审守住 |
| 改 A1.5 LOCKED 段引发视觉轨退化 | 走 /optimize-prompts + regression-baseline 快照,可一键回滚;PM 决议留痕 |
| 双轴字段误判(尤其受众) | 受众只由代码"提名",PM 必须拍板;判错可随时改字段(非 LOCKED 强约束,标推测对齐 P007 选项 B) |
| **(M1)平台探测多信号自撞(RN/Flutter)误提名** | §4.2.1 有序消解短路 native-* 与 legacy web;人工 Gate 兜底;§9 用 RN repo 验收 |
| **(M2)验收归一化器被当轻活、拖累排期** | 诚实定级"高成本适配器工程",压到 Wave 4,能力矩阵 + 路线图均标"高" |
| **(M3)看板漏渲染视觉环 Gate 1.5a/1.5b** | new-feature 种 gate 键 + CI 断言"会停的 gate 必有键";看板从单一真理源派生 gate 列表 |
| 新增卡片污染 web/toB 项目 | 严格门控触发,不命中不读;web/toB 永不触发 native/toC 卡 |
| **看板自由文本字段(原始需求/escapes 一句话)可能带产品名** | 看板**不渲染 secrets**(`load-secrets.sh` 保证密钥在仓外);Tier-2 托管前先做脱敏 |
| **结构性(非 prompt)改动回滚** | 工作空间是 git 仓:**回滚 = `git revert`**;看板是纯新增只读目录,回滚 = 删 `dashboard/` |
| 方案铺太大、迟迟不落地 | 按 §6 分波走,每波标启动信号;Wave 1–2 自包含可独立验证后再推进 |

---

## 9. 本方案的验收标准(怎么算做成 · v1.1 加平台/gate 项)

- [ ] **(M1)拿一个真实 RN / Flutter repo 跑 `/init-project`,Gate 0.5 经有序消解后只提名一个 `frontend_kind`(不把 RN 误判成 web),并产出能力矩阵(🟡/⛔ 项有适配动作)。**
- [ ] 拿一个**真实 C 端原生 repo** 跑 `/init-project`,正确提名 platform=native + audience,矩阵 P020(@map)对原生标 🟡。
- [ ] 拿一个 **toC 需求**跑 `/new-feature`,A1 产出激活漏斗 + 劝退断崖;A2 软闸把高 drop-off 风险项**原样升 PM(两选处置)**。
- [ ] 拿一个 **toB 需求**跑 `/new-feature`,A1 产出任务流程 + 效率摩擦点;web 项目**不触发**任何 toC/native 卡片。
- [ ] **(M3)控制塔 Tier 0 能让一个非技术同事在 10 秒内说出"现在卡在哪个环节、是在等 agent 还是等 PM"——包括卡在视觉环 Gate 1.5a/1.5b 时。**
- [ ] 全程**引擎层零退化**:regression-set(A2/A4/A7)100% 通过;A1/A1.5 由人工 CHANGELOG 复核 + 上面的行为验收把关;现有 8-agent 主流程在 web 项目上行为不变。

---

## 附录 A · 能力矩阵字段草案(Gate 0.5 产物机读化 · v1.1 拆 P020/P021)

```yaml
capability_matrix:
  generated_at: "<date>"
  platform: <frontend_kind>
  audience: <primary>
  subsystems:
    - { name: "engine",               status: ok,    action: "" }
    - { name: "contract_gate_P021",   status: ok,    action: "" }            # 跨端数据流,原生更相关
    - { name: "contract_gate_P020_map", status: adapt, action: "native UI-tree assert (no DOM)" }
    - { name: "visual_spec_table",    status: ok,    action: "px→pt/dp" }
    - { name: "visual_demo",          status: adapt, action: "approximate-html" }
    - { name: "visual_baseline_scan", status: adapt, action: "native token source" }
    - { name: "dev_verify",           status: adapt, action: "testflight/emulator" }
    - { name: "acceptance",           status: adapt, action: "maestro driver + results normalizer (HIGH cost)" }
    - { name: "pm_gray",              status: ok,    action: "" }
  # status: ok(✅) | adapt(🟡) | na(⛔)
```

## 附录 B · 受众判定速查(供 Gate 0.5 与 A1 引用 · 不变)

| 看到这些 → | 提名 | "劝退"模型 | 体验路径 | 设计火力 |
|---|---|---|---|---|
| RBAC/后台/多租户/SSO/审计/报表/席位 | toB | 学不会·绕开·影子 IT | 角色→任务→完成效率 | 信息密度·渐进披露·角色 IA·批量 |
| 注册引导/社交登录/推送/内购/裂变/漏斗埋点 | toC | 首屏跳出·漏斗流失 | 拉新→Aha→留存 | 降摩擦·激活漏斗·空态即引导·召回 |
| 两套都命中(marketplace / 自助 SaaS) | both | 两套并存 | 按 surface 各画一份 | 两套分别施加,不混用 |

---

> **下一步**:落地 §6 **Wave 1**(① 双轴字段 + ② Gate 0.5 含 M1 消解 + ③ cp 四张路径卡 + ⓪ 填回归集),自包含、可独立验证,跑通后推 **Wave 2**(④⑤ 劝退机器)。**Wave 3(看板)等首条真实 run、Wave 4(原生适配器)等首个原生项目** —— 信号未到不开工。
