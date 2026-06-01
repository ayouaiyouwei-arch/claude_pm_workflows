#!/usr/bin/env node
// ⚠️ 骨架提示：ROLE_HINT / MODULE_ABBR / ROUTE_ALIASES 当前为 robobus 示例值，接入项目务必改成自己的（对齐 fixtures/auth 角色、acceptance.config modules、真实路由）。
/**
 * CSV → Playwright spec.ts 骨架生成器
 *
 * 用法：
 *   node scripts/csv-to-spec.mjs <csv-path> [--out <dir>] [--filter <case-id-pattern>] [--force]
 *
 * 示例：
 *   # 把 OPT-013 16 条 CSV 生成到 tests/regression/综合工作台/
 *   node scripts/csv-to-spec.mjs \
 *     "product-docs/_drafts/2026-05-20-dashboard-stats-acceptance-coverage/06-用例.csv" \
 *     --out test/tools/e2e-scripts/tests/regression/综合工作台
 *
 *   # 只生成 P0 用例
 *   node scripts/csv-to-spec.mjs <csv> --filter "TC-DSH-00[2-7]"
 *
 *   # 强制覆盖已存在 spec
 *   node scripts/csv-to-spec.mjs <csv> --force
 *
 * 规则：
 *   - 18 列 CSV 严格按 test/test-cases/_用例字段说明.md
 *   - 仅生成 automation_type=e2e 或 hybrid 的用例
 *   - 文件名 = <case_id>.spec.ts
 *   - 默认不覆盖已存在 spec（防误删 PM 手填的实现）· 需 --force
 *   - 骨架内容：Given/When/Then 三段 + 5 态注释 + 设计方法注释 + UI setup/teardown 占位
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------- arg 解析 ----------
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: csv-to-spec.mjs <csv-path> [--out <dir>] [--filter <pattern>] [--force]');
  process.exit(1);
}

const csvPath = args[0];
const outDirIdx = args.indexOf('--out');
const outDir = outDirIdx >= 0 ? args[outDirIdx + 1] : null;
const filterIdx = args.indexOf('--filter');
const filterPattern = filterIdx >= 0 ? new RegExp(args[filterIdx + 1]) : null;
const force = args.includes('--force');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV 文件不存在：${csvPath}`);
  process.exit(1);
}

// ---------- CSV 解析（简易实现 · 支持双引号内逗号 / 转义） ----------
function parseCsv(content) {
  const lines = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"' && content[i - 1] !== '\\') {
      inQuote = !inQuote;
      buf += ch;
    } else if (ch === '\n' && !inQuote) {
      lines.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) lines.push(buf);

  function parseRow(line) {
    const cells = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (ch === ',' && !q) {
        cells.push(cell);
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    return cells;
  }

  const header = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow).map((cells) => {
    const obj = {};
    header.forEach((h, idx) => (obj[h.trim()] = (cells[idx] ?? '').trim()));
    return obj;
  });
  return { header, rows };
}

// ---------- 模块 → 角色推断 ----------
const ROLE_HINT = {
  综合工作台: 'gray_admin',
  智能排班中心: 'dispatcher01',
  安全运营中心: 'supervisor01',
  订单中心: 'officer01',
  基础资源库: 'gray_admin',
  系统设置: 'gray_admin',
  效能分析: 'leader01',
  规则配置中心: 'gray_admin',
};

// ---------- 模块 → 缩写（与 _用例字段说明.md § 四 / acceptance-report.mjs MODULE_BY_ABBR 对齐） ----------
// 用于在 spec 标题注入 @模块缩写 tag · 供 acceptance-report.mjs 与 `pnpm test --grep @SEC` 过滤/归因
const MODULE_ABBR = {
  综合工作台: 'DSH', 智能排班中心: 'SCH', 订单中心: 'ORD', 安全运营中心: 'SEC',
  规则配置中心: 'RUL', 效能分析: 'ANA', 基础资源库: 'RES', 系统设置: 'SYS', 跨模块场景: 'SCN',
};

// ---------- CSV PRD 路由 → 灰度真实路由 ----------
// 在 TC-DSH-002 reference impl 跑通过程中发现 · CSV 写的是 PRD 规划路由名 ·
// 灰度实际渲染路由可能不同（如 /admin/dashboard → /workbench · main.tsx:676）
// 此表持续积累 · 生成器自动转译 · 让骨架默认能跑通登录 + 导航
const ROUTE_ALIASES = {
  '/admin/dashboard': '/workbench',
  '/workbench/overview': '/workbench', // DIFF-005 老路由兼容
};
function resolveRoute(prdRoute) {
  return ROUTE_ALIASES[prdRoute] ?? prdRoute;
}

// ---------- 设计方法标签提取 ----------
function extractDesignMethods(scenario) {
  const m = scenario.match(/^\[([A-Z+]+)\]/);
  return m ? m[1] : 'SC';
}

// ---------- 字符串字面量安全转义 ----------
function escTs(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// ---------- spec 骨架渲染 ----------
function renderSpec(row) {
  const {
    case_id,
    module,
    page,
    route,
    diff_ref,
    priority,
    scenario,
    preconditions,
    steps,
    expected,
    five_states,
    evidence_required,
  } = row;

  const role = ROLE_HINT[module] ?? 'gray_admin';
  const moduleAbbr = MODULE_ABBR[module] ?? '';
  const tagStr = `@${priority}${moduleAbbr ? ` @${moduleAbbr}` : ''} @role:${role} @L1`;
  const resolvedRoute = resolveRoute(route);
  const routeRemapped = resolvedRoute !== route;
  const methods = extractDesignMethods(scenario);
  const stepsArr = (steps || '').split(/[;；]\s*\d+\)\s*/).map((s) => s.trim()).filter(Boolean);
  const expectedArr = (expected || '').split(/[;；]\s*\d+\)\s*/).map((s) => s.trim()).filter(Boolean);
  const fiveStates = (five_states || '').split(/[;,]/).map((s) => s.trim()).filter((s) => s && s !== 'na');
  const evidence = (evidence_required || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);

  return `// CSV: ${case_id} · ${module} · ${page} · ${diff_ref}
// 用例字段冻结说明：test/test-cases/_用例字段说明.md
// 测试设计方法（必读）：test/test-cases/_测试设计方法.md
//
// 设计方法标签：[${methods}]
// 优先级：${priority}
// CSV 路由：${route}
${routeRemapped ? `// 灰度真实路由：${resolvedRoute}（生成器自动转译 · 见 scripts/csv-to-spec.mjs ROUTE_ALIASES）` : `// 真实路由：${route}`}
// 5 态覆盖：${fiveStates.length ? fiveStates.join(' / ') : '无'}
// 证据：${evidence.join(' / ')}
//
// ⚠️ PM 自跑路径核心约束（用户 LOCKED · 2026-05-20）：
//   1. 所有增删改 = 必须走页面 UI 点击（getByRole / getByText / getByLabel）
//   2. 不准用 API 直接造数据 / 直接清数据
//   3. setup（造前置）+ teardown（清残留）也必须 UI 化
//   4. evidence 截图必须按 5 态采集
//
// 📚 Reference Impl：tests/regression/综合工作台/TC-DSH-002.spec.ts（PM 自跑首条 PASS 样板）

