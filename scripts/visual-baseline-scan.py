#!/usr/bin/env python3
"""
visual-baseline-scan.py · 项目视觉基线自动提取（patch-010 · 复活 2026-05-09 /tmp 一次性脚本）

统计口径与 product-docs/.../visual-baseline/00-调查方法.md § 三 对齐，并增补：
圆角 / 阴影尺寸 / dark: 前缀 / UI 组件库依赖检测。

只读不写源码。输出 JSON（机器留档 · 可复跑 diff）+ 终端摘要。
JSON 由 extract-visual-baseline skill 整理成 visual-baseline/01~06 草稿（人读）。

用法：
  python3 scripts/visual-baseline-scan.py \
    --dirs code/<repo>/packages/admin/src code/<repo>/packages/shared/ui/src \
    --components-dir code/<repo>/packages/shared/ui/src \
    --pkg code/<repo>/package.json code/<repo>/packages/admin/package.json \
    --out /tmp/visual-baseline-result.json
"""
import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime

EXTS = {".tsx", ".ts", ".jsx", ".js", ".css", ".vue", ".html", ".scss", ".less"}
SKIP_DIRS = {"node_modules", "dist", "build", ".git", ".next", "coverage", "__pycache__"}

FAMILIES = (
    "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|"
    "cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white|transparent|current"
)
SHADES = "50|100|200|300|400|500|600|700|800|900|950"
COLOR_PREFIXES = (
    "bg|text|border|ring|from|to|via|divide|outline|fill|stroke|accent|caret|"
    "decoration|placeholder|shadow"
)
SPACING_PREFIXES = "p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y"
SPACING_VALS = (
    "0\\.5|1\\.5|2\\.5|3\\.5|0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|"
    "44|48|52|56|60|64|72|80|96|px"
)

RE_HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
RE_RGB = re.compile(r"rgba?\(([^)]+)\)")
RE_TW_COLOR = re.compile(rf"\b({COLOR_PREFIXES})-({FAMILIES})(?:-({SHADES}))?\b")
RE_TW_TEXT_SIZE = re.compile(r"\btext-(xs|sm|base|lg|xl|[2-9]xl)\b")
RE_CSS_FONT_SIZE = re.compile(r"font-size:\s*(\d+\.?\d*)(px|rem|em)")
RE_TW_SPACING = re.compile(rf"\b({SPACING_PREFIXES})-({SPACING_VALS})\b")
RE_CSS_PX = re.compile(r"\b(\d+\.?\d*)px\b")
RE_ROUNDED = re.compile(r"\brounded(?:-(none|sm|md|lg|xl|2xl|3xl|full))?\b")
RE_SHADOW_SIZE = re.compile(r"\bshadow(?:-(sm|md|lg|xl|2xl|inner|none))?\b(?!-)")
RE_DARK = re.compile(r"\bdark:")
RE_FONT_FAMILY = re.compile(r"font-family:\s*([^;}]+)|\bfont-(sans|serif|mono)\b")

UI_LIB_MARKERS = [
    "antd", "@ant-design", "@mui/material", "element-plus", "element-ui", "naive-ui",
    "vant", "@arco-design", "@douyinfe/semi-ui", "tdesign", "@nextui-org", "@chakra-ui",
    "@radix-ui", "@headlessui", "vuetify", "primereact", "primevue", "react-bootstrap",
    "tailwindcss", "lucide-react", "@heroicons", "react-icons", "echarts", "@antv",
    "recharts", "d3", "chart.js",
]


def norm_hex(h: str) -> str:
    h = h.lower()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 8:  # 舍 alpha
        h = h[:6]
    return "#" + h


def iter_files(dirs):
    for d in dirs:
        for root, subdirs, files in os.walk(d):
            subdirs[:] = [s for s in subdirs if s not in SKIP_DIRS]
            for f in files:
                if os.path.splitext(f)[1] in EXTS:
                    yield os.path.join(root, f)


