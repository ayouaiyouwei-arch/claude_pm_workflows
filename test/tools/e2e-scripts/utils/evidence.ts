import fs from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';

/**
 * EvidencePhase：阶段标签
 *   - 经典：before / after（修复前 / 修复后）
 *   - 5 态：loading / empty / error / success / permission（PM 自跑回归补全用 · 见 .claude/skills/pm-regression-deliver/）
 *   - 自定义：任意字符串
 */
export type EvidencePhase = 'before' | 'after' | 'loading' | 'empty' | 'error' | 'success' | 'permission' | string;

const BASELINE_VERSION = process.env.BASELINE_VERSION ?? 'B1.0.0-初始化占位';
const EVIDENCE_ROOT = path.resolve(import.meta.dirname, '..', '..', '..', 'evidence', BASELINE_VERSION);

function caseDir(caseId: string): string {
  return path.join(EVIDENCE_ROOT, caseId);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * 启动 HAR 录制（在 spec 开头调用）。
 * 与 Playwright `context({ recordHar })` 不同，这里要求 spec 已用 `browser.newContext({ recordHar: { path } })` 启动；
 * 本函数仅返回该 path 供 spec 调用 context.close() 时落盘。
 */
export function harPath(caseId: string, phase: EvidencePhase): string {
  return path.join(caseDir(caseId), `${phase}.har`);
}

/**
 * 截图 + 元信息归档。
 *
 * 用法：
 *   await captureEvidence(page, 'TC-SEC-001', 'before');
 *   // ... 操作页面 / 修复
 *   await captureEvidence(page, 'TC-SEC-001', 'after');
 */
export async function captureEvidence(
  page: Page,
  caseId: string,
  phase: EvidencePhase,
  meta?: Record<string, unknown>,
): Promise<void> {
  const dir = caseDir(caseId);
  await ensureDir(dir);
  const screenshotPath = path.join(dir, `${phase}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const metaPath = path.join(dir, `${phase}.meta.json`);
  const payload = {
    caseId,
    phase,
    baselineVersion: BASELINE_VERSION,
    capturedAt: new Date().toISOString(),
    url: page.url(),
    title: await page.title().catch(() => ''),
    viewport: page.viewportSize(),
    userAgent: await page.evaluate(() => navigator.userAgent).catch(() => ''),
    extra: meta ?? null,
  };
  await fs.writeFile(metaPath, JSON.stringify(payload, null, 2), 'utf-8');
}

/**
 * 把外部 SQL 查询结果（已为字符串）落到证据目录。
 *   await attachSqlLog('TC-SEC-001', 'after', 'SELECT status,handled_by FROM alert WHERE id=...; -- 结果...');
 */
export async function attachSqlLog(
  caseId: string,
  phase: EvidencePhase,
  sqlContent: string,
): Promise<void> {
  const dir = caseDir(caseId);
  await ensureDir(dir);
  const file = path.join(dir, `${phase}.sql.log`);
  await fs.writeFile(file, sqlContent, 'utf-8');
}

/**
 * 把任意附件归档（如 OpenAPI snapshot）。
 */
export async function attachFile(
  caseId: string,
  filename: string,
  content: string | Buffer,
): Promise<void> {
  const dir = caseDir(caseId);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, filename), content);
}
