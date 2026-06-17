#!/usr/bin/env node
/**
 * 覆盖义务矩阵渲染器（S1 · 2026-06-14）
 *
 * 把 gen-cases / gen-cases-spec 产出的 obligations(结构化覆盖义务) 渲染成 coverage-matrix.md，
 * 供 `lint-cases.js --obligations` 机器门校验。兑现 _测试设计方法.md §〇『闭环矩阵随用例产出，
 * 落 reports/<版本>/coverage-matrix.md，是发布门/A7/覆盖审计的对照基准』这一既定承诺。
 *
 * 用法：
 *   node test/tools/render-coverage-matrix.mjs <obligations.json> [--out <coverage-matrix.md>] [--title "<模块/文档>"]
 *     obligations.json 形如 [{source,id,desc,status}, ...] 或 {title, obligations:[...]}
 *     （status = 命中的 case_id 列表 / "未覆盖" / "有意不测:理由"）
 *   不带 --out 时打印到 stdout。
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: render-coverage-matrix.mjs <obligations.json> [--out <md>] [--title <t>]');
  process.exit(1);
}
const inPath = args[0];
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
const titleIdx = args.indexOf('--title');
let title = titleIdx >= 0 ? args[titleIdx + 1] : '';

if (!fs.existsSync(inPath)) {
  console.error(`❌ obligations JSON 不存在：${inPath}`);
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
const obligations = Array.isArray(raw) ? raw : (raw.obligations || []);
if (!title && !Array.isArray(raw)) title = raw.title || '';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
const norm = (s) => String(s ?? '').trim();
const uncovered = obligations.filter((o) => norm(o.status) === '未覆盖');
const intentional = obligations.filter((o) => norm(o.status).startsWith('有意不测'));
const covered = obligations.length - uncovered.length - intentional.length;

const lines = [];
lines.push(`# 覆盖义务矩阵${title ? ' · ' + title : ''}`);
lines.push('');
lines.push(`> S1 闭环硬门 · 义务 ${obligations.length} 条：覆盖 ${covered} / 有意不测 ${intentional.length} / 未覆盖 ${uncovered.length}`);
lines.push('> 门禁：`node test/tools/lint-cases.js --obligations <本文件>`（任一「未覆盖」= 非零退出，不放行）');
lines.push('');
lines.push('| 来源 | 义务ID | 描述 | 覆盖(case_id / 未覆盖 / 有意不测:理由) |');
lines.push('|---|---|---|---|');
for (const o of obligations) {
  lines.push(`| ${esc(o.source)} | ${esc(o.id)} | ${esc(o.desc)} | ${esc(o.status)} |`);
}
lines.push('');

const out = lines.join('\n') + '\n';
if (outPath) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, out, 'utf-8');
  console.log(`✅ coverage-matrix 已写 ${outPath}（义务 ${obligations.length} · 覆盖 ${covered} / 有意不测 ${intentional.length} / 未覆盖 ${uncovered.length}）`);
  if (uncovered.length) console.log(`⚠ 有 ${uncovered.length} 条未覆盖，过 lint --obligations 会被判不放行`);
} else {
  process.stdout.write(out);
}
