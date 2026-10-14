import type { Ref } from "vue";
import type { PermissionScope } from "../core/scope";
import type { RouteLocationNormalized } from "vue-router";

/* -------------------------------------------------
 * Permission Modes
 * ------------------------------------------------- */
export type PermissionMode =
  | "and"
  | "or"
  | "not"
  | "startWith"
  | "endWith"
  | "regex";

/* -------------------------------------------------
 * Permission Value
 * ------------------------------------------------- */
export interface PermissionObject {
  permissions: string[];
  mode: PermissionMode;
}

export type PermissionValue =
  | "*"
  | string
  | string[]
  | PermissionObject;

export type PermissionsArray = string[] | Ref<string[]> | Ref<any>;

/* -------------------------------------------------
 * Decrypt / Transform Hook
 * ------------------------------------------------- */
export type DecryptHook = (raw: any) => string[] | Promise<string[]>;

/* -------------------------------------------------
 * Global Config
 * ------------------------------------------------- */
export interface GlobalConfig {
  permissions: PermissionsArray | null;
  developmentMode: boolean;
  decrypt?: DecryptHook;
}

/* -------------------------------------------------
 * Configure Permission Options
 * ------------------------------------------------- */
export interface ConfigurePermissionOptions {
  developmentMode?: boolean;
  persist?: boolean;
  decrypt?: DecryptHook;
  transform?: DecryptHook;
}

/* -------------------------------------------------
 * Plugin Options
 * ------------------------------------------------- */
export interface PluginOptions {
  permissions?: PermissionsArray | any;
  developmentMode?: boolean;
  fetchPermissions?: () => Promise<string[] | any>;
  persist?: boolean;
  decrypt?: DecryptHook;
  transform?: DecryptHook;
}

/* -------------------------------------------------
 * Route Meta with Permissions
 * ------------------------------------------------- */
export interface RouteMetaWithPermissions {
  requiresAuth?: boolean;
  checkPermission?: boolean;
  permissions?: PermissionValue;
  isAuthRoute?: boolean;
  [key: string]: any;
}

/* -------------------------------------------------
 * Permission Route
 * ------------------------------------------------- */
export interface PermissionRoute {
  path: string;
  meta?: RouteMetaWithPermissions;
  children?: PermissionRoute[];
  [key: string]: any;
}

/* -------------------------------------------------
 * Guard Options
 * ------------------------------------------------- */
export interface GuardOptions {
  /** Request-local permission state; required for Nuxt SSR guard usage. */
  permissionScope?: PermissionScope;
  authRoutes?: Array<{ path: string }>;
  protectedRoutes?: PermissionRoute[];
  getAuthState?: () => AuthState;
  loginPath?: string;
  homePath?: string;
  /**
   * Where an authenticated user goes when a route is denied and no other
   * protected route is accessible (e.g. "/403"). Defaults to loginPath.
   */
  deniedPath?: string;
  /**
   * Called when an authenticated user is denied and has no accessible
   * fallback route — a good place to clear the session or show a message.
   */
  onNoAccess?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void | Promise<void>;
  decrypt?: DecryptHook;
  transform?: DecryptHook;
  onDenied?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
  onAllowed?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
}

/* -------------------------------------------------
 * Auth State
 * ------------------------------------------------- */
export interface AuthState {
  isAuthenticated: boolean;
  permissions?: string[] | any;
  user?: {
    permissions?: string[] | any;
    [key: string]: any;
  };
}

/* -------------------------------------------------
 * HTMLElement Augmentation
 * ------------------------------------------------- */
declare global {
  interface HTMLElement {
    _vPermissionOriginalDisplay?: string;
    _vPermissionSkipUpdates?: boolean;
    _vPermissionParent?: Node | null;
    _vPermissionNextSibling?: Node | null;
    _vPermissionComment?: Comment | null;
  }
}

/* -------------------------------------------------
 * Vue Router Meta
 * ------------------------------------------------- */
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    checkPermission?: boolean;
    permissions?: PermissionValue;
    isAuthRoute?: boolean;
  }
}
