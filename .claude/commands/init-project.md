# /init-project · 新项目接入向导（onboarding）

> 一套全新流水线骨架接入某个项目时跑这个命令。**只跑一次**，跑完 `PROJECT-PROFILE.md` 从"占位"变"已初始化"。
>
> 核心原则（用户明确要求）：
> 1. **先告知用户要提供哪些前置准备信息**（git 等），不要默默开始
> 2. **拉取代码后主动梳理**项目的不可直接搬运的"知识"（核心架构黑名单 / 领域术语 / 技术栈）
> 3. **写入任何文档之前，必须逐项问用户确认**——绝不自作主张写 LOCKED

---

## 你（主对话）的职责

你是接入向导编排者。整个流程是 6 步，**第 1 步和第 4 步是强制 Gate（停下等用户）**。

---

## 第 0 步：开场说明（必做）

对用户说明这是空白骨架接入，并**列出前置准备清单**：

> "欢迎接入新项目。这套流水线的'流程引擎'是通用的，但每个项目的'知识'（核心架构、领域术语、技术栈）不能直接搬——我会**拉你的代码主动梳理**，但**写进配置前会逐项问你确认**。
>
> 开始前请提供以下**前置准备信息**：
> 1. **代码仓库地址**（git URL）+ 凭据（SSH key 已配 / token / 其他）
> 2. **拉取分支**：我从哪条分支拉只读快照？（如 `main` / `release/v*`）
> 3. **推送策略**：交付包要不要推回 git？需要的话推到哪条分支？是否要'拉一条推一条'的双向隔离（防 PM 私有内容污染研发仓）？
> 4. **项目名 + 一句话定位**
> 5.（可选，验收时再给也行）验收环境：前端/后端地址、测试账号、是否可写库"

**等用户回答完 1~4（5 可选）再进第 1 步。** 信息不全就追问，不要脑补。

---

## 第 1 步：🚦 Gate · 确认前置信息 + 拉代码

把用户给的信息复述确认，然后拉代码到 `code/`：

```bash
# 按用户给的仓库 + 分支
cd code
git clone <用户给的仓库地址> <仓库名>   # 或 git fetch 已有的
cd <仓库名>
git checkout <用户给的拉取分支>
git pull
git rev-parse --short HEAD              # 记下快照点
```

拉取失败（凭据/网络）→ 把原文错误告诉用户，问是重试还是换方式。**不要跳过。**

---

## 第 2 步：主动梳理（分析 code/ · 不写文件）

拉到代码后，**主动 grep/读** 出以下候选（这一步只分析、只在对话里汇报，不写任何文件）：

### 2.1 技术栈 + 端结构
```bash
cd code/<仓库名>
ls package.json pom.xml go.mod build.gradle 2>/dev/null     # 技术栈线索
cat pnpm-workspace.yaml 2>/dev/null || ls packages/ 2>/dev/null   # 是否 monorepo + 端清单
```
推断：前端栈 / 后端栈 / 是否 monorepo / 触及端清单 / 构建命令。

### 2.2 核心技术架构黑名单候选（最重要）
扫描"动了会大范围回归 / 不可逆 / 影响所有消费者"的结构：
- monorepo 包拆分（`packages/*` / workspace 配置）
- 跨端共享契约（`shared/` / 公共 SDK）
- 接口代码生成产物（`generated/` / orval / openapi / protobuf）
- DB schema / 迁移（`migration/` / flyway / alembic / prisma）
- 鉴权模块（`auth/`）
- 技术栈/构建（package.json / pom.xml 锁定）
- CI/部署（`.github/` / Dockerfile / k8s）
→ 提名 N 项候选（数量随项目，5~9 项常见）。

### 2.3 领域术语候选（防近义混淆 P004）
grep 核心实体类/接口/枚举，挑出**容易被 AI 划等号但实际不同**的近义概念：
```bash
grep -rohE "class [A-Z][A-Za-z]+|enum [A-Z][A-Za-z]+" --include=*.java --include=*.ts code/<仓库名>/ | sort -u | head -60
```
→ 提名易混淆术语对（如"站点 vs 场站"、"订单 vs 工单"）。

> ⚠️ 全程遵守 P007 实证驱动：每个候选都标出**它来自哪个文件/类**（commit SHA），不凭印象。

### 2.4 视觉基线提取（patch-010 · 有前端 UI 时必做）

先检测项目有无前端：

```bash
# package.json 含 react/vue/svelte/angular 任一，或存在 *.tsx / *.vue 文件 → 有前端
grep -lE '"(react|vue|svelte|@angular/core)"' code/<仓库名>/package.json code/<仓库名>/*/package.json 2>/dev/null
find code/<仓库名> -name "*.tsx" -o -name "*.vue" | grep -v node_modules | head -3
```

