---
模式编号: P005
标题: dev 灰度端到端 smoke 验证（升 .done 后真环境功能确认）
首次发现: <项目实战中首次出现时填>
出现次数: 0（骨架自带 · 三层防护已内置 · 待本项目首战）
最近出现: -
关联agent: 无（PM 端独立动作）· 依赖 dev-gray-deep-verify skill
状态: active（防护已内置 · 待本项目验证）
---

# P005 · dev 灰度端到端 smoke 验证

> 🔧 骨架自带通用方法论。这是一条"升 .done 质保"模式——本文件记录"为什么有 dev-gray-deep-verify skill / /dev-verify 命令 / CLAUDE.md 关键约束 #7"。

## 描述

任何包升 `.done`（含手动追认 / promote-deliverable / /new-feature 第 9 步）后，**PM 端独立**到 dev 灰度环境 click 一次，确认研发实现真的在 dev 灰度可用。

## 为什么需要这个？（实战教训来源）

研发自带 per-package regression script 同时检查"代码健康"+"功能正确"：
- **代码健康**：`pnpm type-check` / `mvn test` / `pnpm build` / py-compile 等本地命令
- **功能正确**：浏览器实跑 + DOM/网络断言

**问题**：PM 机器不是完整研发机（缺 mvn / node 版本可能对不齐 / build deps 不全）→ 代码健康部分常挂 → 报告显示 100% FAIL → PM 误以为新包坏。

**实际**：browser proof 多数都通过，功能在 dev 灰度真的对。

→ **需要 PM 端独立链路**：只验"功能正确"（dev 灰度可见），不卡"代码健康"（PM 机器固有限制）。

## 已采取的对策（骨架内置 · 三层）

| 层 | 对策 | 落点 |
|---|---|---|
| **L1 工具能力** | `dev-gray-deep-verify` skill | `.claude/skills/dev-gray-deep-verify/`（含 lib/dev-login.cjs · lib/deep-verify-helpers.cjs · templates/）|
| **L2 一键编排** | `/dev-verify <包名>` command | `.claude/commands/dev-verify.md` |
| **L3 默认执行** | 集成到升 .done 流程 | promote-deliverable B-后置（推荐）· CLAUDE.md 关键约束 #7 |

## 核心技术解

### dev 灰度登录绕验证码（如适用）

许多 dev 环境 captcha 用 **SVG 渲染**，明文藏在 `<text>` 标签里：

```js
const b64 = src.replace(/^data:image\/svg\+xml;base64,/, '');
const svg = Buffer.from(b64, 'base64').toString('utf8');
const code = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]).join('').slice(0, 4);
```

→ Playwright 抓 captcha img → 解 SVG → 填表单 → 提交。无需图片 OCR。

⚠️ **本机制依赖项目 captcha 是 SVG 明文渲染**。新项目接入时**第一件事是验证**：
- 打开 dev 灰度登录页 → DevTools 看 captcha `<img>` 的 `src`
- 是 `data:image/svg+xml;base64,...` → 同款绕过可用
- 是普通图片 / hCaptcha / 无验证码 → **改 `lib/dev-login.cjs::decodeCaptchaFromDataUrl`**（OCR / API 直登 / 直接登录）

### 多平台支持

`lib/dev-login.cjs` 默认提供 `loginAdmin` + `loginScreen` 两个 helper（基于 robobus 实战）。你项目可能有：
- 1 个平台（如 SaaS 后台只一个 admin）→ 只用 `uiLogin` 通用入口
- N 个平台（如 admin + cockpit + h5）→ 仿照 `loginAdmin/loginScreen` 加 helper

## 出现过的包（按时间倒序）

| 日期 | 包 | 结果 | 关键发现 |
|---|---|---|---|
| `<本项目首次跑时登记>` | `<包>` | `<✅/⚠️/❌>` | `<...>` |

## 残余风险 / 仍未解决的子情况

- **selector 关键字不匹配**误判 fail：每包 check 文件的 elements 字典由 PM 实写（贴近实际命名）+ 必带 fullPage 截图给人复核兜底
- **dev 灰度数据空**导致功能链路触发不了（如"双击 vehicle marker 进 closeup" 需先有 marker）：⚠️ 标注但不阻断
- **captcha 偶尔识别错**：skill 自带 3 次重试（`maxRetries=3`）
- **token / 账号密码泄露**：截图 + 日志归档到 `evidence/` · 加 `.gitignore`

## 升格 / 降格条件

- **升格为 LOCKED**：连续 5 个 `.done` 包都正确跑了 dev 验证（含主动跑 + promote 自动跑）
- **降格为已规避**：dev 灰度自身有完整端到端 smoke 服务（GitOps + 自动验收报表）
- **降格为已废弃**：dev 灰度 captcha 升级为不可绕过的形式且无替代登录通道

## 给新项目的提示

骨架自带本能力。`/init-project` 配好 dev 灰度地址 + 账号到 `PROJECT-PROFILE.md § 六 验收环境` 后：

1. **第一步验证 captcha 类型**（见上）→ 必要时改 `dev-login.cjs`
2. 任何包升 `.done` 时跑 `/dev-verify <PKG>`
3. 每个新包配套写 `test/tools/e2e-scripts/pm-dev-tests/check-<PKG>.cjs`（从模板派生 · 改 PKG_CHECKS）
4. 验证结果归档到包内 `evidence/dev-verify-<日期>.json` + 截图
