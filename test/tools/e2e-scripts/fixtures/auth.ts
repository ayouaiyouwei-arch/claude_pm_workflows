import { test as base, expect, type Page } from '@playwright/test';

/**
 * 多角色登录夹具 · 通用模板（项目无关骨架）
 *
 * ⚠️ 接入项目必做：实现 performLogin（登录流程因项目而异）。
 *   - 角色 id 与账号：在 .env（`PM_<ROLE>_USER` / `PM_<ROLE>_PASSWORD`）或下方 DEFAULT_CREDENTIALS 填
 *   - 登录流程：导航登录页 → 填账号密码 → （如有验证码自行处理）→ 提交 → 等离开登录页
 *   - 验证码：若为图形/短信码，需从可见渠道获取（如 DOM 内 SVG 明文、测试短信网关），
 *     仍属「纯 UI 操作」——不调业务造数接口。参考 robobus 实现（从登录页 <img> 的 SVG 反解）。
 *
 * 独立验收原则：登录走真实 UI，不 mock、不直接注入 token 绕过登录页。
 */

// 项目自定义角色 id（如 'admin' / 'dispatcher' / 'officer' ...）
export type Role = string;

interface Credentials { user: string; password: string; }

// 接入项目填角色账号（或用 .env 覆盖）
const DEFAULT_CREDENTIALS: Record<string, Credentials> = {
  // admin: { user: 'admin', password: 'CHANGE-ME' },
};

function getCredentials(role: Role): Credentials {
  const u = process.env[`PM_${role.toUpperCase()}_USER`] ?? DEFAULT_CREDENTIALS[role]?.user;
  const p = process.env[`PM_${role.toUpperCase()}_PASSWORD`] ?? DEFAULT_CREDENTIALS[role]?.password;
  if (!u || !p) {
    throw new Error(`[fixtures/auth] role=${role} 缺凭证 · 设 PM_${role.toUpperCase()}_USER/PASSWORD 或填 DEFAULT_CREDENTIALS`);
  }
  return { user: u, password: p };
}

async function performLogin(page: Page, role: Role): Promise<void> {
  const { user, password } = getCredentials(role);
  // ───────────────────────────────────────────────────────────
  // TODO 接入项目实现登录流程。骨架给一个常见模板（按需改 locator）：
  // ───────────────────────────────────────────────────────────
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => null);
  if (!/\/login/.test(page.url())) return; // 已登录态（cookie 有效）
  // await page.getByPlaceholder(/账号|用户名/).first().fill(user);
  // await page.getByPlaceholder(/密码/).first().fill(password);
  // // 如有验证码：从 DOM/渠道获取后 fill（不调造数接口）
  // await page.locator('button[type="submit"]').first().click();
  // await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  throw new Error('[fixtures/auth] performLogin 未实现 · 见本文件 TODO 与 README-验收骨架.md');
}

export const test = base.extend<{ loginAs: (role: Role) => Promise<void> }>({
  loginAs: async ({ page }, use) => {
    await use(async (role: Role) => { await performLogin(page, role); });
  },
});

export { expect };