- **有前端** → 按 `extract-visual-baseline` skill 第 1~4 步跑提取（`python3 scripts/visual-baseline-scan.py --dirs <各前端端 src/> --out /tmp/visual-baseline-result-<日期>.json`），整理出"视觉基线候选"：实测主色族 / 中性族 / 语义色候选 / 品牌色候选（高频硬编码 hex）/ 字号阶梯 / 间距阶梯 / 圆角阴影惯例 / 组件清单 / UI 依赖（检出自建体系则提名"不引"的组件库黑名单）
- **无前端（纯后端）** → 跳过，§ 七记"是否常含 UI 类需求 = 否 / 视觉基线目录 = 无"

> 这一步兑现 A1.5 必读里"`product-docs/visual-baseline/` 各文件由 /init-project 在有设计系统时生成"的承诺——不做这步，A1.5 跑 UI 需求时没有项目风格事实源，只能凭通用最佳实践自由发挥（不会长得像你的项目）。

---

## 第 2.5 步：🚦 Gate 0.5 · 双轴适配体检（UPGRADE Wave 1 ② · 2026-06-16 · 仍不写文件）

> 目的:接入时就把"这个项目形态会让流水线哪里需要适配"显式暴露成一张能力矩阵,而不是等跑需求时才撞坑。沿用既有"grep 提名 → PM 拍板"套路。**两条正交轴各自判定**(见 PROJECT-PROFILE § 5.1)。

### 2.5.1 平台探测(**提名信号 · 非机械判定 · 必先有序消解**)

> ⚠️ **关键(M1)**:下表是**提名信号**,不是确定性分类。多个信号会**同时命中**(RN 仓同时像 native-ios+native-android+rn,还会触发 2.4 的 web 探测;Flutter 同时像两种 native)。**必须先跑有序消解,再交 PM 拍板**,否则会错误提名。

**有序消解规则(先判、命中即短路):**
1. `package.json` 含 `react-native` **或** 存在 `pubspec.yaml` → **先定 `rn` / `flutter`**,**短路掉** native-ios / native-android 的"壳目录信号"(它们的 `ios/` `android/` 是生成壳);
2. **同时排除 2.4 的 web 误判**:`react-native` 存在时,2.4 的 web 探测(`grep "(react|vue|...)"` + `.tsx`)命中**不得**把 RN 判成 web;
3. 仅当 1/2 未命中,才用壳目录/构建文件信号提名 `native-*` / `desktop` / `web`;
4. 消解后仍多命中 → **全部作为候选升 PM**,PM 拍板定 `frontend_kind`(人工 Gate 兜底,消解只让候选更干净)。

```bash
cd code/<仓库名>
# 先判 RN / Flutter（最高优先，短路 native-*）
grep -l '"react-native"' package.json */package.json 2>/dev/null   # → rn
ls pubspec.yaml 2>/dev/null && ls lib/*.dart 2>/dev/null | head -1  # → flutter
# 仅在上面都空时，才看原生壳 / desktop
ls *.xcodeproj Package.swift Podfile 2>/dev/null                    # → native-ios
find . -name AndroidManifest.xml -not -path '*/node_modules/*' | head -1   # → native-android
grep -l '"electron"' package.json 2>/dev/null; ls src-tauri 2>/dev/null    # → desktop
```

| frontend_kind | 提名信号 | 优先级 |
|---|---|---|
| rn | `react-native` in package.json + `ios/`+`android/` | **最高(短路 native-*)** |
| flutter | `pubspec.yaml` + `lib/**.dart` | **最高(短路 native-*)** |
| native-ios | `*.xcodeproj` / `Package.swift` / `Podfile`(且非 rn/flutter 壳) | 次 |
| native-android | `AndroidManifest.xml` + `build.gradle(.kts)` + `*.kt`(且非 rn/flutter 壳) | 次 |
| desktop | `electron` in package.json / `src-tauri/` | 次 |
| web | react/vue/svelte/angular(`react-native` 存在时不触发) | 次 |
| none | 以上皆无 = 纯后端 | 兜底 |

### 2.5.2 受众探测(**代码只提名 · PM 必拍板**)

受众是**业务事实**,不像技术栈能从代码确凿推出 —— 代码只负责提名,PM 必拍:

```bash
# toB 信号
grep -rliE "rbac|tenant|saml|sso|audit.?log|admin|workspace" code/<仓库名>/ --include=*.{ts,tsx,java,kt} | head
# toC 信号
grep -rliE "onboarding|signup|push|in.?app.?purchase|invite|referral|funnel|analytics" code/<仓库名>/ --include=*.{ts,tsx,swift,kt} | head
```

