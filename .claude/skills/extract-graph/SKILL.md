---
description: ⚠️ 占位 skill。从 .done 包抽取实体-关系三元组追加到 knowledge/graph.jsonl。启用门槛：≥ 20 个 .done 包 + PM 在 _graph-schema.md § 七 累积 ≥ 5 条真实检索需求。当前禁用。
---

# Skill · extract-graph（占位 / 待启用）

> 一句话定位：把 `.done` 包内 `01/03/04` 文件中的实体（CHG / 模块 / 接口 / 字段 / 模式）和它们之间的关系抽成 jsonl 三元组，让 PM 能反向检索"这个接口被哪几个 CHG 改过"。

## ⚠️ 当前状态：禁用

**禁止主动调用本 skill**。启用流程：

1. PM 在 `knowledge/_graph-schema.md § 七` 累积 ≥ 5 条**真实**检索需求（不是想象的）
2. PM 主动确认 `.done` 包数 ≥ 20
3. PM 改本文件 frontmatter 的 description，去掉"⚠️ 占位"前缀
4. 在 `optimization/PROMPT-CHANGELOG.md` 追加一段「extract-graph 启用」记录

任何 agent 在 § 当前禁用 段未被去除前调用本 skill → 拒绝执行。

---

## 触发条件（启用后）

- `.active → .done` promote 完成、`pipeline-retrospector` 跑完后立即调
- PM 手动批量回填历史 `.done` 包

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| done 包路径 | ✅ | `deliverables/2026-05-09-OPT-001-...done/` |
| 模式 | ✅ | `incremental`（单包追加） / `backfill`（批量回填） |

## 步骤（启用后实现）

### 1. 读 schema

100% 加载 `knowledge/_graph-schema.md` 的实体类型 + 关系类型白名单。**禁止抽出白名单外的类型**——脏数据进 jsonl 后清理成本极高。

### 2. 抽取 case → module 关系

来源：包内 `03-PRD片段.md` § 改动文件清单 + `04-接口契约.md` 的目录前缀

```
{"s": "case:<run_id>", "p": "修改", "o": "module:<module>", "src": "03-PRD片段.md § 一", "ts": "<done_date>"}
```

### 3. 抽取 case → endpoint 关系

来源：`04-接口契约.md` 接口段。区分：
- 新增接口 → `p: "新增"`
- 调整已有接口 → `p: "调整"`
- 仅读不写 → `p: "读取"`

### 4. 抽取 case → field 关系

来源：`04-接口契约.md` 字段表。仅抽**新增 / 改类型 / 改语义**的字段，纯读取的不抽（噪声太多）。

### 5. 抽取 case → pattern 关系

来源：`optimization/patches-pending/<run_id>.md § frontmatter 关联patterns`（由 retrospector 已写）

### 6. 抽取 chg → case / patch → pattern 关系

来源：包名解析（CHG）+ `optimization/patches-applied/*.md` 的 § 关联 patterns

### 7. 写入 graph.jsonl

```bash
# 严格 append-only
for triple in "${TRIPLES[@]}"; do
  echo "$triple" >> knowledge/graph.jsonl
done
```

每行 JSON 必须含 5 个字段：`s` `p` `o` `src` `ts`，**否则拒绝写入**。

### 8. 数据校验（每次抽取后跑）

```bash
# 行格式校验
jq -e . knowledge/graph.jsonl > /dev/null || echo "❌ jsonl 格式错"

# 类型前缀白名单校验
awk -F'"' '{for(i=2;i<=NF;i+=2) if($i ~ /^[a-z]+:/) print $i}' knowledge/graph.jsonl | \
  awk -F':' '{print $1}' | sort -u | grep -v '^\(case\|chg\|module\|endpoint\|field\|pattern\|agent\|patch\)$' && \
  echo "❌ 出现非法实体前缀"

# 重复三元组（s+p+o 完全相同）
sort knowledge/graph.jsonl | uniq -d -c | awk '$1>1' && echo "⚠️ 有重复三元组"
```

## 输出（启用后）

```
[extract-graph 完成 · 包=<run_id>]
追加三元组数: <N>
按谓词分布: 修改=<a> 新增=<b> 调整=<c> 命中=<d> ...
graph.jsonl 当前总行数: <total>
校验: ✅ 格式 / ✅ 白名单 / ⚠️ 重复 <K> 条（已自动去重）
```

## 不允许的事

- ❌ 在禁用状态下被调用（pre-check 必须跑）
- ❌ 写非白名单实体类型 / 关系类型
- ❌ 跳过 § 8 校验
- ❌ 改写 graph.jsonl 已有行（只能 append）
- ❌ 抽取 `product-docs/` 中的内容（违反四轨隔离）
