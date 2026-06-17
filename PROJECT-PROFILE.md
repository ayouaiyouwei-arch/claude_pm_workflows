# PROJECT-PROFILE · 项目档案（流水线唯一配置源）

> ⚠️ 本文件是整套流水线的**唯一项目专属配置源**。所有 agent / skill / command 引用本文件，**不在各自文件里硬编码项目信息**。
>
> 初始化完成后：本文件的"§ 三 核心架构黑名单 / § 四 领域术语 / § 五 技术栈"等字段进入 **LOCKED**（改动要走变更流程，对齐 P007 实证驱动）。
> 全部候选实证应来自代码快照 `<SHA>`（`<拉取分支>`），并经 PM 逐项确认。

---

## 〇、初始化状态

| 字段 | 值 |
|---|---|
| 初始化状态 | 未初始化 · 待 /init-project |
| 初始化日期 | `<待 /init-project 填充>` |
| 梳理方式 | 由 /init-project 拉取代码主动梳理（grep + 仓库 CLAUDE.md/docs 实证 @ `<SHA>`）+ 用户逐项确认（各项 Gate 逐条采纳） |

---

## 一、项目基本信息

| 字段 | 值 |
|---|---|
| 项目全称 | `<项目全称>` |
| 工作空间短名 | `<短名>` |
| 一句话定位 | `<一句话定位 · 由 /init-project 收集>` |
| PM / 负责人 | `<PM 名>` |
| 当前里程碑 | `<当前里程碑 / 分支>` |

---

## 二、Git 接入约定（前置准备 · 必填）

| 字段 | 值 |
|---|---|
| 代码仓库地址 | `<git URL>` |
| 凭据方式 | `<凭据方式 · 例：HTTPS · macOS 钥匙串 osxkeychain / SSH key；密码不落任何文件>` |
| **拉取分支**（只读快照来源）| `<拉取分支 · 例 main / release/*>` |
| 拉取方式 | `git fetch + checkout <分支> + pull --rebase` |
| **是否启用"双向分支隔离"** | `<是 / 否 · 由 PM 确认；否=code/ 只拉不推，交付包留在工作空间 deliverables/>` |
| 推送分支（如启用隔离）| `<推送分支 · 不启用则留空>` |
| 推送范围（如启用隔离）| `<推送范围 · 不启用则留空>` |
| 提交人身份（如需独立身份）| `<提交人身份 · 不需要则留空>` |
| code/ 本地路径 | `code/<仓库名>/`（只读快照，本工作空间从不修改） |

---

## 三、N 项核心技术架构黑名单（LOCKED · 动这些必须走变更登记）

> 实证 @ `<SHA>` · PM 逐项确认采纳。这是 scope-reviewer(A4) / tech-architect(A3) 判定"是否触动核心架构"的依据。
> 下表为**单行示例占位**，实际条目按本项目 `/init-project` 梳理后逐项填充（一项一行）。

| # | 核心架构项 | 为什么是黑名单（动它的回归半径）| 判定关键词/路径 |
|---|---|---|---|
| 1 | `<核心架构项 · 例：数据层 schema / 任务执行引擎 / 鉴权守卫链>` | `<动它的回归半径 · 例：改它两端构建+部署全受影响 / 状态漂移>` | `<判定关键词/路径 · 例 path/to/<文件> · `<实体名>`>` |

> 按本项目 `/init-project` 梳理 → 逐项问 PM 确认后展开为多行（每项一行，含回归半径 + 判定关键词/路径）。

---

## 四、领域术语表（LOCKED · 防近义混淆 · 对齐 P004）

> 实证 @ `<SHA>` · PM 逐项确认采纳。
> 下表为**单行示例占位**，按本项目 `/init-project` 或 `/init-docs` 填充（一对易混淆术语一行）。

| 中文 | 代码实体/接口 | 业务定义 | ❌ 易混淆于 |
|---|---|---|---|
| `<术语>` | `<代码实体/接口>`（`<文件:行>`）| `<业务定义>` | ≠ `<易混淆实体>`（`<文件:行>`，`<差异说明>`）|

> 按本项目 `/init-project` 或 `/init-docs` 填充：每对易混淆术语一行，标 `<文件:行>` 实证。

> 备注（示例）：角色三档 `<角色1> / <角色2> / <角色3>`（`<UserRole 实体>` `<文件:行>`）——涉及权限的需求必须按本项目的角色档位逐档区分。
>
> 🔒 LOCKED 变更留痕（格式范例 · 内容由本项目实战填充）：
> `🔒 LOCKED 变更留痕 <日期>（PM 确认 · Gate <X> <模块> <问题号>=<裁决>）："<术语行>"原文 **"<旧口径>"** 修订为 **"<新口径>"**。依据：`<文件:行> @ <SHA>` 实证 + <研发注释/文档佐证>。仓库文档 `<文件:行>` 同步修正已列研发待办。`

---

## 五、技术栈 + 端结构

