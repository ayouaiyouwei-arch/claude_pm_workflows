import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

// 加载 .env（不存在则跳过 · 角色账号等放 .env，见 .env.example）
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

/**
 * 独立验收回归 · Playwright 配置（项目无关骨架）
 *
 * 独立验收原则：默认打【真实环境】（不 mock）。接入项目改 ADMIN_BASE_URL：
 *   - 真实灰度/预发：export ADMIN_BASE_URL=https://<你的灰度域名>
 *   - 本地：export PLAYWRIGHT_ENV=local（默认 http://localhost:5173）
 *
 * 报告产物落 ../../reports/<BASELINE_VERSION>/playwright-results/ ·
 * 再由 L2 引擎 `pnpm acceptance:report` 聚合成「独立验收回归报告.md」。
 */

const ENV = process.env.PLAYWRIGHT_ENV ?? 'staging';
const DEFAULT_BASE_URL = ENV === 'local' ? 'http://localhost:5173' : '';
// ⚠️ 接入项目必填：真实环境地址（env ADMIN_BASE_URL 或改此默认值）
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? DEFAULT_BASE_URL ?? 'https://CHANGE-ME.example.com';
const BASELINE_VERSION = process.env.BASELINE_VERSION ?? 'B1.0.0';
const REPORTS_DIR = `../../reports/${BASELINE_VERSION}/playwright-results`;

// 真实数据 UI 操作单条耗时可能较长 · 默认 timeout 拉到 5 min
const SINGLE_TEST_TIMEOUT = Number(process.env.PW_TIMEOUT_MS ?? 300_000);

export default defineConfig({
  testDir: './tests',
  fullyParallel: process.env.PW_FULLY_PARALLEL === 'true',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: Number(process.env.PW_WORKERS ?? 1),
  timeout: SINGLE_TEST_TIMEOUT,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: `${REPORTS_DIR}/html-report`, open: 'never' }],
    ['json', { outputFile: `${REPORTS_DIR}/results.json` }],
    ['junit', { outputFile: `${REPORTS_DIR}/junit.xml` }],
  ],
  outputDir: `${REPORTS_DIR}/test-output`,
  use: {
    baseURL: ADMIN_BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    ignoreHTTPSErrors: false, // 真实环境建议真证书；本地自签可临时设 true
    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
