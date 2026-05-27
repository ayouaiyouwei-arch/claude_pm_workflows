---
模式编号: P007
标题: 派活提示词必须在 push **之前**生成并落到交付包内（与镜像一起 push · 不是 push 后再生成）
首次发现: <本项目实战中触发时填>
出现次数: 0（骨架自带 · 防遗忘 · 待本项目验证）
最近出现: -
关联agent: 主对话（/new-feature 流水线第 8 步收尾）· write-fix-prompt skill · generate-research-deliverable skill
状态: active（骨架自带 · 待本项目验证）
---

# P007 · 派活提示词必须在 push **之前**生成并落到交付包内

> 🔧 骨架自带通用方法论。**仅适用于"研发对端是 Codex / AI 编程使用人"的项目** · 不适用于"研发是手写代码人"的项目。

## 描述

当工作空间端**对接的研发是 Codex / AI 编程使用人**（而不是手写代码人）时：
- 研发拿到 business 分支 commit 后 · 不会直接读代码 · 而是把"派活提示词"复制粘贴给 Codex
- Codex 需要明确知道："去读哪个目录的哪些文件 + 按什么顺序 + 注意什么"
- **业务侧 push 只是把 .draft 包推到 git · 不等于派活完成 · 还需要"派活提示词"作为指南**

**关键 v2 修正（2026-05-27 实战沉淀）**：派活提示词必须**先生成 + 落到交付包内** · **再 push business**（提示词随镜像一起到 docs/acceptance/）· 而**不是** push 之后再生成。

## 为什么必须 push 前生成？（v1 v2 对比）

```
❌ v1（错）：push 后生成
  打包 .draft → push business → 调 write-fix-prompt 输出文本 → PM 通过外部渠道（IM / 邮件）传 dengyunpan
  问题：
  - 提示词不进 git · 无留痕
  - 外部渠道易丢失 / 历史难追溯
  - PM 二次操作（复制粘贴外部传）= 额外步骤
  - 反工时无地方追溯"上次派的什么"

✅ v2（对）：push 前生成 · 提示词进包
  打包 .draft → 调 write-fix-prompt 生成提示词 → 落到 .draft 包根 `00-Codex派活提示词.md`
                → 镜像 .draft 包到 code/<仓库>/docs/acceptance/<日期>-<slug>/
                → push business（提示词随镜像一起推上去）
  优势：
  - 提示词进 git · 永久留痕 · 可追溯
  - dengyunpan 拉 business 即可在镜像目录读 · 不需 PM 外部传
  - 多轮反工时 [ROUND-N] 历史与提示词并存
  - 跨人协作（多 PM / 多研发）时 single source of truth
```

## 触发条件

- 主对话刚完成 `/new-feature` 流水线第 8 步打包 `.draft`（generate-research-deliverable）
- **打包后立即调 write-fix-prompt**（**不等 push**）· 落到 `.draft` 包根
- 然后再镜像到 `code/<仓库>/docs/acceptance/<日期>-<slug>/`
- 最后 push business

## 反例（**禁止重犯**）

### ❌ v1 反例：push 后才生成提示词

```
1. 打包 .draft
2. 镜像 + push business commit
3. 主对话："✅ push 完成 · 流程已圆满"
4. PM："等等 · 提示词呢？"
5. 主对话："调 write-fix-prompt 生成..."输出文本到聊天框
6. PM 复制粘贴外部传 dengyunpan
```

**问题**：提示词不进 git · 后续反工无地方追溯 · PM 二次操作。

### ❌ 反例 2：把 write-fix-prompt 当"可选下一步"

```
"下一步建议：
  A. promote .active
  B. write-fix-prompt
  C. 结束"
```

不应该把 write-fix-prompt 排成"可选项" · 应该**默认主动调** · 而且**在 push 之前**。

### ❌ 反例 3：把 dengyunpan 当成手写代码人

看到 commit message 是人写的（`feat(xxx): implement ...`）就以为研发是手写 · 跳过 write-fix-prompt。

