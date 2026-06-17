---
description: 用 cursor-ide-browser MCP 对单条 case_id 做手工辅助验收，落浏览器辅助验收记录.md 到 evidence/<版本>/<case_id>/，并写一行入执行清单
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · browser-acceptance

> 一句话定位：针对一条 `case_id`，用 cursor-ide-browser MCP 做**手工辅助验收**（探索性 / 修复前后人工对照 / 5 态人工复核），把结论落到 `evidence/<版本>/<case_id>/浏览器辅助验收记录.md`，并通过 `执行清单.csv` 留痕。

## 触发条件

- 用户明确要求「手工验收 / 浏览器辅助跑一下 xxx 用例」
- Playwright 跑批失败后人工复核（确认是真 bug 还是用例问题）
- 探索性测试 / 单条问题快速复现
- 修复后人工对照
- `automation_type=manual` 用例的执行

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| `case_id` | ✅ | `TC-SEC-001` |
| 当前生效基线 | ✅ | `B1.0.x` |
| 验收账号角色 | ✅ | `dispatcher` |
| 期望相位 | ✅ | `before` / `after` / `both` |
| 是否需要 SQL 校验 | 可选 | 是 / 否 |

## 工具

- **cursor-ide-browser MCP**：`browser_navigate` / `browser_snapshot` / `browser_click` / `browser_fill` / `browser_take_screenshot` / `browser_network_requests` / `browser_tabs` / `browser_lock`
- **关联技能**：调 `capture-test-evidence` 抓证据、调 `log-diff-entry` 登记新差异

## 步骤

1. **基线锁定 + 用例校验**
   - 读 `baseline/01-基线版本登记表.md` 拿当前 B 版本号
   - 在 `test/test-cases/<模块>.csv` 中确认 `case_id` 真实存在并读取 `steps` / `expected` / `five_states` / `evidence_required`
2. **环境校验**
   - 真实数据模式（非 Mock；开关见 PROJECT-PROFILE.md § 六）
   - 目标 URL 可访问（前端地址见 § 六）
   - 环境变量 `QA_<ROLE>_USER` / `QA_<ROLE>_PASSWORD` 已设置
3. **浏览器准备**
   - `browser_tabs` 看现有标签
   - 若已有标签 → 先 `browser_lock {action:lock}` 锁定；否则 `browser_navigate` 后再锁
4. **登录**
   - `browser_navigate` 到 `/login`
   - `browser_snapshot` 拿表单 ref
   - `browser_fill` 用环境变量填账号密码（**禁止明文粘贴**）
   - `browser_click` 提交
5. **执行 CSV `steps`**
   - 按 `steps` 字段顺序逐步操作
   - 每一步前 `browser_snapshot` 防 ref 失效
   - 关键状态调 `capture-test-evidence` 抓 before / after
6. **5 态人工复核**
   - 按 `five_states` 字段逐项验证（`na` 跳过）
   - loading：`browser_navigate` 后立即截图（≤ 1s）
   - empty：用空筛选 / 空账号触发
   - error：`browser_handle_dialog` 拒绝某关键调用 / 或预先模拟断网
   - success：正常路径
   - permission：换 `readonly` / `noauth` 账号重测
7. **接口契约人工核对**
   - `browser_network_requests` 抓本次会话的关键请求
   - 对照 `product-docs/modules/<模块>/02-页面-产品-代码对照矩阵.md § 二 接口面汇总`，逐字段确认
8. **判定**
   - pass / fail / blocked
   - 失败时调 `log-diff-entry` 登记新 `DIFF-XXX` 或在 `缺陷清单.csv` 登记 `BUG-XXX`
9. **写浏览器辅助验收记录**
   - 用 `templates/浏览器辅助验收记录模板.md` 在 `evidence/<版本>/<case_id>/浏览器辅助验收记录.md` 落档
10. **写一行入 `执行清单.csv`**
    - `case_id,executed_at,executor,env,baseline_version,result,evidence_dir,bru_collection,playwright_spec,notes`
    - `bru_collection` 与 `playwright_spec` 写 `na`
    - `notes` 注明 `via cursor-ide-browser`
11. **回写差异台账**
    - 通过 → 在 `baseline/02-PRD-实现差异台账.md` 把关联 `DIFF-XXX` 状态改为「已关闭-纳入 B<待发布版本>」
    - 不通过 → 改为「不通过-退回修复」并附原因
12. **释放浏览器**
    - 完成所有操作后 `browser_lock {action:unlock}`
13. **更新 `test/测试说明文档.md`**
    - § 三对应基线段落追加「`case_id` 浏览器辅助验收完成，结论 pass/fail/blocked」

## 输出

```md
## browser-acceptance 报告
- case_id: TC-SEC-001
- 基线版本：B1.0.x
- 角色：dispatcher
- 相位：both
- 5 态结果：loading ✅ / empty ✅ / error ✅ / success ✅ / permission ✅
- 接口契约：✅
- 证据：evidence/<版本>/<case_id>/{before,after}.{png,har,meta.json}{,sql.log}
- 浏览器辅助验收记录：evidence/<版本>/<case_id>/浏览器辅助验收记录.md
- 执行清单：execution/<版本>/执行清单.csv（追加 1 行）
- 最终判定：pass
- 差异台账回写：DIFF-001 → 已关闭-纳入 B1.0.x
```

## 禁止事项

- ❌ 在 chat 中明文输入测试账号密码
- ❌ 在 Mock 数据模式执行（真实模式开关见 PROJECT-PROFILE.md § 六）
- ❌ 不写 `执行清单.csv`（视为未执行）
- ❌ 不写 `浏览器辅助验收记录.md` 或不存到 `evidence/<版本>/<case_id>/` 目录
- ❌ 跳过 5 态核查
- ❌ 替代 Playwright 跑「smoke + regression + scenario」自动化套件
- ❌ 不更新 `test/测试说明文档.md` § 三
