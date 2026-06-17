---
description: 运行独立验收回归套件——委托 acceptance-regression 引擎跑 Playwright（L0-L3：smoke / regression / scenario / 权限矩阵），出 独立验收回归报告.md，汇总到 execution/<版本>/执行清单.csv 与 reports/<版本>/
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md + `acceptance.config.json`

# Skill · run-acceptance-suite

> 一句话定位：本 skill 是 **`acceptance-regression`（L2 通用引擎）的项目侧编排入口**。基于当前生效基线版本，按 `test-cases/<模块>.csv` 跑 **Playwright 独立验收套件**（L0 smoke / L1 regression / L2 permission / L3 scenario，黑盒 + 真实环境），由引擎出 `reports/<版本>/独立验收回归报告.md`，并把执行结果汇总到 `execution/<版本>/执行清单.csv`。
>
> ⚠️ **契约/单元测试不在此**：API 契约对照是研发自测层（见可选 skill `api-contract-test`），本 skill 只做用户可见行为的黑盒验收，对齐 `acceptance-regression § 一 三原则`。

## 触发条件

- 用户明确要求「跑验收 / 跑回归 / 跑套件」
- 基线发布前必跑（`baseline/04-基线刷新检查清单.md` 收尾阶段）
- 一组差异 / 变更修复完成后做闭环验收
- 每次 PR 至少跑 smoke 子集（`--grep @L0`）

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| 当前生效基线 | ✅ | `B1.0.x` |
| 套件范围 | ✅ | `smoke`(@L0) / `regression`(@L1) / `permission`(@L2) / `scenario`(@L3) / `all`(L0-L3) |
| 模块过滤（可选） | 可选 | `--grep @<模块缩写>`（模块缩写见 `acceptance.config.json § modules`）|
| 环境 | ✅ | `Local`(localBaseURL) / `Staging`(baseURL) |

## 工具

- **acceptance-regression 引擎**：编排 `pnpm test:acceptance`（跑 L0-L3）+ 报告引擎 `lib/acceptance-report.mjs`（详见 `.claude/skills/acceptance-regression/SKILL.md § 六`）
- **Playwright**：`<包管理器> test` / `test:acceptance`（包管理器见 PROJECT-PROFILE.md § 五，在 `test/tools/e2e-scripts/` 执行）

## 步骤

1. **读基线 & 校验目录**
   - 读 `product-docs/baseline/01-基线版本登记表.md` 拿当前 B 版本号
   - 确认项目根有 `acceptance.config.json`（无则照 `.claude/skills/acceptance-regression/templates/acceptance.config.template.json` 起一份）
   - 确认 `test/execution/<版本>/`、`test/reports/<版本>/`、`test/evidence/<版本>/` 目录存在；不存在则创建
2. **环境校验**
   - 确认 `code/<仓库名>/` 已同步（commit / 分支与根 `说明文档.md` 一致）
   - 确认**真实环境模式**（不 mock；打 `baseURL`/`localBaseURL` 真后端真数据——这是 acceptance-regression 独立验收的铁律）
   - 确认环境变量 `QA_*_USER` / `QA_*_PASSWORD` 已设置（账号见 PROJECT-PROFILE.md § 六）
   - 确认 `BASELINE_VERSION` 环境变量 = 当前 B 版本号
3. **跑独立验收套件**（Playwright L0-L3）
   - `cd test/tools/e2e-scripts && <包管理器> install`（如未装依赖；包管理器见 PROJECT-PROFILE.md § 五）
   - `npx playwright install --with-deps chromium`（首次）
   - `BASELINE_VERSION=<版本> <包管理器> test:acceptance`（或按套件范围加 `--grep @L0`/`@L1`/`@<模块>`）
   - 解析 `reports/<版本>/playwright-results/results.json`，把每个 spec 第一行注释中的 `case_id` 以 `result=pass/fail/skipped` 追加到 `执行清单.csv`
4. **出报告**（委托引擎）
   - `BASELINE_VERSION=<版本> node "$HOME/.claude/skills/acceptance-regression/lib/acceptance-report.mjs"`
   - 报告落 `reports/<版本>/独立验收回归报告.md`（报告名由 `acceptance.config.json § reportFileName` 决定，默认即此）
   - **P0 有 FAIL → 引擎 exit 1（红线阻断，不得升基线）**
5. **失败用例处置**
   - 对每条 `result=fail` 在 `缺陷清单.csv` 自动登记一行 `BUG-XXX`（编号顺延）
   - 对每条 `BUG-XXX` 评估是否属新差异：
     - 若是 → 调 `log-diff-entry` 技能登记 `DIFF-XXX`，并在 `缺陷清单.csv` 的 `suggested_diff` 字段填入
     - 若是已知差异 → 把 `DIFF-XXX` 状态在 `baseline/02-PRD-实现差异台账.md` 改为「不通过-退回修复」
6. **回写差异台账**（通过的）
   - 对每条 `result=pass` 且关联 `DIFF-XXX` 的用例：在 `baseline/02-PRD-实现差异台账.md` 把 `DIFF-XXX` 状态改为「已关闭-纳入 B<待发布版本>」
7. **更新 `test/测试说明文档.md` 与根 `说明文档.md`**
   - 在 `test/测试说明文档.md` § 三对应基线版本段落追加跑批结果
   - 在根 `说明文档.md` 第三节追加里程碑

## 输出

```md
## run-acceptance-suite 执行报告
- 基线版本：B1.0.x
- 套件范围：L0 smoke + L1 regression + L2 permission + L3 scenario
- 环境：Local / Staging（报告头打印 baseURL 作为非-mock 铁证）
- 执行时间窗：YYYY-MM-DD HH:mm ~ HH:mm
- 用例总数 / 通过 / 失败 / 阻塞 / 跳过：N / N / N / N / N
- P0 红线：通过 / 阻断（引擎 exit code）
- Playwright 退化：N（详见 回归对比.md）
- 是否建议升基线：是 / 否
- 文件清单：
  - execution/<版本>/执行清单.csv（追加 N 行）
  - execution/<版本>/缺陷清单.csv（追加 N 行）
  - reports/<版本>/playwright-results/
  - reports/<版本>/独立验收回归报告.md
```

## 禁止事项

- ❌ 在 Mock 环境跑然后标 pass（违背独立验收"真实环境"铁律）
- ❌ 跨基线版本混用 `execution/` 或 `reports/` 目录
- ❌ Playwright 失败但报告标 pass
- ❌ P0 红线 FAIL（引擎 exit 1）仍升基线
- ❌ 跳过环境变量校验直接跑（会把空账号带入登录）
- ❌ 不更新 `test/测试说明文档.md` § 三 与根 `说明文档.md` 第三节
