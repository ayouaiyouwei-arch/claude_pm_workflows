// dev-gray-deep-verify · 标准化 helper · 截图/网络/DOM/字体
const fs = require('fs');
const path = require('path');

/** 截图 + 写文件 · 静默失败不抛 */
async function shot(page, outDir, name) {
  const f = path.join(outDir, `${name}.png`);
  try { await page.screenshot({ path: f, fullPage: false, timeout: 10000 }); }
  catch (e) { return null; }
  return f;
}

async function fullPageShot(page, outDir, name) {
  const f = path.join(outDir, `${name}-fullpage.png`);
  try { await page.screenshot({ path: f, fullPage: true, timeout: 15000 }); }
  catch (e) { return null; }
  return f;
}

/** 录所有 /api/v1/* 请求 · 返回 listener · 用完手动 .off */
function recordApiCalls(page, urlSubstr = '/api/v1/') {
  const reqs = [];
  const handler = r => { const u = r.url(); if (u.includes(urlSubstr)) reqs.push(u); };
  page.on('request', handler);
  return {
    requests: reqs,
    stop: () => page.off('request', handler),
    filter: substr => reqs.filter(u => u.includes(substr)),
    count: substr => reqs.filter(u => u.includes(substr)).length,
  };
}

/**
 * 批量查 selector · 返回命中表 { key: count }
 * @param {object} queries { keyName: 'css selector or text=...' }
 */
async function checkElements(page, queries) {
  const out = {};
  for (const [k, sel] of Object.entries(queries)) {
    try { out[k] = await page.locator(sel).count(); }
    catch (e) { out[k] = -1; out[`${k}_error`] = e.message.slice(0, 100); }
  }
  return out;
}

/** 抓前 N 个标题元素的字体信息 · 用于视觉一致性判定 */
async function extractTitleFonts(page, maxCount = 20) {
  return page.evaluate((max) => {
    const sels = [
      '[class*="title" i]', '[class*="Title"]', '[class*="section-title"]',
      '[class*="panel-title" i]', 'h1', 'h2', 'h3', 'h4',
    ];
    const els = [];
    for (const s of sels) {
      els.push(...Array.from(document.querySelectorAll(s)));
      if (els.length >= max * 2) break;
    }
    const seen = new Set();
    const result = [];
    for (const el of els) {
      if (seen.has(el)) continue;
      seen.add(el);
      const cs = window.getComputedStyle(el);
      result.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 80),
        text: (el.textContent || '').trim().slice(0, 40),
        fontFamily: cs.fontFamily.slice(0, 100),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
      });
      if (result.length >= max) break;
    }
    return result;
  }, maxCount);
}

/** body 文字前 N 字 · 用于关键词命中判定 + 调试 */
async function bodyTextPreview(page, len = 500) {
  try { return (await page.locator('body').textContent({ timeout: 5000 })).slice(0, len); }
  catch { return ''; }
}

/** 装 console error / pageerror 收集器 · 返回数组 */
function startErrorCollector(page, maxLen = 200) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, maxLen)); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message.slice(0, maxLen)}`));
  return errors;
}

/** 准备输出目录 */
function makeOutDir(prefix = 'dev-deep-test') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = `/tmp/${prefix}/${ts}`;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 写 results.json */
function writeResults(outDir, results) {
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
}

module.exports = {
  shot, fullPageShot, recordApiCalls, checkElements, extractTitleFonts,
  bodyTextPreview, startErrorCollector, makeOutDir, writeResults,
};