import { test, expect } from '../../../fixtures/auth';
import { captureEvidence } from '../../../utils/evidence';

const CASE_ID = '${case_id}';
const ROUTE = '${resolvedRoute}';

test.describe(\`\${CASE_ID} · [${methods}] ${escTs((scenario || '').slice(0, 70))}\`, () => {
  test.beforeEach(async ({ loginAs }) => {
    // 以 ${role} 登录（P006 § 三 真实账号 · auth fixture 自动管 captcha + storageState 复用）
    await loginAs('${role}');
  });

  test(\`\${CASE_ID} · [${methods}] · ${priority} ${tagStr}\`, async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'case_id', description: CASE_ID });
    testInfo.annotations.push({ type: 'priority', description: '${priority}' });
    testInfo.annotations.push({ type: 'diff_ref', description: '${diff_ref}' });
    testInfo.annotations.push({ type: 'design_methods', description: '${methods}' });

    // ============================================================
    // Given · 已登录 + 导航到目标路由（hash 路由 · reload 确保接口重新请求）
    // ============================================================
    // 原 CSV preconditions:
    //   ${escTs((preconditions || '').slice(0, 200))}
    await test.step(\`Given · ${role} 已登录 · 进入 \${ROUTE}\`, async () => {
      await page.goto(\`/#\${ROUTE}\`);
      await page.reload(); // 重要：hash 内导航不重发请求 · reload 强制重新挂载组件
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(ROUTE.replace(/\\//g, '\\\\/')));
    });

    // ============================================================
    // When · 操作步骤（PM 填实 locator + 真实 UI 点击）
    // ============================================================
${stepsArr.map((s, i) => `    await test.step(\`When ${i + 1} · ${escTs(s.slice(0, 80))}\`, async () => {
      // TODO PM: 真实 UI 点击 · 禁止 API 直调
      // 范例见 TC-DSH-002.spec.ts · 用 getByRole / getByText / getByPlaceholder
      throw new Error('未实现 · 请按 CSV steps 填实 · 参考 TC-DSH-002 reference impl');
    });`).join('\n\n')}

    // ============================================================
    // Then · 断言
    // ============================================================