| 命中 → | 提名 | 信号 |
|---|---|---|
| toB | RBAC/后台/多租户/SSO/审计日志/报表导出/席位计费 |
| toC | 注册引导/社交登录/推送/内购/分享裂变/应用商店/漏斗埋点 |
| both | 两套都命中:marketplace(C 端 app + B 端商家后台)、自助 SaaS |

### 2.5.3 产出:能力矩阵(交 PM 的"判断坑"机制)

逐子系统标 ✅可用 / 🟡需适配 / ⛔不适用 + 适配动作(下表为 web↔C 端原生示例,按实际探测结果填):

| 子系统 | web | C 端原生 | 适配动作 |
|---|---|---|---|
| 8-agent 流程 / Gate / evals 自进化 | ✅ | ✅ | 无 |
| 契约闸 P021 跨端数据流 + schema 黑名单 | ✅ | ✅(更相关) | 无 |
| 契约闸 P020 @map DOM 钩子断言 | ✅ | 🟡 | 原生无 DOM,换原生 UI 树断言(Maestro view-hierarchy / XCUITest a11y id) |
| A1.5 视觉规范 spec 表(px 级) | ✅ | ✅ | 单位 px→pt/dp,组件名映射原生 |
| A1.5 HTML demo | ✅ | 🟡 | `visual_demo_mode=approximate-html` 或 `figma-ref` |
| 视觉基线扫描 visual-baseline-scan.py | ✅ | 🟡 | 改读原生 token 源 |
| dev-verify / 灰度 smoke | ✅ | 🟡 | 改 TestFlight/内测/模拟器 |
| acceptance-regression(Playwright) | ✅ | ⛔→🟡 | 换 driver(Maestro/Appium)+ **results 归一化器(高成本适配器工程)** |
| P013 PM 灰度主观体验 | ✅ | ✅(真机更自然) | 无 |

> 这张矩阵在第 4 步 Gate 一并交 PM 拍板;PM 确认后第 5 步写入双 profile + `capability_matrix`,**🟡/⛔ 的项当场登记为已知 deviation**(复用现有"登偏差"模式),不假装能跑。引擎层(8 agent + evals + 契约闸 P021)在任何平台/受众下 100% 可用,这是底线。

---

## 第 3 步：整理梳理结果（对话里呈现，仍不写文件）

把第 2 步 + 第 2.5 步的候选整理成一张"待确认清单"，分 5 块：
- A. 技术栈 + 端结构（带证据文件）
- B. 核心架构黑名单候选（N 项，每项带"动它的回归半径"+ 判定路径）
- C. 领域术语候选（每对带"易混淆于"+ 来源实体）
- D. 视觉基线候选（有前端时 · 主色/品牌色/允许色系白名单/字号间距阶梯 · 每项带频次与样例文件）
- E. 双轴适配体检（平台提名 + 受众提名 + 能力矩阵 🟡/⛔ 项及适配动作 · UPGRADE Wave 1 ②）

---

## 第 4 步：🚦 Gate · 写入前逐项问用户确认（强制 · 用户明确要求）

**这是最重要的一步。** 用 `AskUserQuestion`（或逐块询问）把第 3 步的候选交给用户：

> "我梳理出了你项目的候选配置（基于实际代码，标了出处）。**在写进 PROJECT-PROFILE 之前请你确认**：
>  - 核心架构黑名单：我提名了这 N 项，你要增 / 删 / 改哪些？
>  - 领域术语：这几对易混淆术语对吗？还有要补的吗？
>  - 技术栈/端清单：对吗？
>  - （有前端时）视觉基线：实测主色是 X 系、品牌色候选 #XXX（出现 N 次）、允许色系白名单 [...]——对吗？此后 UI 设计将被强制贴着这套风格走，超出白名单的颜色会被打回
>  - **双轴适配（Gate 0.5）：平台 = <提名 frontend_kind>、受众 = <提名 primary>；能力矩阵里 <N> 项需适配（🟡/⛔），适配动作 = <逐项>——确认后这些当场登记为已知 deviation，流水线不会假装能跑它们**"

用户可能：
- 确认全部 → 进第 5 步
- 增删改某几项 → 改完再复述一遍确认
- 说"某项我也不确定" → 标 `🔍 推测 · 待 sync 后回填`（P007 选项 B），不写强约束

**绝不允许跳过本 Gate 直接写文件。**

---

## 第 5 步：写入配置（用户确认后才执行）

确认后，主对话写：

