# Prompt 变更日志（空 · /optimize-prompts 自动追加）

> 本文件是**追加式账本**：每次 `/optimize-prompts` 合并 patches-pending → agent .md 后，自动在此追加一条变更记录。
> 骨架初始为空——下方为**格式示例占位**，由本项目运行 `/optimize-prompts` 后逐条追加真实记录。

<!-- 格式示例（占位 · 实际记录由 /optimize-prompts 自动追加）

## <YYYY-MM-DD> · <patch 编号> · <一句话标题>

- **触发源**：<什么实战/复盘触发了本次 prompt 改良>
- **决议**：<核心立场 / 方法论结论>
- **改动文件 + 版本**：<agent/command 名 vX.Y → vX.Z · 简述改动点>
- **效果 / 验证**：<改良后预期收益或验证口径>

-->

## 2026-06-16 · patch-001 · 受众轴接入:A1 体验路径/劝退产物 + A2 劝退 lens

- **触发源**：`optimization/UPGRADE-PLAN-v1.1.md` Wave 1③b + Wave 2④⑤（roadmap 评审驱动 · 非 .done 包反思）。实测 A1 有 JTBD/IA/Nielsen 但无任何环节显式产"体验路径 + 劝退点",根因 = journey-map/experience-map 等卡片未进快照、未接 A1。
- **决议**：受众(toB/toC)是独立于平台(web/native)的第二条轴;"劝退/体验路径"挂受众轴。A1 按 `audience_profile.primary` 门控产出体验路径 + 劝退点;A2 第 11 项软闸(主观取舍升 PM 的现成位置)加劝退风险 lens。零新增 Gate。
- **改动文件 + 版本**：`product-expert.md` v1.6→v1.7（映射表加 3 受众门控行 + 新增 §4.8 产物）· `requirement-reviewer.md` v1.2→v1.3（第 11 项软闸加 1b 受众门控 lens）。LOCKED 锚点段校验 byte-identical 未触碰。
- **效果 / 验证**：⚠️ 回归集空,PM 授权跳过回归→后续人工抽查;LOCKED 校验已过。行为验收(待首个需求):toC→A1 出激活漏斗+劝退断崖、A2 升高 drop-off;toB→任务流程+效率摩擦;web/无 audience→不触发受众卡。回滚点 = `regression-baseline/product-expert-v1.6` + `requirement-reviewer-v1.2`。

## 2026-06-16 · 簿记同步（非 prompt 改动）· agent-versions.json 对齐 frontmatter

- **类型**：纯簿记对账,**未改任何 agent `.md`**。骨架 init 时把 `agent-versions.json` 重置为 1.0,但 6 个 agent 的 frontmatter 仍带骨架内置 patch-009~014 的版本号,json 与实际漂移。本次仅把 json 追平 frontmatter,`last_patch` 保留 `null`(这些版本来自骨架内置 patch,非本项目 patch-NNN 合并,不应臆造 last_patch id)。
- **同步项**：pipeline-evaluator 1.0→1.3 · pipeline-retrospector 1.0→1.1 · tech-architect 1.0→1.3 · test-case-author 1.0→1.3 · test-case-reviewer 1.0→1.1 · visual-spec-author 1.0→1.4。各项 `last_updated` 及顶层 `last_updated` 置 2026-06-16。

## 2026-06-16 · typo 修正（非行为改动 · 走 §六 typo 例外）· product-expert §-引用

- **类型**：纯 typo/引用修正，**不 bump 版本**（无行为变化，frontmatter 仍 v1.7，与 json 一致）。
- **改动**：`product-expert.md` 方法论映射表 design-brief 行的 "§ 三缺口识别" → "§ 3 缺口识别"。该 agent 用两套章节号（Arabic=工作流步骤 / CJK=输出文档结构），"缺口识别"是 Arabic `### 3`，而 `§ 三` 实为输出结构的"用户答复整理"——原引用指向错误章节（UPGRADE Track B 审计 · 红队 reference-integrity）。
