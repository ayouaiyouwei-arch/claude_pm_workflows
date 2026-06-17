# graph.jsonl · 实体-关系 schema（Layer B，待启用）

> ⚠️ **当前未启用**。本文件只是占位 schema。启用门槛：≥ 20 个 `.done` 包 + PM 主动决议。

---

## 一、为什么要做

到一定规模后，单纯靠 grep `cases.csv` 不够：
- 无法回答"上次改 admin/order-list 的 CHG 都碰过哪些字段"
- 无法回答"接口 `POST /order/cancel` 在哪几个包被改过、改前改后的契约"
- 无法回答"模式 P003 影响的所有 agent 与所有触及端的交叉表"

`graph.jsonl` 是**单文件三元组**，diff-friendly，**不上 Neo4j / 不上向量库**。

---

## 二、实体类型（白名单，可扩展）

| 类型前缀 | 示例 | 来源 |
|---|---|---|
| `case:` | `case:2026-01-15-OPT-001-...` | `cases.csv` 第 1 列 |
| `chg:` | `chg:CHG-039` | 包名解析 |
| `module:` | `module:admin/order-list` | `03-技术方案.md` 改动文件聚合 |
| `endpoint:` | `endpoint:POST_/order/cancel` | `04-接口契约.md` |
| `field:` | `field:Order.status` | `04-接口契约.md` |
| `pattern:` | `pattern:P001` | `knowledge/patterns/` |
| `agent:` | `agent:product-expert` | `.claude/agents/` |
| `patch:` | `patch:patch-007` | `optimization/patches-applied/` |

---

## 三、关系类型（白名单，可扩展）

| 谓词 | 主体 → 客体 | 含义 |
|---|---|---|
| `修改` | case → module | 本期改动了某模块 |
| `新增` | case → endpoint | 本期新增了某接口 |
| `调整` | case → endpoint | 本期改了已有接口 |
| `读取` | case → field | 本期读取某字段（不改） |
| `命中` | case → pattern | 本期出现某模式 |
| `归属于` | chg → case | CHG 与 case 的归属（多对一可能） |
| `打补丁于` | patch → agent | 补丁改了哪个 agent |
| `规避` | patch → pattern | 补丁声称规避哪个模式 |

---

## 四、jsonl 格式

每行一个 JSON 对象：

```json
{"s": "case:2026-01-15-OPT-001-card-collapse", "p": "修改", "o": "module:admin/order-list", "src": "03-技术方案.md § 一", "ts": "2026-05-15"}
{"s": "case:2026-01-15-OPT-001-card-collapse", "p": "命中", "o": "pattern:P001", "src": "patches-pending/2026-05-09-...md", "ts": "2026-05-15"}
{"s": "patch:patch-007", "p": "规避", "o": "pattern:P001", "src": "PROMPT-CHANGELOG.md", "ts": "2026-06-12"}
```

字段：
- `s` (subject) — 必填，实体 ID（带类型前缀）
- `p` (predicate) — 必填，谓词
- `o` (object) — 必填，实体 ID 或字符串字面量
- `src` — 必填，证据来源（文件路径 + 锚点）
- `ts` — 必填，三元组写入日期

---

## 五、未来检索范例（启用后）

```bash
# 上次改 admin/order-list 的所有 case
grep '"o": "module:admin/order-list"' knowledge/graph.jsonl | jq -r '.s'

# pattern P001 在哪些 case 出现过
grep '"o": "pattern:P001"' knowledge/graph.jsonl | jq -r '.s'

# 哪些 patch 规避了 P001
grep '"p": "规避"' knowledge/graph.jsonl | grep '"o": "pattern:P001"' | jq -r '.s'
```

---

## 六、启用前清单

- [ ] `.done` 包数 ≥ 20
- [ ] 已有 PM 在 5 个不同场景下"想要这种检索"的真实需求（写在本文件 § 七）
- [ ] 抽取脚本已写完并跑过 5 个历史包验证
- [ ] 启用后第一周，PM 每天检查 jsonl 是否被污染（错类型前缀 / 缺 src 等）

---

## 七、PM 真实需求记录（积累场景，启用前 ≥ 5 条）

| 序 | 日期 | 场景描述 |
|---|---|---|
| 1 | - | - |
