/**
 * 集中管理 data-testid。
 *
 * 约定：
 *  - 所有 spec 必须通过本表引用 data-testid，禁止硬编码 CSS 选择器（如 `.el-button:nth-child(3)`）
 *  - 如发现某节点缺 data-testid，先在前端补上 `data-testid="..."`，再在本表登记，禁止用脆性选择器替代
 *  - 选择器命名约定：`<模块>.<页面>.<元素>`，例 `dashboard.summary.totalOrdersCard`
 */

export const Selectors = {
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

  dashboard: {
    summary: {
      totalOrdersCard: 'dashboard.summary.totalOrders',
      activeDriversCard: 'dashboard.summary.activeDrivers',
      onlineVehiclesCard: 'dashboard.summary.onlineVehicles',
      activeAlertsCard: 'dashboard.summary.activeAlerts',
      trendChart: 'dashboard.summary.trendChart',
    },
  },

  schedule: {
    calendar: {
      root: 'schedule.calendar.root',
      viewSwitcher: 'schedule.calendar.viewSwitcher',
      dimSwitcher: 'schedule.calendar.dimSwitcher',
    },
    adjust: {
      slot: 'schedule.adjust.slot',
      replaceDriverBtn: 'schedule.adjust.replaceDriverBtn',
      replaceVehicleBtn: 'schedule.adjust.replaceVehicleBtn',
      pickerSubmit: 'schedule.adjust.pickerSubmit',
    },
  },

  order: {
    list: {
      table: 'order.list.table',
      statusFilter: 'order.list.statusFilter',
      pagination: 'order.list.pagination',
    },
    detail: {
      timeline: 'order.detail.timeline',
      refundBtn: 'order.detail.refundBtn',
      refundReason: 'order.detail.refundReason',
      refundSubmit: 'order.detail.refundSubmit',
    },
  },

  security: {
    monitor: {
      list: 'security.monitor.list',
      map: 'security.monitor.map',
      handleBtn: 'security.monitor.handleBtn',
      closeBtn: 'security.monitor.closeBtn',
      closeReason: 'security.monitor.closeReason',
      closeSubmit: 'security.monitor.closeSubmit',
      wsStatus: 'security.monitor.wsStatus',
    },
  },

  rule: {
    alert: {
      newBtn: 'rule.alert.newBtn',
      enableSwitch: 'rule.alert.enableSwitch',
      saveBtn: 'rule.alert.saveBtn',
    },
  },

  analysis: {
    operation: {
      odMatrix: 'analysis.operation.odMatrix',
      aggSwitcher: 'analysis.operation.aggSwitcher',
      exportBtn: 'analysis.operation.exportBtn',
    },
  },

  resource: {
    route: {
      editorEnter: 'resource.route.editorEnter',
      draftSaveBtn: 'resource.route.draftSaveBtn',
      publishBtn: 'resource.route.publishBtn',
    },
    vehicle: {
      newBtn: 'resource.vehicle.newBtn',
      statusSwitcher: 'resource.vehicle.statusSwitcher',
    },
  },

  setting: {
    user: {
      newRoleBtn: 'setting.user.newRoleBtn',
      bindUserBtn: 'setting.user.bindUserBtn',
    },
  },
} as const;

export type SelectorKey = typeof Selectors;
