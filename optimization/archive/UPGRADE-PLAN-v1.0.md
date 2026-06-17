# 流水线优化方案 · 可视化 / 双轴适配 / 产测分工

> **文档性质**:战略级优化路线图(roadmap)。**不是** `optimization/` 补丁生命周期里的 `patches-pending` 条目——本文规划的 agent prompt 改动,落地时仍**逐条走 `/optimize-prompts`**(版本 bump + LOCKED 锚点校验 + regression-set 回归 + CHANGELOG 留痕),非 prompt 的结构性改动(字段/脚本/看板)走常规变更登记。
>
> | 字段 | 值 |
> |---|---|
> | 版本 | v1.0(草案 · 待 PM 评审) |
> | 日期 | 2026-06-16 |
> | 作者 | PM(hyukminpark) |
> | 适用骨架 | claude-product-pipeline(项目无关骨架版) |
> | 关联文件 | `CLAUDE.md` · `PROJECT-PROFILE.md` · `.claude/commands/init-project.md` · `.claude/agents/product-expert.md` · `.claude/agents/visual-spec-author.md` · `acceptance.config.template.json` · `knowledge/methodology/` |
> | 编号约定 | 本文不自算编号;落地拆包时一律 `bash scripts/next-id.sh` 分配(遵守骨架"禁自算编号"铁律) |

---

## 0. 摘要(TL;DR)

本方案回应 PM 提出的三个改造方向,并补齐其中最关键的一条隐含轴:

1. **可视化 / 产品化** → 建一座**只读控制塔**(read-only),渲染流水线**已经在产出**的 `pipeline-state.json` + `evals/*.csv`,让非技术人员看懂 agent 协作、工作进度与实时指标。分三层,推荐只做到 Tier 1。
2. **接入坑 + 多端/多受众适配** → 引入**两条正交轴**——`platform_profile`(技术:web/native)与 `audience_profile`(受众:toB/toC)——并在 `/init-project` 增设 **Gate 0.5 适配体检**,把"坑"在接入时就显式暴露成一张能力矩阵;两条 web 耦合轨(视觉轨 / 验收轨)改为**可插拔适配器**;产品设计层按受众**门控引入**方法论卡片,并新增"用户体验路径 + 劝退点扫描"产物。
3. **产测分工** → **逻辑拆分(推荐) / 物理拆仓(否决)**。A6/A7 必须留在 `/new-feature` 同一次 run 内(闭环驱动用例生成的事实源),独立验收轨可获得独立命令入口。

**一句话核心洞察**:`toB/toC`(受众)≠ `web/native`(技术),是正交的第二条轴;"会不会劝退 / 体验路径"挂在**受众轴**上,不在技术平台轴上。

---

## 1. 背景与问题陈述

### 1.1 当前流水线是什么

本工作空间不是一个传统"应用",而是一套 **Claude Code 工作空间**:
- **runtime = Claude Code 本身**;agent = `.claude/agents/*.md` 子代理;编排 = `/new-feature` 这个 markdown prompt;
- 8 个流水线 agent(A1 产品 → A1.5 视觉 → A2 需求审 → A3 技术 → A4 范围审 → A5 二次校验 → A6 用例 → A7 用例审)+ 2 个 meta agent + legacy-excavator;
- 5~6 个人工 Gate;状态落在 `pipeline-state.json`(每包一份)+ `deliverables/*.{draft,active,done}` 状态机;
- 指标落在 `evals/{runs,loops,escapes,cases}.csv`(由 `pipeline-retrospector` 在升 `.done` 后写,且写时 schema 校验);
- 自进化闭环:retrospect → `/pipeline-review`(周)→ `/optimize-prompts`(月,把反复教训折回 agent prompt);
- 确定性防护:收口脚本(next-id/promote)+ git pre-push 硬闸 + CC hooks 三件套。

> **任何改造都要顺这个纹理**:不要做一个反过来驱动 agent 的后端(那是和 Claude Code 抢方向盘),而是**渲染/扩展流水线已产出的产物**。本原则贯穿全文。

### 1.2 三个待解问题(PM 提出)

