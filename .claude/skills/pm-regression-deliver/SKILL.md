---
description: PM 自跑回归补全 + 闭环交付（专用于 "0 代码改动 · 仅测试资产补齐" 类需求 · 不走研发 intake · CSV → spec.ts → 跑测 → 标 DIFF 已发布 一站式）
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · pm-regression-deliver

> 一句话定位：把"PM 自跑回归"作为**独立交付路径**（替代 /new-feature 8-agent 流水线）。专用场景：差异已实证发现代码 100% 就位（0 代码改动）· 仅需补 e2e 回归用例 · 不应走研发 intake。
>
> **设计依据**：实战教训——零代码包不走 new-feature（见 knowledge/patterns/ 项目实战沉淀）
>
> **核心约束**：所有增删改 = 必须走页面 UI 点击 · 禁止 API 直接造数据/清数据 · setup + teardown 也必须 UI 化

---

## 触发条件

- DIFF 裁决结论 = "0 代码改动 · 仅补回归资产"
- PM 主动跑 `/pm-regression-deliver <DIFF-NNN>`（or 单独跑某个模块 / case-id）
- 不走 `/new-feature`（实战教训：8-agent 流水线对此类需求是大马拉小车）

---

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| DIFF 编号 | ✅ | `DIFF-005` / 或一个 _drafts 包名 |
| CSV 来源 | ✅ | `product-docs/_drafts/<日期>-<短名>/06-用例.csv` 或 `test/test-cases/<模块>.csv` 一行段 |
| 目标模块 | 自动推断 | <模块A> / <模块B> / ...（模块清单见 PROJECT-PROFILE.md § 四/五）|
| 角色（默认管理员角色）| 可选 | 测试账号见 PROJECT-PROFILE.md § 六（多角色）|

---

## 5 阶段流程

### S1 · 准备（识别输入 + 环境校验）

```bash
# 1. 确认 DIFF 状态（必须 = "已裁决" 或 "0 代码"）
DIFF="DIFF-005"
grep -A 20 "### ${DIFF}" product-docs/baseline/02-PRD-实现差异台账.md | head -25

# 2. 定位 CSV 来源
CSV="product-docs/_drafts/<日期>-<短名>/06-用例.csv"
[ -f "$CSV" ] || { echo "❌ CSV 不存在 · 先跑 A6 用例专家产 06-用例.csv"; exit 1; }

# 3. 验收环境配置自检（按 PROJECT-PROFILE.md § 六；相关模式见 knowledge/patterns/ 项目实战沉淀）
#    - 前端地址可达：curl -I <PROJECT-PROFILE § 六 前端地址>
#    - 多角色账号有效：（首次跑会自动验证 · 账号见 § 六）
#    - Playwright 装好：cd test/tools/e2e-scripts && <PROFILE § 五 包管理器> install && npx playwright install chromium
```

主对话告知 PM：

> "S1 准备完成：DIFF-<N> · CSV 已定位 · <M> 条 e2e 用例待生成 spec。"
> "是否进 S2 生成？"

---

### S2 · 生成 spec 骨架

```bash
# CSV → spec.ts 骨架（默认输出到 test/tools/e2e-scripts/tests/regression/<模块>/）
node scripts/csv-to-spec.mjs "$CSV"

# 只生成 P0 用例（先做最小闭环）
# node scripts/csv-to-spec.mjs "$CSV" --filter "TC-DSH-00[2-7]"

# 强制覆盖已存在 spec
# node scripts/csv-to-spec.mjs "$CSV" --force
```

输出形如：
```
✅ TC-<MOD>-002 → test/tools/e2e-scripts/tests/regression/<模块>/TC-<MOD>-002.spec.ts
✅ TC-<MOD>-003 → ...
...
📊 生成完成 · created=16 · skipped=0 · 输出目录=...
```

每个 spec 骨架自带：
- Given/When/Then 三段
- 5 态注释（按 CSV five_states 列）
- 设计方法标签（按 CSV scenario 头 `[XX]`）
- 角色推断（按模块）
- TODO PM 占位（提醒手填 locator + 真实 UI 点击）
- Teardown 占位（提醒清残留）

