# Prompt 变更日志（空 · /optimize-prompts 自动追加）

## 2026-06-10 · patch-011 · 知识库治理（主仓同步 · 消费断链修复 + 生命周期 + 编号映射）

- A1 v1.5 / A3 v1.3 / A6 v1.3：必读段接线 query-knowledge（历史案例检索必跑 · 不再"只写不读"）
- query-knowledge SKILL：状态匹配 bug 修复（case 模糊：active/LOCKED=活跃 · dormant=休眠不返回）+ 产出尾部图谱需求积累引导
- `knowledge/README § 一.5`：热温冷知识生命周期（晋升/降级标准 + active⇄dormant 状态机 · 降级 PM 拍板）；`/optimize-prompts` 第 0.5 步月更降级检查；`pipeline-evaluator` 周报 dormant 候选提示
- 新建 `knowledge/patterns/_编号映射.md`：主仓↔骨架编号唯一互译权威（同步 patch 照表机械替换）；CLAUDE.md P007 撞号段加注澄清（与 patterns/P007 是两条规则）
- `_模式模板.md` 状态规范值改 active/dormant

## 2026-06-10 · patch-010 · 视觉基线自动提取 + 风格选型（主仓同步 · "自动适配项目风格"补全）

- 新建 `scripts/visual-baseline-scan.py`：扫前端代码统计真实用色/字号/间距/圆角阴影/组件引用/UI 依赖（主仓 dogfood 验证口径）
- 新建 `extract-visual-baseline` skill：初建/刷新两模式 · drift 对比 · 草稿强制标"待 PM 确认 + commit SHA" · PM 确认 Gate 5 项业务语言 · 刷新先归档不覆盖
- `init-project` 第 2.4 步：检测前端 → 自动提取视觉基线（第 3 步 D 块 / 第 4 步 Gate 确认 / 第 5 步 4.5 写入 + § 七回填）——兑现 A1.5 "由 /init-project 生成"的承诺；纯后端跳过
- `visual-spec-author` v1.2 → **v1.3**：第 0 步基线存在性检查四分支（缺失但有存量 UI = 禁止跳过直接发挥 · 必须先提取）+ § 0.5 风格选型子流程（Gate 1.5-style：候选风格 mini demo 截图 → PM 看图拍板 → 固化沿用）
- 效果：① 基线可刷新 ② 新项目 init 即贴真实风格 ③ 全新项目看图选一次风格后自动沿用

## 2026-06-10 · patch-009b · 方法论卡片内置快照（主仓同步 · 流水线自包含）

- 新建 `knowledge/methodology/`：30 张设计方法论卡片快照（heuristic-evaluation / critique-* 三件套 / user-flow-diagram / error-handling-ux / form-design / data-visualization / ui-ux-pro-max / emil-design-eng 等 · 含 README 清单与 license 注记）
- A1 v1.4 / A2 v1.1 / A1.5 v1.2 内 8 处卡片路径改降级链：项目内 `knowledge/methodology/<name>.md` → 兜底 `~/.claude/skills/<name>/SKILL.md` → 缺失跳过
- README 双语小节改"内置：设计方法论卡片（克隆即用 · 零安装）"
- 卡片为快照不自动跟源；公开分发前确认原始 skill 集 license（README 已注记）

## 2026-06-10 · patch-009 · 设计方法论 skill 融入 A1/A1.5/A2 + Loop 工程（主仓 patch-009 同步）

