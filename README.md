# claude-product-pipeline

> **Turn a one-line product requirement into an engineer-ready delivery package — via an 8-agent [Claude Code](https://docs.claude.com/en/docs/claude-code) pipeline. Self-evolving, project-agnostic.**
> 把一句话需求孵化成研发可直接施工的交付包 —— 8 个 Claude Code agent 的流水线引擎。越用越聪明，项目无关。

![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d97757)
![Agents](https://img.shields.io/badge/agents-8%20+%202-blue)
![Project agnostic](https://img.shields.io/badge/project-agnostic-2ea44f)
![Self-evolving](https://img.shields.io/badge/self--evolving-eval%E2%86%92optimize%E2%86%92knowledge-purple)

**English** · [中文](#中文)

---

## What is this

A pipeline that turns *"I want feature X"* into a spec a developer (human or AI like Codex) can build from **without further clarification** — by routing it through **8 specialized Claude Code sub-agents + 5–6 human gates**, then sedimenting every run so the pipeline **gets smarter the more you use it**.

It ships as a **project-agnostic skeleton**: clone it, run `/init-project`, and it reads your codebase to build *your* project's rules. All project-specific knowledge lives in a single file — `PROJECT-PROFILE.md`.

## How it works

```mermaid
flowchart TD
    REQ([📝 One-line requirement]) --> A1[A1 · Product<br/>refine + Q&A]
    A1 --> A15[A1.5 · Visual spec<br/>UI needs only]
    A15 --> A2[A2 · Requirement review]
    A2 --> A3[A3 · Tech design]
    A3 --> A4[A4 · Scope review]
    A4 -->|large change| A5[A5 · Second check]
    A4 -->|small change| A6[A6 · Test cases]
    A5 --> A6
    A6 --> A7[A7 · Case review]
    A7 --> PKG([📦 Engineer-ready<br/>.draft package])
    PKG -. retrospect .-> KB[(runs.csv · cases.csv<br/>knowledge/patterns)]
    KB -. weekly /pipeline-review .-> KB
    KB -. monthly /optimize-prompts .-> A1
```

- **8 agents**: A1 Product → A1.5 Visual spec *(UI only)* → A2 Requirement review → A3 Tech design → A4 Scope review → A5 Second check *(only if A4 flags a large change)* → A6 Test cases → A7 Case review
- **2 meta-agents**: `pipeline-retrospector` (sediments each delivery) + `pipeline-evaluator` (weekly report)
- **Output**: a `deliverables/*.draft` package = the blueprint a developer/Codex builds from directly
- **Self-evolving loop**: every `.done` package writes to `runs.csv` / `cases.csv`; `/pipeline-review` produces a weekly report; `/optimize-prompts` folds recurring lessons back into the agent prompts

## Quick start

```bash
git clone https://github.com/ayouaiyouwei-arch/claude-product-pipeline.git my-project-pm
cd my-project-pm
# Open in Claude Code — CLAUDE.md auto-detects a fresh skeleton and lists what to provide
/init-project          # pulls your code, drafts rules, confirms with you, fills PROJECT-PROFILE.md
/new-feature "<your one-line requirement>"
```

## Design principle: generic engine, project-specific knowledge

| Layer | What | Portability |
|---|---|---|
| 🟢 **Engine** (process / reviews / evolution) | 8 agents + commands + evals/optimization/knowledge mechanics | **works as-is** |
| 🟡 **Knowledge** (project-specific) | core-architecture blacklist / domain terms / tech stack / git & acceptance conventions | **filled by `/init-project` into `PROJECT-PROFILE.md`** |
| 🔴 **Data** | each project's change logs / packages / learned patterns | **grows from empty** |

The key move: **all project-specific knowledge collapses into one file (`PROJECT-PROFILE.md`)** that every agent references — so porting to a new project = refilling one file.

## What's inside

```
PROJECT-PROFILE.md       # single source of project config
CLAUDE.md                # session preamble + first-run onboarding trigger
.claude/
├── agents/   (10)       # 8 pipeline agents + 2 meta agents
├── skills/   (22)       # packaging / promotion / testing / acceptance-regression / knowledge / baseline
└── commands/ (6)        # /init-project /new-feature /pipeline-review /optimize-prompts /babysit-active /iterate-A7
product-docs/baseline/   # version / diff / change ledgers (empty, grow as you go)
deliverables/_template/  # delivery-package template (12 root docs + snapshot + demo)
test/tools/e2e-scripts/  # independent acceptance e2e skeleton (L0–L5 + role matrix + config template)
knowledge/patterns/      # 4 built-in generic methodologies + your project's learned ones
evals/ · optimization/   # runs.csv + weekly reports · prompt patches + agent versions
```

## Built-in methodologies (ship with the skeleton)

Seven cross-project "battle rules" distilled from real projects:

- **P001 — UI granularity**: specs must state each interaction's granularity / position / 5 states / visibility
- **P002 — no tech-speak in PRDs**: requirements use business language, not routes / endpoints / file paths
- **P003 — no AI over-reach**: when ambiguous, ask — don't invent
- **P004 — no retrospect lag**: every `.done` must write `runs.csv` (3-layer guard built in)
- **P005 — dev-gray smoke verify**: after every `.done`, PM independently clicks through dev gray (`/dev-verify` · 3-layer guard built in)
- **P006 — A4 → A5 → G-gate → DRIFT 4-tier intercept**: technical commitments get challenged at A5, gated at G-checks, drift-logged on mismatch — zero rework on contract-fact misalignment
- **P007 — evidence-driven conventions**: grep real code before asserting any code convention, or mark it a guess

Everything else (domain-term confusion, acceptance env, branch isolation…) **your project grows on its own** after a few runs.

## Independent acceptance regression (built-in)

A **second track, separate from dev self-tests**: real-environment, black-box, PM-owned acceptance. Reusing the dev team's (often mocked) runner means your acceptance adds no independent signal — so the skeleton ships its own.

- **3 principles**: real env (no mock) · black-box behavior (no source/SQL peeking) · independent assertions (acceptance cases, not dev contracts) → never drifts from implementation
- **L0–L5 layers**: login smoke / module regression / role permission matrix / cross-module scenario / visual regression / one-command orchestration
- **Generic report engine** at `~/.claude/skills/acceptance-regression/`: aggregates Playwright `results.json` → a Markdown acceptance report (by layer / module / priority + role matrix + P0 red-line gate). Project values injected via `acceptance.config.json`.
- **New project**: drop an `acceptance.config.json` + write black-box specs → `pnpm acceptance:full` → an independent acceptance report. Engine reused, zero rewrite.

## The self-evolving loop

Every delivery feeds back into the engine — so it sharpens *per project*:

- **Sediment** — each `.done` package auto-writes `runs.csv` + `cases.csv`; a recurring lesson lands a `knowledge/patterns/` entry (via the `pipeline-retrospector` meta-agent).
- **Review** — `/pipeline-review` runs weekly: the `pipeline-evaluator` emits a report (pass rate, recurring misses, rubric sampling).
- **Optimize** — `/optimize-prompts` runs monthly: lessons raised ≥ N times **fold back into the agent prompts** (agent version bumped + changelogged), so the *next* feature is reviewed by smarter agents.
- **Highest-signal inputs** — not just test failures, but **independent-acceptance findings** (real-env black-box) and **PM gray-env hands-on** — exactly the signals a mocked dev runner misses.

Net effect: the engine ports as-is; the smarts regrow per project — recurring mistakes get caught earlier, estimates sharpen, and the agents themselves improve, automatically.

---
---

<a name="中文"></a>
# 中文

> 一套"用 AI agent 团队把一句话需求孵化成研发可直接施工的交付包"的流水线引擎。
> 本仓库是**项目无关骨架**——克隆下来接任何项目即可用，项目专属知识由 `/init-project` 向导梳理后写入 `PROJECT-PROFILE.md`。

## 这是什么

把"产品需求 → 研发交付"的过程拆成 **8 个 AI agent + 5~6 个人工 Gate** 的流水线，并自带"越用越聪明"的自我进化闭环（评估 → 优化 → 知识沉淀）。

- **8 agent**：A1 产品 / A1.5 视觉规范（仅 UI 类）/ A2 需求审 / A3 技术 / A4 范围审 / A5 二次校验（仅 A4 触发）/ A6 用例 / A7 用例审
- **自进化**：每次交付后 `pipeline-retrospector` 自动沉淀；`/pipeline-review` 周报；`/optimize-prompts` 月度把踩坑提炼进 agent prompt
- **产物**：`deliverables/*.draft` 包 = 给研发/Codex 拿到就能干活的施工图

## 设计原则：引擎通用，知识专属

| 层 | 内容 | 移植性 |
|---|---|---|
| 🟢 引擎（流程/审核/进化机制）| 8 agent + 命令 + evals/optimization/knowledge 机制 | **直接通用** |
| 🟡 知识（项目专属）| 核心架构黑名单 / 领域术语 / 技术栈 / git 约定 / 验收环境 | **由 `/init-project` 梳理后填入 `PROJECT-PROFILE.md`** |
| 🔴 数据 | 各项目的变更台账 / 交付包 / 实战 patterns | **随用随长，从空开始** |

关键设计：**所有项目专属知识收敛到唯一一个文件 `PROJECT-PROFILE.md`**，所有 agent/skill 引用它，不在各自文件里硬编码。换项目 = 重填这一个文件。

## 怎么用（新项目接入 3 步）

```bash
# 1. 克隆
git clone https://github.com/ayouaiyouwei-arch/claude-product-pipeline.git my-project-pm && cd my-project-pm
# 2. 在 Claude Code 里开第一段对话 —— CLAUDE.md 会自动检测到空白骨架并列出前置准备清单
# 3. 运行接入向导
/init-project        # 拉你的代码 → 主动梳理规则 → 逐项问你确认 → 填 PROJECT-PROFILE.md
/new-feature "<你的一句话需求>"
```

`/init-project` 会：① 先告知你要准备哪些信息（git 等）② 拉代码到 `code/` ③ **主动 grep/读代码**梳理【核心架构黑名单】【领域术语表】【技术栈/端结构】候选（带出处，遵守"实证驱动"）④ **写入前逐项问你确认**（绝不自作主张写 LOCKED）⑤ 确认后落 `PROJECT-PROFILE.md` + 初始化 agent 版本 + baseline 空台账。

## 自带的通用方法论（不随项目变）

- **P001 UI 颗粒度缺失** —— 需求要写清每个交互的粒度/位置/5 态/可见性
- **P002 需求文档混入技术语言** —— PRD 用业务语言，不写路由/接口/文件名
- **P003 AI 过度发挥** —— 含糊处问人，不自由发挥
- **P004 retrospect 滞后漏审** —— 升 .done 必落 runs.csv（三层防护已内置）
- **P005 dev 灰度 smoke 验证** —— 升 .done 后 PM 端独立到 dev 灰度真 click 一次（三层防护已内置 · `/dev-verify`）
- **P006 二次校验硬约束 G 门触发链** —— A4 质询 → A5 LOCKED 硬约束 → 06 验收 G 门 → 04 契约 DRIFT 流程 · 施工期主动拦截技术承诺与事实不符（四级机制已内置）
- **P007 约定必须实证驱动** —— 任何代码约定先 grep 实证或标"推测"，不凭印象

其余 patterns（领域术语混淆、验收环境、分支隔离等）由你的项目跑几轮后**自己长出来**。

## 自带的独立验收回归（与流水线并行的第二轨）

**独立于研发自测的一轨**：打真实环境、黑盒、PM 主导的验收。复用研发那套（常带 mock 的）runner，验收就失去独立意义——所以骨架自带一套。

- **三原则**：真实环境（不 mock）· 黑盒行为（不抓源码/SQL）· 独立断言源（验收用例，非研发契约）→ 天然不与实现漂移
- **L0–L5 分层**：登录冒烟 / 模块回归 / 角色权限矩阵 / 跨模块场景 / 视觉回归 / 一键编排
- **通用报告引擎** `~/.claude/skills/acceptance-regression/`：读 Playwright `results.json` → 出 Markdown 验收报告（按层级/模块/优先级 + 角色权限矩阵 + P0 红线）。项目专属值由 `acceptance.config.json` 注入。
- **新项目接入**：放一个 `acceptance.config.json` + 写黑盒 spec → `pnpm acceptance:full` → 独立验收报告。引擎复用，无需重写。

## 自迭代闭环（越用越聪明的引擎）

每次交付都反哺引擎，让它对**你的项目**越来越懂：

- **沉淀** —— 每个 `.done` 包由 `pipeline-retrospector` 自动写入 `runs.csv` + `cases.csv`；反复出现的教训再落一条 `knowledge/patterns/`。
- **复盘** —— `/pipeline-review` 每周跑：`pipeline-evaluator` 出周报（通过率 / 反复踩的坑 / rubric 抽样）。
- **优化** —— `/optimize-prompts` 每月跑：被反复提出 ≥ N 次的教训**折回 agent prompt**（agent 版本号 bump + CHANGELOG），下一个需求就由更聪明的 agent 来审。
- **最关键的输入** —— 不只是用例失败，更是**独立验收的发现**（真实环境黑盒）和 **PM 灰度实操体验**——正是带 mock 的研发 runner 漏掉的信号。

净效果：引擎照搬、聪明重长——反复的错误更早被抓、估算更准、agent 自己变强，全自动。

## 它的价值主张

**框架即引擎，越用越聪明。** 换个项目，引擎照搬，聪明重新长——跑得越多，这套流水线对你的项目就越懂。
