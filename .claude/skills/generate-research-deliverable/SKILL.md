---
description: 从基线 + PRD + CHG + 用例自动生成一份 .draft 状态的研发交付包，给 Codex 物理隔离的工作视野
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · generate-research-deliverable

> 一句话定位：产品 PM 起新需求/优化时调用。从 `_template/` 复制一份带时间戳 + CHG 编号 + 状态后缀的交付包，并按输入参数预填 02 / 03 / 04 / 05 / 99，PM 后续只需补完 01 / 03 / 06。**产出的包初始为 `.draft`，需要后续调 `promote-deliverable` 升 `.active` 才能给 Codex 干活。**

## 触发条件

- 产品 PM 提出新需求或优化（已登记 `CHG-XXX`）
- 用户明确要求「起一个研发交付包」「为 CHG-XXX 起包」「派活给 Codex 之前先打个包」
- 验收不通过且决定 `.superseded` 重做时（起一个新包，引用旧包）

## 输入

| 输入 | 是否必填 | 示例 / 默认 |
|---|---|---|
| CHG 编号 | ✅ | `<CHG-XXX>` |
| 中文短名（≤ 12 字） | ✅ | `<模块名>闭环` |
| 创建日期 | 默认今日 | `<YYYY-MM-DD>` |
| 关联 DIFF（多条） | 选填 | `<DIFF-XXX>` |
| 关联模块（test 内目录名） | ✅ | `<模块名>` |
| 修改白名单 glob 列表 | ✅ | `code/<仓库名>/<前端包>/src/pages/<模块>/**`（端结构见 PROJECT-PROFILE.md § 五） |
| 修改黑名单 glob 列表 | 默认套通用集 | 见模板 |
| 必过用例 case_id 列表 | ✅ | `<MOD>-001, <MOD>-002, ...` |
| **【M1.8 D2 新增】本期作废 case_id 列表** | 选填 | `<MOD>-XYZ`（snapshot 里有但本期取消） |
| **【M1.8 D2 新增】本期修改 case_id 列表** | 选填 | `<MOD>-ABC=固定60%不可拖` |
| 截止日期 | ✅ | `<YYYY-MM-DD>` |
| 指派 owner | ✅ | `Codex` / 研发姓名 |

## 前置校验（执行前自检）

1. **CHG 已登记**：`grep "<CHG-XXX>" product-docs/ai-page-interaction-audit/baseline/03-产品变更登记.md` 命中
2. **包名不冲突**：`ls deliverables/` 不存在同名目录（含其他状态后缀）
3. **当前 `.active` 包数 ≤ 1**：本 skill 只产 `.draft`，不影响 active 计数；但如已经 ≥ 1 active，提醒 PM「起完 draft 后不能立刻 active」

## 步骤

1. **拷贝模板**
   ```bash
   cp -R deliverables/_template deliverables/<YYYY-MM-DD>-<CHG-XXX>-<中文短名>.draft
   ```
   - 拷贝完成后，删除包内 `test-cases-snapshot/.gitkeep`（步骤 4.5 会用真 CSV 填充）

1.5 **【M1.8 D1 新增】沿用包内 `AGENTS.md`**
   - `_template/AGENTS.md` 已被一并拷贝到包根
   - 检查包内 `AGENTS.md` 是否存在；不存在则中止（说明 `_template/` 损坏）

2. **预填 02-基线快照.md**
   - `<B1.0.x>`：读 `product-docs/.../baseline/01-基线版本登记表.md` 取最新行
   - `commit SHA`：执行 `cd code/<仓库名> && git rev-parse HEAD`
   - `commit 时间 / 标题`：`git log -1 --format='%ci%n%s'`
   - `相关 DIFF` § 三：按输入的 DIFF 列表，去 `02-PRD-实现差异台账.md` 摘要标题 + 状态
   - `相关 CHG` § 四：按输入的 CHG，去 `03-产品变更登记.md` 摘要标题 + 状态

