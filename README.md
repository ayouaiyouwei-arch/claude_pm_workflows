# AI 产品需求孵化流水线 · 项目无关骨架

> 一套"用 AI agent 团队把一句话需求孵化成研发可直接施工的交付包"的流水线引擎。
> 本仓库是**项目无关骨架**——克隆下来接任何项目即可用，项目专属知识由 `/init-project` 向导梳理后写入 `PROJECT-PROFILE.md`。

---

## 这是什么

把"产品需求 → 研发交付"的过程拆成 **8 个 AI agent + 5~6 个人工 Gate** 的流水线，并自带"越用越聪明"的自我进化闭环（评估 → 优化 → 知识沉淀）。

- **8 agent**：A1 产品 / A1.5 视觉规范（仅 UI 类）/ A2 需求审 / A3 技术 / A4 范围审 / A5 二次校验（仅 A4 触发）/ A6 用例 / A7 用例审
- **自进化**：每次交付后 `pipeline-retrospector` 自动沉淀；`/pipeline-review` 周报；`/optimize-prompts` 月度把踩坑提炼进 agent prompt
- **产物**：`deliverables/*.draft` 包 = 给研发/Codex 拿到就能干活的施工图

---

## 设计原则：引擎通用，知识专属

| 层 | 内容 | 移植性 |
|---|---|---|
| 🟢 引擎（流程/审核/进化机制）| 8 agent + 5 command + evals/optimization/knowledge 机制 | **直接通用** |
| 🟡 知识（项目专属）| 核心架构黑名单 / 领域术语 / 技术栈 / git 约定 / 验收环境 | **由 `/init-project` 梳理后填入 `PROJECT-PROFILE.md`** |
| 🔴 数据 | 各项目的变更台账 / 交付包 / 实战 patterns | **随用随长，从空开始** |

关键设计：**所有项目专属知识收敛到唯一一个文件 `PROJECT-PROFILE.md`**，所有 agent/skill 引用它，不在各自文件里硬编码。换项目 = 重填这一个文件。

---

## 怎么用（新项目接入 3 步）

### 1. 克隆骨架到新工作空间
```bash
git clone <本骨架仓库> my-project-pm && cd my-project-pm
```

### 2. 在 Claude Code 里开第一段对话
开场 `CLAUDE.md` 会**自动检测**到 `PROJECT-PROFILE.md` 还是占位，提示你这是空白骨架，并列出**前置准备清单**（git 地址/拉取分支/推送策略/项目名/验收环境）。

### 3. 运行 `/init-project`
向导会：
1. 先告知你要准备哪些信息（git 等）
2. 把你的代码拉到 `code/`
3. **主动 grep/读代码**，梳理出【核心架构黑名单】【领域术语表】【技术栈/端结构】候选（带出处，遵守"实证驱动"）
4. **写入前逐项问你确认**（绝不自作主张写 LOCKED）
5. 确认后落 `PROJECT-PROFILE.md` + 初始化 agent 版本 + baseline 空台账

完成后即可：
```
/new-feature <你的一句话需求>
```

---

## 目录结构

```
PROJECT-PROFILE.md       ← 项目唯一配置源（git/技术栈/核心架构黑名单/领域术语/验收环境）
CLAUDE.md                ← 开场必读（含首次使用检测 + onboarding 触发）
.claude/
├── agents/   (10)       ← 8 流水线 agent + 2 评估/反思 agent
├── skills/   (19)       ← 打包/升级/测试/知识/基线 等机制
└── commands/ (6)        ← /init-project /new-feature /pipeline-review /optimize-prompts /babysit-active /iterate-A7
product-docs/
├── baseline/            ← 版本/差异/变更 三台账（空，随用随登记）
└── _drafts/             ← /new-feature 流水线中间产物
deliverables/
├── _template/           ← 交付包模板（12 根文件 + snapshot + demo）
└── 提交记录.md          ← 业务侧提交账本（空）
test/                    ← 用例 + 自动化资产 + 报告（骨架）
knowledge/
├── patterns/            ← P001/P002/P003/通用方法论自带 + 项目实战沉淀
├── cases.csv / graph    ← 案例库 + 知识图谱（空）
evals/                   ← runs.csv + regression-set + weekly 周报（空）
optimization/            ← patches-pending/applied + agent-versions.json
code/                    ← 新项目只读代码快照（/init-project 拉进来）
```

---

## 自带的通用方法论（不随项目变）

骨架预置 5 条跨项目通用的"踩坑铁律"（来自真实项目实战提炼）：

- **P001 UI 颗粒度缺失** —— 需求要写清每个交互的粒度/位置/5 态/可见性
- **P002 需求文档混入技术语言** —— PRD 用业务语言，不写路由/接口/文件名
- **P003 AI 过度发挥** —— 含糊处问人，不自由发挥
- **P004 retrospect 滞后漏审** —— 升 .done 必落 runs.csv（三层防护已内置）
- **P007 约定必须实证驱动** —— 任何代码约定先 grep 实证或标"推测"，不凭印象

其余 patterns（领域术语混淆、验收环境、分支隔离等）由你的项目跑几轮后**自己长出来**。

---

## 它的价值主张

**框架即引擎，越用越聪明。** 换个项目，引擎照搬，聪明重新长——跑得越多，这套流水线对你的项目就越懂。
