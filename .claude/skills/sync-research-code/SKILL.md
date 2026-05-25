---
description: 在 code/ 下首次 clone 或日常 pull 研发仓库，并把同步信息写入「说明文档.md」进度记录
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · sync-research-code

> 一句话定位：把研发代码同步到本工作空间的 `code/<repo-name>/`，并完成同步留痕、OpenAPI 校验、基线引用复核。

## 触发条件

- 用户明确要求「同步代码」「拉取代码」「pull / clone 研发仓库」
- 用户提到 PROJECT-PROFILE.md § 二 登记的研发仓库需要拉取或更新（单仓 / 多仓按项目实际）
- 准备做接口契约校验、验收前发现 `code/` 为空或落后
- 在 `说明文档.md` 进度记录中查不到最近一次同步留痕（超过约定节奏）

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| repo-url | ✅ | 见 PROJECT-PROFILE.md § 二 Git 接入约定（代码仓库地址）|
| repo-name | ✅ | `<仓库名>` |
| target-branch | ✅ | **见 PROJECT-PROFILE.md § 二（拉取分支）**（如启用双向隔离，永远从拉取分支拉）|
| 是否首次 clone | ✅ | 是 / 否 |

## ⚠️ 拉取分支硬约束（每次 sync 前必读 · 仅当 PROJECT-PROFILE § 二 启用双向隔离时适用）

**拉**永远从 PROJECT-PROFILE.md § 二 约定的**拉取分支**拉 · **不要从推送分支（business 分支）拉**（那是 PM 推 business commit 的分支 · 可能含 PM revert / 半成品 · 不代表研发最新）。

若 PROJECT-PROFILE § 二 未启用双向隔离（单分支模式），直接按 § 二 约定的拉取分支 pull 即可。

> 本约束沉淀自实战 LOCKED 经验（sync 前误停在推送分支 · 差点把 PM revert commit 当成研发最新）· 相关模式见 knowledge/patterns/（项目实战沉淀）。

## 步骤

1. **读 `说明文档.md`**：确认是否已有同名仓库目录、上次同步的 commit、是否有未完成的任务依赖本次同步
2. **检查目录**：在 `code/` 下用 `ls` 确认 `<repo-name>/` 是否已存在
3. **首次 clone 分支**：
   ```bash
   cd code
   git clone <repo-url> <repo-name>
   cd <repo-name>
   git checkout <PROJECT-PROFILE § 二 拉取分支>   # 启用隔离时永远拉取分支 · 不准推送分支
   ```
4. **日常 pull 分支**（启用隔离时：先 checkout 拉取分支再 pull · 不依赖当前分支）：
   ```bash
   cd code/<repo-name>
   git fetch --all --tags --prune
   # 关键：显式 checkout 拉取分支 · 不假设当前分支正确
   git checkout <PROJECT-PROFILE § 二 拉取分支>   # 见 PROJECT-PROFILE.md § 二
   git pull --rebase
   # 自检（仅启用隔离时）：确认当前不在推送分支
   [ "$(git branch --show-current)" != "<PROJECT-PROFILE § 二 推送分支前缀>"* ] || { echo "❌ 隔离校验: 仍在推送分支 · 退出"; exit 1; }
   ```
5. **记录元信息**：执行 `git rev-parse --short HEAD` 拿 commit、`git status` 确认无脏改
6. **OpenAPI 校验**（仅后端仓库）：拉取后端 OpenAPI（如 `/v3/api-docs` 或 `target/openapi.json`，具体见 PROJECT-PROFILE.md § 五），检查可解析、关键路径仍存在
7. **编译 / 类型校验**（命令见 PROJECT-PROFILE.md § 五 构建命令）：
   - 后端：按 § 五 后端测试 / 编译命令
   - 前端：按 § 五 type-check 命令
8. **基线引用复核**：与 `baseline/02-PRD-实现差异台账.md` 中提到的接口、文件路径比对，发现失效立即新增差异条目
9. **回写说明文档**：在 `说明文档.md` 第三节追加同步记录（时间 + 仓库 + 分支 + commit + 校验结果）
10. **若发现破坏性变更**：触发 `log-diff-entry` 技能登记新差异

## 输出

```md
- [x] YYYY-MM-DD HH:mm 同步代码 code/<repo-name>
  - 仓库：<repo-url>
  - 分支：<branch>
  - commit：<short-sha>
  - 校验结果：OpenAPI ✅ / 编译 ✅ / 基线引用仍有效 ✅
  - 新增差异条目：DIFF-XXX（如有）
  - 备注：（如有）
```

## 禁止事项

- ❌ 禁止 `git push` / `git push --force`
- ❌ 禁止把多个仓库展平到 `code/` 根目录
- ❌ 禁止跳过 OpenAPI / 编译校验
- ❌ 禁止不写「说明文档.md」进度记录
- ❌ 禁止把研发代码内容粘贴到 `product-docs/`
