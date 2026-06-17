#!/usr/bin/env node
/**
 * G1 静态门禁 · 用例库 CSV lint（schema v2 / 19 列）
 * 用法：node test/tools/lint-cases.js                 （从工作空间根目录跑·扫 test/test-cases/）
 *      node test/tools/lint-cases.js --dir <相对/绝对目录>（对目标态 _drafts 验收用例 CSV 单独门禁·不污染 test-cases）
 *      node test/tools/lint-cases.js [--dir <d>] --obligations <coverage-matrix.md>（S1 闭环硬门·任一义务「未覆盖」即非零退出）
 * 退出码：0=全过；1=有硬错误（CI / pre-commit 阻断）
 *
 * 检查项：
 *  - 表头逐字 == 冻结 v2（19 列）
 *  - 每数据行字段数==19（间接保证字段内零 ASCII 逗号）
 *  - case_id 全库唯一 + 格式 TC-<缩写>-<数字>
 *  - scenario 方法标签 [..] 且 token∈白名单(EC/BV/DT/SC/EG/ST/VR + 已登记特殊标签)；priority∈{P0,P1,P2}
 *  - five_states 非空 且 token∈{loading,empty,error,success,permission,na}（Q2 · 2026-06-14）
 *  - automation_type∈{manual,api,e2e,hybrid} + path 配对(manual→na)；[VR]→evidence 含 screenshot（Q2）
 *  - na 掩盖 error 嫌疑（expected 含错误语义却整字段记 na）→ 警告（Q2）
 *  - 模块内 P0:P1:P2 配比 30:50:20 ±20pt（警告，不阻断）
 *  - fe_ref/diff_ref/chg_ref 可追溯（指向真实 FE/DIFF/CHG，否则硬错）
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
// --dir <path>：对指定目录的 CSV 做 G1 结构门禁（用于 _drafts/ 目标态用例，不污染 test-cases/）；无参=现状默认行为。
const argv = process.argv.slice(2);
let dirArg = null, oblArg = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dir' && argv[i + 1]) dirArg = argv[i + 1];
  else if (argv[i].startsWith('--dir=')) dirArg = argv[i].slice('--dir='.length);
  else if (argv[i] === '--obligations' && argv[i + 1]) oblArg = argv[i + 1];
  else if (argv[i].startsWith('--obligations=')) oblArg = argv[i].slice('--obligations='.length);
}
const CASES_DIR = dirArg ? path.resolve(ROOT, dirArg) : path.join(ROOT, 'test/test-cases');
const HEADER = 'case_id,module,page,route,fe_ref,diff_ref,chg_ref,baseline_version,priority,scenario,preconditions,steps,expected,five_states,evidence_required,automation_type,automation_path,owner,last_updated';
const COLS = HEADER.split(',').length; // 19
// 弱语义白名单（Q2 · 2026-06-14 · 词表取自现网 599 条实际用值，新增校验不破坏存量）
const ALLOWED_TAGS = new Set(['EC', 'BV', 'DT', 'SC', 'EG', 'ST', 'VR', 'REGRESSION-REVERSE', 'MAP', 'BV-LABEL']); // 7 法 + 已登记特殊标签
const ALLOWED_STATES = new Set(['loading', 'empty', 'error', 'success', 'permission', 'na']);
const ALLOWED_AUTO = new Set(['manual', 'api', 'e2e', 'hybrid']);
const ERR_WORDS = /400|401|403|404|409|报错|拦截|失败|被拒|拒绝|越权|无权|超限|不存在|非法|异常/;

const errors = [];
const warns = [];

function readLedgerIds() {
  const ids = new Set();
  for (const f of ['baseline/02-PRD-实现差异台账.md', 'baseline/03-产品变更登记.md']) {
    const p = path.join(ROOT, 'product-docs', f);
    if (fs.existsSync(p)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(DIFF|CHG)-\d+/g)) ids.add(m[0]);
  }
  return ids;
}
function readFeIds() {
  const ids = new Set();
  const mdir = path.join(ROOT, 'product-docs/modules');
  if (fs.existsSync(mdir)) for (const d of fs.readdirSync(mdir)) {
    const p = path.join(mdir, d, '03-页面交互问题清单.md');
    if (fs.existsSync(p)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/FE-[A-Z]+-\d+/g)) ids.add(m[0]);
  }
  return ids;
}

const ledger = readLedgerIds();
const feIds = readFeIds();
const seenCaseId = new Map();

if (!fs.existsSync(CASES_DIR)) { console.error('找不到 test/test-cases/（请在工作空间根目录运行）'); process.exit(1); }
const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('.csv'));

for (const f of files) {
  const fp = path.join(CASES_DIR, f);
  const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(l => l.length);
  if (!lines.length) { errors.push(`${f}: 空文件`); continue; }
  if (lines[0] !== HEADER) { errors.push(`${f}: 表头偏离冻结 v2（应 19 列 chg_ref 在第7列）`); }

  let p0 = 0, p1 = 0, p2 = 0, n = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const id = row[0];
    if (row.length !== COLS) { errors.push(`${f}:${i + 1} 字段数=${row.length}≠${COLS}（疑字段内含英文逗号/错列）${id ? ' ['+id+']' : ''}`); continue; }
    n++;
    // case_id
    if (!/^TC-[A-Z]+-\d+$/.test(id)) errors.push(`${f}:${i + 1} case_id 格式非法: ${id}`);
    if (seenCaseId.has(id)) errors.push(`${f}: case_id 重复 ${id}（另见 ${seenCaseId.get(id)}）`); else seenCaseId.set(id, f);
    // scenario 方法标签：必有 + token∈白名单（Q2）
    const tagM = row[9].match(/^\[([^\]]+)\]/);
    if (!tagM) errors.push(`${f}:${i + 1} ${id} scenario 缺方法标签`);
    else for (const t of tagM[1].split('+')) if (!ALLOWED_TAGS.has(t.trim())) errors.push(`${f}:${i + 1} ${id} 未登记方法标签 [${t.trim()}]`);
    // priority
    if (!['P0', 'P1', 'P2'].includes(row[8])) errors.push(`${f}:${i + 1} ${id} priority 非法: ${row[8]}`);
    else { if (row[8] === 'P0') p0++; else if (row[8] === 'P1') p1++; else p2++; }
    // five_states：非空 + token∈枚举（Q2）
    if (!row[13]) errors.push(`${f}:${i + 1} ${id} five_states 空（不适用须写 na）`);
    else for (const s of row[13].split(';')) if (s && !ALLOWED_STATES.has(s.trim())) errors.push(`${f}:${i + 1} ${id} five_states 非法 token: ${s.trim()}`);
    // na 掩盖 error 嫌疑（Q2 · 警告不阻断）
    if (row[13] === 'na' && ERR_WORDS.test(row[12])) warns.push(`${f}:${i + 1} ${id} five_states=na 但 expected 含错误语义（疑似掩盖 error 态）`);
    // automation_type 枚举 + path 配对（Q2 · 原 A7 机械检查下沉到 G1）
    if (!ALLOWED_AUTO.has(row[15])) errors.push(`${f}:${i + 1} ${id} automation_type 非法: ${row[15]}`);
    else if (row[15] === 'manual' && row[16] !== 'na') errors.push(`${f}:${i + 1} ${id} automation_type=manual 但 automation_path≠na: ${row[16]}`);
    else if (row[15] !== 'manual' && (!row[16] || row[16] === 'na')) errors.push(`${f}:${i + 1} ${id} automation_type=${row[15]} 但 automation_path 缺失`);
    // [VR] 用例 evidence_required 必含 screenshot（Q2 · 原 A7 硬指标下沉）
    if (/\[VR/.test(row[9]) && !/screenshot/.test(row[14])) errors.push(`${f}:${i + 1} ${id} [VR] 用例 evidence_required 未含 screenshot`);
    // 可追溯
    for (const r of (row[4] ? row[4].split(';') : [])) if (r && !feIds.has(r)) errors.push(`${f} ${id} fe_ref 悬空: ${r}`);
    for (const r of (row[5] ? row[5].split(';') : [])) if (r && !ledger.has(r)) errors.push(`${f} ${id} diff_ref 悬空: ${r}`);
    for (const r of (row[6] ? row[6].split(';') : [])) if (r && !ledger.has(r)) errors.push(`${f} ${id} chg_ref 悬空: ${r}`);
  }
  // 配比（SCN 跨模块 E2E 套件 P0 偏多属预期，跳过）
  if (n >= 10 && !f.startsWith('SCN')) {
    const r0 = Math.round(p0 * 100 / n), r1 = Math.round(p1 * 100 / n), r2 = Math.round(p2 * 100 / n);
    if (r0 < 10 || r0 > 50 || r1 < 30 || r1 > 70 || r2 > 40) warns.push(`${f}: 配比 P0=${r0}% P1=${r1}% P2=${r2}%（偏离 30:50:20 ±20pt）`);
  }
}

// --obligations <coverage-matrix.md>：S1 闭环硬门 —— 任一义务「未覆盖」即硬错（S1 · 2026-06-14）
if (oblArg) {
  const op = path.resolve(ROOT, oblArg);
  if (!fs.existsSync(op)) {
    errors.push(`--obligations 文件不存在: ${oblArg}`);
  } else {
    let dataRows = 0, unc = 0;
    for (const ln of fs.readFileSync(op, 'utf8').split('\n')) {
      if (!ln.trim().startsWith('|')) continue;
      const cols = ln.split('|').slice(1, -1).map((c) => c.trim());
      if (cols.length < 4) continue;
      if (cols[0] === '来源' || /^:?-{2,}:?$/.test(cols[0])) continue; // 跳表头/分隔行
      dataRows++;
      if (cols[3] === '未覆盖') { unc++; errors.push(`coverage-matrix 未覆盖义务: [${cols[0]}] ${cols[1]} ${cols[2]}`); }
    }
    console.log(`覆盖义务矩阵 ${oblArg}：${dataRows} 条义务，未覆盖 ${unc} 条${unc ? '（硬错·不放行）' : ''}。`);
  }
}

const total = seenCaseId.size;
console.log(`扫描 ${files.length} 个 CSV，共 ${total} 条用例。`);
if (warns.length) { console.log('\n⚠ 警告（不阻断）：'); warns.forEach(w => console.log('  - ' + w)); }
if (errors.length) { console.error(`\n✗ 硬错误 ${errors.length} 条：`); errors.slice(0, 60).forEach(e => console.error('  - ' + e)); if (errors.length > 60) console.error(`  …还有 ${errors.length - 60} 条`); process.exit(1); }
console.log('\n✓ G1 静态门禁全过。');
