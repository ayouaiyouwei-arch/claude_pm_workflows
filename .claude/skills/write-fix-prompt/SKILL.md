---
description: 生成"指向唯一 .active 交付包"的 Codex 派活提示词；M1.7 后禁止再走"散差异条目 + 复制 PRD"的旧模式
---

# Skill · write-fix-prompt（M1.7 升级版）

> 一句话定位：从 `deliverables/<active 包>/` 生成一份可一键复制给 Codex / 后端 AI 的派活提示词。**不复制 PRD 段落、不复制接口字段、不复制用例正文**——这些都已在交付包内冻结，提示词只负责"指路 + 立规矩"。

## 触发条件

- PM 已完成 `generate-research-deliverable .draft` + `promote-deliverable .draft → .active`
- 用户明确要求「写一份提示词给 Codex」「打包发给前端/后端 AI」
- `.active` 包第 N 轮反工，需要在原指引基础上追加新一轮

## 前置校验（启动前自检）

1. **唯一 active**
   ```bash
   COUNT=$(ls deliverables/ | grep '\.active$' | wc -l)
   [ "$COUNT" = "1" ] || ABORT "active 包不是 1 个，违反单 active 约束"
   ```
2. **包结构完整**
   ```bash
   ACTIVE=$(ls deliverables/ | grep '\.active$')
   for f in 00-给Codex的导读.md 99-状态.md 01-需求范围与边界.md 02-基线快照.md \
            03-PRD片段.md 04-接口契约.md 05-用例清单.md 06-验收标准.md \
            07-时间与里程碑.md 08-修复历史.md; do
     [ -f "deliverables/$ACTIVE/$f" ] || ABORT "缺 $f"
   done
   ```
3. **包内无 `<待 PM 填写>` 占位**
   ```bash
   grep -r "<待 PM 填写>" "deliverables/$ACTIVE/" && ABORT "包未补完，禁止派活"
   ```

任一未通过 → 中止，输出失败原因，**不**生成提示词。

## 输入

| 输入 | 是否必填 | 说明 |
|---|---|---|
| 当前 .active 包名 | 自动检测 | 由前置校验确定 |
| 派活轮次 | ✅ | 第 1 轮 / 反工第 N 轮 |
| 接收方 | ✅ | `Codex / 后端 AI` |
| 备注 | 选填 | 例：本轮重点修复 BUG-3 |

## 步骤

1. **跑前置校验**（见上）
2. **读 `99-状态.md`** 确认状态确为 `.active` 且 owner 是接收方
3. **读 `08-修复历史.md`** 找最近一次 `[ROUND-N]` 或 `[ANSWER-N]`，决定本次是首轮还是接续
4. **拼装提示词**（见 § 输出格式），**不复制**包内 02 ~ 08 的正文，只引用路径
5. **追加到 `08-修复历史.md`**：`[NOTE-N] PM 派活 第 N 轮，提示词已发出 / 接收方 Codex`
6. **更新 `说明文档.md` § 三**：`派活：<active 包名> 第 N 轮，接收方 Codex`
7. **输出**：终端打印一段可一键复制的 Markdown

## 输出格式（强制）

```md
## 派活提示词（请一键复制粘贴给 Codex / 后端 AI）

> ⚠️ 你（接收方 AI）必须先完成本节 § 启动前自检，再开始读包内文件。

### § 启动前自检（强制）

```bash
ls deliverables/ | grep '\.active$' | wc -l   # 必须输出 1
ls deliverables/ | grep '\.active$'            # 输出应该是：<active 包名>
```

如果输出 ≠ 1，停下来报「违反单 active 约束」，**不要动 code/**。

### § 当前 active 交付包

- 路径：`deliverables/<active 包名>/`
- 状态：.active
- 接收方：Codex（或 后端 AI）
- 派活轮次：第 N 轮

### § 强制阅读顺序（不允许跳过、不允许换序）

1. `00-给Codex的导读.md` ← 5 条铁律 + 阅读顺序，不读完不允许动 code/
2. `99-状态.md` ← 看包当前真状态、变更历史
3. `01-需求范围与边界.md` ← 白名单 / 黑名单 / 灰色区域
4. `02-基线快照.md` ← 基线版本 + commit SHA + 相关 DIFF/CHG
5. `03-PRD片段.md` ← 本次需求事实源（不去看主 PRD）
6. `04-接口契约.md` ← API + 字段 + 错误码
7. `05-用例清单.md` ← 必过 case_id + 测试资产路径
8. `06-验收标准.md` ← 9 项硬检查
9. `07-时间与里程碑.md` ← 截止 + 依赖
10. `08-修复历史.md` ← 看历史 ROUND/QUESTION/ANSWER/BUG/FIX

### § 五条铁律（完整引用 `.cursor/rules/07-研发交付包规范.mdc § 一`）

1. 单 active 强制（已在 § 启动前自检覆盖）
2. 物理隔离：禁止主动 read / grep `product-docs/` / `test/` 其他 / `archive/` / 其他包
3. 必读文件强制：上方 10 步全读完才能动 code/
4. 白黑名单强制：100% 在 `01 § 三` 内 + 0 命中 `01 § 四`
5. 留痕强制：每轮代码改动后追加 `08-修复历史.md` 的 `[ROUND-N]` 段

### § 本轮交付要求

每轮代码改动后，必须在 `08-修复历史.md` 末尾追加 `[ROUND-N]` 段，含：

1. 修改文件清单（相对 code/ 完整路径）
2. 关键改动说明
3. 自动化用例运行结果（Bruno + Playwright，路径见 `05-用例清单.md`）
4. 5-state 覆盖：empty / loading / data / error / partial
5. 风险与未尽事宜

### § 越界 / 疑问处置

- 任何范围外 / PRD 片段歧义 / 契约漂移 → 写 `08-修复历史.md [QUESTION-N]`
- **不要拍脑袋**自行决定，等 PM `[ANSWER-N]` 答复后再动手

### § 验收对接

- PM 完成后会跑 `.claude/skills/run-acceptance-suite/SKILL.md`
- 9 项硬检查（`06-验收标准.md § 七`）全过 → PM 调 `promote-deliverable .active → .done`

### § 备注

<填写本轮重点 / 反工修复说明 / 等等>

---

> 你的第一条回复，必须以「**导读已读，开始读 01-需求范围与边界.md**」开头，证明你完成了 `00-给Codex的导读.md` 的阅读。
```

## 禁止事项

- ❌ 在提示词中复制 `03-PRD片段.md` / `04-接口契约.md` / `05-用例清单.md` 的正文（让 Codex 自己去包里读）
- ❌ 跳过单 active 自检直接发提示词
- ❌ 提示词指向多个 `.active` 包
- ❌ 不更新 `08-修复历史.md` 的 `[NOTE-N] 派活` 段
- ❌ 不更新 `说明文档.md` 进度记录
- ❌ 在 `.draft` 状态包上发提示词（必须先 promote 到 `.active`）
- ❌ 在 `.done / .superseded` 状态包上发提示词