---

### S3 · 填实（PM 手填 / Claude 协助 / reference impl 模仿）

主对话告知 PM：

> "S2 生成 <N> 个骨架。下一步选一条 P0 作为 reference impl 填实 → 跑通 → 其他 N-1 条模仿。"
>
> "options:
>   - A. 让我（主对话）帮你填第 1 条 P0 + 用 Playwright codegen 录制 locator（推荐）
>   - B. 你自己填（参考已存在的 reference impl · 如某条已跑通的 P0 TC-<MOD>-002）
>   - C. 跳过填实 · 先 dryrun 看骨架（会 100% fail · 但能验证生成质量）"

主对话填实流程（选 A 时）：
1. 用 `mcp__playwright__browser_navigate` 打开前端地址（见 PROJECT-PROFILE.md § 六）
2. UI 登录管理员角色账号（账号 / 口令见 PROJECT-PROFILE.md § 六）
3. 走 CSV steps 列每一步 · 抓真实 locator
4. 把 locator 写回 spec.ts · TODO PM 段替换为真实代码
5. UI 点击式增删改（如果 CSV 含数据改动） · 不允许调 API
6. teardown 段也走 UI 删除（如真创建了数据）

填实质量门槛：
- ✅ `<PROFILE § 五 包管理器> test --grep <case_id> --headed` 单条全过
- ✅ 0 个 TODO PM 残留
- ✅ evidence 截图按 5 态全采
- ❌ 任何 `api.fetch(...)` / `request.post(...)` 跨过页面直接造数据 = 不通过

---

### S4 · 跑测（单条 → 批量 → 全 PASS）

```bash
cd test/tools/e2e-scripts
# 下方 pnpm 可按 PROJECT-PROFILE.md § 五 包管理器替换（npm / yarn / pnpm）

# 1. 单条 headed 调试（首次跑 reference impl）
pnpm test --grep TC-<MOD>-002 --headed

# 2. 单模块批量
pnpm test tests/regression/<模块>

# 3. 失败排查
#    - reports/<版本>/playwright-results/html-report/index.html 看
#    - retain-on-failure 自动留 trace + video + screenshot
pnpm report

# 4. 重跑失败用例
pnpm test --last-failed
```

跑测产物（按 `BASELINE_VERSION` 归档）：
- `test/reports/<版本>/playwright-results/html-report/`
- `test/reports/<版本>/playwright-results/results.json`
- `test/reports/<版本>/playwright-results/junit.xml`
- `test/evidence/<版本>/<case_id>/` 截图 / network har

---

### S5 · 闭环（标 DIFF 已发布 + 提交记录 + 收尾）

**与 /new-feature 路径的差异**（**不要走错**）：

