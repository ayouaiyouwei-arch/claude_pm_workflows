---
description: 用 Playwright 报告 + 历史对比，列出退化用例与新增失败，输出 reports/<版本>/回归对比.md；新增退化阻断发布
---

# Skill · regression-check

> 一句话定位：把**当前基线** Playwright 跑批结果与**上一基线** 对比，列出新增失败 / 新增通过 / 稳定性变化；**新增退化用例** ≥ 1 条则阻断发布。

## 触发条件

- 用户明确要求「跑回归对比 / 退化检查」
- 基线发布前必跑（`baseline/04-基线刷新检查清单.md` 收尾阶段）
- 月度复盘（`periodic-review` 联动）
- 一组修复完成后，确认未引入退化

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| 当前基线 | ✅ | `B1.0.x` |
| 上一基线 | ✅ | `B1.0.(x-1)`（如属首版基线则填 `none`） |
| Playwright 报告路径（当前 / 上一基线） | ✅ | `reports/B1.0.x/playwright-results/results.json` |
| 是否阻断发布 | ✅ | 是 / 否（默认是） |

## 工具

- 读 `reports/<上一版本>/playwright-results/results.json` + `reports/<当前版本>/playwright-results/results.json`
- 解析 / 对比（可用 Node `jsonpath` 或纯文本）
- 写 `reports/<当前版本>/回归对比.md`

## 步骤

1. **基线锁定 + 文件校验**
   - 当前基线报告必须存在
   - 上一基线报告若不存在 → 视为首版基线，跳过对比直接出空报告
2. **解析两份 results.json**
   - 提取每条 spec 的 `case_id`（从 spec 第一行注释或 `testInfo.annotations`）
   - 状态：pass / fail / skipped / flaky
   - 执行时长
3. **对比维度**
   - **新增失败（退化）**：上一基线 pass 当前 fail
   - **新增通过（修复）**：上一基线 fail 当前 pass
   - **稳定性**：上一基线 pass 当前 pass，但执行时长 ↑ ≥ 50% / 出现 flaky
   - **新增 / 删除用例**：spec 列表差异
4. **退化判定**
   - `新增失败用例数 ≥ 1` → **新增退化** = 是
   - 是 → 在 `执行清单.csv` 把对应 `case_id` 标 `result=fail` + `notes` 注明 `regression`
   - 是 → 在 `缺陷清单.csv` 登记 `BUG-XXX`，severity 至少 `major`
   - 是 → 输入参数 `是否阻断发布=是` → **拒绝发布**
5. **报告输出**
   - 用 `templates/回归对比.md`（在 reports/<版本>/ 已有）填充：
     - 新增失败列表
     - 新增通过列表
     - 稳定性变化表
     - 退化判定结论
6. **联动**
   - 退化项调 `log-diff-entry` 登记新差异（type 视根因而定）
   - 通知测试负责人 + 修复人
7. **更新 `测试说明文档.md`**
   - § 三对应基线段落追加「回归对比完成，新增退化 N、新增通过 N」

## 输出

```md
## regression-check 报告
- 当前基线：B1.0.x
- 上一基线：B1.0.(x-1)
- 当前 spec 数：N
- 上一 spec 数：N
- 新增失败（退化）：N（详见列表）
- 新增通过（修复）：N（详见列表）
- 稳定性变化：N 条 +50% 时长、N 条 flaky
- 退化判定：是 / 否
- 阻断发布：是 / 否
- 报告文件：reports/<版本>/回归对比.md
```

## 禁止事项

- ❌ 当前基线无 Playwright 报告时强行出对比（必须先跑 `run-acceptance-suite`）
- ❌ 退化项不在 `执行清单.csv` / `缺陷清单.csv` 登记
- ❌ 退化项不阻断发布（除非用户显式 override 并在 `测试说明文档.md` 留痕）
- ❌ 跨基线版本混用 `playwright-results/`
- ❌ 不更新 `测试说明文档.md` § 三