| 字段 | 值 |
|---|---|
| 前端技术栈 | `<前端技术栈 · 例：某框架 + 某构建工具 + 某 CSS 方案 + 某状态库>` |
| 后端技术栈 | `<后端技术栈 · 例：某 Web 框架 + 某 ORM + 某队列 + 某鉴权方案；业务数据源 / 存储 / 邮件等外部集成面>` |
| 是否 monorepo | `<是 / 否 · 若是，列出包结构 例 <服务端包>、<前端包>>` |
| **触及端清单**（巡检 + 回归范围）| `<端清单 · 例 ① Web 端 ② Server API ③ 任务执行引擎 ④ 外部集成面>` |
| 包管理器 | `<包管理器 + 版本 · 例 pnpm ≥ 9 / npm / yarn>` |
| type-check 命令 | `<type-check 命令 · 例 pnpm build / tsc --noEmit>` |
| build 命令 | `<build 命令>` |
| 后端测试命令 | `<测试命令（后端/前端/lint）>` |

### 5.1 双轴适配档案（platform_profile ⟂ audience_profile · 由 /init-project Gate 0.5 填充 · UPGRADE Wave 1 ①）

> 两条**正交**轴:`platform`（技术怎么落地）与 `audience`（给谁用、怎么算"劝退"）独立判定、独立门控,**禁止合并成单枚举**。各 agent 按这两字段做平台/受众门控（不命中不读对应卡片,零负担）。`<占位>` 由 Gate 0.5 经"代码提名 → PM 拍板"填实。

```yaml
platform_profile:
  frontend_kind:       web | native-ios | native-android | flutter | rn | desktop-electron | none | hybrid
  visual_demo_mode:    html-demo | approximate-html | figma-ref | native-snapshot | none   # A1.5 demo 载体
  acceptance_driver:   playwright | maestro | appium | xcuitest | espresso | manual         # 验收驱动
  gray_env_kind:       web-url | testflight | internal-track | emulator | none              # 灰度环境形态
  design_token_source: css-hex | swiftui-tokens | compose-tokens | flutter-theme | none     # 视觉基线 token 源

audience_profile:
  primary: toB | toC | both
  surfaces:                              # primary=both 时按界面拆,分别分析(不合并)
    - { name: "<界面名>", audience: toB | toC }
```

> 🔍 多轴而非单枚举的理由:一个 `hybrid` 项目可能 web 端走 Playwright、客户端走 Maestro;`visual_demo_mode` 与 `acceptance_driver` 必须能各自切。
> 🔍 受众轴是**业务事实**,代码只"提名"、PM 必拍板(对齐 P007 选项 B,非 LOCKED 强约束,判错可随时改字段)。

> 🔒 LOCKED 变更留痕（格式范例 · 内容由本项目实战填充）：
> `🔒 LOCKED 变更留痕 <日期>（PM 确认 · Gate <X> <问题号>=<裁决> 裁决修订）："<字段行>"原文 **"<旧口径>"** 修订为 **"<新口径>"**。依据：`<文件:行> @ <SHA>` 实证 + <佐证>。<影响说明>。`
> 🔍 推测 · 待研发确认：`<对不确定约定的推测描述，标推测、不写强约束（对齐 P007 选项 B）>`。
> 本地起服 / Swagger 等运行说明按仓库 CLAUDE.md，由 `/init-project` 梳理后回填。

---

## 六、验收环境（对齐 P006 · 可选，验收前必填）

| 字段 | 值 |
|---|---|
| 环境性质 | `<待 PM 提供 · 例：dev 灰度 / 远端部署>` |
| 前端地址 | `<待提供 · 形如 https://<host>/<前端路径>>` |
| 后端 API 地址 | `<待提供 · 形如 https://<host>/<API 前缀>>` |
| 验收数据库 | `<待提供>` |
| 测试账号（多角色）| `<待提供 · 按本项目角色档位逐档补齐（例 <角色1>/<角色2>/<角色3>）>` |
| 浏览器自动化 | Playwright MCP 可用（待验收环境地址就绪后联调） |

---

## 七、流水线偏好

| 字段 | 值 |
|---|---|
| 是否常含 UI 类需求（触发 A1.5 视觉规范）| `<是 / 否 · 由 /init-project 按本项目判定>` |
| 视觉基线目录（如有设计系统 token）| `product-docs/visual-baseline/`（由 /init-project 初建 · 扫描 `<N>` 文件 @ `<SHA>` · PM 确认白名单） |
| 单 .active 约束 | 启用（同时最多 1 个 active 包） |
| 交付物形态 | .draft 包给研发 |

---

## 八、本项目已沉淀的 LOCKED 经验（初始为空，越用越多）

> 由 `pipeline-retrospector` 在每次交付 .done 后追加；由 `/optimize-prompts` 月更提炼为 `knowledge/patterns/`。
> 通用方法论模式 P001（UI 颗粒度）/ P002（技术语言污染）/ P003（AI 过度发挥）随骨架自带，其余由本项目实战长出。

| 编号 | 名称 | 一句话 |
|---|---|---|
| P001 | UI 颗粒度缺失 | （骨架自带 · 通用）|
| P002 | 需求文档混入技术语言 | （骨架自带 · 通用）|
| P003 | AI 过度发挥 | （骨架自带 · 通用）|
| P004 | retrospect 滞后漏审 | （骨架自带 · 通用 · 升 .done 必落 runs.csv · 三层防护已内置）|
| P005 | dev 灰度 smoke 验证 | （骨架自带 · 通用 · 升 .done 后 PM 真 click 一次 · `/dev-verify` · 三层防护已内置）|
| P006 | 二次校验硬约束 G 门触发链 | （骨架自带 · 通用 · A4 质询 → A5 LOCKED → 06 G 门 → 04 DRIFT · 四级机制已内置）|
