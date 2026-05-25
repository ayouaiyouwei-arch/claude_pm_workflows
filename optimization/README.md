# optimization/ · prompt 演进层

> 本目录管理 `.claude/agents/*.md` 与 `.claude/skills/*` 的**持续优化**。核心原则：人审 + 版本化 + 周期合并，**禁止 agent 自己改自己**。

---

## 一、目录构成

| 路径 | 谁写 | 谁读 | 频率 |
|---|---|---|---|
| `patches-pending/<YYYY-MM-DD>-<CHG>-<short>.md` | `pipeline-retrospector` agent | PM 在 `/optimize-prompts` 中 | 每个 `.done` 包 1 份 |
| `patches-applied/<YYYY-MM-DD>-patch-<NNN>.md` | `/optimize-prompts` 命令自动 | git history / 排查 prompt 退化时 | 每月 5–15 条 |
| `patches-rejected/<YYYY-MM-DD>-rejected-<NNN>.md` | `/optimize-prompts` 命令自动 | 防止 retrospector 重复提同一条 | 每月若干 |
| `PROMPT-CHANGELOG.md` | `/optimize-prompts` 自动追加 | PM 排查"agent 啥时候变废的" | append-only |
| `agent-versions.json` | `/optimize-prompts` 自动写 | retrospector / evaluator 区分版本 | 每次合并 |
| `regression-baseline/<agent>-v<x>.<y>/<case_id>/` | `/optimize-prompts` 在改 prompt 前自动快照 | 回滚时人工 diff | 每次合并 1 套 |

---

## 二、补丁生命周期

```
.done 包                                  PM 每月
   │                                        │
   ▼ pipeline-retrospector                  ▼ /optimize-prompts
patches-pending/<包名>.md  ──────►  ① 按"被独立提出次数"排序
                                    ② PM 逐条决策：合并 / 拒绝 / 改写后合并
                                    ③ 合并时：
                                       a. 校验补丁未触碰 LOCKED 锚点
                                       b. 快照旧版到 regression-baseline/
                                       c. 改对应 .claude/agents/*.md（bump version）
                                       d. 跑 regression-set 回归（A2/A4/A7）
                                       e. 通过 → patches-applied/ + 追加 CHANGELOG
                                          失败 → 自动回滚 + patches-rejected/
                                    ④ patches-pending/<包名>.md 移走
```

---

## 三、LOCKED 锚点规则（核心安全网）

每个 `.claude/agents/*.md` 中**核心铁律段**用以下锚点框住：

```md
<!-- LOCKED:START reason="不修改 code/ 是工作空间根本立场" -->
- 本工作空间**不修改 code/**——code/ 只是从研发那边拉取的只读快照
<!-- LOCKED:END -->
```

`/optimize-prompts` 在合并补丁前 **必检**：
- 补丁的 `target_anchor` 不能落在任何 `<!-- LOCKED:START -->` 与 `<!-- LOCKED:END -->` 之间
- 补丁的 diff 不能删除/修改 LOCKED 段任意字符
- 违反 → 该补丁直接进 `patches-rejected/`，原因写"触碰 LOCKED 锚点"

每个 agent 的 LOCKED 段清单见 `.claude/agents/*.md` 自身（搜 `LOCKED:START`）。

---

## 四、PROMPT-CHANGELOG.md 格式（每条合并 1 段）

```md
## patch-007 · 2026-06-12

- **合并人**：PM
- **触发包**（≥ 2 个独立提出才合并）：
  - 2026-05-09-OPT-001-...
  - 2026-05-23-OPT-004-...
- **改动文件**：`.claude/agents/product-expert.md` v1.0 → v1.1
- **改动锚点**：§ 三 Q&A 清单
- **改动内容**：
  ```diff
  - 必问：业务流程、用户角色、数据来源
  + 必问：业务流程、用户角色、数据来源、字段类型（int/string/enum/datetime）
  ```
- **触发理由**：模式 P001（A1 漏问字段类型）已在 3 个包独立出现
- **回归结果**：regression-set 3/3 通过，A2/A4/A7 结论无变化
- **关联 patterns**：knowledge/patterns/P001-字段类型缺失.md
```

---

## 五、agent-versions.json 格式

```json
{
  "schema_version": 1,
  "last_updated": "2026-06-12",
  "agents": {
    "product-expert": { "version": "1.1", "last_patch": "patch-007", "last_updated": "2026-06-12" },
    "requirement-reviewer": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-08" },
    "tech-architect": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-08" },
    "scope-reviewer": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-08" },
    "secondary-reviewer": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-08" },
    "test-case-author": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-09" },
    "test-case-reviewer": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-09" },
    "visual-spec-author": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-10" },
    "pipeline-retrospector": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-10" },
    "pipeline-evaluator": { "version": "1.0", "last_patch": null, "last_updated": "2026-05-10" }
  }
}
```

---

## 六、不允许的事

- ❌ **手改 `.claude/agents/*.md` 而不走 `/optimize-prompts`**（除非 LOCKED 段或 typo 修正，且必须同步追加 CHANGELOG）
- ❌ **删除 `patches-rejected/` 里的条目**——`pipeline-retrospector` 会读这里防重复提
- ❌ **跳过 regression-set 回归直接合并**
- ❌ **触碰 LOCKED 锚点**——出现意见请改在 PR 里讨论，不走自动补丁
