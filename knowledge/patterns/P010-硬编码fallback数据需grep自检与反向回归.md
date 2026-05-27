---
模式编号: P010
标题: 硬编码 fallback 数据源需 grep 自检 + 反向回归用例（A1 漏 = A3/A5/A6 全漏）
首次发现: 2026-05-27
出现次数: 1（实战首次）
最近出现: 2026-05-27
关联agent: product-expert / tech-architect / test-case-author / test-case-reviewer
状态: active（已 LOCKED · 通用方法论 · 不等第 2 次复现）
---

# P010 · 硬编码 fallback 数据源需 grep 自检 + 反向回归用例

## 描述

现有代码常含 `ROUTE_DATA = {...}` / `MOCK_VEHICLES = [...]` / `DEFAULT_CONFIG = {}` 等**硬编码兜底数据**。改动相关功能时若 A1 § 二现状梳理漏 grep 这类数据源 → A3 复用扫描沿用 A1 范围继续漏 → A5 LOCKED G 门生成时也漏 → A6 用例缺反向回归（A→B→A 模式）→ Codex 严格按文档实施，**单向逻辑通过 + 反向场景静默失败**。

**反向回归用例的关键意义**：A→B→A 模式不仅验证"切到 B 是否正确"·更验证"再切回 A 时数据 / 视图 / 副作用是否还在初始状态"·这是检测"fallback 失败 + 静默 return"类 BUG 的唯一可靠手段。

## 触发场景

任一命中即触发本模式硬约束：

1. 需求触及 **地图渲染 / 数据展示 / 模拟器 / mock 数据回放** 类需求
2. 需求含 "切换 / 筛选 / ID 变化 / 用户身份切换 / 模式切换"

## 已采取的对策

| 改动文件 | 改动锚点 |
|---|---|
| `.claude/agents/product-expert.md` | § 2.x P010 LOCKED · 硬编码 fallback grep 自检 |
| `.claude/agents/tech-architect.md` | § 四定量指标新增"已识别 fallback 数量"列 + P010 LOCKED 强约束 |
| `.claude/agents/test-case-author.md` | § 反向回归专属约束 LOCKED + `[REGRESSION-REVERSE]` 标签 |
| `.claude/agents/test-case-reviewer.md` | Pass2 新增 `[REGRESSION-REVERSE]` 触发判定脚本 LOCKED |

## 残余风险 / 仍未解决的子情况

- grep 命令 `_DATA\s*=|MOCK_|HARDCODED|fallback.*=.*\[|FALLBACK_|DEFAULT_.*=.*\{` 是经验性 · 可能漏一些罕见命名模式（如 `OFFLINE_*` / `STATIC_*`）· 需后续观察
- 反向回归 `A→B→A` 三层验证（渲染/状态/副作用）目前仅靠 A6 自觉 · 未做静态校验工具

## 升格 / 降格条件

- **保持 LOCKED**：连续 5 个 `.done` 包都执行了 P010 grep + 反向回归 → 已成习惯
- **降格为已规避**：连续 10 个 `.done` 包未再出现"切场景后失败"类 BUG
- **不会降格为已废弃**（P010 是流水线根本盲区 · 不依赖具体 agent）

## 关联资源

- 反例：用 `[EG]` 单向验证 · 应升 `[REGRESSION-REVERSE]`
- 与 P011（视觉规范禁模糊）/ P012（数据层过滤 UI 联动）同期沉淀