3. **预填 04-接口契约.md（骨架）**
   - 列出关联模块在后端 OpenAPI 目录（如 `code/<仓库名>/.../openapi/`，具体路径见 PROJECT-PROFILE.md § 五）下的 yaml 路径作为出处
   - § 一接口清单留空表头，由 PM 手填
   - § 二鉴权 / § 三通用约定 / § 五契约漂移处理 套用模板默认文案

4. **预填 05-用例清单.md**
   - 按输入的 `case_id` 列表，去 `test/test-cases/<模块>.csv` 取对应行的 `title / priority / auto / asset_path / evidence_required`
   - 渲染成 § 二表格
   - § 三回归用例：自动加项目约定的全局回归用例（如导航 / 鉴权 / 首页三条，按 test/test-cases/ 实际全局回归集）
   - **【M1.8 D2】预填 § 四「本期用例增删改登记」**：
     - § 4.1 已作废：按输入的"本期作废 case_id 列表"逐行渲染（去 snapshot 对应模块 CSV 提取原断言摘要）
     - § 4.2 本期修改：按输入的"本期修改 case_id 列表"渲染（旧断言从 snapshot 提取，新断言留 `<待 PM 填写>`）
     - § 4.3 本期新增：从输入的 case_id 列表里筛出 snapshot 里**找不到**的 case_id（命令见 § 4.5）
     - § 4.4 不变：自动留空（默认状态）

