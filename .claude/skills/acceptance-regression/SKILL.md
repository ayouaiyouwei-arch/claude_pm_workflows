---
name: acceptance-regression
description: 独立验收回归框架（L2 通用·跨项目）。当需要为一个项目搭建「独立于研发自测的、打真实环境的黑盒验收回归」时使用：包括出独立验收报告、5 角色权限矩阵、按层级/模块/优先级聚合、P0 红线阻断。适用于任何 Playwright + 真实环境的验收场景，项目专属值由 acceptance.config.json 注入。不适用于研发侧单元/契约测试（那是研发自测）。
---

# 独立验收回归框架 · L2 通用引擎

> 起源：robobus-workspace_pm 于 2026-06-01 抽象上 L2（CLAUDE 工作空间 P028 首次 L1→L2 实战）。
> 引擎项目无关；项目专属值（模块/角色/URL/路由）全部由 `acceptance.config.json` 注入。

## 一、是什么 · 为什么独立

**独立验收 ≠ 研发自测。** 研发的全量 runner 多为 mock dev server（被测方用自己的 mock 考卷判自己）。复用它 = 验收无独立价值（实战教训：研发全量 100% PASS 仍漏掉潜伏 30+ 天的 P0，因为 mock 掩盖了真实数据流）。

**独立验收三原则**（贯穿所有用例）：
1. **真实环境**（不 mock）：打真实灰度/预发，真后端真数据。报告必打印 baseURL 作为非-mock 铁证。
2. **黑盒行为**（不审源码）：只断言用户可见行为，不碰源码契约 / type-check / SQL（那是研发的）。→ 天然不与研发实现漂移：后端怎么重构，行为对就过。
3. **独立断言源**：断言来自 PM 验收用例（场景化 Given/When/Then）+ 视觉规范 + 灰度发现的真实 bug，**不抄研发权限码 / equivalenceMethod**。

## 二、三层防御中的定位

| 层 | 机制 | 速度 | 抓什么 |
|---|---|---|---|
| 快筛 | dev-verify（升 .done 后冒烟）| 秒~分 | 功能"在不在" |
| **系统化考卷** | **本框架** | 10–30min | 功能"对不对"（全模块行为 + 权限矩阵 + 5 态）|
| 人眼兜底 | PM 灰度主观体验 | 5min | runner 测不到的体感/数据合理性 |

本框架是中间层——可重复、出报告、系统化。

## 三、分层 L0–L5（在项目 `tests/` 下扩展）

| 层 | 目录 | 内容 |
|---|---|---|
| L0 | `tests/smoke/` | 多角色登录 + 首页可达 |
| L1 | `tests/regression/<模块>/` | 各模块 CSV 用例的真实行为断言 |
| L2 | `tests/permission/` | 角色 × 关键页权限矩阵（数据驱动）|
| L3 | `tests/scenario/` | 跨模块业务链 |
| L4 | `tests/visual-regression/` | 双断点像素基线（视觉回归独立跑，不进主回归红绿）|
| L5 | 编排 | `pnpm test:acceptance`（跑 L0-L3）→ 本引擎出报告 |

## 四、tag 约定（过滤 + 报告归因的基础）

spec 标题内打 tag（供 `--grep` 过滤），同时 push annotations（供报告归因，两者并存）：
- 层级 `@L0..@L4` / 优先级 `@P0 @P1 @P2` / 模块 `@<缩写>`（见 config.modules）/ 角色 `@role:<id>`
- annotations：`case_id` / `priority` / `diff_ref` / `role` / `page` / `expected`(L2 用)
- 过滤：`pnpm test --grep @P0`、`pnpm test --grep @<模块缩写>`、`pnpm test --grep @permission`

## 五、配置 `acceptance.config.json`（放项目根，引擎从 cwd 向上找）

| 字段 | 必填 | 含义 |
|---|---|---|
| `projectLabel` | 否 | 报告标题前缀，如 `robobus` |
| `baseURL` | 是 | 真实环境地址（独立性铁证）|
| `localBaseURL` | 否 | `PLAYWRIGHT_ENV=local` 时的本地地址 |
| `reportsDir` | 否 | 报告根目录（默认 `test/reports`），引擎按 `<reportsDir>/<BASELINE_VERSION>/` 找 |
| `resultsSubpath` | 否 | Playwright json 产物相对路径（默认 `playwright-results/results.json`）|
| `reportFileName` | 否 | 输出报告名（默认 `独立验收回归报告.md`）|
| `codeRepoForSha` | 否 | 读研发快照 SHA 的 git 仓相对路径（无则跳过）|
| `devRunnerLabel` | 否 | 报告里点名"独立于"的研发 runner |
| `modules` | 是 | `{缩写: 中文名}`，用于 tag 归因 + 报告模块表 |
| `layers` | 否 | 覆盖默认层级名 |
| `defaultBaseline` | 否 | 未传 BASELINE_VERSION 时的默认值 |

## 六、接入新项目（4 步）

1. **项目根放 `acceptance.config.json`**（按 § 五，参考 `templates/acceptance.config.template.json`）。
2. **建独立 Playwright 项目**：`playwright.config.ts` 的 `baseURL` 指真实环境、reporter 含 `json`（outputFile = `<reportsDir>/<版本>/playwright-results/results.json`）、`screenshot: only-on-failure`。
3. **写 spec**：标题打 tag（§ 四）+ push annotations；登录走 fixture（每项目自实现 `loginAs`）；**禁 `page.route` mock、禁抓 API 断言、禁 SQL**——只断言用户可见行为。L2 权限矩阵用数据驱动（一份 MATRIX 数据 + 一个遍历 spec），`denied` 判定 = goto 后 `not.toHaveURL`（被路由守卫重定向走）。
4. **跑测 + 出报告**：
   ```bash
   BASELINE_VERSION=<版本> pnpm test:acceptance
   BASELINE_VERSION=<版本> node "$HOME/.claude/skills/acceptance-regression/lib/acceptance-report.mjs"
   ```
   报告落 `<reportsDir>/<版本>/<reportFileName>`。P0 有 FAIL → 引擎 exit 1（阻断）。

## 七、L1 / L2 边界

- **L2（本 skill · 通用）**：`lib/acceptance-report.mjs` 报告引擎 + 本方法论 + config schema + 分层/tag 约定。
- **L1（项目 · 专属）**：`acceptance.config.json` 值 + 用例 CSV + 填实的 spec + 登录实现（如 captcha 解析）+ 项目深耦合的验收环境约定。
- **待抽 L2（roadmap）**：`csv-to-spec`（CSV→spec 骨架生成器，当前留 L1，因依赖项目专属的角色/模块/路由映射，参数化后可上 L2）。

## 八、参考实例（robobus L1）

- 报告样例：`robobus-workspace_pm/test/reports/B1.2.0/独立验收回归报告.md`
- L2 权限矩阵范本：`test/tools/e2e-scripts/tests/permission/{role-access-matrix.spec.ts,access-matrix.data.ts}`
- L1 黑盒用例范本：`test/tools/e2e-scripts/tests/regression/订单中心/TC-ORD-001.spec.ts`（纯 UI 黑盒，对照旧 hybrid 白盒用例的正例）