| 维度 | /new-feature 研发 intake | **PM 自跑路径（本 skill）** |
|---|---|---|
| 代码改动 | ≥ 1 行 | **0 行** |
| 包状态机 | .draft → .active → .done | **无包 · 不进 deliverables/** |
| 业务侧 push | ✅ commit + push | **❌ 不 push business commit** |
| DIFF 切已发布 | .done 自动触发 | **全 PASS 后 PM 手动改 baseline** |
| 提交记录登记 | OPT-XXX 主账本一条 | **"PM-DELIV-XXX" 一条（区别 OPT）** |
| retrospect | 进 runs.csv + cases.csv + patches-pending | **不进**（不属流水线运行 · 直接更新 patterns） |

S5 具体步骤：

```bash
# 1. 全 PASS 校验
grep -q '"failed":\s*0' test/reports/<版本>/playwright-results/results.json && echo "✅ 全 PASS"

# 2. baseline DIFF 状态切"已发布"
#    打开 product-docs/baseline/02-PRD-实现差异台账.md
#    把 DIFF-<N> 的 "状态" 字段改 "已发布 · PM 自交付（YYYY-MM-DD）"
#    "裁决结论" 字段补一句 "<YYYY-MM-DD> PM 自跑回归补全完成 · <N>/<N> PASS · 见 test/reports/<版本>/"

# 3. CSV 升档到 test/test-cases/<模块>.csv
#    把 _drafts/<日期>-<短名>/06-用例.csv 内容 append 到 test/test-cases/<模块>.csv（追加 N 行 · 不重号）

# 4. 提交记录登记（主账本 § 一新一条 + § 二详情段）
#    编号 = PM-DELIV-001（顺延）· 区别 OPT-XXX
#    内容范本见本 SKILL § 附录 1
```

---

## 工具

- **生成器**：`scripts/csv-to-spec.mjs`（CSV → spec.ts 骨架）
- **Playwright**：`test/tools/e2e-scripts/`
- **数据策略**：`fixtures/auth.ts`（多角色登录 · 账号见 PROJECT-PROFILE.md § 六）· **无 fixtures/api.ts 主流调用**（API 仅留作清理兜底）
- **MCP**：`mcp__playwright__*`（主对话填实 reference impl 时用）

---

## 不允许的事

- ❌ **混用 /new-feature**：本 skill 触发后不准回退到 8-agent 流水线
- ❌ **API 造数清数**：所有真实数据增删改必须 UI · 见 fixtures/auth.ts 头部注释
- ❌ **跨基线归档**：reports/ 必须按 BASELINE_VERSION 分目录
- ❌ **跳过 reference impl**：第一条 P0 没跑通就跑 16 条 = 100% fail
- ❌ **业务侧 push commit**：本 skill 不产 business commit（与研发交付包 OPT-XXX 区别 · 见 knowledge/patterns/ 项目实战沉淀）

---

## 附录 1 · 提交记录登记范本（S5 第 4 步用）

§ 一 主账本表追加一行（紧贴序号最大的）：

```md
| <N+1> | <YYYY-MM-DD HH:mm +08:00> | **PM-DELIV-001** | <DIFF-NNN> <模块>验收资产补齐（<X>/<X> PASS · PM 自跑） | — | — | **PM 自交付**（0 代码 · 仅测试资产 · 不走研发 intake） | <N> 条 .spec.ts · 位于 `test/tools/e2e-scripts/tests/regression/<模块>/` | `test/reports/<版本>/playwright-results/` | ✅ PM 自跑全 PASS · DIFF-<NNN> 已切"已发布" |
```

§ 二 详情段（仿研发交付包撤回条 § 二的简化版）：

```md
### 提交 #<N+1> · PM-DELIV-001 <模块>验收资产补齐（<DIFF-NNN> · PM 自跑）（<YYYY-MM-DD HH:mm>）

| 字段 | 值 |
|---|---|
| **编号** | PM-DELIV-001 |
| **路径** | PM 自跑回归补全（不走研发 intake · 见 `.claude/skills/pm-regression-deliver/`）|
| **关联 DIFF** | <DIFF-NNN>（状态 "已裁决" → "已发布 · PM 自交付"）|
| **关联包** | OPT-<X>（已撤回 · 替代路径）|
| **产物** | <N> 条 .spec.ts + reports + evidence |
| **跑测结果** | <X>/<X> PASS · 0 fail · 0 skipped |
| **基线版本** | B1.x.x |

**为什么不走 /new-feature**：DIFF-<NNN> 是"0 代码改动 + 仅测试资产"类型 → 研发拿到不知做什么 → 走 PM 自跑路径（见 knowledge/patterns/ 项目实战沉淀）

**反思**：……
```

---

## 中断与恢复

- S2 生成失败 → 检查 CSV 18 列完整性（automation_type 列必须有 e2e / hybrid）
- S3 填实卡住 → 选 C dryrun 看骨架 · 或先跑通 1 条 smoke 用例
- S4 失败 > 30% → 不要硬跑 16 条 · 回 S3 重新审视 reference impl · 多半是 locator 模式错
- S5 跑通后 PM 反悔 → 跑 `git checkout` 还原 baseline 即可（无 business commit）
