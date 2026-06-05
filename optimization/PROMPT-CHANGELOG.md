# Prompt 变更日志（空 · /optimize-prompts 自动追加）

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
