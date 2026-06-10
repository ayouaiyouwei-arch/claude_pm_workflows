# knowledge/methodology/ · 设计方法论卡片（项目内置快照）

> **patch-009b（2026-06-10 PM 二次决议）**：把流水线引用的设计方法论卡片从用户级 `~/.claude/skills/` 快照进项目，使流水线**自包含**——克隆本项目 / 骨架的人无需安装任何外部 skill 即可获得完整的 A1/A1.5/A2 设计力增强。

## 谁在读这些文件

A1 product-expert / A2 requirement-reviewer / A1.5 visual-spec-author 三个 agent 按各自"设计方法论库"映射表的触发条件**用 Read 工具按需读取**（不是 Claude Code 可调用 skill——故意不放 `.claude/skills/`，避免污染会话 skill 列表）。

**读取顺序**（agent 内已写死）：
1. 优先：项目内 `knowledge/methodology/<name>.md`（本目录 · 版本随项目走）
2. 兜底：用户级 `~/.claude/skills/<name>/SKILL.md`（本目录缺失时）
3. 都缺失：跳过该步不阻塞流水线

## 清单（30 个）

| 用途 | 卡片 |
|---|---|
| A1 流程/边界态/文案（7） | user-flow-diagram · error-handling-ux · loading-states · feedback-patterns · ux-writing · hicks-law · millers-law |
| A1 结构/动机/检索（5） | information-architecture · navigation-patterns · jobs-to-be-done · search-ux · design-brief |
| A1 Loop-1 + A2 第 11 项（1） | heuristic-evaluation（Nielsen 10 条 + 严重度 0-4） |
| A1.5 视觉基础（5） | visual-hierarchy · layout-grid · color-system · typography-scale · spacing-system |
| A1.5 类型触发（7） | form-design · data-visualization · dark-mode-design · responsive-design · animation-principles · micro-interaction-spec · component-spec |
| A1.5 Loop-3 自评 lens（4） | critique-visual-hierarchy · critique-composition · critique-typography · emil-design-eng |
| 丙档大库（1） | ui-ux-pro-max（44K · 99 条 UX 红线 · **只按域读 Quick Reference 分区勿全读**；原 data/scripts 检索器在源头即为断链，未随快照） |

## 三条总则（与 agent 内一致 · 重申）

1. **项目事实源永远赢**：卡片与项目视觉基线文件（见 `PROJECT-PROFILE.md` 登记）冲突时，以项目文件为准；卡片只供"设计思路与判断框架"，严禁据此引入项目外色板/字号/新组件库
2. **按需读不全读**：触发条件见各 agent 的"设计方法论库"映射表
3. **P027 兼容**：方法论产出转述给 PM 时仍走业务语言

## 更新方式

- 本目录是**快照**（snapshot · 2026-06-10 自 `~/.claude/skills/` 拷入），不自动跟随源更新
- 需要刷新某张卡片：`cp ~/.claude/skills/<name>/SKILL.md knowledge/methodology/<name>.md`，并同步 `pipeline-skeleton/knowledge/methodology/`
- 改动需经 `/optimize-prompts` 或 PM 决议留痕（同 agent prompt 待遇）

## 来源与分发注意

卡片源自第三方/社区 Claude Code skill 集（2026-06-09 安装于用户级目录；emil-design-eng 内容标注源自 Emil Kowalski 的公开设计哲学，ui-ux-pro-max 为社区整理的设计指南库）。团队内部使用没有问题；**若将含本目录的仓库公开分发，请先确认原始 skill 集的 license 条款**。