- **触发源**：主仓引入用户级设计方法论 skill 集（`~/.claude/skills/` 下约 20 张卡片：heuristic-evaluation / critique-* / user-flow-diagram / error-handling-ux / ux-writing 等），并为流水线头部补三个自评/闭环 Loop（对齐尾部 A6→A7 双层模式）。
- **决议**：方法论 = 按需 Read 的"行业最佳实践层"——降级条款（缺卡跳过不阻塞）+ 项目事实源永远赢 + 转述 PM 走 P015 业务语言；A2 第 11 项可用性快扫 = **软闸**（可用性取舍是产品决策 · AI 亮问题、PM 拍板，不参与打回）。
- **Loop 工程五原则**（一句话）：事件驱动非定时 / 硬上限（Loop-1 1 轮 · Loop-3 ≤ 2 轮 · /iterate-A2 ≤ 2 轮）/ 新问题即停 / 决策类升 PM 不自转 / 全程留痕可抽查（§ 〇.7 残留表 + self-critique.md）。
- **改动文件 + 版本**：
  - product-expert v1.3 → **v1.4**（设计方法论库 9 行触发表 + § 3.5 定律依据补充 + § 4.1 JTBD 注 + § 4.2 流程三段式 + § 4.3 ux-writing 注 + § 4.4 五态 checklist + § 6.5 Loop-1 自走查 + § 〇.7 残留表）
  - requirement-reviewer v1.0 → **v1.1**（第 11 项可用性启发式快扫·软闸 + 结论三态 + P1 分诊标注【形式类/决策类】）
  - visual-spec-author v1.1 → **v1.2**（设计方法论库：基础 5 卡 + 层级三问 + 类型触发卡 + 丙档 2 卡；§ 2.35 Loop-3 demo 自评循环；§ 2.6 Loop-4 before/after 对比图）
  - new-feature.md（Gate 1.5b 附 Loop-3 自评摘要 + 第 2 步 A2 三分支：打回按分诊推荐 /iterate-A2 · 通过带警告强制亮 PM 三选一处置）
  - **新增** `.claude/commands/iterate-A2.md`（Loop-2 · A2 打回自动闭环 · 最多 2 轮 · 决策类先升 PM）
- **编号泛化**：主仓 P026/P027/P029/P030/P023 → 骨架 P014/P015/P018/P017/P011；skill 路径统一 `~/.claude/skills/`（缺失自动跳过，不阻塞流水线）。

## 2026-06-05 · P020 + P021 LOCKED · 可渲染必可验证 + 跨端数据流契约（通用方法论 · 实战命中后合并 · v2 终版）

- **核心立场**：渲染缺陷是**验收盲区，不是需求没写清** → 防御火力在**测试用例 + 验收流水线**，不在 A1/A3 拦截需求/方案设计。（初稿曾在 A1/A3 加设计阶段硬闸，当日纠偏撤掉。）
- **触发源**：地图渲染缺陷复盘（选中不聚焦 / 缩放拖拽不顺 / 只画点不画线 + 编辑端保存几何零用例）。根因 = 渲染输出在 canvas/验收 Mock/截图三条路都无可断言抓手（**渲染验收盲区**）+ 编辑端存几何进 `payload:unknown` 黑盒、展示端不读而用别的字段重建（**跨端写读两套**）。
- **新增 LOCKED pattern**：`P020-可渲染必可验证.md` + `P021-跨端数据流契约.md`（测试/验收中心版）
- **改动 agent + 版本**：
  - product-expert v1.2 → **v1.3**（§ 2.u 渲染元素清单**轻量输入·非硬闸** + § 2.v 跨端识别·只留"非同源→问 PM"产品决策）
  - tech-architect v1.1 → **v1.2**（**撤** #8/#9 设计硬闸 → §6.4 一句"建议带测试钩子"，非否决项）
  - test-case-author v1.1 → **v1.2**（`[MAP]` 加厚=火力重心 + P021 round-trip 用例 + 钩子缺失=test-blocker）
  - visual-spec-author v1.0 → **v1.1**（视觉规范模板 § 七点五 地图/canvas 渲染态契约）
  - `knowledge/patterns/P013-*.md`（用户灰度 5 分钟补地图固定动作 M1~M5）
- **验收流水线（核心落点）**：L2 skill `~/.claude/skills/acceptance-regression/SKILL.md` 新增 § 九 `@map` overlay 断言方法论（真实 DOM `data-*`·禁截图·钩子缺失=test-blocker）+ `@map` tag
- **三层收口**（撤设计闸后）：L2 测试(A6 `[MAP]`+round-trip DOM 断言 / A1.5 demo 落 data 钩子) + 验收流水线(acceptance-regression `@map`) + L4 灰度(P013 M1~M5)；设计阶段只留 A1 跨端"两端是否一致"问 PM 这一产品决策
- **同步来源**：robobus 主仓 patch-008 v2（主仓 pattern 编号 P031/P032 · 骨架泛化为 P020/P021）
