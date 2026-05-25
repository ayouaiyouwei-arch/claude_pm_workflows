---
description: 运行验收套件——基于当前生效基线跑 Bruno（API 契约）+ Playwright（E2E 回归），汇总到 execution/<版本>/执行清单.csv 与 reports/<版本>/
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · run-acceptance-suite

> 一句话定位：基于当前生效基线版本，按 `test-cases/<模块>.csv` 执行 **Bruno 集合**（API 契约 / 功能）+ **Playwright 套件**（smoke / regression / scenario），把执行结果汇总到 `execution/<版本>/执行清单.csv`、`reports/<版本>/bruno-results.json`、`reports/<版本>/playwright-results/`。

## 触发条件

- 用户明确要求「跑验收 / 跑回归 / 跑套件」
- 基线发布前必跑（`baseline/04-基线刷新检查清单.md` 收尾阶段）
- 一组差异 / 变更修复完成后做闭环验收
- 每次 PR 至少跑 smoke 子集

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| 当前生效基线 | ✅ | `B1.0.x` |
| 套件范围 | ✅ | `smoke` / `regression` / `scenario` / `bruno-only` / `all` |
| 模块过滤（可选） | 可选 | `<模块A>` / `<模块B>` / 全部（模块见 PROJECT-PROFILE.md § 四/五）|
| 环境 | ✅ | `Local` / `Staging` |

## 工具

- **Bruno CLI**：`bru run --env <env> --reporter-json <out.json>`（在 `test/tools/api-collection/` 执行）
- **Playwright**：`<包管理器> test` / `test:smoke` / `test:regression`（包管理器见 PROJECT-PROFILE.md § 五，在 `test/tools/e2e-scripts/` 执行）

## 步骤

1. **读基线 & 校验目录**
   - 读 `product-docs/.../baseline/01-基线版本登记表.md` 拿当前 B 版本号
   - 确认 `test/execution/<版本>/`、`test/reports/<版本>/`、`test/evidence/<版本>/` 目录存在；不存在则创建
2. **环境校验**
   - 确认 `code/<仓库名>/` 已同步（commit / 分支与 `说明文档.md` 一致）
   - 确认使用真实数据模式（非 Mock；具体开关见 PROJECT-PROFILE.md § 六）
   - 确认环境变量 `QA_*_USER` / `QA_*_PASSWORD` 已设置（账号见 § 六）
   - 确认 `BASELINE_VERSION` 环境变量 = 当前 B 版本号
3. **Bruno 子套件**（API）
   - `cd test/tools/api-collection`
   - `bru run --env <env> --reporter-json ../../reports/<版本>/bruno-results.json`
   - 解析输出，把每个 `<METHOD>_<path>.bru` 对应的 `case_id`（通过 CSV 反查）以 `result=pass/fail` 追加到 `执行清单.csv`
4. **Playwright 子套件**（E2E）
   - `cd test/tools/e2e-scripts && <包管理器> install`（如未装依赖；包管理器见 PROJECT-PROFILE.md § 五）
   - `npx playwright install --with-deps chromium`（首次）
   - `BASELINE_VERSION=<版本> FRONTEND_BASE_URL=<前端地址，见 § 六> <包管理器> test:smoke`（或按套件范围跑 regression / scenario）
   - 解析 `reports/<版本>/playwright-results/results.json`，把每个 spec 第一行注释中的 `case_id` 以 `result=pass/fail/skipped` 追加到 `执行清单.csv`
5. **失败用例处置**
   - 对每条 `result=fail` 在 `缺陷清单.csv` 自动登记一行 `BUG-XXX`（编号顺延）
   - 对每条 `BUG-XXX` 评估是否属新差异：
     - 若是 → 调 `log-diff-entry` 技能登记 `DIFF-XXX`，并在 `缺陷清单.csv` 的 `suggested_diff` 字段填入
     - 若是已知差异 → 把 `DIFF-XXX` 状态在 `baseline/02-PRD-实现差异台账.md` 改为「不通过-退回修复」
6. **回写差异台账**（通过的）
   - 对每条 `result=pass` 且关联 `DIFF-XXX` 的用例：在 `baseline/02-PRD-实现差异台账.md` 把 `DIFF-XXX` 状态改为「已关闭-纳入 B<待发布版本>」
7. **生成报告**
   - 用 `templates/验收报告模板.md` 在 `reports/<版本>/验收报告.md` 写一份正式报告
   - 含通过率 / 失败明细 / blocker 缺陷 / 是否建议升基线
8. **更新 `测试说明文档.md` 与根 `说明文档.md`**
   - 在 `测试说明文档.md` § 三对应基线版本段落追加跑批结果
   - 在根 `说明文档.md` 第三节追加里程碑

## 输出

```md
## run-acceptance-suite 执行报告
- 基线版本：B1.0.x
- 套件范围：smoke + regression + scenario
- 环境：Local / Staging
- 执行时间窗：YYYY-MM-DD HH:mm ~ HH:mm
- 用例总数 / 通过 / 失败 / 阻塞 / 跳过：N / N / N / N / N
- Bruno blocker 偏差：N（详见 api-contract-diff.md）
- Playwright 退化：N（详见 回归对比.md）
- 是否建议升基线：是 / 否
- 文件清单：
  - execution/<版本>/执行清单.csv（追加 N 行）
  - execution/<版本>/缺陷清单.csv（追加 N 行）
  - reports/<版本>/bruno-results.json
  - reports/<版本>/playwright-results/
  - reports/<版本>/验收报告.md
```

## 禁止事项

- ❌ 在 Mock 环境跑然后标 pass
- ❌ 跨基线版本混用 `execution/` 或 `reports/` 目录
- ❌ Bruno 跑出的失败不在缺陷清单 / 差异台账登记
- ❌ Playwright 失败但报告标 pass
- ❌ 跳过环境变量校验直接跑（会把空账号带入登录）
- ❌ 不更新 `测试说明文档.md` § 三 与根 `说明文档.md` 第三节