${expectedArr.map((e, i) => `    await test.step(\`Then ${i + 1} · ${escTs(e.slice(0, 80))}\`, async () => {
      // TODO PM: 断言 expect(...).toBeVisible() / toHaveText(...) / toBe(...)
    });`).join('\n\n')}

${fiveStates.length ? `    // ============================================================
    // 5 态覆盖（自动截图 · 命中即采证）
    // ============================================================
${fiveStates.map((s) => `    await test.step('5 态 · ${s}', async () => {
      // TODO PM: 触发 ${s} 态（按 CSV five_states 列）· 然后截图
      await captureEvidence(page, CASE_ID, '${s}', { stage: '${s} 态' });
    });`).join('\n\n')}` : ''}

    // ============================================================
    // 5 态 · 控制台无业务 error（过滤 429/favicon 环境噪音）
    // ============================================================
    await test.step('5 态 · 控制台无业务 error', async () => {
      const errors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.waitForTimeout(2_000);
      const businessErrors = errors.filter(
        (e) => !/429|favicon|net::ERR_BLOCKED_BY_CLIENT|status of 4\\d\\d/.test(e),
      );
      if (businessErrors.length > 0) {
        testInfo.annotations.push({ type: 'console-error', description: businessErrors.join('\\n') });
      }
      expect(businessErrors, \`业务 console error: \${businessErrors.join('\\n')}\`).toEqual([]);
    });

    // ============================================================
    // Teardown · 清理（如本用例有增删改 · 必须 UI 操作清除）
    // ============================================================
    // TODO PM: 若 setup/When 阶段通过 UI 创建了真实数据 · 这里必须走 UI 删除
    // 范例：await page.getByRole('row', { name: /<新增的标识>/ }).getByRole('button', { name: '删除' }).click();
    //       await page.getByRole('button', { name: '确认删除' }).click();
  });
});
`;
}

// ---------- 主流程 ----------
const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/﻿/, '');
const { rows } = parseCsv(csvContent);

const e2eRows = rows.filter((r) => {
  if (!r.case_id) return false;
  if (filterPattern && !filterPattern.test(r.case_id)) return false;
  return ['e2e', 'hybrid'].includes(r.automation_type);
});

if (e2eRows.length === 0) {
  console.error('⚠️ 0 条 e2e/hybrid 用例命中 · 检查 CSV automation_type 列与 --filter');
  process.exit(2);
}

// 推断 outDir（按第一条用例的模块）
const firstModule = e2eRows[0].module;
const targetDir = outDir || `test/tools/e2e-scripts/tests/regression/${firstModule}`;
fs.mkdirSync(targetDir, { recursive: true });

let created = 0;
let skipped = 0;
for (const row of e2eRows) {
  const specPath = path.join(targetDir, `${row.case_id}.spec.ts`);
  if (fs.existsSync(specPath) && !force) {
    console.log(`⏭  skip ${row.case_id}（已存在 · 用 --force 覆盖）`);
    skipped++;
    continue;
  }
  fs.writeFileSync(specPath, renderSpec(row), 'utf-8');
  console.log(`✅ ${row.case_id} → ${specPath}`);
  created++;
}

console.log('');
console.log(`📊 生成完成 · created=${created} · skipped=${skipped} · 输出目录=${targetDir}`);
console.log('');
console.log('下一步：');
console.log(`  1. 进 ${targetDir} 把 TODO PM 处填实（参考 TC-DSH-002 reference impl）`);
console.log(`  2. cd test/tools/e2e-scripts && pnpm install`);
console.log(`  3. pnpm test --grep <case_id> --headed   # 单条调试`);
console.log(`  4. pnpm test:regression                  # 批量跑`);
