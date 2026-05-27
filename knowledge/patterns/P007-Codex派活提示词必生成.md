---
模式编号: P007
标题: 业务侧 push 完成后必须主动调 write-fix-prompt 生成 Codex 派活提示词
首次发现: <本项目实战中触发时填>
出现次数: 0（骨架自带 · 防遗忘 · 待本项目验证）
最近出现: -
关联agent: 主对话（/new-feature 流水线第 8 步收尾）· write-fix-prompt skill · generate-research-deliverable skill
状态: active（骨架自带 · 待本项目验证）
---

# P007 · 业务侧 push 完成后必须主动调 write-fix-prompt 生成派活提示词

> 🔧 骨架自带通用方法论。**仅适用于"研发对端是 Codex / AI 编程使用人"的项目** · 不适用于"研发是手写代码人"的项目。

## 描述

当工作空间端**对接的研发是 Codex / AI 编程使用人**（而不是手写代码人）时：
- 研发拿到 business 分支 commit 后 · 不会直接读代码 · 而是把"派活提示词"复制粘贴给 Codex
- Codex 需要明确知道："去读哪个目录的哪些文件 + 按什么顺序 + 注意什么"
- **业务侧 push 只是把 .draft 包推到 git · 不等于派活完成**

因此：**`/new-feature` 流水线第 8 步打包 + 业务侧 push 完成后** · 主对话**必须主动调 `write-fix-prompt` skill** 生成顶层派活提示词。

## 为什么需要这个？

```
❌ 误判（push commit 就够）：
   PM push business commit → 默认研发能看到 → 实际研发不知道要做哪个包
   ↓
   研发拉取 + 自行决定看哪个目录 + 自行决定先看哪个文件
   ↓
   信息密度低 · 容易漏 G 门 · 容易跳步

✅ 正确（push + write-fix-prompt 双步）：
   PM push business commit
   ↓
   主对话主动调 write-fix-prompt skill 生成提示词
   ↓
   PM 把提示词文本复制粘贴给研发
   ↓
   研发把提示词喂给 Codex
   ↓
   Codex 知道：读 docs/acceptance/<日期>-<slug>/ + 先看 AGENTS.md + 00-给Codex的导读 + 04-接口契约 + 06 § 〇 G 门
   ↓
   Codex 实施 + push release commit
   ↓
   P008 6 步追认 → .done
```

## 触发条件

- 主对话刚完成 `/new-feature` 全流水线第 8 步打包 + push
- 或刚单独 push 业务侧 commit
- PM 明确指出"是 Codex / AI 编程派活" 项目

## 反例（**禁止重犯**）

### ❌ 反例 1：把 write-fix-prompt 当成"可选下一步"

```
"push 完成 · 流程已圆满"
"下一步建议：A. promote .active  B. write-fix-prompt  C. 结束"
```

不应该把 write-fix-prompt 排成"可选项" · 应该**默认主动调** · 不询问 PM。

### ❌ 反例 2：把 dengyunpan 当成手写代码人

看到 commit message 是人写的（`feat(dispatch): implement OPT-XXX...`）就以为研发是手写代码人 · 跳过 write-fix-prompt。

实际上 commit message 可能是 Codex 自动生成的 · 也可能是研发手写后让 Codex 实施。

**对策**：`/init-project` 时必须问 PM "研发对端是 Codex 使用人还是手写人？" 默认假设是 Codex 使用人。

### ❌ 反例 3：调 promote-deliverable 但不调 write-fix-prompt

```
promote-deliverable .draft → .active 后
说："状态已变 · 流程完成"
```

但 promote 只是改后缀 · 没产出"派活语料"。.active 状态需要配合 write-fix-prompt 才完整。

## 操作模板

```python
# /new-feature 第 8 步打包完成 + 业务侧 push 后立即执行
# 不需要询问 PM "需要写提示词吗" · 默认调

Skill(skill="write-fix-prompt", args="<.draft 包路径>")
```

write-fix-prompt 产出格式（让 PM 复制粘贴）：

```
# === 复制以下文本给研发 · 研发喂给 Codex ===

请实施 <CHG-XXX-X>（<一句话短描述>）· 施工图位于：

  code/<repo>/docs/acceptance/问题说明/<日期>-<slug>/

施工第一步：
1. 读 AGENTS.md（包级铁律）
2. 读 00-给Codex的导读.md（详细操作手册）
3. 读 04-接口契约.md（接口签名 + DRIFT 流程）
4. 读 06-验收标准.md § 〇（实施前置 G 门 · grep/curl/SQL 验证清单）

任何 G 门失败 → 在 08-修复历史.md 标 [CONTRACT-DRIFT-N] · 等 PM 决策 · 严禁自适应实现。

完成后在 08 追加 [ROUND-N] 段 + 提交 release commit。

# === 复制结束 ===
```

## 给新项目的提示

### `/init-project` 时的检查清单

`/init-project` skill 必须问 PM：

```
"你的研发对端身份？
A. Codex / AI 编程使用人（默认 · 适用本项目骨架设计）
B. 手写代码人（不需要 write-fix-prompt · 跳过 P007）
C. 混合（部分人 Codex · 部分手写）"
```

- 选 A → 启用 P007（每次 push 后强制调 write-fix-prompt）
- 选 B → 不启用 P007（write-fix-prompt skill 仍存在 · 但不强制）
- 选 C → 默认按 A · PM 自己控制何时调

## 关联机制

- write-fix-prompt skill：`/SKILL.md`（生成派活提示词）
- generate-research-deliverable skill：生成 .draft 包 + 镜像到 code/
- P008（research 自主实施 · 工作空间不追同步）：派活后流程
