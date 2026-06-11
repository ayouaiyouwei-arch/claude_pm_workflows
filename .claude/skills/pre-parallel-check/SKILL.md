---
description: 并行对话开新需求前的预检命令。一次性输出当前 .active 占用、.draft 在飞、下一个可用 OPT-XXX / 类似编号、下一个可用 CHG-XXX-A、business push 分支、当前 release 分支 SHA，并按 5 维度（D1 文件交集 / D2 核心架构同项 / D3 schema / D4 接口 / D5 active 闸）做冲突自检，按"完全独立 / 有冲突 / 仅 D5 排队"三档输出。完全独立的需求并行无数量上限。
---

# Skill · pre-parallel-check

> 一句话定位：开新对话提需求前，把"工作空间共享元数据当前状态"一次性导出 + 按 5 维度做冲突自检，给新对话一段开场预占位文本。**完全独立可并行无上限，命中 D1-D4 任一冲突即不允许并行**。

## 触发条件

- PM 准备**在新对话框 / 新窗口提一个新需求**（OPT / 类似编号体系），而当前工作空间已有其他对话**在跑 A1~A8 流水线但还没升 .active**
- PM 想确认"现在能不能并行"+ "下一个 OPT/CHG 号是几"
- 与 `/new-feature` 流水线 A1 启动**之前**配对：A1 第一步 grep 之前先看这段

## 不适用

- 单对话顺序提需求：直接 `/new-feature` 即可，不需要预检
- 已经在 .active 施工中 / 等研发回包：那是 `/babysit-active` 的事，不是本 skill

## 输入

无参数。仅读取工作空间当前文件状态。

## 步骤

### 1. 扫 `.active` 占用（硬约束 · 单 active）

```bash
ACTIVE_PKGS=$(ls deliverables/ 2>/dev/null | grep "\.active$")
ACTIVE_COUNT=$(echo "$ACTIVE_PKGS" | grep -c . || echo 0)
```

判定：
- `ACTIVE_COUNT == 0` → ✅ 新对话可以跑到 .active
- `ACTIVE_COUNT == 1` → ⚠️ 新对话**只能跑到 .draft + push business**，不能升 .active（须等当前 .active 升 .done / archive）
- `ACTIVE_COUNT > 1` → 🚨 已违反 single-active 铁律，先停下查原因再开新对话

### 2. 扫 `.draft` 在飞

```bash
DRAFT_PKGS=$(ls deliverables/ 2>/dev/null | grep "\.draft$")
DRAFT_COUNT=$(echo "$DRAFT_PKGS" | grep -c . || echo 0)
```

把每个 `.draft` 包名 + mtime 一起列出来，让 PM 一眼看到"几条对话在飞"。

### 2.5 冲突自检 5 维度（**最关键 · D1-D4 任一命中 = 禁并行**）

> 主对话拿到新需求的"一句话 + 预判触及文件"后必须跑本节。完全独立 = 多 .draft 并行无上限；命中冲突 = 后来的对话必须停。

新需求触及的文件清单（来源 = PM 一句话 + 主对话 grep 实证预判，不需要精确到行）：

```bash
NEW_GLOBS=(
  "<glob1>"
  "<glob2>"
)
```

逐 .active + .draft 包做 5 维度比对：

#### D1 · 修改白名单文件交集（**最关键**）

```bash
for PKG in $ACTIVE_PKGS $DRAFT_PKGS; do
  RANGE_FILE="deliverables/$PKG/01-需求范围与边界.md"
  [ -f "$RANGE_FILE" ] || continue
  # 抽出 § 三 修改白名单的 glob 列表（按项目实际结构调整目录关键字）
  EXISTING_GLOBS=$(awk '/^## 三/,/^## 四/' "$RANGE_FILE" | grep -oE "(src|packages|app|backend|frontend|server)/[^ \`]+")
  for NEW in "${NEW_GLOBS[@]}"; do
    echo "$EXISTING_GLOBS" | grep -F "$NEW" && echo "⛔ D1 冲突：$PKG 已占用 $NEW"
  done
done
```

判定：任 1 文件路径 overlap = 冲突。整目录 `**` 与子文件也算 overlap。

#### D2 · 核心架构 / shared 同项触动

```bash
for PKG in $ACTIVE_PKGS $DRAFT_PKGS; do
  RANGE_FILE="deliverables/$PKG/01-需求范围与边界.md"
  [ -f "$RANGE_FILE" ] || continue
  # PROJECT-PROFILE.md § 三 已列项目核心架构黑名单清单 · grep 关键词按项目本地调整
  CORE_HIT=$(grep -E "shared/|config/|Dockerfile|核心架构.*\*\*是\*\*" "$RANGE_FILE")
  if [ -n "$CORE_HIT" ]; then
    echo "⚠️ D2 候选冲突：$PKG 触动核心架构 → 主对话核对新需求是否同项"
  fi
done
```

