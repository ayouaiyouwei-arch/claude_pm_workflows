#!/usr/bin/env bash
# validate-evals-csv.sh · evals 三表写入时 schema 校验（patch-012）
# 用法:
#   bash scripts/validate-evals-csv.sh runs   [--last|--all]   # 默认 --all
#   bash scripts/validate-evals-csv.sh loops  [--last|--all]
#   bash scripts/validate-evals-csv.sh escapes [--last|--all]
# 约定:
#   - retrospector 每次 append 后必跑对应表 --last，失败不准报完成
#   - pipeline-evaluator 周报 preflight 跑三表 --all，失败不硬断、在周报 § 数据质量记异常
# exit 0 = 通过；exit 1 = 有违例（stdout 列出 行号/列名/违例值）

set -euo pipefail
cd "$(dirname "$0")/.."

FILE_KEY="${1:?用法: validate-evals-csv.sh <runs|loops|escapes> [--last|--all]}"
MODE="${2:---all}"

command -v python3 >/dev/null 2>&1 || {
  echo "❌ 缺 python3：evals CSV schema 校验依赖 python3，无法校验（fail-closed）。请先安装（macOS: brew install python3）后重试" >&2
  exit 1
}

python3 - "$FILE_KEY" "$MODE" <<'PYEOF'
# -*- coding: utf-8 -*-
import csv, re, sys

file_key, mode = sys.argv[1], sys.argv[2]

INT = r'^\d+$|^-$'
FLOAT01 = r'^(0(\.\d{1,2})?|1(\.0{1,2})?)$|^-$'
DATE = r'^\d{4}-\d{2}-\d{2}$'

# 🔧 骨架版占位：/init-project 时按 PROJECT-PROFILE.md § 五 替换为本项目真实端白名单
#   （与 evals/_runs字段说明.md 列 4 同步）。未替换前（仍含 '<端>' 占位）跳过端白名单严格校验、仅提示，
#   避免新项目真实端（如 checkout/catalog）被骨架遗留白名单硬拒报费解错误。
SIDES = {'<端1>', '<端2>', '<端3>'}
SIDES_CONFIGURED = not any(s.startswith('<') for s in SIDES)

SCHEMAS = {
    'runs': {
        'path': 'evals/runs.csv',
        'cols': 22,
        'checks': {
            1:  ('done_date', DATE),
            2:  ('类型', {'新增', '优化', 'UI重构', 'bug修复', '混合'}),
            4:  ('修改级别', {'L1', 'L2', 'L3', '-'}),
            5:  ('A1_轮数', INT),
            6:  ('A2_结论', {'通过', '打回后通过', '打回', '-'}),
            7:  ('A3_声明改动文件数', INT),
            8:  ('A4_结论', {'通过', '触发A5', '打回', '-'}),
            9:  ('A5_是否触发', {'是', '否', '-'}),
            10: ('A5_建议', {'通过原方案', '拆分', '复用替代', '延后', '-'}),
            11: ('A6_用例总数', INT),
            12: ('A6_VR占比', FLOAT01),
            13: ('A7_打回轮数', INT),
            14: ('Codex_轮次', INT),
            15: ('Codex_QUESTION数', INT),
            16: ('实际改动文件数', INT),
            18: ('交付路径', {'流水线', '主对话直出', 'P008补档', '直接派活'}),
            19: ('A5_PM裁决', {'采纳', '部分采纳', '推翻', '-'}),
            20: ('包周期_小时', r'^\d+(\.\d)?$|^-$'),
            21: ('patch水位', r'^patch-\d{3}$|^-$'),
        },
        'special': 'sides',
    },
    'loops': {
        'path': 'evals/loops.csv',
        'cols': 11,
        'checks': {
            1: ('loop_id', {'Loop-1', 'A2-软闸', 'Loop-2', 'Loop-3', 'Gate1.5b改图', 'iterate-A7'}),
            2: ('触发', {'是', '否'}),
            3: ('轮数', INT),
            4: ('检出数', INT),
            5: ('自修数', INT),
            6: ('升级PM数', INT),
            7: ('残留数', INT),
            8: ('新问题即停', {'是', '否', '-'}),
            9: ('超限', {'是', '否', '-'}),
        },
    },
    'escapes': {
        'path': 'evals/escapes.csv',
        'cols': 9,
        'checks': {
            0: ('escape_id', r'^ESC-\d{3}$'),
            1: ('登记日期', DATE),
            4: ('严重度', {'P0', 'P1', 'P2'}),
            5: ('发现层', {'Codex施工', '全量回归', 'dev-verify', 'PM灰度', '线上', '其他'}),
            6: ('应拦截层', {'A1', 'A1.5', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
                            'Loop-1', 'Loop-2', 'Loop-3', '不可拦截'}),
            8: ('状态', {'开放', '已闭环'}),
        },
    },
}

schema = SCHEMAS.get(file_key) or sys.exit(f'未知表: {file_key}')
rows = list(csv.reader(open(schema['path'], encoding='utf-8')))
data = [(i + 1, r) for i, r in enumerate(rows)][1:]  # (行号, 行) · 跳表头
data = [(n, r) for n, r in data if r and any(c.strip() for c in r)]
if mode == '--last':
    data = data[-1:] if data else []

errors = []
for lineno, r in data:
    if len(r) != schema['cols']:
        errors.append(f'L{lineno} {r[0] if r else "?"}: 列数 {len(r)} ≠ {schema["cols"]}')
        continue
    for idx, (name, rule) in schema['checks'].items():
        v = r[idx].strip()
        ok = (v in rule) if isinstance(rule, set) else bool(re.match(rule, v))
        if not ok:
            errors.append(f'L{lineno} {r[0]}: {name}={v!r} 违例')
    if schema.get('special') == 'sides' and SIDES_CONFIGURED and r[3].strip() != '-':
        bad = [t for t in r[3].split(';') if t.strip() not in SIDES]
        if bad:
            errors.append(f'L{lineno} {r[0]}: 触及端含非白名单 token {bad}')

if errors:
    print(f'❌ {schema["path"]} 校验失败（{len(errors)} 处）:')
    print('\n'.join(errors))
    sys.exit(1)
if schema.get('special') == 'sides' and not SIDES_CONFIGURED:
    print('ℹ️  端白名单仍为骨架占位（SIDES 含 \'<端>\'）→ 已跳过端校验；/init-project 按 PROJECT-PROFILE § 五 替换后生效')
print(f'✅ {schema["path"]} 校验通过（{mode} · {len(data)} 行）')
PYEOF
