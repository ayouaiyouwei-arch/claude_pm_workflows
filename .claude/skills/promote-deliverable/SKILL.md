---
description: 研发交付包状态机闸门——驱动 .draft → .active → .done → archive/ 的状态变更，强制 single-active 校验
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · promote-deliverable

> 一句话定位：**唯一**允许变更交付包状态后缀的入口。每次状态切换前自动跑前置校验（单 active / 验收门槛 / 冷却期），通过后改目录后缀 + 写 `99-状态.md` + 同步 `说明文档.md`，并在违例时锁定包。

## 触发条件

- PM 评审通过 `.draft`，要派给 Codex（`.draft → .active`）
- Codex 完成验收，PM 准备收尾（`.active → .done`）
- `.done` 已冷却 ≥ 7 天，PM 归档（`.done → archive/`）
- 上游基线 / PRD 推翻本包，需作废（任意状态 → `.superseded`）
- 紧急修复包（创建 `.hotfix` 或 `.hotfix → .done`）

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| 包路径 | ✅ | `deliverables/<YYYY-MM-DD>-<CHG-XXX>-<中文短名>.draft` |
| 目标状态 | ✅ | `active` / `done` / `archive` / `superseded` |
| 变更人 | ✅ | PM 姓名 |
| 备注 | 选填 | 任意 |
| 强制覆盖（跳过校验） | 默认 false，仅 `--force` 时 true | - |

## 状态机（合法路径）

```
.draft     ──▶ .active        （评审通过）
.draft     ──▶ .superseded    （需求作废）
.active    ──▶ .done          （验收通过）
.active    ──▶ .superseded    （上游推翻）
.done      ──▶ archive/       （冷却 ≥ 7 天）
.done      ──▶ .superseded    （罕见，验收后才发现废）
.hotfix    ──▶ .done          （紧急修复完成）
.hotfix    ──▶ .superseded    （hotfix 作废）
```

> 任何**非以上箭头**的转移**直接拒绝**（含 `.done → .active` 反向 / `archive → .active` 复活）。

## 前置校验矩阵

### A. `.draft → .active`

| 校验 | 命令 / 检查 | 通过条件 |
|---|---|---|
| A1 全空间唯一 active | `ls deliverables/ \| grep '\.active$' \| wc -l` | = 0 |
| A2 包内 01 已补完 | grep `<待 PM 填写>` 计数 | = 0（在 01-需求范围与边界.md 内） |
| A3 包内 03 已补完 | 同 A2，检查 03-PRD片段.md | = 0 |
| A4 包内 06 已补完 | 同 A2，检查 06-验收标准.md | = 0 |
| A5 关联 CHG 状态 | 读 baseline/03 内 `<CHG>` 行的"状态"列 | = `已立项` 或更后续 |

### B. `.active → .done`

| 校验 | 检查 | 通过条件 |
|---|---|---|
| B1 06 § 七 9 项硬检查 | 数 `- [x]` 个数 | = 9 |
| B2 08 至少有 1 条 ROUND-N | 正则匹配 | ≥ 1 |
| B3 自动化用例自跑结果 | 读 08 最新 ROUND-N 段的"自动化用例运行结果" | 全 pass |
| B4 测试执行清单 | `test/execution/<B1.0.x>-<本期>/执行清单.csv` | P0 全 pass |
| B5 关联 CHG 状态 | baseline/03 内对应行 | = `已上线` 或 `已修复` |

### C. `.done → archive/`

| 校验 | 检查 | 通过条件 |
|---|---|---|
| C1 冷却期 | 读 99-状态.md 「.active → .done」时间戳 | ≥ 7 天前（默认；可 `--cooldown N` 覆盖） |
| C2 全空间无 active 引用 | grep 当前 active 包内是否引用本包 | 不引用 |

### D. `*.hotfix` 创建

| 校验 | 检查 | 通过条件 |
|---|---|---|
| D1 全空间唯一 hotfix | `ls deliverables/ \| grep '\.hotfix$' \| wc -l` | = 0 |
| D2 关联线上事件单 | 输入参数必带 `--incident-id` | 非空 |

### E. 任意 → `.superseded`

