---
description: （可选·研发自测层）以 code/<repo>/v3/api-docs OpenAPI 为事实源，对实时 HTTP 响应做契约漂移核查（路径/字段/枚举/分页/状态码偏差），输出 reports/<版本>/api-contract-diff.md。非核心 PM 验收环——独立验收走 run-acceptance-suite → acceptance-regression。
---

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

# Skill · api-contract-test（可选 · 研发自测层）

> ⚠️ **定位：可选的研发侧契约核查，不在核心 PM 验收主线上。** 按 `acceptance-regression § 一` 的分工，契约/单元测试属"研发自测"；PM 流水线的独立验收主线是 `run-acceptance-suite` → `acceptance-regression`（黑盒 + 真实环境）。本 skill 仅在以下场景作为**补充**启用：研发未做契约测试、或 PM 侧需要主动核查后端 OpenAPI 与实际响应的漂移。
>
> 一句话定位：以 `code/<仓库名>/v3/api-docs` OpenAPI（后端 OpenAPI 入口见 PROJECT-PROFILE.md § 五）为事实源，对**实时 HTTP 响应**（用 curl / Node fetch / Playwright `request` context 探测，工具无关）比对请求 / 响应 / 字段 / 枚举 / 分页 / 状态码，输出**契约偏差报告**。发现的 `blocker` / `critical` 偏差自动登记为 `DIFF-XXX`（type=`API_CONTRACT`）。

## 触发条件

- 用户明确要求「跑契约对比 / API 偏差核查」
- 同步代码（`sync-research-code` 技能）后，研发侧无契约测试时补做
- 后端发布新接口或字段变更后，PM 侧主动核查

## 输入

| 输入 | 是否必填 | 示例 |
|---|---|---|
| 当前生效基线 | ✅ | `B1.0.x` |
| OpenAPI 来源 | ✅ | 拉取 `http://localhost:8080/v3/api-docs` 或既有 `reports/<版本>/openapi.json` |
| 探测环境 | ✅ | `Local` / `Staging`（真实后端地址，见 PROJECT-PROFILE § 六）|
| 报告输出位置 | ✅ | `test/reports/<版本>/api-contract-diff.md` |

## 工具

- **OpenAPI 拉取**：`curl <后端 OpenAPI 入口，见 PROJECT-PROFILE § 五> > openapi.json`（启动后端后）
- **HTTP 探测**（工具无关，任选其一）：`curl` / Node `fetch` 脚本 / 复用 `test/tools/e2e-scripts/` 的 Playwright `request` context（已带登录态 fixture，最省事）
- **解析**：Node `openapi-types` / `yaml` / `jsonpath` 或纯文本对比

## 步骤

1. **基线锁定 + 目录校验**
   - 确认 `test/reports/<版本>/` 目录存在
2. **OpenAPI 拉取并归档**
   - 启动后端（启动命令见 PROJECT-PROFILE.md § 五，如 Java 的 `./mvnw -B spring-boot:run`）
   - `curl <后端 OpenAPI 入口，见 PROJECT-PROFILE § 五> > test/reports/<版本>/openapi.json`
   - 校验 JSON 可解析、`paths` 段非空
3. **确定待核查端点清单**
   - 端点清单 = OpenAPI `paths` ∩ `test-cases/<模块>.csv` 涉及的接口（聚焦本期/本基线相关接口，不必全量）
   - 对每个端点准备一组探测请求（method / path / 必要 query / body / 登录态）
4. **路径对比（Path Drift）**
   - OpenAPI 中存在但清单缺：登记为「用例缺失」（提示补验收用例）
   - 实际可访问但 OpenAPI 缺：登记为「OpenAPI 缺失」（提示后端确认）
   - 两侧路径模板不一致（如 `/orders/{id}` vs `/orders/{orderId}`）：登记为「path drift」
5. **字段对比（Field Drift）**
   - 用 HTTP 探测拿真实响应
   - 对照 OpenAPI 的 `responses.200.content.application/json.schema`
   - 字段命名不一致 / 类型不一致 / 必填不一致 → 登记
6. **枚举对比（Enum Drift）**
   - OpenAPI 字段标注的 `enum` 与真实响应中出现的枚举值集合差异 → 登记
   - 大小写差异（如 `in_service` vs `IN_SERVICE`）→ 登记
7. **分页对比**
   - `pageNum` 起始（1-based vs 0-based）
   - `pageSize` 上限
   - 响应结构（`{list,total,pageNum,pageSize}` vs 其他）
8. **状态码对比**
   - OpenAPI `responses` 声明 vs 真实响应状态码
9. **错误结构对比**
   - 全局响应包装是否一致（`{code,message,data,traceId}`）
10. **偏差等级**
    - **blocker**：路径缺失 / 字段类型错 / 状态码错 → 阻塞发布
    - **critical**：枚举大小写错 / 必填字段缺 → 必须修复
    - **major**：字段命名不规范 / 错误结构不一致 → 1 周内修复
    - **minor**：注释 / 描述不一致 → 下个 minor 修复
11. **报告输出**
    - 按下方「输出」结构写到 `test/reports/<版本>/api-contract-diff.md`
12. **联动登记**
    - 每条 `blocker` / `critical` 调 `log-diff-entry` 技能登记 `DIFF-XXX`（type=`API_CONTRACT`）
    - 在 `执行清单.csv` 把对应 `case_id` 标 `result=fail`，`notes` 引用 `DIFF-XXX`
13. **更新 `test/测试说明文档.md`**
    - § 三对应基线段落追加「契约对比完成，blocker N、critical N、major N、minor N」

## 输出

```md
## api-contract-test 报告
- 基线版本：B1.0.x
- OpenAPI snapshot：reports/<版本>/openapi.json（commit 2f44d0a）
- 探测环境：Staging（真实后端地址）
- 偏差汇总：blocker N、critical N、major N、minor N
- 新增 DIFF-XXX：DIFF-007, DIFF-008（API_CONTRACT 类）
- 报告文件：reports/<版本>/api-contract-diff.md
- 退出标准：blocker = 0 → ✅ / ❌
```

## 禁止事项

- ❌ 不拉 OpenAPI 直接探测（缺事实源）
- ❌ 用 mock / dev server 的响应冒充真实契约（必须打真实后端）
- ❌ blocker 偏差不登记 `DIFF-XXX`
- ❌ 把 OpenAPI snapshot 写到非 `reports/<当前基线>/` 目录
- ❌ 跨基线版本复用 OpenAPI snapshot
- ❌ 不更新 `test/测试说明文档.md` § 三