def git_sha(path):
    try:
        return subprocess.run(
            ["git", "-C", path, "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=10,
        ).stdout.strip() or None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", nargs="+", required=True, help="扫描目录（多个）")
    ap.add_argument("--components-dir", nargs="*", default=[],
                    help="组件库目录（统计组件名被引用的文件数）")
    ap.add_argument("--pkg", nargs="*", default=[], help="package.json 路径（UI 依赖检测）")
    ap.add_argument("--out", required=True, help="输出 JSON 路径")
    ap.add_argument("--top", type=int, default=60, help="终端摘要 top N")
    args = ap.parse_args()

    for d in args.dirs:
        if not os.path.isdir(d):
            sys.exit(f"目录不存在: {d}")

    c_hex, c_rgb = Counter(), Counter()
    c_tw_full, c_tw_fs = Counter(), Counter()
    c_text_size, c_css_font = Counter(), Counter()
    c_spacing, c_css_px = Counter(), Counter()
    c_rounded, c_shadow = Counter(), Counter()
    c_font_family = Counter()
    dark_hits = 0
    hex_locations = {}  # hex -> 样例文件（最多 3 个 · 给 07-未token化热点用）
    files_scanned = 0
    per_dir_count = Counter()

    for fp in iter_files(args.dirs):
        try:
            text = open(fp, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        files_scanned += 1
        for d in args.dirs:
            if fp.startswith(d.rstrip("/") + "/") or fp == d:
                per_dir_count[d] += 1
                break

        for m in RE_HEX.finditer(text):
            h = norm_hex(m.group(1))
            c_hex[h] += 1
            if h not in hex_locations:
                hex_locations[h] = []
            if len(hex_locations[h]) < 3 and fp not in hex_locations[h]:
                hex_locations[h].append(fp)
        for m in RE_RGB.finditer(text):
            c_rgb["rgba(" + m.group(1) + ")"] += 1
        for m in RE_TW_COLOR.finditer(text):
            prefix, family, shade = m.group(1), m.group(2), m.group(3)
            full = f"{prefix}-{family}" + (f"-{shade}" if shade else "")
            c_tw_full[full] += 1
            c_tw_fs[family + (f"-{shade}" if shade else "")] += 1
        for m in RE_TW_TEXT_SIZE.finditer(text):
            c_text_size["text-" + m.group(1)] += 1
        for m in RE_CSS_FONT_SIZE.finditer(text):
            c_css_font[m.group(1) + m.group(2)] += 1
        for m in RE_TW_SPACING.finditer(text):
            c_spacing[f"{m.group(1)}-{m.group(2)}"] += 1
        for m in RE_CSS_PX.finditer(text):
            v = float(m.group(1))
            if 0 < v <= 200:
                c_css_px[m.group(1) + "px"] += 1
        for m in RE_ROUNDED.finditer(text):
            c_rounded["rounded" + (f"-{m.group(1)}" if m.group(1) else "")] += 1
        for m in RE_SHADOW_SIZE.finditer(text):
            c_shadow["shadow" + (f"-{m.group(1)}" if m.group(1) else "")] += 1
        for m in RE_FONT_FAMILY.finditer(text):
            val = (m.group(1) or ("font-" + m.group(2))).strip()[:60]
            c_font_family[val] += 1
        dark_hits += len(RE_DARK.findall(text))

    # 组件引用频次（文件级 · 同 00-调查方法口径）
    components = {}
    comp_names = []
    for cd in args.components_dir:
        if not os.path.isdir(cd):
            continue
        for f in os.listdir(cd):
            if f.endswith((".tsx", ".vue", ".jsx")) and f[0].isupper():
                comp_names.append(os.path.splitext(f)[0])
    if comp_names:
        comp_counter = Counter()
        comp_res = {n: re.compile(rf"\b{re.escape(n)}\b") for n in comp_names}
        for fp in iter_files(args.dirs):
            try:
                text = open(fp, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            for n, rx in comp_res.items():
                if rx.search(text):
                    comp_counter[n] += 1
        components = dict(comp_counter.most_common())

    # UI 依赖检测
    ui_deps = {}
    for pkg in args.pkg:
        try:
            data = json.load(open(pkg, encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        hits = {k: v for k, v in deps.items()
                if any(k == m or k.startswith(m + "/") or m in k for m in UI_LIB_MARKERS)}
        if hits:
            ui_deps[pkg] = hits

    result = {
        "meta": {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "dirs": args.dirs,
            "files_scanned": files_scanned,
            "per_dir_files": dict(per_dir_count),
            "git_sha": {d: git_sha(d) for d in args.dirs[:1]},
            "method_doc": "visual-baseline/00-调查方法.md § 三（patch-010 复活版 + 圆角/阴影/dark/依赖增补）",
        },
        "hex": dict(c_hex.most_common()),
        "hex_sample_files": {h: v for h, v in list(hex_locations.items())[:200]},
        "rgb": dict(c_rgb.most_common(100)),
        "tw_color_full": dict(c_tw_full.most_common()),
        "tw_color_family_shade": dict(c_tw_fs.most_common()),
        "tw_text_size": dict(c_text_size.most_common()),
        "css_font_size": dict(c_css_font.most_common()),
        "tw_spacing": dict(c_spacing.most_common()),
        "css_px": dict(c_css_px.most_common(80)),
        "rounded": dict(c_rounded.most_common()),
        "shadow_size": dict(c_shadow.most_common()),
        "font_family": dict(c_font_family.most_common(30)),
        "dark_prefix_count": dark_hits,
        "components": components,
        "ui_deps": ui_deps,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    json.dump(result, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # 终端摘要
    print(f"扫描 {files_scanned} 文件 · {len(args.dirs)} 目录 → {args.out}")
    print(f"\n== Tailwind family-shade top {min(args.top, 20)} ==")
    for k, v in c_tw_fs.most_common(20):
        print(f"  {v:6d}  {k}")
    print("\n== 硬编码 hex top 15 ==")
    for k, v in c_hex.most_common(15):
        print(f"  {v:6d}  {k}")
    print("\n== 字号 ==", dict(c_text_size.most_common(10)))
    print("== 圆角 ==", dict(c_rounded.most_common(8)))
    print("== 阴影 ==", dict(c_shadow.most_common(8)))
    print("== dark: 前缀 ==", dark_hits)
    if ui_deps:
        print("== UI 依赖 ==")
        for pkg, hits in ui_deps.items():
            print(f"  {pkg}: {', '.join(sorted(hits))}")


if __name__ == "__main__":
    main()
