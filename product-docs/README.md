# product-docs 说明（文档命名空间 + 修改边界）

> 🔧 项目无关骨架版 · 接入后由 `/init-docs` 充实 `00-产品全景.md` 与各模块 6 件套。

## 一、命名空间（对齐 CLAUDE.md 第 13 条 · 引用必须带路径）

| 路径 | 性质 | 编号体系 | 谁产出 |
|---|---|---|---|
| `product-docs/00-产品全景.md` | 全局总览（信息架构 + 端到端主流程 + 模块索引 = **全端巡检对象**） | 全局 | `/init-docs` |
| `product-docs/01-角色权限矩阵.md` | 角色 × 页面/操作 矩阵（acceptance-regression + [DT] 用例输入） | 全局 | `/init-docs` |
| `product-docs/modules/M0X-<模块名>/` | **存量现状** 6 件套（长期演进） | **每模块独立编号 01~07** | `/init-docs` Gate D1/D2 |
| `product-docs/baseline/` | 基线版本登记 / PRD-实现差异台账 / 产品变更登记 / 刷新清单 | 基线独立编号 | `publish-baseline` |
| `product-docs/visual-baseline/` | 视觉基线（调查方法 + 交互最佳实践） | 视觉独立编号 | `extract-visual-baseline` |
| `product-docs/_drafts/` | **单需求过程稿**（/new-feature 中间产物 · 用完即弃） | 需求局部编号 | `/new-feature` agent |

> 三套编号各自独立：`modules/`（存量现状）≠ `_drafts/`（过程稿）≠ `deliverables/*/`（交付包冻结快照）。**禁止裸说"02 文档"，引用必须带完整路径。**

## 二、修改边界

- 本工作空间**从不修改 `code/`**——`code/` 是从研发拉的只读快照。
- `00-产品全景` / `modules/` / `baseline/` 是 `/new-feature` 流水线的**上游事实源**，只能由 `/init-docs`、`publish-baseline` 这类收口入口按 append-only / 演进记录方式更新，不在需求过程中随手改。
- 模块 6 件套的"现状即事实"铁律：只写系统实际行为（P007 实证 · 出处带 `文件@SHA`）；"觉得不该这样"的进 `07-待裁决` 或升 `baseline/02-PRD-实现差异台账`。
