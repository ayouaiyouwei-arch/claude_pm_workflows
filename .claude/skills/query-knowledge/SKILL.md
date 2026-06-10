---
description: 在 A1/A3/A6 的「必读」阶段调用，按触及端 / 类型 / 模块从 knowledge/cases.csv + knowledge/patterns/ 找出相关历史包与已知模式，让 agent 不再重复犯老错。
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · query-knowledge

> 一句话定位：把"翻历史 .done 包找经验"这件事从随机 grep 变成结构化检索。

## 触发条件

- A1（产品专家）在必读阶段，识别完触及端后
- A3（技术方案专家）在 5 项复用扫描前
- A6（测试用例专家）在必读阶段确认本期类型后
- PM 手动调（如临开包前想看"上次类似需求踩过什么坑"）

## 输入

| 输入 | 是否必填 | 示例 | 来源 |
|---|---|---|---|
| 触及端 | ✅ | `<端A>;<端B>`（触及端清单见 PROJECT-PROFILE.md § 五）| A1 § 〇 |
| 类型 | ✅ | `新增` / `优化` / `UI重构` | A1 § 〇 |
| 核心模块（可选） | 否 | `<端>/<模块>` | A3 § 一 |
| 调用方 | ✅ | `A1` / `A3` / `A6` / `PM` | 自报 |

## 步骤

### 1. 检索 knowledge/cases.csv

```bash
TOUCH_ENDS="<触及端，多值用 |>"  # 如 "<端A>|<端B>"（端清单见 PROJECT-PROFILE.md § 五）
TYPE="<类型>"
MODULE="<核心模块或空>"

# 找触及端 / 类型有重叠的最近 5 个 .done 包
awk -F',' -v t="$TOUCH_ENDS" -v ty="$TYPE" -v m="$MODULE" '
NR>1 && $4 ~ t && ($3 == ty || ty == "") && (m == "" || $6 ~ m) {print}
' knowledge/cases.csv | tail -5
```

### 2. 检索 knowledge/patterns/

```bash
# 列所有 active 状态的模式，按"最近出现"排序
for f in knowledge/patterns/P*.md; do
  STATUS=$(awk -F': ' '/^状态:/ {print $2}' "$f")
  RECENT=$(awk -F': ' '/^最近出现:/ {print $2}' "$f")
  AGENT=$(awk -F': ' '/^关联agent:/ {print $2}' "$f")
  # 状态匹配规则（patch-011 修正）：含 active 或 LOCKED = 活跃；含 dormant/已规避 = 休眠不返回
  case "$STATUS" in
    *dormant*|*已规避*) ;;                      # 休眠：跳过
    *active*|*LOCKED*) echo "$RECENT | $f | $AGENT" ;;
  esac
done | sort -r | head -10
```

### 3. 按调用方过滤模式相关性

| 调用方 | 只看 关联agent 包含 |
|---|---|
| A1 | `product-expert` |
| A3 | `tech-architect` |
| A6 | `test-case-author` |
| PM | 全部 |

### 4. 产出（口头返回，不落盘）

```
[query-knowledge 完成]

📚 触及端有重叠的最近 5 个 .done 包：
  1. <case_id_1>: 类型=<X> 模块=<Y> 决策摘要=<Z>
     done 路径: deliverables/<case_id_1>.done/
  ...

⚠️ 与本期相关的 active 模式（按最近出现）：
  P003 · <标题>（最近: 2026-04-28 · 关联: tech-architect）
  P001 · <标题>（最近: 2026-05-09 · 关联: product-expert）

💡 建议：
  - 进 deliverables/<case_id_1>.done/ 看 03-PRD片段.md（同模块的最近决策）
  - 读 knowledge/patterns/P003-...md（看对策段是否已避开）
```

### 5. （patch-011）图谱需求积累引导（产出末尾固定附一句）

```
本次检索若没找到你想要的（如"想按组件名找所有用过它的包"这类 cases.csv 列维度覆盖不了的查询），
请把想要的检索方式一句话告诉 PM 记入 knowledge/_graph-schema.md § 七——
积累 ≥ 5 条真实需求是启用知识图谱（graph.jsonl）的硬门槛之一。
```

## 输出规则

- **只读不写**——本 skill 不允许写任何文件（§ 七需求记录由 PM 决定后人工写入）
- **结果不上下文淹没**：每类至多列 5 条，过多则要求调用方收紧筛选条件
- **降级**：knowledge/cases.csv 行数 < 3 时，直接返回 "样本不足，跳过"，不要硬凑

## 上游 agent 接入方式（✅ patch-011 已接线：A1 必读第 11 项 / A3 必读第 7 项 / A6 必读第 7 项）

```md
## 必读

...
8. （可选）调 query-knowledge skill 找历史包：
   ```
   触及端: <本期触及端>
   类型: <新增/优化/UI重构>
   调用方: A1
   ```
   - 输出会列出最近 5 个相关 .done 包 + active patterns
   - **如果有 P 编号的 active 模式与本期高度相关，必须读完对应 patterns 文件再继续**
```

## 不允许的事

- ❌ 改 `knowledge/cases.csv` 或 `knowledge/patterns/*.md`
- ❌ 把模式当成"权威结论"——它只是历史信号，本期具体决策仍以 PM + 当前 agent 判断为准
- ❌ 调用方未传 `调用方` 字段就跑——拒绝执行（用于审计 grep 谁在用）