| # | 问题 | 本质 |
|---|---|---|
| Q1 | 抽象成产品 / 加可视化页面,让非技术人员看懂 agent 协作与工作过程 + 实时指标 | 露出问题 + 翻译问题(数据大多已存在) |
| Q2 | 新项目接入会遇到的坑;框架解决不了时有无机制引导用户判断坑;C 端客户端能否适配 | 项目形态多样性 → 需要"早暴露 + 可绕过"机制 |
| Q3 | 产品和测试工作区放一起,拆分是否更好 | 闭环耦合 vs 角色/节奏分工 |

### 1.3 贯穿性洞察:两条正交轴

接入一个新项目时,影响流水线适配的是**两条相互独立的轴**:

- **`platform_profile`(技术轴)**:web / native-ios / native-android / flutter / rn / desktop / none / hybrid —— 决定**技术怎么落地**(demo 用 HTML 还是真机、验收用 Playwright 还是 Maestro)。
- **`audience_profile`(受众轴)**:toB / toC / both —— 决定**给谁用、体验路径长什么样、怎么算"劝退"**。

二者正交:toB 后台可以是 web 也可以是 native;toC app 同理。**Q1 的可视化主要受工程结构影响;Q2 的"坑"两轴都涉及;"劝退/体验路径"只受受众轴影响。** 把这两轴分清,是本方案不建错地方的前提。

---

## 2. 设计总则(不可动摇的约束)

落地任何一块都必须守住下列约束,否则会破坏骨架的核心价值(可移植 + 自进化):

1. **只读层不驱动流水线**:看板/事件流只读文件,绝不反向编排 agent;它挂了流水线照跑。
2. **引擎通用 / 知识专属 / 数据从空长**(现有三层不变):新增的 `platform_profile`/`audience_profile` 属"知识层",收敛进 `PROJECT-PROFILE.md` 单一真理源,不在各 agent 里硬编码。
3. **双轴正交**:两个 profile 字段独立判定、独立门控,禁止合并成单枚举。
4. **方法论给"为什么",项目事实给"用什么"**(现有三条总则不变):新增卡片只供判断框架,**严禁**据此引入项目外色板/字号/组件库;与项目视觉基线冲突时以项目文件为准。
5. **门控读取,不全读**:平台/受众门控的卡片,不命中条件不读 —— web/toB 项目永不被 toC/native 卡片污染,零负担。
6. **机械约束下沉脚本,prose 只留判断型约束**(现有哲学):能用脚本/字段/hook 强制的,不靠 prompt 自觉;能判断的(如"劝退风险")交人工 Gate/软闸。
7. **prompt 改动走 `/optimize-prompts`**:不手改 `.claude/agents/*.md`,不触碰 LOCKED 锚点,改完跑 regression-set。
8. **P015 业务语言**:所有面向 PM/非技术人员的露出(看板标签、Gate 提示、能力矩阵)用业务语言,不堆技术黑话。

---

## 3. 改造一:可视化 —— 只读控制塔

### 3.1 现状与缺口

- 当前唯一的"露出"是 `scripts/hooks/session-start-brief.sh`:开场注入 ≤15 行纯文字(在飞包 / 流水线进度 / 账本对账)——非技术人员看不懂、看不到实时协作、看不到趋势。
- 指标全在 CSV 里,结构化且 schema 校验过,但没有任何渲染。

### 3.2 关键事实:数据 90% 已存在

| 想看的东西 | 数据源(现成) | 缺口 |
|---|---|---|
| 当前在跑哪个 agent / 哪个 Gate 在等谁 | `pipeline-state.json`:`current_step` / `steps{}` / `gates{}` | 仅缺渲染 |
| "卡在 agent vs 卡在等 PM" | Gate 双时间戳 `asked_at` + `at`(见 `.claude/commands/new-feature.md` 第 0 步)| 仅缺渲染 |
| 指标趋势 / 拦截漏斗 / Loop 收敛 | `evals/{runs,loops,escapes}.csv` | 仅缺渲染 |
| agent 内部实时动作("此刻在干嘛")| 无结构化事件流 | **需新增**(见 Tier 1)|

### 3.3 三层方案