判定：两包都改 `shared/` / `config/` / Dockerfile / 鉴权 / 路由 / CI / 依赖（按 PROJECT-PROFILE.md § 三登记的核心架构黑名单逐项核对）= 冲突。

#### D3 · DB migration / schema 同表

```bash
for PKG in $ACTIVE_PKGS $DRAFT_PKGS; do
  SCHEMA_HIT=$(grep -E "V[0-9]+__|migration|ALTER TABLE|CREATE TABLE|数据库表.*[1-9]" "deliverables/$PKG/01-需求范围与边界.md" 2>/dev/null)
  [ -n "$SCHEMA_HIT" ] && echo "⚠️ D3 候选冲突：$PKG 含 schema 变更 → 新需求是否动同表？"
done
```

判定：两包都新建 V编号 / 都 ALTER 同一表 = 冲突。

#### D4 · OpenAPI / 接口契约同路径

```bash
for PKG in $ACTIVE_PKGS $DRAFT_PKGS; do
  CONTRACT_FILE="deliverables/$PKG/04-接口契约.md"
  [ -f "$CONTRACT_FILE" ] || continue
  EXISTING_APIS=$(grep -oE "/api/[a-z_/{}.-]+" "$CONTRACT_FILE" | sort -u)
  for NEW_API in "${NEW_APIS[@]:-}"; do
    echo "$EXISTING_APIS" | grep -F "$NEW_API" && echo "⛔ D4 冲突：$PKG 已占用接口 $NEW_API"
  done
done
```

判定：两包都改同一 OpenAPI 路径 / 同一 OpenAPI tag = 冲突。

#### D5 · single-active 闸（**保留**）

复用 § 1 的 `ACTIVE_COUNT`：

- `ACTIVE_COUNT == 0` → ✅ 新对话可升 .active
- `ACTIVE_COUNT == 1` → ⚠️ 新对话**只能跑到 .draft + push business**（仍允许并行 · 但 .active 排队）
- `ACTIVE_COUNT > 1` → 🚨 违反铁律 · 先停查

> ⚠️ D5 保留原因：dev-verify smoke（P005）+ 用户灰度主观体验（P013）都要独占灰度环境 · 多 .active 同时验收会互相污染。

#### 三档结论

| 维度组合 | 结论 | 允许动作 |
|---|---|---|
| D1-D4 全独立 + D5 = 0 | ✅ **完全独立** | 新对话可一路跑到 .draft → .active（无数量上限） |
| D1-D4 全独立 + D5 = 1 | 🟡 **仅 D5 排队** | 新对话可跑到 .draft + push business · .active 等闸 |
| D1-D4 任一命中 | ⛔ **禁并行** | 新对话**必须停** · 等冲突的 .active/.draft 升 .done 后再开 |

> **（patch-012）逃逸登记提醒**：本次新需求若是 **hotfix / followup（修已 .done 包暴露的缺陷）**，立项前先追加 1 行 `evals/escapes.csv`（9 列 · 见 `evals/_escapes字段说明.md`），处置列填本次新包号。

### 3. 计算下一个可用编号（OPT / 类似前缀）

> 注：项目实际编号前缀按 PROJECT-PROFILE.md 登记调整（OPT / FEAT / BUG / TICKET 等）

```bash
PREFIX="OPT"   # 按项目本地调整
MAX_DELIV=$(ls deliverables/ 2>/dev/null | grep -oE "${PREFIX}-[0-9]+" | sort -u | sed "s/${PREFIX}-//" | sort -n | tail -1)
MAX_CHG=$(grep -oE "CHG-${PREFIX}[0-9]+" product-docs/*/baseline/03-产品变更登记.md 2>/dev/null | grep -oE "[0-9]+" | sort -n | tail -1)
NEXT_NUM=$(( ${MAX_DELIV:-0} > ${MAX_CHG:-0} ? ${MAX_DELIV:-0} : ${MAX_CHG:-0} ))
NEXT_ID=$(printf "${PREFIX}-%03d" $((NEXT_NUM + 1)))
```

注意：基线表路径用通配 `product-docs/*/baseline/03-产品变更登记.md` 兜底未来重命名。

### 4. 扫 business push 分支当前状态

> 仅在项目启用了双向分支隔离（拉 release 推 business）时执行 · 否则跳过

