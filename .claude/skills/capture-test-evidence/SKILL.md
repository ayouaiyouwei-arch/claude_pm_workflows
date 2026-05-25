---
description: 用 cursor-ide-browser MCP 抓单条 case_id 的修复前后截图 + Network HAR + 可选 SQL 日志，归档到 evidence/<版本>/<case_id>/
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · capture-test-evidence

> 一句话定位：针对一条 `case_id`，按「修复前 → 操作 → 修复后」的相位用 cursor-ide-browser MCP 抓**截图 + Network HAR**，可选附加 SQL 校验日志，统一归档到 `test/evidence/<版本>/<case_id>/`。

## 触发条件

- `single-page-acceptance` 或 `browser-acceptance` 技能调用过程中需要抓证据
- 用户明确要求「抓 xxx 用例的修复前后截图」
- 验收报告完成前需要补齐证据链
- Playwright 跑批失败后人工复核需要重新抓证据

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| `case_id` | ✅ | `TC-SEC-001` |
| 当前生效基线 | ✅ | `B1.0.x` |
| 目标 URL | ✅ | `<前端地址，见 PROJECT-PROFILE.md § 六>/<端>/<页面>` |
| 验收账号角色 | ✅ | `dispatcher` |
| 阶段 | ✅ | `before` / `after` / `both` |
| 是否需要 SQL 日志 | 可选 | 是 / 否 |

## 工具

- **cursor-ide-browser MCP**：`browser_navigate` / `browser_snapshot` / `browser_take_screenshot` / `browser_network_requests`
- **可选**：手工在数据库里跑 SQL 查询，把结果文本附入 `<phase>.sql.log`

## 步骤

1. **基线 & 目录校验**
   - 确认 `test/evidence/<版本>/<case_id>/` 目录存在；不存在则创建
   - 在 `test/test-cases/<模块>.csv` 中确认 `case_id` 真实存在，读取 `evidence_required` 字段（screenshot / network / sql）
2. **环境校验**
   - 确认真实数据模式（非 Mock；开关见 PROJECT-PROFILE.md § 六）
   - 确认目标 URL 可访问
3. **before 相位**（如选 `before` 或 `both`）
   - `browser_navigate` 到登录页
   - 用环境变量 `QA_<ROLE>_USER` / `QA_<ROLE>_PASSWORD` 登录（**禁止明文粘贴密码到 chat**）
   - `browser_navigate` 到目标 URL
   - `browser_snapshot` 拿页面结构
   - `browser_take_screenshot` → 落 `evidence/<版本>/<case_id>/before.png`
   - `browser_network_requests` → 落 `evidence/<版本>/<case_id>/before.har`
   - 写一份 `before.meta.json`（URL / 时间 / UA / viewport / 角色）
4. **关键操作**（按用例 `steps` 字段）
   - 调 `browser_click` / `browser_fill` / `browser_select` 完成业务动作
   - 每一步操作前后取 `browser_snapshot` 防止 ref 失效
5. **after 相位**（如选 `after` 或 `both`）
   - `browser_take_screenshot` → 落 `evidence/<版本>/<case_id>/after.png`
   - `browser_network_requests` → 落 `evidence/<版本>/<case_id>/after.har`
   - 写一份 `after.meta.json`
6. **SQL 日志**（如需要）
   - 在数据库里跑 `SELECT ... FROM ... WHERE ...`
   - 把查询语句 + 结果以 plain text 落 `evidence/<版本>/<case_id>/after.sql.log`
7. **校验完整性**
   - 对照 `evidence_required` 字段：所选项的文件必须全部存在；缺任一项 → 流程失败 + 通知
8. **更新 `测试说明文档.md`**
   - § 三对应基线段落追加「`case_id` 证据已采集」一行

## 输出

```
test/evidence/<版本>/<case_id>/
├── before.png
├── before.har
├── before.meta.json
├── after.png
├── after.har
├── after.meta.json
└── after.sql.log（可选）
```

报告片段：

```md
## capture-test-evidence
- case_id: TC-SEC-001
- 基线版本：B1.0.x
- 阶段：both
- 角色：dispatcher
- 文件：
  - before.png / before.har / before.meta.json
  - after.png / after.har / after.meta.json
  - after.sql.log（含 SELECT alert.status,handled_by ...）
- 完整性校验：✅
```

## 禁止事项

- ❌ 在 chat 中明文输入测试账号密码
- ❌ 把证据写到非 `evidence/<当前基线>/<case_id>/` 路径
- ❌ 跳过 `evidence_required` 字段的强制校验
- ❌ 截图缺时间戳 / URL 元信息（必须落 `*.meta.json`）
- ❌ HAR 录制不全（必须含登录后的关键业务请求）
- ❌ SQL 日志含敏感个人信息（必须脱敏后再落盘）