| 层 | 内容 | 成本 | 何时做 |
|---|---|---|---|
| **Tier 0** | 纯只读看板(单 HTML 或小 Vite 应用),watch `pipeline-state.json` + 三张 CSV,渲染:① 每条在飞流水线的流程图(哪个 agent 亮、哪个 Gate 等谁)② agent 耗时 vs PM 等待耗时拆分 ③ 指标趋势 | 低 | **优先** |
| **Tier 1** | 加一个 Claude Code hook(PostToolUse / SubagentStop)把 `{ts, agent, tool, event}` 追加到 `evals/events.jsonl`;看板 tail 这个流 → 实时"agent 在干嘛" | 中 | 要真·实时再做 |
| **Tier 2** | 用 Claude Agent SDK + 小服务包成多人托管产品 | 高 | **暂不做**,等真有外部用户需求 |

**推荐边界**:做到 Tier 1 即覆盖"让非技术人员看懂协作 + 实时 + 指标"的 95%。Tier 2 会把"个人工作空间"变成"托管产品",并危及"项目无关 + 单文件配置"的可移植性,需求未明朗前不碰。

### 3.4 两个硬约束

1. **看板永远只读**。一旦它开始驱动 agent,可移植性即崩。
2. **"非技术人员可读"主要是翻译问题**:复用现有 P015 铁律——显示"产品细化 / 范围把关 / 用例生成",而不是"A4 scope-reviewer"。看板内置一张 `agent → 业务名` 映射表。

### 3.5 数据契约(需小幅 enrich)

`pipeline-state.json` 建议补两个非破坏性字段,便于看板渲染时间线(不改 retrospector 既有逻辑):
- `steps.<Ax>.started_at` / `ended_at`(目前只有 `verdict`/`rounds`);
- `steps.<Ax>.label`(业务名,可由看板侧映射表代替,二选一)。

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

插在现有 `.claude/commands/init-project.md` **第 2 步(主动梳理)与第 4 步(确认)之间**,完全沿用现有"grep 提名 → PM 拍板"套路。

#### 4.2.1 平台探测信号(机械判定,标出处)

| frontend_kind | 探测信号 |
|---|---|
| native-ios | `*.xcodeproj` / `Package.swift` / `Podfile` |
| native-android | `AndroidManifest.xml` + `build.gradle(.kts)` + `*.kt` |
| flutter | `pubspec.yaml` + `lib/**.dart` |
| rn | `package.json` 含 `react-native` + 存在 `ios/` `android/` |
| desktop | `package.json` 含 `electron` / 存在 `src-tauri/` |
| web | react/vue/svelte/angular(现有逻辑) |
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
| 契约闸(P020/P021)+ schema 黑名单 | ✅ | ✅(更相关) | 无 |
| A1.5 视觉规范 **spec 表**(px 级) | ✅ | ✅ | 单位 px→pt/dp,组件名映射原生 |
| A1.5 **HTML demo** | ✅ | 🟡 | `visual_demo_mode=approximate-html` 或 `figma-ref` |
| 视觉基线扫描 `visual-baseline-scan.py` | ✅ | 🟡 | 改读原生 token 源 |
| dev-verify / 灰度 smoke | ✅ | 🟡 | 改 TestFlight/内测/模拟器 |
| acceptance-regression(Playwright) | ✅ | ⛔→🟡 | 换 driver(Maestro/Appium)+ results 归一 |
| P013 PM 灰度主观体验 | ✅ | ✅(真机更自然) | 无 |

PM 确认后写入双 profile,**🟡/⛔ 的项当场登记为已知 deviation**(复用现有"登偏差"模式),不假装能跑。

> **定性结论**:C 端的后端/逻辑/契约层接得很顺,甚至比 web 更吃契约闸;漏的只有"视觉 demo"与"验收驱动"两条,且都可降级、可换 driver,不是结构性不可用。

### 4.3 两条漏轨的适配器契约

#### 4.3.1 视觉轨(A1.5)

现 demo 形态在 `.claude/agents/visual-spec-author.md` 被 LOCKED 死成"单文件 index.html + Playwright 截图"。改为读 `visual_demo_mode` 分流:

| 模式 | 行为 |
|---|---|
| `html-demo`(web) | 照旧 |
| `approximate-html`(原生) | 产 HTML 近似预览 + spec 头部**强制写一行 deviation**:"此 demo 为近似预览,原生最终以真机/Figma 为准";4-lens 自评照跑(它评的是图,不在乎图怎么来) |
| `figma-ref`(有设计稿) | spec 引用 Figma frame,不产 HTML |

