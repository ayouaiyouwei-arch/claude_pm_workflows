/**
 * 集中管理 data-testid · 通用模板（项目无关骨架）
 *
 * ⚠️ 接入项目必做：按本项目模块/页面填充下方 modules 段（删除 __example 占位）。
 *   - 模块缩写与拆分以 /init-docs Gate D1 确认稿为准（对齐 acceptance.config.json § modules）
 *
 * 约定：
 *  - 所有 spec 必须通过本表引用 data-testid，禁止硬编码 CSS 选择器（如 `.el-button:nth-child(3)`）
 *  - 如发现某节点缺 data-testid，先在前端补上 `data-testid="..."`，再在本表登记，禁止用脆性选择器替代
 *  - 选择器命名约定：`<模块>.<页面>.<元素>`，例 `<模块>.list.statusFilter`
 *  - 渲染类元素（地图/canvas overlay）必须挂真实 data-* 钩子（对齐 P020「可渲染必可验证」），不可用截图替代断言
 */

export const Selectors = {
  // ── 以下两段（global / login）项目无关，通用保留 ──
  global: {
    siderMenu: 'global.sider.menu',
    headerUser: 'global.header.user',
    headerLogout: 'global.header.logout',
    pageLoading: 'global.page.loading',
    pageEmpty: 'global.page.empty',
    pageError: 'global.page.error',
    toast: 'global.toast',
    confirmDialog: 'global.confirm.dialog',
    confirmOk: 'global.confirm.ok',
    confirmCancel: 'global.confirm.cancel',
  },

  login: {
    username: 'login-username',
    password: 'login-password',
    submit: 'login-submit',
    errorMsg: 'login-error',
  },

  // ── 以下为占位示例，演示 `<模块>.<页面>.<元素>` 命名约定 ──
  // 接入项目后删除 __example，按本项目模块逐个补充（结构同 global/login）。
  __example: {
    list: {
      table: '__example.list.table',
      statusFilter: '__example.list.statusFilter',
      pagination: '__example.list.pagination',
    },
    detail: {
      root: '__example.detail.root',
      primaryAction: '__example.detail.primaryAction',
    },
  },
} as const;

export type SelectorKey = typeof Selectors;
