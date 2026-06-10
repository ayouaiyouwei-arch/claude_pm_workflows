---
name: extract-visual-baseline
description: 项目视觉基线自动提取/刷新（patch-010）。扫描前端代码统计真实用色/字号/间距/圆角阴影/组件引用/UI 依赖 → 整理 visual-baseline/01~06 草稿（标"自动提取·待 PM 确认"）。两个场景：① 初建——项目有前端但视觉基线不存在（/init-project 或 A1.5 发现缺失时调）② 刷新——基线快照陈旧（研发大改版后 · 产 drift 对比报告）。只读统计不修改源码。
---

# extract-visual-baseline · 视觉基线自动提取/刷新

> 解决的问题：A1.5 的"贴项目风格设计"依赖 visual-baseline 事实源，但它原本是一次性人工脚本产物（脚本在 /tmp 已丢）——基线会陈旧、新项目没有。本 skill 把提取变成**可重复执行**的标准动作。

## 何时用

| 模式 | 触发 |
|---|---|
| **初建** | 项目有前端 UI 但 visual-baseline 目录不存在/为空（/init-project 第 2.4 步 · 或 A1.5 第 0 步发现缺失且项目有存量 UI） |
| **刷新** | 研发大改版后 / 距上次扫描 > 1 个月 / PM 主观"现在界面和基线对不上了" |

## 第 1 步：确定扫描范围

- 扫描目录 = `PROJECT-PROFILE.md § 五 端结构`里各**前端端**的 src/（纯后端项目不适用本 skill）；组件库目录 = 项目共享组件目录（如有）；pkg = 根 + 主要端的 package.json

```bash
python3 scripts/visual-baseline-scan.py \
  --dirs code/<仓库名>/<前端端1>/src code/<仓库名>/<前端端2>/src \
  --components-dir code/<仓库名>/<共享组件目录>/src \
  --pkg code/<仓库名>/package.json \
  --out /tmp/visual-baseline-result-$(date +%Y%m%d).json
```
- **先 `git rev-parse --short HEAD` 记录代码冻结点**（写进草稿头部 · P007 实证驱动）

## 第 2 步：跑脚本 + 核对摘要

脚本输出 JSON（机器留档 · 可复跑 diff）+ 终端摘要。核对摘要是否"像这个项目"（主色族/中性族应与肉眼印象一致）；明显异常（如 0 命中）先查扫描路径。

## 第 3 步：（仅刷新模式）drift 对比

与现有 visual-baseline 各清单登记值对比，产 drift 摘要表：

| 维度 | 判定 |
|---|---|
| 新色系 | family 在老基线"允许色系"外出现且频次 > 10 → 列出（研发引入了新颜色？） |
| 排名突变 | top 20 family-shade 排名变动 > 5 位 → 列出 |
| 组件增减 | 新组件 / 引用归零的组件 |
| 硬编码热点 | hex top 15 的新面孔（07-未token化热点候选） |
| 字号/间距/圆角 | 阶梯外新值 |

每条 drift 二选一问 PM（业务语言）：**基线过时该更新**（研发改版是对的 · 基线跟上）/ **代码漂移该登记**（基线是对的 · 走 log-diff-entry 登 DIFF 让研发收敛）。

## 第 4 步：整理 01~06 草稿

输出目录：`product-docs/visual-baseline/`（按 PROJECT-PROFILE § 七登记的视觉基线目录；**刷新时先把旧版 mv 到 `visual-baseline/_archive/<日期>/`，不覆盖**）。

每份头部必标：

```
> ⚠️ 自动提取 · 待 PM 确认 · 数据源 <json 路径> · 扫描 <N> 文件 @ commit <SHA> · <日期>
```

| 文件 | 从 JSON 哪些字段整理 | agent 要做的判断 |
|---|---|---|
| 01-颜色清单.md | `tw_color_family_shade` + `hex` + `rgb` | 按频次分类：中性 / 主色 / 语义色候选（红=危险绿=成功类）/ 品牌色候选（高频非 Tailwind 标准色的 hex） |
| 02-字号清单.md | `tw_text_size` + `css_font_size` | 项目字号阶梯 + 各档典型用途（抽 2~3 处实际代码确认用途） |
| 03-间距清单.md | `tw_spacing` + `css_px` + `rounded` + `shadow_size` | spacing 阶梯 + 圆角/阴影惯例（哪档是卡片默认） |
| 04-设计系统配置现状.md | —（Read 实物） | tailwind.config / 全局 css 变量 / 主题文件摘录 |
| 05-组件清单.md | `components` + `ui_deps` | 可复用组件 + 实际依赖 + **"不引"的 UI 库黑名单候选**（检出 tailwindcss 自建体系 → antd/mui 列入不引） |
| 06-token-候选推导.md | `hex` 全量 | HEX→最近 Tailwind class 速查表（≤5% 色差标"建议靠拢"；映射不上标"项目特有 token 候选"）+ 给 A1.5 的硬约束建议 |
| 07-未token化的硬编码热点.md（可选） | `hex_sample_files` | 高频硬编码 hex 的样例文件清单 |
| 08-交互最佳实践参考.md | **不自动生成**（行业沉淀非项目提取物；新项目从骨架模板拷通用版后人工校） | — |

## 第 5 步：🚦 PM 确认 Gate（草稿转正前强制）

待确认项用业务语言列给 PM（每项带数据出处）：

1. **品牌色判定**：`#XXX` 出现 N 次（样例文件 ...），是品牌色还是历史遗留该清理？
2. **主色/语义色**：主操作用 blue 系、危险用 red、成功用 emerald——对吗？
3. **允许色系白名单**：实测高频 = [...]；A1.5 将禁止引入此外的色系——名单对吗？
4. **字号/间距阶梯**：实测阶梯 = [...]；超出阶梯的设计将被打回——接受吗？
5. **偏差容忍**：硬编码色接近 Tailwind 标准色 5% 内是否一律建议靠拢？

PM 确认后：去掉"待 PM 确认"标 → 草稿转正式 → **00-调查方法.md 末尾 append 本次扫描登记**（日期/范围/文件数/commit SHA/模式初建或刷新/drift 处置摘要）。

## 硬约束

- ❌ 不修改任何源码（只读统计）
- ❌ 草稿未经 PM 确认不得作为 A1.5 事实源（"待 PM 确认"标记在则 A1.5 引用时必须向 PM 声明）
- ❌ 刷新模式不直接覆盖旧基线（先归档 `_archive/<日期>/`，保留可回溯）
- ✅ 每个结论带数据出处（频次 + 样例文件 · P007 实证驱动）
- ✅ 完成时第一句话：`[extract-visual-baseline 完成] 模式 = <初建/刷新>，扫描 <N> 文件 @ <SHA>，草稿 = <目录>，待 PM 确认 <M> 项<，drift <K> 条>`