> 关键:A1.5 的 **px 级 spec 表对原生照样有价值**,只是换单位与组件名;漏的只有"零依赖 HTML"这一种载体,不是整条轨。改 LOCKED 段须走 `/optimize-prompts` 并 PM 决议留痕。

#### 4.3.2 验收轨(acceptance-regression)

现 `acceptance.config.template.json` 写死 `resultsSubpath: playwright-results/results.json`。但**报告引擎(按层级/模块/优先级/角色矩阵聚合 + P0 红线)是 runner 无关的**——它只读 `results.json`。改法:

- 加 `acceptance_driver` 字段 + 一个 **results 归一化器**:任何 runner(Maestro YAML flow / Appium)输出映射到现有 results schema;
- 报告引擎、L0–L5 分层、P0 红线闸**全部复用,零重写**;
- C 端落地首选 **Maestro**(YAML 最轻),次选 Appium;视觉回归 = 原生截图 diff。

#### 4.3.3 降级总原则

能跑就跑,不能跑就**标 🟡/⛔ + 吐适配器契约桩 + 登 deviation,绝不阻断流水线**。引擎层(8 agent + evals + 契约闸)在任何平台/受众下 100% 可用,这是底线。

### 4.4 受众驱动的产品设计(劝退 / 体验路径)

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

A2 已有第 11 项可用性软闸(0–4 分,≥3 分原样亮给 PM、绝不自动打回、三选一处置)。**这是放"劝退主观判断"的完美位置**(劝退天然主观,该升 PM 而非 agent 拍):
- toC 项目 → 软闸加 **drop-off severity** lens(这个交互会在漏斗哪一步吓走用户);
- toB 项目 → 软闸加 **效率/可学习性** lens(这个改动会不会让老用户重学)。

零新增 Gate,直接挂在已有软闸的处置三选一上。

#### 4.4.4(可选 · 高阶)让"劝退"可度量

A1 扫出的劝退点列成 risk register,喂给 **P013 PM 灰度主观体验**(现有最高信号输入)——PM 真机 5 分钟专门照劝退点走一遍;漏到灰度/线上的劝退问题关联进 `evals/escapes.csv`,让"劝退"从感觉变成账本。

### 4.5 知识卡片分层引入

接入点 = A1 设计方法论库映射表(`.claude/agents/product-expert.md` 的"触发条件→读哪张卡→用在哪"表)+ 降级链。**只加卡 + 加门控触发列,不改机制。**

#### 4.5.1 平台门控层(仅 `frontend_kind ∈ {native-*, flutter, rn, hybrid}` 读)

| 卡片 | 补的 C 端缺口 | 来源 |
|---|---|---|
| `gesture-patterns` | 手势/滑动/长按 | 已有用户级 skill,`cp` 快照 |
| `onboarding-first-run` | 首启引导/权限预热/空态 | 由 `onboarding-design` skill 改写 |
| `platform-hig` | iOS HIG / Material 约定 + 何时遵循 vs 突破品牌 | 需新写 |
| `permissions-priming` | 相机/定位/推送的请求时机与文案 | 需新写 |
| `notifications-reengagement` | 推送/召回/留存循环 | 需新写 |
| `offline-connectivity-states` | 弱网/离线态 | 需新写 |

#### 4.5.2 受众门控层(按 `audience_profile.primary` 读)

| 门控 | 卡片 | 已有/新写 |
|---|---|---|
| toC | `journey-map`(路径) · `onboarding-design`(激活) · `metrics-definition`(漏斗指标) | **三张已有 skill,`cp` 即可** |
| toC 新增 | `activation-funnel-dropoff`(劝退点扫描) · `friction-reduction` · `retention-loops` | 需新写(3) |
| toB | `information-architecture` · `navigation-patterns` · `hicks/millers-law` · `data-visualization` · `form-design` | **全部已在 30 卡片内,直接门控复用** |
| toB 新增 | `power-user-efficiency`(快捷/批量) · `progressive-disclosure`(可学习性) · `role-based-ia` | 需新写(3) |

> 🔑 **关键发现**:`journey-map` / `experience-map` 正是"体验路径"的方法论卡片——它们**作为 skill 已存在,但既没进 30 卡片快照、也没接进 A1**。这是体验路径推理缺位的根因。**第一步就是把它们 `cp` 进 `knowledge/methodology/` 并接入 A1 映射表。**

#### 4.5.3 接入 A1 映射表的样式(示例行)

