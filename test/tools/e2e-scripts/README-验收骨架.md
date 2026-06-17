# 独立验收回归 · E2E 骨架（项目无关）

> 配 L2 引擎 `~/.claude/skills/acceptance-regression/`。本目录是**项目级 e2e 实例**，跑真实环境黑盒验收 → L2 引擎出报告。
> 方法论与 config schema 见 `.claude/skills/acceptance-regression/SKILL.md`。

## 独立验收三原则（写每条用例前默念）
1. **真实环境**（不 mock）：打真实灰度/预发，不用 `page.route` 拦截真实 API。
2. **黑盒行为**（不审源码）：只断言用户可见行为，不抓接口字段 / 不查 SQL / 不审 type。
3. **独立断言源**：断言来自验收用例（业务语义），不抄研发权限码 / 契约。

## 接入 5 步

1. **项目根放 `acceptance.config.json`**（照 `.claude/skills/acceptance-regression/templates/acceptance.config.template.json`）：填 baseURL / modules / projectLabel 等。
2. **装依赖**：`cd test/tools/e2e-scripts && pnpm install && npx playwright install chromium`。
3. **配环境**：`cp .env.example .env`，填角色账号（`PM_<ROLE>_USER/PASSWORD`）；`export ADMIN_BASE_URL=https://<你的真实环境>`。
4. **实现 `fixtures/auth.ts` 的 `performLogin`**（登录流程因项目而异，按需处理验证码等步骤；见该文件 TODO）。
5. **写用例 + 跑**：
   ```bash
   BASELINE_VERSION=<版本> pnpm test:acceptance      # 跑 L0-L3
   BASELINE_VERSION=<版本> pnpm acceptance:report     # L2 引擎出报告（→ test/reports/<版本>/独立验收回归报告.md）
   # 或一条龙：pnpm acceptance:full
   ```

## 分层（在 `tests/` 下）
- `smoke/` L0 多角色登录冒烟 · `regression/<模块>/` L1 模块功能 · `permission/` L2 权限矩阵 · `scenario/` L3 跨模块 · `visual-regression/` L4 视觉

## tag 约定（过滤 + 报告归因）
spec 标题打 `@P0 @<模块缩写> @role:<id> @L1`；同时 push annotations（`case_id`/`priority`/`diff_ref`）。
过滤：`pnpm test --grep @P0`、`pnpm test --grep @<模块缩写>`、`pnpm test --grep @permission`。

## L2 权限矩阵：填 `tests/permission/access-matrix.data.ts` 即生效（spec 逻辑通用无需改）

## L1 黑盒用例模板（复制到 `tests/regression/<模块>/TC-XXX-001.spec.ts`）
```ts
import { test, expect } from '../../../fixtures/auth';
import { captureEvidence } from '../../../utils/evidence';

const CASE_ID = 'TC-XXX-001';
const ROUTE = '/your-route';

test.describe(`${CASE_ID} · [SC] <角色> <页面> 加载 · 渲染 + 空态`, () => {
  test.beforeEach(async ({ loginAs }) => { await loginAs('admin'); });

  test(`${CASE_ID} · [SC] · P1 @P1 @XXX @role:admin @L1`, async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'case_id', description: CASE_ID });
    testInfo.annotations.push({ type: 'priority', description: 'P1' });

    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await test.step('Given · 已登录 · 进入页面', async () => {
      await page.goto(`/#${ROUTE}`);
      await page.waitForLoadState('networkidle').catch(() => null);
      await expect(page).toHaveURL(new RegExp(ROUTE.replace(/\//g, '\\/')));
    });

    await test.step('Then · 关键 UI 元素可见（纯黑盒：标题/筛选/表头/空态，禁抓 API/SQL）', async () => {
      await expect(page.getByRole('heading', { name: '<页面标题>' })).toBeVisible();
      // await expect(page.getByRole('columnheader', { name: '<列名>' })).toBeVisible();
      await captureEvidence(page, CASE_ID, 'success', { stage: 'success' });
    });

    await test.step('5 态 · 控制台无业务 error', async () => {
      await page.waitForTimeout(1500);
      const biz = errors.filter((e) => !/429|favicon|net::ERR_BLOCKED|status of 4\d\d/.test(e));
      expect(biz, `业务 console error: ${biz.join('\n')}`).toEqual([]);
    });

    // Teardown：如有 UI 增删改，必须走 UI 删除清残留，严禁 api.delete
  });
});
```

## 参考实例
<项目首个 L1 实例占位>：`test/tools/e2e-scripts/tests/regression/<模块>/TC-XXX-001.spec.ts`（纯 UI 黑盒）、`tests/permission/`（角色矩阵填好的样例）。按本项目 `/init-project` 或 `/init-docs` 填充。