```bash
# 切到 code/ 子仓 · 路径按 PROJECT-PROFILE.md 登记调整
cd code/<项目主仓名> 2>/dev/null && {
  CURRENT_BRANCH=$(git branch --show-current)
  RELEASE_BRANCH=$(git branch -a 2>/dev/null | grep -oE "release/[a-zA-Z0-9._/-]+" | head -1)
  RELEASE_HEAD=$(git rev-parse --short $RELEASE_BRANCH 2>/dev/null || git rev-parse --short HEAD)
  BIZ_BRANCH=$(git branch -a 2>/dev/null | grep "feature/business-submit-" | sed 's/^.*\///' | sort -u | tail -1)
}
cd - >/dev/null
```

输出：
- 当前 checkout 在哪个分支（如果停在 business 分支 → 提醒 sync 前先切回 release · 见骨架自带 P007 实证驱动）
- release 分支 HEAD SHA（新对话 grep 实证用）
- 最近的 business 分支名（新对话 push 时用 · 或当日新建 `feature/business-submit-<日期>`）

### 5. 生成"复制粘贴预占位文本"

直接打印给主对话（PM 把它复制到新对话的第一条消息），格式：

```
【并行预占位 · <时间戳>】

· 当前 .active：<包名 或 "无（可升 .active）">
· 当前 .draft（在飞 N 条）：
  - <draft 包名 1>
  - <draft 包名 2>
· 本对话预占编号：<OPT-XXX>
· 关联 CHG：<CHG-XXX-A>（首次登记用 -A · 同包追加变更用 -B/-C）
· code 当前分支：<分支名>
· code release HEAD：<短 SHA>
· business push 分支：<分支名>

【冲突自检 5 维度结果】
· D1 文件交集：<✅ 独立 / ⛔ 与 <包名> 在 <文件路径> 冲突>
· D2 核心架构同项：<✅ 独立 / ⛔ 都触 shared|config|Dockerfile|路由|鉴权|CI|依赖 同项>
· D3 schema 同表：<✅ 独立 / ⛔ 都改同表>
· D4 接口同路径：<✅ 独立 / ⛔ 都改 <接口路径>>
· D5 active 闸：<✅ 0 active / 🟡 1 active 需 .draft 排队 / 🚨 > 1 违规>

【结论档位】
<✅ 完全独立 · 允许跑到 .active>
 或 <🟡 仅 D5 排队 · 允许跑到 .draft + push business · .active 等闸>
 或 <⛔ 禁并行 · 命中 D1/D2/D3/D4 中 <X> 项 · 新对话必须停>

【铁律提醒】
1. ⛔ 档 → 立即关闭本对话 · 等冲突 .active/.draft 升 .done 后再开
2. 🟡 档 → 本对话只跑到 .draft + push business · 不要主动升 .active
3. ✅ 档 → 完全独立 · 可一路跑到 .active（无数量上限）
4. CHG 登记请用 <CHG-XXX-A>，不要重新分配，已经在主对话占位
5. .active 升级仍走 promote-deliverable skill（D5 闸保留）
```

### 6. PM 主对话端落痕（可选）

如果 PM 真的要并行多条，主对话可以在 `deliverables/_parallel-reservations.md`（不存在则新建 · 不入 git）追加一行：

```
<时间戳> | <编号> | <CHG-XXX-A> | <一句话需求> | 新对话窗口名
```

避免 5 分钟内 PM 自己再开第 3 条又重复占同一号。

> 注意：该文件不归档不入 git · 只是主对话的临时备忘 · 包升 .draft 后这一行自然失效。

## 输出

主对话直接把第 5 步那段"预占位文本"以代码块形式贴出来，让 PM 一键复制。同时简短说明：
- 本次预占的编号 + CHG 号
- 5 维度自检结论档位（✅ 完全独立 / 🟡 仅 D5 排队 / ⛔ 禁并行）
- ⛔ 档时必须明确告知 PM："**本需求与 <冲突包名> 命中 D<X> 冲突 · 建议关闭新对话 · 或先撤销冲突包的 .draft**"

## 反例（禁止重犯）

- ❌ 不读 baseline 03 直接拿 `deliverables/` 目录算最大号 → 漏掉只在基线表登记但还没建包的 CHG · 撞号
- ❌ 在新对话用本 skill（应：本 skill 在**当前主对话**跑 · 输出文本给 PM 复制到**新对话**）
- ❌ **不跑 D1-D4 冲突自检直接并行** → 两包同时改同文件 / 同表 / 同接口 → merge 冲突 + 验收互相污染
- ❌ 看到 ACTIVE_COUNT=1 还允许新对话升 .active → 违反 D5 single-active 铁律
- ❌ 误把"并行数量"当判定依据 → 应判 D1-D4 文件/架构/schema/接口冲突 · 数量本身不是约束
