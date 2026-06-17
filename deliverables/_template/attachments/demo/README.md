# attachments/demo · UI 类需求专属目录

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> 本目录是给"含视觉规范的需求"准备的 demo 落盘位置。**仅 UI 类需求触发时由 A1.5 视觉规范专家在 _drafts 阶段生成**，打包到 .draft 包时整目录复制过来。

---

## 一、目录约定

```
attachments/demo/
├── README.md                  ← 本文件（来自 _template）
├── index.html                 ← 主 demo（单文件零依赖，浏览器双击可开）
├── index-<其他断点>.html      ← 多断点（如有；常见 1280 / mobile）
├── qa-log.md                  ← A1.5 第 1 轮 Gate 1.5a 含糊点答疑归档
└── screenshots/
    ├── baseline-default.png   ← Playwright 自检截图（默认断点，按项目主分辨率，例 1440 × 900）
    ├── baseline-<断点>.png    ← 多断点截图
    └── baseline-<状态>.png    ← 5 态截图（success / loading / empty / error / permission）
```

**非 UI 类需求**：本目录保留为空（仅本 README 在），打包时**保留空目录**也可（让目录约定一致）。

---

## 二、demo 形态硬约束（A1.5 必遵守）

| 项 | 要求 | 反例（违规） |
|---|---|---|
| 形态 | 单文件 HTML + 内嵌 `<style>` + 必要时内嵌 `<script>` | ❌ 多文件、引外部 CSS、引 React |
| 依赖 | **零依赖**（不引 CDN / npm / Tailwind / 图标库） | ❌ `<script src="https://cdn.tailwindcss.com">` |
| 图标 | SVG inline 或 emoji 占位 + 注释标"实施时换项目图标库 `<XxxIcon>`" | ❌ 引图标库 CDN |
| 数据 | mock 真实数据（"列表有 8 条"就渲 8 行） | ❌ "..." 省略 |
| 交互 | 仅静态视觉态切换（hover / active / disabled），不接 API | ❌ 真实 fetch |
| 注释 | 每段 `<style>` 上方标"对应 Tailwind class / token 名" | ❌ 裸 hex 无注释 |

详见 `.claude/agents/visual-spec-author.md § 工作流程 § 2.1 产 HTML demo`。

---

## 二.5、交互覆盖清单（**A1.5 必须演示**）

> 本节是 demo 的"交互完整度"硬指标。详细 18 条 + 项目内例子 + 反例见 [`product-docs/visual-baseline/08-交互最佳实践参考.md`](../../../../product-docs/visual-baseline/08-交互最佳实践参考.md)。

### 触发分级

| 需求类型 | 必演示数量 |
|---|---|
| **新增页面 / 整页布局重构** | **必含 10 全覆盖** |
| **单组件视觉重构** | 必含 10 中至少 **6 条**（按组件类型选） |
| 非 UI 类需求 | 跳过本节 |

### 必含 10 条速查

```
1.  hover 态           — :hover / hover:bg-* / hover:border-*
2.  active 态          — active:scale-* / active:bg-*
3.  focus ring         — focus-visible:ring-2 focus-visible:ring-blue-500/40
4.  disabled 态        — disabled:opacity-50 disabled:cursor-not-allowed
5.  loading 态         — skeleton / animate-pulse / spinner
6.  empty 态           — 图标 + 文案 + 引导操作（不只是"暂无数据"）
7.  error 态           — 错误图标 + 文案 + 重试按钮
8.  长文本 truncate    — truncate + 父级 min-w-0 + title={fullText}
9.  键盘操作           — Enter 提交 / Esc 关闭 / Tab 焦点循环
10. 过渡动画           — transition-all duration-200 ease-in-out
```

### 推荐 5 条（按需）

```
11. 暗色模式（@variant dark / prefers-color-scheme）
12. 移动端响应式（sm: / md: / lg:）
13. 数据 "new" 高亮（animate-pulse 1.5s 后 remove）
14. tooltip / popover（title 属性最简）
15. 空数据"引导插画"（不要光文字）
```

### 自检命令（A1.5 第 2 轮起包前必跑）

```bash
DEMO=attachments/demo/index.html

echo "=== 必含 10 条覆盖检查 ==="
echo "1.  hover:"        ; grep -E ':hover|hover:'        $DEMO | wc -l
echo "2.  active:"       ; grep -E ':active|active:'      $DEMO | wc -l
echo "3.  focus ring:"   ; grep -E 'focus|outline'        $DEMO | wc -l
echo "4.  disabled:"     ; grep -E 'disabled|cursor-not'  $DEMO | wc -l
echo "5.  loading:"      ; grep -E 'loading|skeleton|animate-pulse' $DEMO | wc -l
echo "6.  empty:"        ; grep -E 'empty|暂无|未找到'    $DEMO | wc -l
echo "7.  error:"        ; grep -E 'error|失败|错误|重试' $DEMO | wc -l
echo "8.  truncate:"     ; grep -E 'truncate|min-w-0'     $DEMO | wc -l
echo "9.  键盘操作:"     ; grep -E 'onkeydown|tabindex|Esc|Enter' $DEMO | wc -l
echo "10. 过渡动画:"     ; grep -E 'transition|duration-' $DEMO | wc -l
```

新增页面：每项必须 ≥ 1。单组件重构：至少 6 项 ≥ 1。

> 自检不过 = A1.5 第 2 轮 self-check failed → 主对话回 A1.5 补完后再 Gate 1.5b。

---

## 三、Codex 在 .active 阶段如何使用

> Codex 在阅读 `00-给Codex的导读.md` 时如果发现包内 `01.5-视觉规范.md` 存在，则自动按以下规则使用本目录：

1. **demo 是 100% 事实源**（`01-需求范围与边界.md § 六 demo 铁律`）；含糊处问 PM 不要发挥
2. **token 引用以 `01.5-视觉规范.md § 一/二/三` 为准**；demo 内的 hex / px 仅作视觉参考，最终代码用 Tailwind class 或 token
3. **截图基线（baseline-*.png）由测试 / Playwright 在验收阶段做对比**（`06-验收标准.md § 视觉门槛 V1 截图相似度 ≥ 98%`）
4. **不允许 Codex 改本目录任何文件** —— 这是冻结的视觉事实源；要改请走 PM 另起轮次

---

## 四、qa-log.md 格式（A1.5 第 1 轮答疑归档）

```md
# Visual Spec Q&A Log

## 第 1 轮（YYYY-MM-DD HH:mm）

### 含糊点 1：<标题>
- 段落定位：<原始材料的哪一段>
- 我的解读 A：<...>，依据：<...>
- 我的解读 B：<...>
- PM 答：<A / B / 其他>

### 自行发挥 1：<标题>
- 项：<...>
- 默认决定：<...>
- 是否同意：<...>
- PM 答：<...>

## 第 2 轮 调整记录（如 Gate 1.5b PM 选 B）
- ...
```

> 此日志在 .active 阶段仍可读，方便 Codex 理解"为什么是这样设计"。
