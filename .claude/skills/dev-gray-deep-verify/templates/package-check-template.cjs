// dev-gray-deep-verify · 每包 check 模板（项目无关骨架版）
// 复制为 test/tools/e2e-scripts/pm-dev-tests/check-<包名>.cjs · 改 PKG_CHECKS 即可
// 跑: node test/tools/e2e-scripts/pm-dev-tests/check-<包>.cjs
//
// 输入 env:
//   ROBOBUS_DEV_USER     · dev 灰度账号
//   ROBOBUS_DEV_PASS     · dev 灰度密码
//   ROBOBUS_DEV_BASE_URL · dev 灰度 base URL
//
// 这些值见 PROJECT-PROFILE.md § 六 验收环境
// 项目接入时建议复制到 .env.local 或 shell rc

// === 路径 · 你项目实际位置 ===
// 通常 playwright 装在 code/<仓库名>/node_modules 下（与项目共享依赖）
// 调整为你项目实际路径，或用 NODE_PATH=... node ... 调用
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH
  || require('path').resolve(__dirname, '../../../../code/<你项目仓库名>/node_modules/playwright');
const SKILL_LIB = require('path').resolve(__dirname, '../lib');

const { chromium } = require(PLAYWRIGHT_PATH);
const { loginAdmin, loginScreen } = require(`${SKILL_LIB}/dev-login.cjs`);
const H = require(`${SKILL_LIB}/deep-verify-helpers.cjs`);

// === 从 env 读 dev 灰度配置（PROJECT-PROFILE § 六）===
const BASE = process.env.ROBOBUS_DEV_BASE_URL || '<你项目 dev 灰度 base URL>';
const USER = process.env.ROBOBUS_DEV_USER || '<dev 测试账号>';
const PASS = process.env.ROBOBUS_DEV_PASS || '<dev 测试密码>';

// === 改这里：定义本次要验的包 ===
const PKG_CHECKS = [
  {
    pkg: '<包名>',                                 // 如 OPT-019
    name: '<功能中文名>',                          // 如 排班导入
    platform: 'admin',                             // 'admin' | 'screen' | 项目其他平台
    route: '/#/<路由>',                            // 登录后导航到
    waitMs: 4000,                                  // 加载等待
    elements: {                                    // 必有元素 (key → CSS selector)
      keyElement1: 'button:has-text("操作")',
      keyElement2: 'table',
    },
    expectApiPaths: ['/api/v1/<endpoint>'],        // 预期至少命中一次的 API 子串
    customCheck: async (page) => ({}),             // 可选自定义检查
    captureTitleFonts: false,                      // UI 类需求设 true（取标题字体证据）
  },
  // 复制此项目添加更多包...
];

(async () => {
  const pkgSlug = (PKG_CHECKS[0]?.pkg || 'pkg').toLowerCase();
  const outDir = H.makeOutDir(`dev-deep-test-${pkgSlug}`);
  console.log(`[${new Date().toISOString().slice(11,19)}] 输出: ${outDir}`);
  const results = { startedAt: new Date().toISOString(), baseUrl: BASE, packages: {} };
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const consoleErrors = H.startErrorCollector(page);

  try {
    const needAdmin = PKG_CHECKS.some(c => c.platform === 'admin');
    const needScreen = PKG_CHECKS.some(c => c.platform === 'screen');

    if (needAdmin) {
      console.log('→ admin UI 登录');
      const r = await loginAdmin(page, { baseUrl: BASE, user: USER, pass: PASS });
      results.adminLogin = r;
      if (!r.ok) throw new Error(`admin 登录失败: ${r.error || r.finalUrl}`);
      console.log(`  ✅ → ${r.finalUrl}`);
    }
    for (const c of PKG_CHECKS.filter(c => c.platform === 'admin')) {
      results.packages[c.pkg] = await runCheck(page, c, BASE, outDir);
    }

    if (needScreen) {
      console.log('→ big-screen UI 登录');
      const r = await loginScreen(page, { baseUrl: BASE, user: USER, pass: PASS });
      results.screenLogin = r;
      if (!r.ok) throw new Error(`screen 登录失败: ${r.error || r.finalUrl}`);
      console.log(`  ✅ → ${r.finalUrl}`);
    }
    for (const c of PKG_CHECKS.filter(c => c.platform === 'screen')) {
      results.packages[c.pkg] = await runCheck(page, c, BASE, outDir);
    }
  } catch (e) {
    results.fatalError = e.message;
    console.log(`❌ fatal: ${e.message}`);
  } finally {
    results.consoleErrors = consoleErrors;
    results.finishedAt = new Date().toISOString();
    H.writeResults(outDir, results);
    console.log(`完成 · ${outDir}/results.json`);
    await browser.close();
  }
})().catch(e => { console.error('fatal:', e); process.exit(1); });

async function runCheck(page, c, BASE, outDir) {
  console.log(`=== ${c.pkg} ${c.name} (${c.platform}) ===`);
  const out = { name: c.name, platform: c.platform, checks: {} };
  const apiRec = H.recordApiCalls(page);
  try {
    const url = c.platform === 'screen' && !c.route.startsWith('/big-screen/')
      ? `${BASE}/big-screen${c.route}`
      : `${BASE}${c.route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(c.waitMs || (c.platform === 'screen' ? 10000 : 4000));
    out.checks.urlOk = true;
    out.checks.notOnLogin = !page.url().includes('/login');
    for (const [k, sel] of Object.entries(c.elements || {})) {
      try { out.checks[k] = (await page.locator(sel).count()) > 0; }
      catch { out.checks[k] = false; }
    }
    for (const ap of (c.expectApiPaths || [])) {
      out.checks[`api_${ap.replace(/[^a-z0-9]/gi, '_')}`] = apiRec.count(ap) > 0;
    }
    if (c.captureTitleFonts) out.titleFonts = await H.extractTitleFonts(page);
    if (c.customCheck) Object.assign(out, await c.customCheck(page) || {});
    out.apiRequestCount = apiRec.requests.length;
    await H.shot(page, outDir, `${c.pkg}-final`);
    await H.fullPageShot(page, outDir, c.pkg);
  } catch (e) { out.error = e.message.slice(0, 300); }
  apiRec.stop();
  return out;
}