**对策**：`/init-project` 时必须问 PM "研发对端是 Codex 使用人还是手写人？" 默认假设是 Codex 使用人。

## 操作模板

### 标准工作流（v2）

```bash
# Step 1 · 打包 .draft
Skill(generate-research-deliverable)
# → 生成 deliverables/<日期>-<编号>-<短名>.draft/（含 12 根 .md + AGENTS + demo + snapshot）

# Step 2 · 立即调 write-fix-prompt（push 之前）
Skill(write-fix-prompt, args=".draft 包路径 · 落位包根/00-Codex派活提示词.md")
# → 在 .draft 包根新增 00-Codex派活提示词.md（与 AGENTS.md 同级）

# Step 3 · 镜像到 code/<仓库>/docs/acceptance/<日期>-<slug>/
cp -R deliverables/<日期>-<编号>-<短名>.draft/* \
      code/<仓库>/docs/acceptance/问题说明/<短日期>-<短名>/
# 提示词随镜像一起复制（已含在 .draft/ 内）

# Step 4 · push business
cd code/<仓库>
git checkout feature/business-submit-<日期>
git add "docs/acceptance/问题说明/<短日期>-<短名>/"
git commit -m "biz(req): <编号> <一句话>"
git push origin feature/business-submit-<日期>
# 提示词随 commit 一起到 git · dengyunpan 拉 business 即可在镜像目录读
```

### 提示词必含项（write-fix-prompt skill 模板）

文件落位：`<.draft>/00-Codex派活提示词.md`（00 开头 + 中文 · 确保 ls 排序最前）

内容必含 12 段：
1. **§ 任务编号** + 一句话需求 + 包路径
2. **§ 启动前自检**（grep / git diff 命令 · Codex 拿到必跑）
3. **§ 强制阅读顺序**（含 AGENTS.md / 00-给Codex的导读.md / 99-状态 / 01-08 / 视觉规范 / demo / screenshots）
4. **§ 视觉契约铁律**（UI 类需求 · 含 demo 100% 事实源 · px 偏差 · token 不写死 hex · 5 态完整 · 含糊问 PM）
5. **§ 施工第一步 G 门自检**（A5 LOCKED 的 G1~GN grep 命令）
6. **§ 五条铁律**（单 active · 物理隔离 · 必读强制 · 白黑名单 · 留痕强制）
7. **§ 修改白名单**（具体路径）
8. **§ 修改黑名单**（具体路径 · 含"不准 pnpm add 第三方库"等约束）
9. **§ 本轮交付要求**（修改文件清单 + G 门自检结果 + 截图清单 + 5 角色组合 + 风险）
10. **§ 越界 / 疑问处置**（[QUESTION-N] / [CONTRACT-DRIFT-N]）
11. **§ 验收对接**（9 项硬检查 + UI 类 V1-V5 + dev gray smoke）
12. **§ 本轮重点 + A5 兜底裁定**（解决 A3 § 七 不确定点）

## 给新项目的提示

### `/init-project` 时的检查清单

`/init-project` skill 必须问 PM：

```
"你的研发对端身份？
A. Codex / AI 编程使用人（默认 · 适用本项目骨架设计）
B. 手写代码人（不需要 write-fix-prompt · 跳过 P007）
C. 混合（部分人 Codex · 部分手写）"
```

- 选 A → 启用 P007 v2（每次打包 .draft 后强制调 write-fix-prompt · 提示词进包 · 再 push）
- 选 B → 不启用 P007（write-fix-prompt skill 仍存在 · 但不强制）
- 选 C → 默认按 A · PM 自己控制何时调

## 关联机制

- write-fix-prompt skill：`.claude/skills/write-fix-prompt/SKILL.md`（生成派活提示词 v2）
- generate-research-deliverable skill：生成 .draft 包 · 在 .draft 包根留位 `00-Codex派活提示词.md`
- P006（研发自主实施 · v2 流程）：派活后流程
