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

**核心约束**：任何"代码相关的约定 / 实体命名 / 字段命名 / 架构假设"必须三选一：

| 选项 | 适用 | 落地要求 |
|---|---|---|
| **A. 实证驱动**（推荐）| 已 sync code/ | 先 grep 真实代码 + 标 commit SHA → 写入约定 |
| **B. 标推测** | 还没 sync / 没接触实物 | 约定文本显式标 `🔍 推测 · 待 sync 后回填` · 不写"严禁/必须"强约束 |
| **C. 触发差异登记** | 已发现差异 | 立即登记 + 标优先级 + 裁决截止 ≤ 14 天 |

> 这是 robobus 实战提炼的**通用方法论**，保留在骨架里。它的反面教训（凭经验划等号导致返工）适用于任何项目。

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
| `.claude/` | agents（10）/ skills（19）/ commands（5）|

---

## 🚦 关键流水线入口

- **初始化新项目**：`/init-project`（首次接入用 · 收集前置信息 + 梳理代码 + 确认后写 PROJECT-PROFILE）
- **新需求**：`/new-feature <一句话>` → 8 agent 流水线 + 5~6 Gate
- **包升级**：`promote-deliverable`（.draft → .active → .done → archive）
- **周报**：`/pipeline-review`
- **prompt 月更**：`/optimize-prompts`（合并 patches-pending → agent .md）
- **巡检 active 包**：`/babysit-active`

---

## 📌 关键约束（项目无关，初始化后生效）

1. **从不修改 `code/`**（只读快照）
2. **单 .active 约束**（同时最多 1 个 .active 包 · hotfix 独立）
3. **核心架构黑名单**（见 `PROJECT-PROFILE.md § 三` · 动这些必须走变更登记）
4. **业务侧提交流程**（见 `PROJECT-PROFILE.md § 二` · 是否双向隔离按项目定）
5. **append-only**（deliverables/提交记录.md / 各包 08-修复历史.md / evals/runs.csv / knowledge 各 csv 只追加）
6. **升 .done 必同步 retrospect 落 runs.csv + cases.csv（默认执行）**：任何包升 `.done`（含 /new-feature 第 9 步 / promote-deliverable B-后置 / 手动追认）都必须当场补 runs.csv 18 列 + cases.csv 9 列 · 缺它 = 周报漏审 · `/pipeline-review` 第 1.5 步 + pipeline-evaluator 必检项兜底
7. **升 .done 后跑 dev 灰度 smoke 验证（默认执行 · best-effort 不阻断）**：任何包升 `.done` 都应跑 `/dev-verify <PKG>` 确认 dev 灰度功能真落地 · 用 `dev-gray-deep-verify` skill（自动 captcha + UI 登录 + 截图）· 失败 ⚠️ 写入 99-状态 § 验收痕迹但不回滚 · 完整模式见 `knowledge/patterns/P005-dev灰度smoke验证.md`
8. **P013 LOCKED · PM 灰度主观体验 5 分钟过一遍（默认建议 · 与 P005 并列）**：任何包升 `.done` 后 · 即使 P005 dev-verify 通过 + 全量回归 100% + 0 blocker · PM 仍应**亲自在 dev 灰度环境 5 分钟体验核心场景**（小屏 + 大屏各开一次 · 切换 2 个常见过滤态 · 触发 1 个边界态）· 写主观体验摘要到 99-状态 § 五（✅ / ⚠️ / 🚨 三档）· 发现 P0 阻断 → 立即开 followup · 主对话在 `.done` 升级后**主动提醒** PM 跑 P013。教训：自动化 100% PASS · 但 PM 灰度实拍发现新问题（流水线"自进化"的根本输入）· 完整模式见 `knowledge/patterns/P013-PM灰度主观体验5分钟过一遍.md`
9. **P010/P011/P012 LOCKED · 流水线深层防御（通用方法论 · 2026-05-27 新增）**：
   - **P010**（A1+A3+A6+A7）· 硬编码 fallback 数据源 grep 自检（`_DATA / MOCK_ / FALLBACK_ / DEFAULT_` 模式）+ `[REGRESSION-REVERSE]` 反向回归用例（A→B→A 模式）
   - **P011**（A1.5+A6+A7）· 视觉规范禁用模糊形容词（胶囊/气泡/椭圆/...）+ BAD vs GOOD 对比图 + 整页 2 断点 demo
   - **P012**（A1）· 数据层过滤需求必有 UI 联动 4 要素（标题/placeholder/视觉标识/聚焦）
   触发包：实战中"8 agent 全过 + 全量回归 100% + 但 PM 实拍发现新问题"反思 · 5 agent prompt 新增 7 处 LOCKED 段

---

## 📎 本项目专属 LOCKED 经验（初始为空 · 越用越多）

> `/init-project` 完成后，把本项目实战沉淀的 LOCKED 经验追加到这里（对齐 robobus 原工作空间 CLAUDE.md 的 P004/P006/P008/P015 等做法）。
> 通用方法论 P007（上方）+ P001/P002/P003/P004/P005/P006（见 knowledge/patterns/）随骨架自带，其余由本项目长出。

`<待 /init-project 后按需追加>`
