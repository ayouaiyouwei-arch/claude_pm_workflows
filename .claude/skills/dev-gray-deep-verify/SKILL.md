---
description: PM 端独立深度交互验证 dev 灰度环境功能落地。任何包升 .done 后（含 promote-deliverable / 手动追认）应跑一次，确认研发实现真的在 dev 灰度可用。
---

# Skill · dev-gray-deep-verify

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md · 由 /init-project 填充
>
> 一句话定位：升 .done 后，PM 端**独立**到 dev 灰度环境真 click 一次确认功能落地，不依赖研发回归脚本（其本地代码门常因 PM 机器环境挂）。

## 触发条件

- 包从 `.draft / .active → .done`（含手动追认 / promote-deliverable B-后置）
- 用户 `/dev-verify <包名>`
- 周期性 `/dev-verify --all-pending-done`

## 核心能力

### 1. 通用 UI 登录 helper

`lib/dev-login.cjs`：
- 抓 DOM 上的 captcha `<img>` → 解码 → 提取验证码 → 填表 → 提交
- 多平台支持（按项目实际平台数 · admin / big-screen / 其他端）
- 默认假设 captcha 是 **SVG 明文渲染**（`<text>` 标签内含明文）—— **如你项目 captcha 不是 SVG，改 `decodeCaptchaFromDataUrl` 为图片 OCR 或 API 登录+cookie 持久化**

### 2. 标准化 helper

`lib/deep-verify-helpers.cjs`：
- `shot(page, dir, name)` / `fullPageShot(...)` 截图归档
- `recordApiCalls(page, urlSubstr)` 录 API 请求 · 含 filter/count 工具
- `checkElements(page, queries)` 批量查 selector
- `extractTitleFonts(page)` 抓标题字体（视觉一致性证据）
- `startErrorCollector(page)` console error / pageerror 收集器

### 3. 每包 check 模板

`templates/package-check-template.cjs` —— 每个新包从这里派生：

```js
const PKG_CHECKS = [
  {
    pkg: '<包名>', name: '<中文功能名>',
    platform: 'admin',                                  // 你项目实际平台
    route: '/#/<你项目的路由>',
    elements: { keyEl: 'button:has-text(\"...\")', ... },
    expectApiPaths: ['/api/v1/your-endpoint'],
    customCheck: async (page) => ({ ... }),             // 可选 · 自定义检查
  },
];
```

## 项目接入（/init-project 完成后由 PM 配）

新项目首次用本 skill 前，要在 `PROJECT-PROFILE.md § 六 验收环境` 填好：
- dev 灰度 base URL
- 测试账号 + 密码
- 平台清单（你项目有哪些端 · 各自 base URL）
- captcha 类型（SVG 明文 / 图片 OCR / API 登录绕过 / 无验证码）—— 决定 `dev-login.cjs` 的实现

模板默认值是 robobus 项目的样板。**你项目实施时要替换** `lib/dev-login.cjs` 中的 captcha 解码逻辑 + 登录 URL 模式。

## 用法

```bash
# 方式 A · 命令式
node .claude/skills/dev-gray-deep-verify/templates/package-check-template.cjs

# 方式 B · 派生包专属 check
cp .claude/skills/dev-gray-deep-verify/templates/package-check-template.cjs \
   test/tools/e2e-scripts/pm-dev-tests/check-<包>.cjs
# 编辑 PKG_CHECKS 后跑
node test/tools/e2e-scripts/pm-dev-tests/check-<包>.cjs

# 方式 C · 命令编排（推荐）
/dev-verify <包名>
```

## 输出契约

```
/tmp/dev-deep-test/<timestamp>/
├── <包>-*.png            # 各步截图
├── <包>-fullpage.png
└── results.json          # 结构化结果（含 checks/apiRequestCount/consoleErrors 等）
```

## 接入升 .done 默认执行

- **手动追认 .done**（项目实际类似 P008 时）：插入"4.5 步：dev 灰度 smoke 验证（best-effort）"
- **promote-deliverable B-后置**：retrospect 落库后跑 `/dev-verify <PKG>`
- **CLAUDE.md 关键约束**：升 .done 后默认执行 · 失败不阻断仅写痕迹

## 不允许的事

- ❌ 拿 dev 验证失败当 .done 阻断（dev 灰度数据问题 ≠ 代码 bug · 仅信号）
- ❌ 在 commit 内泄露 token / 真账号密码（截图 + 日志归档到 evidence/ · 加 .gitignore）
- ❌ 用本 skill 跑生产环境（仅 dev 灰度）
- ❌ 假设所有项目 captcha 都是 SVG 明文（先验证你项目 captcha 类型）

## 你项目的本地化清单

接入本 skill 第一步：

- [ ] PROJECT-PROFILE.md § 六 填验收环境 + 账号
- [ ] 验证 dev 灰度 captcha 实现类型（看 `<img src="data:image/svg+xml..">` 是否是 base64 SVG）
- [ ] 如非 SVG，重写 `lib/dev-login.cjs::decodeCaptchaFromDataUrl`
- [ ] 验证登录后的 token 存储位置（localStorage key / sessionStorage / cookie）
- [ ] 列你项目的所有平台 + 路由模式 → 在 `dev-login.cjs` 加对应 helper（仿照 `loginAdmin` / `loginScreen`）
- [ ] 跑模板的样板 PKG_CHECKS 确认能登能截图
