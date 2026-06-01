#!/usr/bin/env node
/**
 * 独立验收回归报告生成器 · L2 通用引擎（项目无关）
 *
 * 来源：robobus-workspace_pm 于 2026-06-01 抽象上 L2（P028 首次 L1→L2 实战）。
 * 引擎本身不绑任何项目；项目专属值（模块/角色/URL/路由）全部由 acceptance.config.json 注入。
 *
 * 独立验收三原则：
 *   1. 真实环境（不 mock）  2. 黑盒行为（不审源码）  3. 独立断言源（验收用例，非研发契约）
 *
 * 用法（在接入项目目录或其子目录下跑）：
 *   BASELINE_VERSION=<版本> node "$HOME/.claude/skills/acceptance-regression/lib/acceptance-report.mjs"
 *   引擎从 cwd 向上查找 acceptance.config.json 作为「项目根 + 配置」。
 *
 * 输入：<项目根>/<reportsDir>/<BASELINE_VERSION>/<resultsSubpath>（Playwright json reporter 产物）
 * 输出：同目录 <reportFileName>
 * 退出码：P0 红线触发（P0 有 FAIL）→ 1；否则 0
 *
 * acceptance.config.json 字段（见 SKILL.md § 配置）：
 *   projectLabel, baseURL, localBaseURL, reportsDir, resultsSubpath, reportFileName,
 *   codeRepoForSha?(读快照 SHA), devRunnerLabel?(报告里点名要独立于的研发 runner),
 *   modules{缩写:中文名}, layers?{Lx:名}, defaultBaseline?
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ---------- 定位 acceptance.config.json（从 cwd 或 ACCEPTANCE_PROJECT_ROOT 向上找） ----------
function findConfig(start) {
  let dir = path.resolve(start);
  for (;;) {
    const p = path.join(dir, 'acceptance.config.json');
    if (fs.existsSync(p)) return { configPath: p, projectRoot: dir };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
const found = findConfig(process.env.ACCEPTANCE_PROJECT_ROOT || process.cwd());
if (!found) {
  console.error('❌ 未找到 acceptance.config.json（从 cwd 向上查找）');
  console.error('   接入项目需在项目根放 acceptance.config.json · 见 ~/.claude/skills/acceptance-regression/SKILL.md');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(found.configPath, 'utf-8'));
const projectRoot = found.projectRoot;

// ---------- 配置（带通用默认） ----------
const BASELINE_VERSION = process.env.BASELINE_VERSION ?? config.defaultBaseline ?? 'B1.0.0';
const MODULE_BY_ABBR = config.modules ?? {};
const LAYER_NAME = config.layers ?? {
  L0: 'L0 登录冒烟', L1: 'L1 模块功能回归', L2: 'L2 权限矩阵',
  L3: 'L3 跨模块场景', L4: 'L4 视觉回归',
};
const projectLabel = config.projectLabel ?? '';
const devRunnerLabel = config.devRunnerLabel ?? '研发自测 runner 与其 mock dev server';
const reportsDir = path.resolve(projectRoot, config.reportsDir ?? 'test/reports', BASELINE_VERSION);
const resultsPath = path.join(reportsDir, config.resultsSubpath ?? 'playwright-results/results.json');
const outPath = path.join(reportsDir, config.reportFileName ?? '独立验收回归报告.md');

// baseURL 判定（独立性铁证：报告打印真实环境地址）
const ENV = process.env.PLAYWRIGHT_ENV ?? 'staging';
const baseURL = process.env.ADMIN_BASE_URL
  ?? (ENV === 'local' ? (config.localBaseURL ?? 'http://localhost:5173') : (config.baseURL ?? '(未配置 baseURL)'));
const isMock = ENV === 'local' || /localhost|127\.0\.0\.1/.test(baseURL);

// ---------- 工具 ----------
// ANSI 颜色码：ESC(27)+[+数字/分号+m。用 fromCharCode 构造 ESC、字符类 [[] 匹配字面 [，零反斜杠歧义。
const ANSI_RE = new RegExp(String.fromCharCode(27) + '[[][0-9;]*m', 'g');
const stripAnsi = (s = '') => String(s).replace(ANSI_RE, '');
const firstLine = (s = '') => stripAnsi(s).split('\n').map((x) => x.trim()).filter(Boolean)[0] || '';
const truncate = (s = '', n = 120) => (s.length > n ? s.slice(0, n) + '…' : s);
const pct = (p, t) => (t ? ((100 * p) / t).toFixed(1) + '%' : '-');
function fmtDuration(ms = 0) {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  return m > 0 ? `${m} 分 ${sec % 60} 秒` : `${sec} 秒`;
}
function gitSha() {
  if (!config.codeRepoForSha) return '(未配置)';
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(projectRoot, config.codeRepoForSha),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '(未能读取)';
  }
}

// ---------- 读 results.json ----------
if (!fs.existsSync(resultsPath)) {
  console.error(`❌ 未找到 results.json：${resultsPath}`);
  console.error(`   请先跑 Playwright 套件生成 json reporter 产物（BASELINE_VERSION=${BASELINE_VERSION}）`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// ---------- 递归收集所有 spec ----------
const allSpecs = [];
function collect(suite) {
  if (Array.isArray(suite.specs)) allSpecs.push(...suite.specs);
  if (Array.isArray(suite.suites)) suite.suites.forEach(collect);
}
(data.suites || []).forEach(collect);

// ---------- 分析单个 spec ----------
function moduleFromFile(f = '') { const m = f.match(/regression\/([^/]+)\//); return m ? m[1] : ''; }
function layerFromFile(f = '') {
  if (f.includes('smoke/')) return 'L0';
  if (f.includes('permission/')) return 'L2';
  if (f.includes('scenario/')) return 'L3';
  if (f.includes('visual-regression/')) return 'L4';
  if (f.includes('regression/')) return 'L1';
  return '-';
}
function analyze(spec) {
  const test = (spec.tests && spec.tests[0]) || {};
  const results = test.results || [];
  const last = results[results.length - 1] || {};
  const anns = [...(test.annotations || []), ...(last.annotations || [])];
  const ann = (type) => { const a = anns.find((x) => x.type === type); return a ? a.description : ''; };

  const title = spec.title || '';
  const tags = [...(spec.tags || []), ...(title.match(/@[\w:]+/g) || [])];
  const hasTag = (re) => tags.find((t) => re.test(t)) || '';

  const caseId = ann('case_id') || (title.match(/TC-[A-Z]+-[\w-]+/) || [])[0] || truncate(title, 40);
  const priority = ann('priority') || hasTag(/^@P\d/).replace('@', '') || '-';
  const role = ann('role') || hasTag(/^@role:/).replace('@role:', '');
  const abbr = (tags.find((t) => MODULE_BY_ABBR[t.replace('@', '')]) || '').replace('@', '');
  const module = (abbr && MODULE_BY_ABBR[abbr]) || moduleFromFile(spec.file);
  const layer = hasTag(/^@L\d/).replace('@', '') || layerFromFile(spec.file);

  let status;
  if (test.status === 'flaky') status = 'FLAKY';
  else if (last.status === 'passed') status = 'PASS';
  else if (last.status === 'skipped' || !last.status) status = 'SKIP';
  else status = 'FAIL';

  const shot = (last.attachments || []).find((a) => a.name === 'screenshot');
  return {
    caseId, priority, role, module, layer, status,
    diffRef: ann('diff_ref'),
    expected: ann('expected'),
    page: ann('page'),
    duration: last.duration || 0,
    error: status === 'FAIL' ? truncate(firstLine(last.error && last.error.message)) : '',
    evidence: shot ? path.relative(projectRoot, shot.path) : '',
  };
}
const specs = allSpecs.map(analyze);

// ---------- 聚合 ----------
function group(keyFn) {
  const map = new Map();
  for (const s of specs) {
    const k = keyFn(s) || '(无)';
    if (!map.has(k)) map.set(k, { total: 0, PASS: 0, FAIL: 0, FLAKY: 0, SKIP: 0 });
    const g = map.get(k); g.total++; g[s.status]++;
  }
  return map;
}
const stats = data.stats || {};
const total = specs.length;
const pass = specs.filter((s) => s.status === 'PASS').length;
const fail = specs.filter((s) => s.status === 'FAIL').length;
const flaky = specs.filter((s) => s.status === 'FLAKY').length;
const skip = specs.filter((s) => s.status === 'SKIP').length;

const byLayer = group((s) => s.layer);
const byModule = group((s) => s.module);
const byPriority = group((s) => s.priority);
const p0 = byPriority.get('P0') || { total: 0, FAIL: 0 };
const p0Red = (p0.FAIL || 0) > 0;
const l2 = specs.filter((s) => s.layer === 'L2');

function statRows(map, nameMap) {
  return [...map.entries()]
    .map(([k, g]) => `| ${nameMap ? (nameMap[k] || k) : k} | ${g.total} | ${g.PASS} | ${g.FAIL} | ${g.FLAKY} | ${g.SKIP} | ${pct(g.PASS, g.total)} |`)
    .join('\n');
}

const verdict = p0Red
  ? '🚨 **阻断（P0 红线触发）** — P0 用例存在 FAIL'
  : fail > 0
    ? '⚠️ **有非 P0 失败 · 需排查（不阻断发布）**'
    : '✅ **放行 · 0 FAIL**';

// ---------- 渲染 Markdown ----------
const titlePrefix = projectLabel ? `${BASELINE_VERSION} · ${projectLabel}` : BASELINE_VERSION;
const md = `# ${titlePrefix} · PM 独立验收回归报告

> **本报告 = PM 独立验收回归**：真实环境 + 黑盒行为断言 + PM 验收用例，**独立于研发 mock runner**。
> 自动生成 · L2 通用引擎 \`~/.claude/skills/acceptance-regression/lib/acceptance-report.mjs\` · 数据源 \`${config.resultsSubpath ?? 'playwright-results/results.json'}\`

## 一、元信息

| 项 | 值 |
|---|---|
| 基线版本 | ${BASELINE_VERSION} |
| 验收环境 baseURL | \`${baseURL}\` ${isMock ? '⚠️ 本地/Mock（非独立验收口径！）' : '✅ 真实环境（非 mock）'} |
| 研发快照 SHA | ${config.codeRepoForSha ? `${config.codeRepoForSha} @ \`${gitSha()}\`` : '(未配置)'} |
| 跑测开始 | ${stats.startTime || '-'} |
| 总耗时 | ${fmtDuration(stats.duration)} |
| 执行器 | Playwright ${(data.config && data.config.version) || '-'} |

## 二、整体结果

| 指标 | 值 |
|---|---|
| 用例总数 | ${total} |
| ✅ PASS | ${pass} |
| ❌ FAIL | ${fail} |
| ⚠️ FLAKY | ${flaky} |
| ⏭️ SKIP | ${skip} |
| 通过率 | **${pct(pass, total)}** |

## 三、按层级

| 层 | 总数 | PASS | FAIL | FLAKY | SKIP | 通过率 |
|---|---:|---:|---:|---:|---:|---:|
${statRows(byLayer, LAYER_NAME) || '| (无) | 0 | 0 | 0 | 0 | 0 | - |'}

## 四、按模块

| 模块 | 总数 | PASS | FAIL | FLAKY | SKIP | 通过率 |
|---|---:|---:|---:|---:|---:|---:|
${statRows(byModule) || '| (无) | 0 | 0 | 0 | 0 | 0 | - |'}

## 五、按优先级（P0 红线）

| 优先级 | 总数 | PASS | FAIL | FLAKY | SKIP | 通过率 |
|---|---:|---:|---:|---:|---:|---:|
${statRows(byPriority) || '| (无) | 0 | 0 | 0 | 0 | 0 | - |'}

> 🔴 **P0 红线**：P0 用例必须 100% PASS。当前 P0 ${p0.total || 0} 条，FAIL ${p0.FAIL || 0} 条 → ${p0Red ? '🚨 **红线触发**' : '✅ 通过'}

## 六、5 角色权限矩阵（L2）

${l2.length
    ? `| 角色 | 页面 | 期望 | 结果 |
|---|---|---|---|
${l2.map((s) => `| ${s.role || '-'} | ${s.page || s.caseId} | ${s.expected || '-'} | ${s.status === 'PASS' ? '✅' : s.status === 'FAIL' ? '❌' : s.status} |`).join('\n')}`
    : '_（本次无 L2 权限矩阵用例）_'}

## 七、FAIL 明细

${fail > 0
    ? `| case_id | 模块 | 优先级 | 错误首行 | diff_ref | 证据 |
|---|---|---|---|---|---|
${specs.filter((s) => s.status === 'FAIL').map((s) => `| ${s.caseId} | ${s.module || '-'} | ${s.priority} | ${s.error || '-'} | ${s.diffRef || '-'} | ${s.evidence || '-'} |`).join('\n')}`
    : '_（无 FAIL）_ 🎉'}

## 八、独立验收结论

- **阻断判定**：${verdict}
- **独立性声明**：本报告为**真实环境黑盒行为验收**（baseURL=\`${baseURL}\`），断言源为 PM 验收用例，**全程独立于 ${devRunnerLabel}**。
${isMock ? '- ⚠️ **警告**：本次 baseURL 指向本地/Mock，不符合独立验收口径，结果仅供调试参考。\n' : ''}---
_L2 通用引擎生成 · 同一 results.json 多次生成结果一致（可重放）· 引擎项目无关，配置来自 ${path.relative(projectRoot, found.configPath) || 'acceptance.config.json'}_
`;

fs.writeFileSync(outPath, md, 'utf-8');
console.log(`✅ 独立验收回归报告已生成：${path.relative(projectRoot, outPath)}`);
console.log(`   [L2 引擎] 项目=${projectLabel || projectRoot} · config=${found.configPath}`);
console.log(`   总数 ${total} · PASS ${pass} · FAIL ${fail} · FLAKY ${flaky} · SKIP ${skip} · 通过率 ${pct(pass, total)}`);
console.log(`   阻断判定：${p0Red ? '🚨 P0 红线' : fail > 0 ? '⚠️ 非 P0 失败' : '✅ 放行'} · baseURL ${baseURL}${isMock ? ' ⚠️Mock' : ' ✅真实'}`);
if (p0Red) process.exitCode = 1;
