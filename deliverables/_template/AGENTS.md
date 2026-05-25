# AGENTS.md · 本交付包级研发 AI 入口

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> 本文件由 Codex 自动加载（cwd = 本包根）。如果你（研发 AI）正在读这段文字，说明你已 cd 进了一个研发交付包——开干前请按下面 5 步走。

---

## 第 1 步：确认你在唯一 active 包内

```bash
cd ..
ls | grep '\.active$' | wc -l   # 必须 = 1
ls | grep '\.active$'            # 应该是当前包名
cd -
```

如果不是 1，或者当前包不是 `.active` 状态（例如你被错误地放到了 `.draft / .done / .superseded` 包里），**立即停手**，向用户报告。

---

## 第 2 步：6 条铁律（不允许任何例外）

1. **单 active 强制**：见第 1 步
2. **物理隔离**
   - ✅ 可读 + 可写：本包内全部文件（除 § 四注明的冻结文件）+ `code/` 白名单文件
   - ✅ 可读 + 不可写：`test/tools/` 与 `test/test-cases/`（用例脚本与 CSV，跑测试需要）
   - ❌ 禁止主动 read / grep：`product-docs/`、`test/` 其他子目录、`deliverables/archive/`、其他 `.draft/.done/.superseded` 包、`_template/`
3. **必读文件**：按 `00 → 99 → 01 → 01.5（如存在）→ 02 → 03 → 04 → 05 → 06 → 07 → 08` 全读完才能动 `code/`
4. **白黑名单**：`code/` 改动 **100%** 在 `01-需求范围与边界.md § 三` 内 + **0** 命中 `§ 四`
5. **留痕**：每轮代码改动后必须在 `08-修复历史.md` 末尾追加 `[ROUND-N]` 段；不写 = 提交无效
6. **视觉契约**（仅 UI 类需求 · 包内含 `01.5-视觉规范.md` 与 `attachments/demo/` 时）：demo 是 100% 事实源；px 偏差硬指标（字号 = 0 / 间距 ≤ 2 / 圆角 = 0）；token 引用不允许写死 hex；含糊处问 PM 不要自由发挥；5 态实现完整覆盖。详见 `01-需求范围与边界.md § 六.5 视觉契约铁律`。

---

## 第 3 步：强制阅读顺序（不允许跳过、不允许换序）

| 序 | 文件 | 你要带走的关键信息 |
|---|---|---|
| 1 | `00-给Codex的导读.md` | 6 铁律详解 + 提问规则 + 越界处置 |
| 2 | `99-状态.md` | 包当前真实状态、owner、最后变更时间 |
| 3 | `01-需求范围与边界.md` | 改什么 / 不改什么 / 灰色区域 / 读权限白名单 / **§ 六.5 视觉契约铁律** |
| 3.5 | `01.5-视觉规范.md`（**仅 UI 类需求** / 文件不存在则跳过） | demo 路径 + 配色 / 字号 / spacing / 组件 / 5 态映射 + 给 Codex 的提示 |
| 4 | `02-基线快照.md` | 基线版本 + commit SHA + 相关 DIFF/CHG |
| 5 | `03-PRD片段.md` | 本次需求事实源（不去看主 PRD） |
| 6 | `04-接口契约.md` | API + 字段 + 错误码 + 契约漂移处理 |
| 7 | `05-用例清单.md` | 必过 case_id 子集 + **§ 四 本期用例增删改登记** |
| 8 | `06-验收标准.md` | 9 项硬检查 + 证据要求（UI 类需求 + 5 项视觉门槛 V1-V5）|
| 9 | `07-时间与里程碑.md` | 截止 + 依赖 |
| 10 | `08-修复历史.md` | 历史 ROUND/QUESTION/ANSWER/BUG/FIX |

---

## 第 4 步：本包的"冻结快照"清单（不许动）

下列文件是 PM 起包瞬间冻结的事实快照，**禁止修改**：

