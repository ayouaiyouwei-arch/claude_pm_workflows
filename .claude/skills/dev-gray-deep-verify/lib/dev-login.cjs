// dev 灰度 UI 登录 helper · 自动解 captcha SVG · 支持 admin / big-screen
// 用法：const { loginAdmin, loginScreen } = require('./dev-login.cjs')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/** 从 captcha img src（data:image/svg+xml;base64,...）解出 4 字符验证码 */
function decodeCaptchaFromDataUrl(src) {
  if (!src || !src.startsWith('data:image/svg+xml')) return '';
  const b64 = src.replace(/^data:image\/svg\+xml;base64,/, '');
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]).join('').slice(0, 4);
}

/**
 * 通用 UI 登录（admin 或 big-screen 同款流程）
 * @param {import('playwright').Page} page
 * @param {object} opts
 * @param {string} opts.loginUrl - 完整登录页 URL
 * @param {string} opts.user
 * @param {string} opts.pass
 * @param {number} [opts.maxRetries=3] - captcha 偶尔识别错时重试
 * @returns {Promise<{ok: boolean, finalUrl: string, attempts: number}>}
 */
async function uiLogin(page, { loginUrl, user, pass, maxRetries = 3 }) {
  let lastUrl = '';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    // 等 captcha 出现
    const img = page.locator('img[src^="data:image/svg+xml"]').first();
    try { await img.waitFor({ timeout: 10000 }); }
    catch { return { ok: false, finalUrl: page.url(), attempts: attempt, error: 'captcha img not appearing' }; }
    const src = await img.getAttribute('src');
    const code = decodeCaptchaFromDataUrl(src);
    if (!code || code.length < 4) {
      if (attempt < maxRetries) continue;
      return { ok: false, finalUrl: page.url(), attempts: attempt, error: `captcha decode failed: "${code}"` };
    }
    // 填表单（排除 checkbox/radio）
    const inputs = page.locator(
      'input:not([type="hidden"]):not([readonly]):not([type="checkbox"]):not([type="radio"])'
    );
    const count = await inputs.count();
    if (count < 3) {
      return { ok: false, finalUrl: page.url(), attempts: attempt, error: `expected ≥3 text inputs, got ${count}` };
    }
    await inputs.nth(0).fill(user);
    await inputs.nth(1).fill(pass);
    await inputs.nth(2).fill(code);
    // 提交
    await page.locator('button:has-text("登 录"), button:has-text("登录")').first().click();
    await page.waitForTimeout(2500);
    try { await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 }); } catch {}
    lastUrl = page.url();
    if (!lastUrl.includes('/login')) {
      return { ok: true, finalUrl: lastUrl, attempts: attempt };
    }
    // 仍在 login → 可能 captcha 识别错，重试
  }
  return { ok: false, finalUrl: lastUrl, attempts: maxRetries, error: 'login still on /login after retries' };
}

/** Admin 登录便捷 */
async function loginAdmin(page, { baseUrl, user, pass }) {
  return uiLogin(page, { loginUrl: `${baseUrl}/#/login`, user, pass });
}

/** Big-screen 登录便捷 */
async function loginScreen(page, { baseUrl, user, pass }) {
  return uiLogin(page, { loginUrl: `${baseUrl}/big-screen/#/login`, user, pass });
}

module.exports = { uiLogin, loginAdmin, loginScreen, decodeCaptchaFromDataUrl };
