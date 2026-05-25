---
description: 流水线周更入口。每周跑一次，调 pipeline-evaluator 出周报，并提醒 PM 完成本周 rubric 抽样。
argument-hint: 留空（自动算本周）或 <YYYY-WW>（指定周次）
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# /pipeline-review · 流水线周更

> 用户已输入：$ARGUMENTS

> 🔧 项目无关骨架版 · 项目专属配置见 PROJECT-PROFILE.md

## 你（主对话）的职责

你是周更编排者。整个命令是 4 步：

1. 算本周窗口 + 列待抽样包
2. 提示 PM 完成 rubric 抽样（在主对话内交互）
3. 调 `pipeline-evaluator` agent 出周报
4. 把周报关键结论 + 给 PM 的建议告知 PM

---

## 第 0 步：算窗口

```bash
# 本周（ISO 周）
WEEK=$(date +%G-W%V)        # 如 2026-W19
WEEK_START=$(date -v-monday +%Y-%m-%d 2>/dev/null || date -d "monday" +%Y-%m-%d)
WEEK_END=$(date +%Y-%m-%d)

# 如用户传了具体周次（$ARGUMENTS 形如 2026-W19）则覆盖
[ -n "$ARGUMENTS" ] && WEEK="$ARGUMENTS"
```

## 第 1 步：列本周 .done 包 + 待抽样

```bash
# 本周 done_date 在窗口内的包
awk -F',' -v s="$WEEK_START" -v e="$WEEK_END" 'NR>1 && $2>=s && $2<=e {print $1}' evals/runs.csv > /tmp/this-week-done.txt

# 已有 rubric 的
ls evals/rubrics/$(date +%Y-%m-%d)*.md 2>/dev/null > /tmp/rubrics-this-week.txt
```

### 第 1.5 步：🚨 retrospect 漏审告警（**必跑**）

> 已知失败模式：包从 `.active → .done`（尤其**批量追认 / 历史回填**）时若跳过 retrospect 落 runs.csv，会导致 runs.csv 滞后、周报漏审（误判"本周 0 done 包"）。本步全量比对 `.done` 目录数 vs runs.csv 行数兜底。

```bash
ls -d deliverables/*.done 2>/dev/null | sed 's#deliverables/##; s#\.done$##' | sort > /tmp/done-on-disk.txt
awk -F',' 'NR>1 && $1!="run_id"{print $1}' evals/runs.csv | sort > /tmp/done-in-runs.txt
MISSING=$(comm -23 /tmp/done-on-disk.txt /tmp/done-in-runs.txt)
if [ -n "$MISSING" ]; then
  echo "🚨 retrospect 漏审告警：以下 .done 包未登 runs.csv："; echo "$MISSING"
  echo "→ 必须先补登 runs.csv + cases.csv 再出周报。"
else
  echo "✅ .done 目录数 = runs.csv 行数，无 retrospect 滞后"
fi
```

**处置**：有漏登 → 先停下提示 PM（A 批量回填 / B 周报标"样本不全"继续）；无漏登 → 进第 2 步。

## 第 2 步：提示 PM 完成 rubric 抽样

按 `evals/rubrics/_rubric模板.md § 抽样规则`：每周 5 包，**优先抽**：
- A4 触发 A5 的
- A7 打回 ≥ 2 轮的
- Codex_QUESTION ≥ 3 的
- A3 估算偏差 > 50% 的
- 剩余名额随机

主对话执行：

```bash
# 优先抽样候选（按字段过滤 runs.csv）
awk -F',' '
NR>1 && (
  $9 == "触发A5" ||
  $14+0 >= 2 ||
  $16+0 >= 3 ||
  ($8>0 && (($17-$8)/$8) > 0.5)
) {print $1, "| A4="$9, "A7轮="$14, "Q="$16, "估算偏="$8"→"$17}
' evals/runs.csv | head -10
```

把候选列给 PM，问：

> "本周待抽样 rubric。优先候选见上（最多 10 个）。
>  - A. 我从优先候选挑 5 个，请你按 `evals/rubrics/_rubric模板.md` 复制 5 份并打分（10 分钟/包）
>  - B. 跳过抽样直接出周报（周报 § 五 PM 主观分会标"本周未抽样"）
>  - C. 让我帮你按模板预填 5 份骨架文件，PM 只填分数 + 一句话理由
>
> 选 A / B / C？"

如果选 C：主对话用 Bash 复制 `_rubric模板.md` 到 5 个 `<YYYY-MM-DD>-<run_id>.md`，每份替换 frontmatter 的 `包名` 字段，**不填分数**，把文件路径列给 PM 等填完后回 `继续`。

## 第 3 步：调 pipeline-evaluator

```
Task(subagent_type="pipeline-evaluator", prompt="
本周窗口：<WEEK_START> ~ <WEEK_END>
周次：<WEEK>
请按 agent 定义流程产出 evals/weekly/<WEEK>-周报.md。
若 rubrics/ 本周抽样不足 5 包，§ 五 写'样本不足 (n=<X>)'，不要跳过。
")
```

## 第 4 步：把周报关键结论告知 PM

主对话**只挑 3 项最关键**：

1. § 一 TL;DR（原样转述）
2. § 二/三/四/五 中所有 🚨 预警项（点名）
3. § 七 给 PM 的下一步建议（原样转述）

格式：

```
✅ 本周周报已生成：evals/weekly/<WEEK>-周报.md

📊 一句话：<TL;DR 原文>

🚨 预警 (<N> 项)：
- ...
- ...

➡️ 建议下一步：
- ...

要看完整周报回复 `查看`，要直接进 /optimize-prompts 回复 `优化`，否则结束。
```

---

## 中断与恢复

- PM 在第 2 步选 C 但没填完分数 → 周报照出，§ 五 标"PM 未填部分包"
- evaluator 报错 → 把错误原文告知 PM，可重试或回退到无 rubric 模式

## 不允许的事

- ❌ 不抽样直接出周报（除非 PM 显式选 B）
- ❌ 让 evaluator 改 runs.csv / rubrics
- ❌ 自己写周报内容（主对话只是编排者）
