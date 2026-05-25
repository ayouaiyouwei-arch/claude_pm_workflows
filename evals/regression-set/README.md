# regression-set/ · prompt 改动回归基准

> 本目录是 `/optimize-prompts` 合并补丁前后的"prompt 不退步"兜底。每次补丁合并都会用这里的"判定型 agent"（A2 / A4 / A7）跑一遍历史包，**结论变了就回滚**。

---

## 一、为什么只回归 A2 / A4 / A7

- A2 / A4 / A7 输出有明确的 **二元/三元结论**（通过 / 打回 / 触发A5），可机械对比
- A1 / A3 / A6 输出是生成型文本，没有 ground truth，做不到自动回归 → 靠 `PROMPT-CHANGELOG.md` 人审
- A1.5 / A5 触发条件特殊，不进回归集

---

## 二、选包标准（PM 手选）

`cases.csv` 收 **3–5 个**有代表性的 `.done` 包：

1. **必含**：1 个 A2 通过 + 1 个 A2 打回（保证 A2 双向都有覆盖）
2. **必含**：1 个 A4 通过 + 1 个 A4 触发 A5（A4 同理）
3. **必含**：1 个 A7 一遍过 + 1 个 A7 打回 ≥ 1 轮
4. **可选**：1 个 UI 类需求（让 A2 多走一步视觉一致性审）

---

## 三、何时刷新

- **每季度** PM 主动 review 一次：上季度有没有更典型的"边界案例"包，替换掉旧的
- 当 `runs.csv` 出现"过去 5 个包都不像 regression-set 里任何一个"的飘移信号 → 立即刷新
- 刷新时把旧的整目录 `mv` 到 `regression-baseline/<日期>-archived/`，不是删除

---

## 四、目录结构

```
regression-set/
├── README.md                              ← 本文
├── cases.csv                              ← 3–5 个 .done 包索引
└── expected/
    ├── <case_id_1>/
    │   ├── A2/02-A2-审核报告-期望.md       ← 从对应 .done 包复制的"标准答案"
    │   ├── A4/04-A4-范围审核报告-期望.md
    │   └── A7/07-A7-用例审核报告-期望.md
    ├── <case_id_2>/...
```

`expected/<case_id>/<agent>/` 下放的不是原报告全文，而是**结论摘要 + 关键打回原因**——`/optimize-prompts` 的回归比对脚本只比这两项。

---

## 五、cases.csv 字段

| 字段 | 说明 |
|---|---|
| `case_id` | 同 `runs.csv` 的 `run_id` |
| `场景标签` | `A2-pass` / `A2-reject` / `A4-pass` / `A4-trigger-A5` / `A7-pass` / `A7-reject` / `UI` 多值用 `;` |
| `选入日期` | YYYY-MM-DD |
| `选入理由` | 一句话说明这个包代表了什么边界 |
| `已落 expected/` | `是` / `否`（PM 复制 expected 文件后改为 `是`） |