| 校验 | 检查 | 通过条件 |
|---|---|---|
| E1 输入备注非空 | 备注参数 | 非空，描述废原因 |
| E2 立即归档承诺 | skill 内强制下一步触发 archive | 自动调用 |

## 步骤

1. **解析输入**：路径 + 目标状态 + 变更人 + 备注
2. **解析当前状态**：从目录后缀提取
3. **跑前置校验**（按上述矩阵）
   - 任一未通过且无 `--force` → 中止，输出失败原因
   - `--force` → 跑校验但允许通过，并在 `99-状态.md § 四 违例锁定记录`追加一行
4. **改目录后缀**
   ```bash
   mv deliverables/<old-suffix> deliverables/<new-suffix>
   # archive 时：mv deliverables/<本包>.done deliverables/archive/<本包>.done
   ```
5. **写 `99-状态.md`**
   - 更新 § 一 当前状态、目录后缀、最近变更时间、变更人
   - 在 § 二 历史表追加新行（序号 +1，时间 / from / to / 操作人 / 备注）
   - 在 § 三 写校验快照（含命令输出 / 各校验项结果）
6. **写 `08-修复历史.md`**
   - 追加 `[MILESTONE-N]` 段，记录状态变更（标题、关联、正文）
7. **同步 `baseline/03-产品变更登记.md`**
   - 更新对应 CHG 行的「关联交付包」列：路径 + 新状态后缀
   - `.active → .done` 时同步把 CHG 状态置为 `已上线 / 已修复`（按输入）
8. **同步 `说明文档.md` § 三 进度记录**
   - 追加：「<日期>·promote：`<包名>` `<from> → <to>`，校验全过 / 已锁定原因 ...」
9. **特定状态附加动作**
   - `.draft → .active`：自动调 `write-fix-prompt` skill 提示 PM 派活
   - `.active → .done`：扫 `test/execution/.../缺陷清单.csv` 是否还有 open 状态缺陷，未关闭则警告（但不阻断）
   - `.done → archive/`：移到 `deliverables/archive/`，**不**改后缀
   - `任意 → .superseded`：立即触发 `.superseded → archive/`（archive 内保留 `.superseded` 后缀）
10. **输出**：见下

## 输出

```md
## promote 结果

- 包：deliverables/<YYYY-MM-DD>-<CHG-XXX>-<中文短名>
- 转换：.draft → .active
- 操作人：PM <姓名>
- 时间：<YYYY-MM-DD HH:mm> UTC+8

### 前置校验
✅ A1 全空间唯一 active：0 → 即将 1（OK）
✅ A2 01 已补完：grep `<待PM填写>` = 0
✅ A3 03 已补完：grep = 0
✅ A4 06 已补完：grep = 0
✅ A5 <CHG-XXX> 状态：已立项

### 已写入
- 目录改名：✅
- 99-状态.md：✅（§ 一/二/三 已更新）
- 08-修复历史.md：✅（[MILESTONE-2] 已追加）
- baseline/03-产品变更登记.md：✅（<CHG-XXX> 关联交付包列已更）
- 说明文档.md 进度记录：✅

### 下一步
- 调 write-fix-prompt 生成给 Codex 的提示词
```

## 失败示例

```md
## promote 拒绝

- 包：deliverables/<YYYY-MM-DD>-<CHG-YYY>-<中文短名B>.draft
- 拟转换：.draft → .active
- 拒绝原因：A1 失败
  - 当前 .active 包数 = 1（deliverables/<YYYY-MM-DD>-<CHG-XXX>-<中文短名A>.active）
  - 违反单 active 约束
- 处置建议：
  1. 等 <CHG-XXX> 包 .active → .done 后再 promote
  2. 或：用 --force 强行 promote（PM 自担风险，会写入违例锁定记录）
```

## 禁止事项

- ❌ 跳过本 skill 直接 `mv` 改目录后缀
- ❌ 跳过 99-状态.md 写入
- ❌ 不更新 baseline/03 关联交付包列
- ❌ 反向转移（`.done → .active` 等）
- ❌ `archive/` 内的包改回 `.active`（必须新建包）
- ❌ `--force` 时不写违例锁定记录
- ❌ 多 active 共存（hotfix 除外）