```
| 触发条件 | 读哪张卡 | 用在哪 |
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
- `runs.csv` 一行把产品侧 A1–A5 与测试侧 A6/A7 指标**绑在同行** → 拆开则自进化闭环断;
- 闭环驱动用例生成(A6)把**产品模块文档当"覆盖义务分母"** → 拆开则用例又"永远不全"(正是它要根治的病);
- 单一 `PROJECT-PROFILE` / `knowledge/` → 拆开则双份维护、必然漂移。

### 5.3 推荐:逻辑拆分强化,物理不拆

| | 做法 |
|---|---|
| ✅ 该加强 | 给独立验收轨**独立命令入口**(对任意已发布 release 跑验收,不依赖 `/new-feature`);已有独立 report 目录与台账;多人/异节奏用 git worktree / 分支隔离 |
| ⛔ 绝不拆 | 流水线内 **A6/A7 必须与 A1–A5 留在同一次 run**;拆到另一工作空间 = 砍掉用例事实源 + 砍掉自进化闭环 |

**分界线**:拆的是"角色/节奏/轨道"(逻辑),不是"仓库/工作空间"(物理)。

---

## 6. 落地路线图(分期 · 切片 · 依赖)

| Phase | 切片 | 性价比 | 依赖 | 验证方式 |
|---|---|---|---|---|
| **P1 基础** | ① `platform_profile` + `audience_profile` 双字段写进 PROJECT-PROFILE 模板;② `/init-project` 插入 Gate 0.5 双轴探测 + 能力矩阵 | 最高 | 无 | 拿一个真实 repo(B/C 端皆可)跑体检,看提名准不准、矩阵到不到位 |
| **P1 基础** | ③ `cp` journey-map / experience-map / onboarding-design 进 `knowledge/methodology/` + 接入 A1 映射表 | 高(近零成本) | 无 | A1 在 toC 需求上能读到路径卡片 |
| **P2 核心** | ④ A1 新增「体验路径 + 劝退点扫描」产物(受众门控);⑤ A2 软闸加 drop-off / 效率 lens | 高 | ③ | 跑一个 toC + 一个 toB 需求,看产物分化是否正确、软闸是否升 PM |
| **P2 核心** | ⑥ 控制塔 Tier 0(只读看板) | 中高 | pipeline-state 小幅 enrich | 非技术人员试看,能否说出"现在卡在谁" |
| **P3 扩展** | ⑦ 视觉轨 `visual_demo_mode` 分流(解 LOCKED,走 /optimize-prompts);⑧ 验收 results 归一化器 + driver 字段 | 中 | ①② | 用一个原生 repo 跑通近似 demo + Maestro 验收报告 |
| **P3 扩展** | ⑨ 新写 6 张受众/平台卡片(toC 3 + toB 3);⑩ 控制塔 Tier 1(events hook) | 中 | ③④ | 卡片命中门控触发;看板有实时事件流 |

**关键路径**:① 是一切的锚点,先做。③ 近零成本立刻补上"体验路径"方法论。④⑤ 才是真正回答"会不会劝退"的机器。

---

## 7. 改动清单(影响面)

| 文件 / 资产 | 改动 | 走哪条流程 |
|---|---|---|
| `PROJECT-PROFILE.md`(模板)| 新增 `platform_profile` / `audience_profile` 段 | 常规变更 |
| `.claude/commands/init-project.md` | 插入 Gate 0.5(探测 + 能力矩阵 + 双轴提名) | 常规变更(command 非 agent) |
| `.claude/agents/product-expert.md`(A1) | 映射表加门控触发列 + 新增「体验路径/劝退」产物段 | **`/optimize-prompts`**(版本 bump v1.0→v1.1) |
| `.claude/agents/requirement-reviewer.md`(A2) | 第 11 项软闸加 drop-off / 效率 lens | **`/optimize-prompts`** |
| `.claude/agents/visual-spec-author.md`(A1.5) | demo 形态读 `visual_demo_mode`(改 LOCKED 段需 PM 决议) | **`/optimize-prompts`** + LOCKED 决议 |
| `acceptance.config.template.json` + 验收引擎 | 加 `acceptance_driver` + results 归一化器 | 常规变更 |
| `knowledge/methodology/` | `cp` 3 张已有卡 + 新写 6 张;更新 README 清单 | 常规变更 + CHANGELOG |
| `pipeline-state.json`(由 new-feature 写)| 补 `started_at/ended_at/label`(非破坏)| 常规变更 |
| 新增 `dashboard/`(只读看板)+ 可选 events hook | 新建 | 常规变更 |
| `scripts/hooks/`(可选 Tier 1)| 新增事件采集 hook | 接 `.claude/settings.json` |

> 所有 agent prompt 改动遵守 `optimization/README.md` 生命周期:LOCKED 锚点校验 + regression-baseline 快照 + regression-set 回归(A2/A4/A7)+ PROMPT-CHANGELOG 留痕 + agent-versions.json bump。

---

## 8. 风险与回滚

| 风险 | 缓解 |
|---|---|
| 看板演变成"驱动器",破坏可移植性 | 架构红线:看板只读,代码评审守住 |
| 改 A1.5 LOCKED 段引发视觉轨退化 | 走 /optimize-prompts + regression-baseline 快照,可一键回滚;PM 决议留痕 |
| 双轴字段误判(尤其受众) | 受众只由代码"提名",PM 必须拍板;判错可随时改字段(非 LOCKED 强约束,标推测对齐 P007 选项 B) |
| 新增卡片污染 web/toB 项目 | 严格门控触发,不命中不读;web/toB 永不触发 native/toC 卡 |
| 方案铺太大、迟迟不落地 | 按 §6 切片走,P1 自包含可独立验证后再推进 |

---

## 9. 本方案的验收标准(怎么算做成)

- [ ] 拿一个**真实 C 端原生 repo** 跑 `/init-project`,Gate 0.5 能正确提名 platform=native + audience,并产出能力矩阵(🟡/⛔ 项有适配动作)。
- [ ] 拿一个 **toC 需求**跑 `/new-feature`,A1 产出激活漏斗 + 劝退断崖;A2 软闸把高 drop-off 风险项升给 PM。
- [ ] 拿一个 **toB 需求**跑 `/new-feature`,A1 产出任务流程 + 效率摩擦点;web 项目**不触发**任何 toC/native 卡片。
- [ ] 控制塔 Tier 0 能让一个非技术同事在 10 秒内说出"现在卡在哪个环节、是在等 agent 还是等 PM"。
- [ ] 全程**引擎层零退化**:regression-set(A2/A4/A7)100% 通过;现有 8-agent 主流程在 web 项目上行为不变。

---

## 附录 A · 能力矩阵字段草案(Gate 0.5 产物机读化)

```yaml
capability_matrix:
  generated_at: "<date>"
  platform: <frontend_kind>
  audience: <primary>
  subsystems:
    - { name: "engine",            status: ok,      action: "" }
    - { name: "contract_gate",     status: ok,      action: "" }
    - { name: "visual_spec_table", status: ok,      action: "px→pt/dp" }
    - { name: "visual_demo",       status: adapt,   action: "approximate-html" }
    - { name: "visual_baseline_scan", status: adapt, action: "native token source" }
    - { name: "dev_verify",        status: adapt,   action: "testflight/emulator" }
    - { name: "acceptance",        status: adapt,   action: "maestro driver + results normalize" }
    - { name: "pm_gray",           status: ok,      action: "" }
  # status: ok(✅) | adapt(🟡) | na(⛔)
```

## 附录 B · 受众判定速查(供 Gate 0.5 与 A1 引用)

| 看到这些 → | 提名 | "劝退"模型 | 体验路径 | 设计火力 |
|---|---|---|---|---|
| RBAC/后台/多租户/SSO/审计/报表/席位 | toB | 学不会·绕开·影子 IT | 角色→任务→完成效率 | 信息密度·渐进披露·角色 IA·批量 |
| 注册引导/社交登录/推送/内购/裂变/漏斗埋点 | toC | 首屏跳出·漏斗流失 | 拉新→Aha→留存 | 降摩擦·激活漏斗·空态即引导·召回 |
| 两套都命中(marketplace / 自助 SaaS) | both | 两套并存 | 按 surface 各画一份 | 两套分别施加,不混用 |

---

> **下一步**:建议先落地 §6 的 P1 切片(① 双轴字段 + Gate 0.5;③ cp 三张路径卡片接入 A1),自包含、可独立验证,跑通后再推 P2。
