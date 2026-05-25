# cases.csv · 字段说明

> 🔧 项目无关骨架版 · 示例均为占位 · 项目专属配置见 PROJECT-PROFILE.md

> `knowledge/cases.csv` 的字段冻结说明。当前版本：**v1.0（2026-05-10）**。

---

## 〇、CSV 通用约定

- UTF-8 无 BOM / LF / 英文逗号 / 双引号包裹含分隔符的字段
- 多值字段用英文分号 `;`
- 空值写 `-`
- **append-only**

---

## 一、字段表（9 列）

| 序 | 字段名 | 类型 | 来源 | 说明 |
|---|---|---|---|---|
| 1 | `case_id` | string | `.done` 包名 | 与 `evals/runs.csv` 的 `run_id` 一一对应 |
| 2 | `done_date` | date | `99-状态.md` | YYYY-MM-DD |
| 3 | `类型` | enum | `01-需求细化.md` | `新增` / `优化` / `UI重构` |
| 4 | `触及端` | string | `01-需求细化.md` | 端名按 PROJECT-PROFILE.md § 五，多值用 `;`（例 `<端A>;<端B>`） |
| 5 | `修改级别` | enum | `03-技术方案.md` | `L1` / `L2` / `L3` |
| 6 | `核心模块` | string | `03-技术方案.md` 改动文件清单聚合 | 如 `<端>/<模块>;<shared>/<子模块>` |
| 7 | `关键决策摘要` | string | retrospector 抽取（≤ 80 字） | 如 "采用前端聚合避免新增后端接口" |
| 8 | `关联patterns` | string | retrospector 匹配 + PM 校正 | `P001;P003`，无则 `-` |
| 9 | `done路径` | string | 自动 | `deliverables/<包名>.done/` |

---

## 二、与 runs.csv 的关系

- **相同主键**：`case_id` == `run_id`
- **不冗余字段**：`类型` / `触及端` / `修改级别` 在两表都有，但读者群不同：runs.csv 服务 `pipeline-evaluator`，cases.csv 服务 A1/A3/A6 检索
- **维护方式**：retrospector 一次写两边，保持同步

---

## 三、A1 / A3 / A6 检索范例

```bash
# A1: 找触及端有重叠的最近 5 个 .done 包，看决策摘要（端名按 PROJECT-PROFILE.md § 五）
grep -E "(<端A>|<端B>)" knowledge/cases.csv | tail -5 | awk -F',' '{print $1, $7}'

# A3: 找改过同模块的历史包，看 03-技术方案.md
grep "<端>/<模块>" knowledge/cases.csv | awk -F',' '{print $9}'

# A6: 找类型相同的 UI 重构包，看 06-用例.csv 的 [VR] 写法
grep "UI重构" knowledge/cases.csv | tail -3 | awk -F',' '{print $9}'
```

---

## 四、版本变更记录

| 版本 | 日期 | 变更 | 操作人 |
|---|---|---|---|
| v1.0 | 2026-05-10 | 首版 9 列 | PM |
