/**
 * L2 · 角色权限矩阵 · 数据模板（项目无关骨架 · 接入项目填 ROLES/PAGES/MATRIX）
 *
 * 独立验收原则：MATRIX 期望值来自【业务语义】（角色职能），不抄研发权限码 / @PreAuthorize。
 *
 * 判定语义：
 *   visible  = 该角色 goto 目标路由后能停留（URL 命中目标）
 *   denied   = 被路由守卫重定向走（URL 不命中目标）
 *   readonly = 能进但关键操作按钮不可见（按钮级断言项目自实现）
 *
 * 实战坑（来自 robobus 首跑）：
 *   坑 A 不同角色登录首页不同 → denied 判定用「goto 后 not.toHaveURL」（被重定向走），不靠"默认不在该页"误判
 *   坑 B 每次 fresh login 慢（如验证码）→ 按角色分组单次登录后遍历页面
 *
 * 当前为空 → role-access-matrix.spec.ts 跑出 0 条；填好下面三项即生效。
 */

export type Role = string;
export type Access = 'visible' | 'denied' | 'readonly';

// TODO 填角色 id（与 fixtures/auth.ts 一致），如 ['admin', 'dispatcher', 'officer']
export const ROLES: Role[] = [];

export interface PageDef { key: string; route: string; module: string; label: string; }

// TODO 填关键页（真实路由 + 模块缩写，与 acceptance.config.json modules 对齐）
export const PAGES: PageDef[] = [
  // { key: 'home', route: '/home', module: 'HOME', label: '首页' },
];

// TODO 填 角色 × 页面 → visible/denied/readonly
export const MATRIX: Record<Role, Record<string, Access>> = {
  // admin: { home: 'visible' },
};