4.5 **【M1.8 D2 新增】生成 test-cases-snapshot/**
   - 整体复制 `test/test-cases/` 全量内容到包内 `test-cases-snapshot/`
     ```bash
     cp test/test-cases/_用例字段说明.md  <包>/test-cases-snapshot/
     cp test/test-cases/_测试设计方法.md  <包>/test-cases-snapshot/
     cp test/test-cases/*.csv             <包>/test-cases-snapshot/
     ```
   - 填写 `<包>/test-cases-snapshot/_快照元数据.md`：
     - § 一 起包基本信息：起包时间 / 起包人 / 关联 CHG / 关联交付包 / 基线版本
     - § 二 snapshot 来源：源目录 / 文档库 commit SHA（`git rev-parse HEAD`）/ 分支
     - § 三 快照清单：对每个文件跑 `wc -l` 与 `shasum -a 256 | cut -c1-12`，填表
     - § 四 本期处置摘要：从 § 4.1 ~ § 4.3 输入数器算 N 条
   - **校验"输入 case_id vs snapshot"一致性**：
     ```bash
     for cid in <输入的必过 case_id>; do
       hit=$(grep -l "^$cid," <包>/test-cases-snapshot/*.csv | wc -l)
       if [ "$hit" = "0" ]; then
         echo "$cid 在 snapshot 里没找到 → 应在 § 4.3 本期新增登记"
       fi
     done
     ```
     不一致 → 在终端输出 PM 待办清单，提醒补 § 4.3

4.6 **【M1.8 D3 新增】asset_path 物理存在校验**
   - 对 § 二/三 中所有 `auto:Y` 的 case_id，跑：
     ```bash
     for path in <asset_path 列表>; do
       [ -e "$path" ] || echo "$path 不存在 → PM 应先补齐自动化资产再派活"
     done
     ```
   - 命中"不存在"的 → 在终端输出 PM 待办清单（不阻断 .draft 起包，但提醒后续 promote 前要补齐）

5. **预填 01-需求范围与边界.md**
   - § 三 白名单：按输入参数渲染
   - § 四 黑名单：套通用基线（路由/鉴权/CI/Dockerfile/依赖文件），叠加 PM 输入
   - § 二 关联背景：CHG / DIFF 编号自动填
   - 其他段落留 `<待 PM 填写>` 占位

6. **预填 07-时间与里程碑.md**
   - 第一行 `包创建` 自动填今日
   - 最后一行 `归档` 默认填截止日期 + 14 天
   - 中间节点留空给 PM 排

7. **预填 99-状态.md**
   - 当前状态：`draft`
   - 目录后缀：`.draft`
   - 最近变更时间：当前时间
   - 变更人：PM
   - 变更历史表加第 1 行：`- → .draft, 包创建`

8. **预填 08-修复历史.md**
   - 在 § 三示例下方追加一条真实记录：
     ```
     ### [MILESTONE-1] <YYYY-MM-DD HH:mm UTC+8> · 包创建为 .draft
     - 起草人：PM <姓名>
     - 关联：<CHG-XXX>
     - 正文：从 B1.0.x 基线 + commit <短 SHA> 创建。等待 PM 补完 01 § 一/二/五，03 PRD 片段，06 验收标准。
     ```

9. **更新 baseline/03-产品变更登记.md**
   - 在对应 `CHG-XXX` 行的「关联交付包」列填 `deliverables/<本包名>.draft/`

10. **更新 `说明文档.md` § 三 进度记录**
    - 追加：「<日期>·起包：`<本包名>.draft`，关联 `<CHG-XXX>`，待 PM 补完 01/03/06。」

11. **输出 PM 待办清单**（终端输出，不写文件）
    - 「请补完：`01 § 一一句话需求 / § 三白名单细化 / § 五灰色区域`」
    - 「请补完：`03-PRD片段.md` 全部章节」
    - 「请补完：`06-验收标准.md § 七 9 项门槛 + § 三性能门槛具体值`」
    - 「补完后调 `promote-deliverable .draft → .active` 才会真正派给 Codex」

## 输出

```md
## 起包结果

- 包路径：deliverables/<YYYY-MM-DD>-<CHG-XXX>-<中文短名>.draft/
- 状态：.draft
- 关联：<CHG-XXX> / <DIFF-XXX>
- 基线：<B1.0.x> / commit <短SHA>

### 已预填
- AGENTS.md（包根，Codex 自动加载）
- 02 / 04（骨架）/ 05（含 § 四本期增删改）/ 07（首尾）/ 08（MILESTONE-1）/ 99
- test-cases-snapshot/：8 份 CSV + 2 份说明 + _快照元数据.md（含 SHA 校验）

### 待 PM 补完
- 01 § 一一句话需求 / § 三白名单细化 / § 五读权限白名单（默认已套通用集，按需扩展）/ § 六灰色区域
- 03-PRD片段.md 全部章节
- 05-用例清单.md § 四.2「本期修改」的"新断言"列
- 06-验收标准.md § 七 9 项门槛 + § 三性能门槛具体值

### PM 待办清单（M1.8 校验输出）
- [ ] N 条 case_id 在 snapshot 里找不到 → 已自动登记到 § 4.3，请确认是否真新增
- [ ] M 条 asset_path 不存在 → promote 前必须补齐
  - <列出具体路径>

### 下一步
- 补完待办后调 `promote-deliverable .draft → .active`
```

## 禁止事项

- ❌ 直接产 `.active`（必须 `.draft` 起步，强制走 `promote-deliverable`）
- ❌ 跳过 CHG 登记直接起包
- ❌ 包名缺日期 / 缺 CHG / 缺中文短名
- ❌ 不更新 `baseline/03-产品变更登记.md` 的关联交付包列
- ❌ 不更新 `说明文档.md` 进度记录
- ❌ 摘超出输入参数的 DIFF / case_id / 接口（防止 PM 偷塞额外范围）
- ❌ 【M1.8 D1】跳过包内 `AGENTS.md` 校验
- ❌ 【M1.8 D2】跳过 `test-cases-snapshot/` 复制 + 元数据填写
- ❌ 【M1.8 D2】未跑 case_id vs snapshot 一致性校验
- ❌ 【M1.8 D3】未跑 asset_path 物理存在校验
- ❌ **business push 时把工作空间 PM 私有目录加入**（详见下方双向隔离段）

## ⚠️ 双向分支隔离 · business 分支 push 仅推交付包

> ⚠️ **仅当 PROJECT-PROFILE.md § 二「是否启用双向分支隔离」= 是时适用**。
> 若本项目不启用双向隔离（直接推 / 不推），跳过本段，按 PROJECT-PROFILE.md § 二 的推送约定执行。
>
> 本段逻辑沉淀自实战 LOCKED 经验（防工作空间 PM 私有目录污染研发仓库），通用做法保留在骨架；具体分支名 / 镜像目录 / 提交人身份均来自 PROJECT-PROFILE.md § 二。相关实战模式见 knowledge/patterns/（项目实战沉淀）。

**push 范围硬约束**（每次新 `.draft` 起包后镜像 + business push 时）：

| 允许推 ✅ | 禁止推 ❌ |
|---|---|
| 交付包镜像目录整目录（路径见 PROJECT-PROFILE.md § 二「推送范围」，含 12 根 .md + AGENTS + 99 + test-cases-snapshot + attachments）| `product-docs/`（PM 私有 PRD / baseline）|
| 镜像目录下的 `_pending-business-context.md`（累积说明 · 如本次附带）| `deliverables/`（PM 私有交付包根 · 含 99-状态 / 08-修复历史 PM 私有）|
| | `test/tools/e2e-scripts/`（PM 自跑测试工具）|
| | PM 工具脚本（如 `scripts/csv-to-spec.mjs`）|
| | `说明文档.md` / `CLAUDE.md`（PM 主控）|
| | `knowledge/` / `optimization/` / `evals/`（PM 流水线沉淀）|

**操作模板**（分支名 / 镜像目录前缀 / 提交人身份均替换为 PROJECT-PROFILE.md § 二 的值）：

```bash
# 1. 镜像 .draft 到 code/<仓库名>（本 skill § 步骤 8 已完成）
SLUG="<同 _drafts 短名>"
TODAY="$(date +%Y-%m-%d)"
SHORT_DATE="$(date +%Y%m%d)"
PKG_NAME="${TODAY}-<CHG/OPT编号>-${SLUG}"

# .draft 镜像到 PROJECT-PROFILE.md § 二 约定的推送范围目录前缀下
MIRROR_PREFIX="<PROJECT-PROFILE § 二 推送范围目录前缀>"   # 例：docs/acceptance/问题说明
MIRROR_DIR="code/<仓库名>/${MIRROR_PREFIX}/${SHORT_DATE}-${SLUG}"
mkdir -p "$MIRROR_DIR"
cp -R "deliverables/${PKG_NAME}.draft/"* "$MIRROR_DIR/"

# 累积说明（如有）一并附带
[ -s deliverables/_pending-business-context.md ] && \
  cp deliverables/_pending-business-context.md "$MIRROR_DIR/_pending-business-context.md"

# 2. business push（在 code/<仓库名> 内 · 仅镜像目录）
cd code/<仓库名>
# 自检 1：必须切到推送分支（见 PROJECT-PROFILE § 二 推送分支）· 不能在拉取分支推
git checkout <PROJECT-PROFILE § 二 推送分支>

# 自检 2：只 add 镜像目录 · 不要 git add -A / git add .
git add "${MIRROR_PREFIX}/${SHORT_DATE}-${SLUG}/"

# 自检 3：核验暂存区（只命中推送范围目录前缀）
STAGED_OUTSIDE=$(git diff --cached --name-only | grep -v "^${MIRROR_PREFIX}/" || true)
[ -z "$STAGED_OUTSIDE" ] || { echo "❌ 隔离校验: 暂存区含非交付包文件 · 退出"; exit 1; }

# 自检 4：禁止推到拉取分支（见 PROJECT-PROFILE § 二 拉取分支）
[ "$(git branch --show-current)" != "<PROJECT-PROFILE § 二 拉取分支前缀>"* ] || { echo "❌ 隔离校验: 在拉取分支不准 push"; exit 1; }

# 3. commit + push（提交人身份见 PROJECT-PROFILE § 二，如不需独立身份则去掉 -c 段）
git -c user.name="<PROFILE 提交人>" -c user.email="<PROFILE 提交邮箱>" \
    commit -m "biz(req): <CHG-XXX | OPT-XXX | PM-DELIV-XXX> <一句话>"
git push origin <PROJECT-PROFILE § 二 推送分支>
```

**push 后续动作**（本 skill § 步骤 9）：

- 99-状态.md § 二状态变更历史追加 `.draft → business-submitted` 行 + commit SHA
- deliverables/提交记录.md 主账本追加一行（含完整 commit SHA / 短 SHA / 业务侧文件数 / 镜像目录路径）
- 如本次附带了 `_pending-business-context.md`：把已附带条目状态改 `已附带 + <本包名>`
