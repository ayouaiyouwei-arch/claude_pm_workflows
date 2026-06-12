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

## 第 3 步：整理梳理结果（对话里呈现，仍不写文件）

把第 2 步的候选整理成一张"待确认清单"，分 4 块：
- A. 技术栈 + 端结构（带证据文件）
- B. 核心架构黑名单候选（N 项，每项带"动它的回归半径"+ 判定路径）
- C. 领域术语候选（每对带"易混淆于"+ 来源实体）
- D. 视觉基线候选（有前端时 · 主色/品牌色/允许色系白名单/字号间距阶梯 · 每项带频次与样例文件）

---

## 第 4 步：🚦 Gate · 写入前逐项问用户确认（强制 · 用户明确要求）

**这是最重要的一步。** 用 `AskUserQuestion`（或逐块询问）把第 3 步的候选交给用户：

> "我梳理出了你项目的候选配置（基于实际代码，标了出处）。**在写进 PROJECT-PROFILE 之前请你确认**：
>  - 核心架构黑名单：我提名了这 N 项，你要增 / 删 / 改哪些？
>  - 领域术语：这几对易混淆术语对吗？还有要补的吗？
>  - 技术栈/端清单：对吗？
>  - （有前端时）视觉基线：实测主色是 X 系、品牌色候选 #XXX（出现 N 次）、允许色系白名单 [...]——对吗？此后 UI 设计将被强制贴着这套风格走，超出白名单的颜色会被打回"

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
   - § 一 项目基本信息 / § 二 git 约定 / § 三 核心架构黑名单 / § 四 领域术语 / § 五 技术栈 / § 六 验收环境（如已给）/ § 七 偏好
2. **`CLAUDE.md`**：
   - 把"首次使用检测"段保留（不删，便于他人 clone 后仍能检测）
   - 如启用双向分支隔离 → 在"本项目专属 LOCKED 经验"段追加一条"分支隔离"铁律（参 robobus P015 做法）
3. **`optimization/agent-versions.json`**：初始化 10 个 agent 版本号为 v1.0
4. **`product-docs/baseline/`**：确认 3 个空台账（01 版本/02 差异/03 变更）就位，写入首条"基线建立"记录
4.5.（有前端时）**`product-docs/visual-baseline/`**：按 `extract-visual-baseline` skill 第 4 步模板落 01~06 草稿（确认后去"待 PM 确认"标），`00-调查方法.md` 登记本次扫描（日期/范围/文件数/commit SHA）；`08-交互最佳实践参考.md` 从通用模板起步（行业沉淀 · 非提取物）；PROJECT-PROFILE § 七回填"视觉基线目录 = product-docs/visual-baseline/"
5.（可选）如用户给了验收环境 → 生成本项目的"验收环境必读"草稿到 `knowledge/patterns/`（参 robobus P006）
5.5 **防御栈接线（patch-014 · 必做）**：
   - **脚本参数区**：按 PROJECT-PROFILE § 二 核对/调整 `scripts/git-hooks/pre-push`、`scripts/git-sync.sh`、`scripts/git-biz-push.sh` 头部 ⚙️ 参数区（推送分支模式 / 镜像路径 / 派活提示词文件名 / 拉取分支模式 / commit 身份；默认值 = 双向隔离惯例，同款工作流零改动）
   - **git 硬闸挂载**（仅双向隔离仓 · 可直推 main 的仓**不挂**）：`git -C code/<仓> config core.hooksPath "$(pwd)/scripts/git-hooks"`，挂后干跑验证：`echo "refs/heads/main <任意SHA> refs/heads/main <任意SHA>" | bash scripts/git-hooks/pre-push`（应输出 [GUARD-G1] 拦截）
   - **CC hooks**：`.claude/settings.json` 随骨架自带（guard-bash / post-csv-validate / session-start-brief 三件套 + deny 9 条），无需额外配置——**hooks 配置在会话启动时加载，init 完成后提醒用户重启会话生效**
   - **密钥**：`mkdir -p ~/.config/$(basename "$(pwd)") && cp scripts/secrets.env.example ~/.config/$(basename "$(pwd)")/secrets.env && chmod 600 ~/.config/$(basename "$(pwd)")/secrets.env`，让用户填真实值（仓内禁写密码本体）

---

## 第 6 步：收尾告知

```
✅ 项目接入完成：<项目名>
- 代码快照：code/<仓库名> @ <短SHA>（分支 <拉取分支>）
- PROJECT-PROFILE.md 已填：核心架构黑名单 N 项 / 领域术语 M 对 / 技术栈 X
- 10 个 agent 版本号已初始化 v1.0
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