- `02-基线快照.md`
- `03-PRD片段.md`
- `04-接口契约.md`
- `05-用例清单.md` § 一/二/三/四
- `test-cases-snapshot/` 整个子目录（含 CSV、字段说明、方法论）
- **`01.5-视觉规范.md`（仅 UI 类需求）** —— 含 demo 路径 + 5 张表（配色/字号/spacing/组件/断点）
- **`attachments/demo/`（仅 UI 类需求）** —— 含 `index.html` + `screenshots/baseline-*.png` + `qa-log.md`

如发现快照与上游真实情况冲突 → 写到 `08-修复历史.md` 的 `[CONTRACT-DRIFT-N]` / `[BASELINE-DRIFT-N]` 段，等用户裁决。**严禁本包内偷改快照**。

---

## 第 5 步：用例冲突处置（关键）

`test-cases-snapshot/` 与 `05-用例清单.md` 共存时：

| 情况 | 处置 |
|---|---|
| `05 § 四` 标 **`已作废`** 的 case_id | snapshot 里这条 **完全忽略**，不要写实现/不要写断言 |
| `05 § 四` 标 **`本期修改`** 的 case_id | 以 `05 § 二/三` 的最新版为准；snapshot 里的旧版仅供历史参考 |
| `05 § 四` 标 **`本期新增`** 的 case_id | 以 `05 § 二/三` 为唯一来源（snapshot 里没有） |
| 未列在 `05 § 四` 的 case_id | snapshot 即最新版，按它做 |

> ⚠️ **绝对不要** 同时按 snapshot 老版 + `05 § 二/三` 新版做 —— 会出现"两个用例都 pass 但实际功能矛盾"的情况。

---

## 第 6 步：跑测试

| 类型 | 命令（在工作空间根执行） |
|---|---|
| Bruno API 契约 | `cd test/tools/api-collection && bru run --env Local <模块>` |
| Playwright E2E | `cd test/tools/e2e-scripts && pnpm playwright test tests/regression/<模块>` |
| 自查 | 仅跑 `05-用例清单.md § 二` 中 `auto:Y` 的 case_id |

> 跑测试**必须**用 `test/tools/` 下的真实资产（snapshot 不含可执行脚本）；跑完不要修改 `test/tools/` 任何文件，要改请走 PM 另起 CHG。

---

## 第 7 步：每轮交付的输出格式

```markdown
## 第 N 轮交付（YYYY-MM-DD HH:mm）

### 1. 修改文件清单
- code/<仓库名>/.../xxx.tsx (新增/修改/删除)

### 2. 关键改动说明
- ...

### 3. 自动化用例运行结果
- Bruno: X/Y pass
- Playwright: X/Y pass

### 4. 5-state 覆盖
- empty / loading / data / error / partial: ...

### 5. 风险与未尽事宜
- ...
```

同步在 `08-修复历史.md` 末尾追加 `[ROUND-N]` 段（同样内容），缺一不可。

---

## 越界 / 疑问处置

- 任何范围外 / 措辞模糊 / 设计冲突 / 用例冲突无法判定 / 契约漂移 → 写到 `08-修复历史.md` 的 `[QUESTION-N]` 段
- 等用户在 `[ANSWER-N]` 段回复后再动手
- **不要**自己拍脑袋决定

---

## 安全基线（同根 AGENTS.md）

- 不 commit secret / token / 密码 / `.env`
- 不改 `.gitignore` 绕过
- 不改 git remote / 不 push 到非 `release/*`
- 不 `git reset --hard` 已推送 commit
- 不动 `code/<仓库名>/Dockerfile*` / `docker-compose*.yml` / `.github/**` / 依赖文件（除非 `01 § 三` 显式列入）

---

> 你的第 1 条回复，必须以 **「AGENTS.md 已读 + 单 active 自检 = N」** 开头，证明你完成了第 1 ~ 2 步。然后再开始读 `00-给Codex的导读.md`。