1. **`PROJECT-PROFILE.md`**：
   - § 〇 初始化状态 → "已初始化 · <日期>"
   - § 一 项目基本信息 / § 二 git 约定 / § 三 核心架构黑名单 / § 四 领域术语 / § 五 技术栈（**含 § 5.1 双轴 `platform_profile` / `audience_profile` 按 Gate 0.5 拍板结果填实**）/ § 六 验收环境（如已给）/ § 七 偏好
   - **`capability_matrix`（Gate 0.5 产物）写入 § 5.1 下或 § 七附录；🟡/⛔ 项同步登记为已知 deviation（按 `log-diff-entry` skill）**
2. **`CLAUDE.md`**：
   - 把"首次使用检测"段保留（不删，便于他人 clone 后仍能检测）
   - 如启用双向分支隔离 → 在"本项目专属 LOCKED 经验"段追加一条"分支隔离"铁律（参某历史项目实战教训做法 · 示例）
3. **`optimization/agent-versions.json`**：初始化 11 个 agent 版本号为 v1.0
4. **`product-docs/baseline/`**：确认 3 个空台账（01 版本/02 差异/03 变更）就位，写入首条"基线建立"记录
4.5.（有前端时）**`product-docs/visual-baseline/`**：按 `extract-visual-baseline` skill 第 4 步模板落 01~06 草稿（确认后去"待 PM 确认"标），`00-调查方法.md` 登记本次扫描（日期/范围/文件数/commit SHA）；`08-交互最佳实践参考.md` 从通用模板起步（行业沉淀 · 非提取物）；PROJECT-PROFILE § 七回填"视觉基线目录 = product-docs/visual-baseline/"
5.（可选）如用户给了验收环境 → 生成本项目的"验收环境必读"草稿到 `knowledge/patterns/`（参某历史项目"验收环境必读"做法 · 示例）
5.5 **防御栈接线（patch-014 · 必做）**：
   - **脚本参数区**：按 PROJECT-PROFILE § 二 核对/调整 `scripts/git-hooks/pre-push`、`scripts/git-sync.sh`、`scripts/git-biz-push.sh` 头部 ⚙️ 参数区（推送分支模式 / 镜像路径 / 派活提示词文件名 / 拉取分支模式 / commit 身份；默认值 = 双向隔离惯例，同款工作流零改动）
   - **端白名单**：把 `scripts/validate-evals-csv.sh` 的 `SIDES` 占位（`'<端1>'…`）替换为本项目真实端清单（按 PROJECT-PROFILE § 五，与 `evals/_runs字段说明.md` 列 4 同步）。未替换前端校验会跳过并提示，替换后才对 runs.csv 触及端生效
   - **git 硬闸挂载**（仅双向隔离仓 · 可直推 main 的仓**不挂**）：`git -C code/<仓> config core.hooksPath "$(pwd)/scripts/git-hooks"`，挂后干跑验证：`echo "refs/heads/main <任意SHA> refs/heads/main <任意SHA>" | bash scripts/git-hooks/pre-push`（应输出 [GUARD-G1] 拦截）
   - **CC hooks**：`.claude/settings.json` 随骨架自带（guard-bash / post-csv-validate / session-start-brief 三件套 + deny 11 条），无需额外配置——**hooks 配置在会话启动时加载，init 完成后提醒用户重启会话生效**
   - **密钥**：`mkdir -p ~/.config/$(basename "$(pwd)") && cp scripts/secrets.env.example ~/.config/$(basename "$(pwd)")/secrets.env && chmod 600 ~/.config/$(basename "$(pwd)")/secrets.env`，让用户填真实值（仓内禁写密码本体）

---

## 第 6 步：收尾告知

```
✅ 项目接入完成：<项目名>
- 代码快照：code/<仓库名> @ <短SHA>（分支 <拉取分支>）
- PROJECT-PROFILE.md 已填：核心架构黑名单 N 项 / 领域术语 M 对 / 技术栈 X
- 11 个 agent 版本号已初始化 v1.0
- baseline 3 台账已建（空，随用随登记）

下一步：
- **存量项目强烈建议先跑 /init-docs**（存量文档基建：模块 6 件套 + 用例库底座，给 /new-feature 当事实源）
- 跑第一个需求：/new-feature <一句话>
- 流水线会引用 PROJECT-PROFILE.md 做核心架构/领域术语判定
- 跑几轮后，pipeline-retrospector 会自动沉淀你项目专属的 patterns（越用越聪明）
```

---

## 不允许的事

- ❌ 不告知前置准备就默默开始（第 0 步必做）
- ❌ 拉代码失败就跳过（第 1 步必须成功或问用户）
- ❌ 梳理结果不经用户确认直接写 PROJECT-PROFILE（第 4 步 Gate 强制）
- ❌ 凭印象提名核心架构/术语（必须 grep 实证，标出处 · P007）
- ❌ 给"我也不确定"的项写强约束（标推测，对齐 P007 选项 B）
