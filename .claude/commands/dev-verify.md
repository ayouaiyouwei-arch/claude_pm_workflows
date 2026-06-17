# /dev-verify · dev 灰度深度交互验证（升 .done 后跑）

> 用户已输入：`$ARGUMENTS`（包名 / `--all-pending-done` / 空=跑刚 promote 的包）

## 触发场景

- 包刚升 `.done`（含 P008 追认 / promote-deliverable）→ 跑一次确认 dev 灰度功能真落地
- 周期性 `/dev-verify --all-pending-done` → 扫所有 .done 但缺 evidence/dev-verify-*.json 的包

## 你（主对话）的职责

调 `dev-gray-deep-verify` skill 的资产，**不重写登录/截图逻辑**。

---

## 第 0 步：解析参数

```bash
ARGS="$ARGUMENTS"
case "$ARGS" in
  --all-pending-done)
    MODE=batch
    # 扫 .done 包 · 排除已有 evidence/dev-verify-*.json 的
    ;;
  "")
    MODE=latest                                          # 最近一个 .done
    ;;
  *)
    MODE=single
    PKG="$ARGS"                                          # 单包模式
    ;;
esac
```

## 第 1 步：环境前置校验

```bash
# 必备
[ -d code/<你项目仓库>/node_modules/playwright ] || { echo "❌ playwright 不在 · 先 pnpm i"; exit 1; }
[ -n "$DEV_GRAY_USER" ] || { echo "⚠️ DEV_GRAY_USER 未设 · 见 PROJECT-PROFILE.md § 六"; exit 1; }
[ -n "$DEV_GRAY_PASS" ] || { echo "⚠️ DEV_GRAY_PASS 未设 · 见 PROJECT-PROFILE.md § 六"; exit 1; }
# Chromium 必装
ls ~/Library/Caches/ms-playwright/chromium-* 2>/dev/null | head -1 || npx playwright install chromium
```

## 第 2 步：定位包 check 文件 · 没有就用模板派生

```bash
PKG_DIR="deliverables/<日期>-<PKG>-*.done"
CHECK_FILE="test/tools/e2e-scripts/pm-dev-tests/check-${PKG}.cjs"

if [ ! -f "$CHECK_FILE" ]; then
  echo "→ 没找到 $CHECK_FILE · 用模板派生（PM 需填 PKG_CHECKS 后再跑）"
  cp .claude/skills/dev-gray-deep-verify/templates/package-check-template.cjs "$CHECK_FILE"
  echo "请编辑 $CHECK_FILE 的 PKG_CHECKS 数组（pkg/name/platform/route/elements/expectApiPaths）"
  exit 0
fi
```

## 第 3 步：跑 check（best-effort）

```bash
# BASE_URL / USER / PASS 见 PROJECT-PROFILE.md § 六（建议放 .env.local · 不 commit）
node "$CHECK_FILE" 2>&1 | tee "/tmp/dev-verify-${PKG}-$(date +%Y%m%d-%H%M%S).log"
```

跑完读 `/tmp/dev-deep-test-<pkg>/*/results.json` 解析结果。

## 第 4 步：归档证据 + 写入包内

```bash
# 找最新输出目录
LATEST_OUT=$(ls -td /tmp/dev-deep-test-*${PKG,,}*/* 2>/dev/null | head -1)
# 复制 results.json 到包内 evidence/
mkdir -p "$PKG_DIR/evidence"
cp "$LATEST_OUT/results.json" "$PKG_DIR/evidence/dev-verify-$(date +%Y-%m-%d).json"
cp "$LATEST_OUT"/*.png "$PKG_DIR/evidence/" 2>/dev/null
```

## 第 5 步：回写 99-状态.md（验收痕迹）

读 results.json 的 `packages.<pkg>.checks` ：
- 全 ✅ → 99-状态 § 五 加 `dev 灰度验证: ✅ 通过 · <日期>`
- 有 ❌ 但 dev 数据相关（如地图标记/列表计数为 0 等数据缺失）→ `dev 灰度验证: ⚠️ 部分通过 · 数据问题 · 详 evidence/dev-verify-*.json`
- 真功能 fail → `dev 灰度验证: ❌ 失败 · 需查 · 详 evidence/`

**不阻断 .done**（dev gray 数据问题不应回退追认状态），但严重 fail 时给 PM 标 🚨。

## 第 6 步：报告

```
✅ dev-verify 完成：<PKG>

通过 checks: N/M
- ✅ <check key>
- ⚠️ <check key>: <一句话原因（数据/选择器/真 fail）>

截图归档: <PKG_DIR>/evidence/
results.json: <PKG_DIR>/evidence/dev-verify-<日期>.json

99-状态.md § 五已更新: dev 灰度验证: <✅/⚠️/❌>
```

---

## 不允许的事

- ❌ 跳过环境前置校验直接跑（chromium 未装会卡半天）
- ❌ dev gray 数据问题导致 fail 时阻断 .done 状态（仅信号 · 写入痕迹但不回滚）
- ❌ 把跑出来的截图/PAT/真账号密码 commit 到任何仓库（evidence/ 在 .gitignore 内或 PM 私有）
- ❌ 用本命令跑生产环境（仅 dev gray）
