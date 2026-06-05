# Prompt 变更日志（空 · /optimize-prompts 自动追加）

## 2026-06-05 · P020 + P021 LOCKED · 可渲染必可验证 + 跨端数据流契约（通用方法论 · 实战命中后合并）

- **触发源**：地图渲染缺陷复盘（选中不聚焦 / 缩放拖拽不顺 / 只画点不画线 + 编辑端保存几何零用例）。根因 = 渲染输出在 canvas/验收 Mock/截图三条路都无可断言抓手（**渲染不可验证**）+ 编辑端存几何进 `payload:unknown` 黑盒、展示端不读而用别的字段重建（**跨端写读两套**）。
- **新增 LOCKED pattern**：`P020-可渲染必可验证.md` + `P021-跨端数据流契约.md`
- **改动 agent + 版本**：
  - product-expert v1.2 → **v1.3**（§ 2.u P020 渲染契约表 + § 2.v P021 跨端数据流契约表）
  - tech-architect v1.1 → **v1.2**（"Codex 一次读懂"检查项 #8/#9 + 2 条硬约束 ❌）
  - test-case-author v1.1 → **v1.2**（配额表 `[MAP]` 行 + `[MAP]` 渲染可验证 LOCKED 段 + 完成话术）
  - visual-spec-author v1.0 → **v1.1**（视觉规范模板 § 七点五 地图/canvas 渲染态契约）
  - `knowledge/patterns/P013-*.md`（用户灰度 5 分钟补地图固定动作 M1~M5）
- **四层收口**：L3 需求(A1 契约表)+L3 方案(A3 方案无效门槛)+L2 测试(A6 `[MAP]` DOM 断言取代不可靠截图 / A1.5 demo 落 data 钩子)+L4 灰度机制(P013 M1~M5)
- **同步来源**：robobus 主仓 patch-008（主仓 pattern 编号 P031/P032 · 骨架泛化为 P020/P021）
