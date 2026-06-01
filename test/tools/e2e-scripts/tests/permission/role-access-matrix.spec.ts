/**
 * L2 · 角色权限矩阵 · 数据驱动 spec（项目无关骨架）
 *
 * 逻辑通用，无需改：填好 access-matrix.data.ts 的 ROLES/PAGES/MATRIX 即生效（空则跑 0 条）。
 *
 * 设计（避坑，见 access-matrix.data.ts）：
 *   坑 A：denied 判定 = goto 后 not.toHaveURL（被路由守卫重定向走）
 *   坑 B：按角色分组，矩阵只读可并发：PW_FULLY_PARALLEL=true PW_WORKERS=4 pnpm test:permission
 *
 * 独立性：打真实环境（fixtures/auth 真账号登录）+ 黑盒断言路由可达性，不碰源码权限码。
 */
import { test, expect } from '../../fixtures/auth';
import { captureEvidence } from '../../utils/evidence';
import { ROLES, PAGES, MATRIX } from './access-matrix.data';

const routeRe = (route: string) => new RegExp(route.replace(/\//g, '\\/'));

for (const role of ROLES) {
  test.describe(`角色权限矩阵 · ${role}`, () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs(role);
    });

    for (const pg of PAGES) {
      const expected = MATRIX[role]?.[pg.key];
      if (!expected) continue;
      const caseId = `TC-PERM-${role}-${pg.key}`;

      test(`${caseId} · ${role} 访问 ${pg.label} 期望 ${expected} @L2 @permission @role:${role} @${pg.module}`, async ({ page }, testInfo) => {
        testInfo.annotations.push({ type: 'case_id', description: caseId });
        testInfo.annotations.push({ type: 'role', description: role });
        testInfo.annotations.push({ type: 'page', description: `${pg.label}(${pg.route})` });
        testInfo.annotations.push({ type: 'expected', description: expected });

        await page.goto(`/#${pg.route}`);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => null);

        if (expected === 'denied') {
          await expect(page, `${role} 不应停留在 ${pg.route}（应被路由守卫降级）`).not.toHaveURL(routeRe(pg.route));
        } else {
          await expect(page, `${role} 应能访问 ${pg.route}`).toHaveURL(routeRe(pg.route));
        }

        await captureEvidence(page, caseId, 'permission', { stage: `${role} → ${pg.key} 期望 ${expected}` });
      });
    }
  });
}
