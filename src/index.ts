// Core configuration and evaluation
export {
  configurePermission,
  getCurrentPermissions,
  isDevMode,
  getDecryptHook,
  setDecryptHook,
} from "@/core/config";
export { hasPermission } from "@/core/evaluator";

// Caching
export {
  getCachedPermission,
  setCachedPermission,
  clearPermissionCache,
  invalidateCache,
} from "@/core/cache";

// Utilities
export * from "./utils/helpers";
export * from "./utils/storage";
export * from "./utils/debug";

// Plugin and directives
export { default as PermissionPlugin } from "./plugin";
export { vPermission } from "./directives/v-permission";

// Guards
export { globalGuard } from "./guards/globalGuard";
export { createPermissionGuard } from "./guards/createGuard";

// Composables
export { usePermission } from "./composables/usePermission";

// Type exports (explicit)
export type {
  PermissionMode,
  PermissionValue,
  PermissionObject,
  PermissionsArray,
  GlobalConfig,
  ConfigurePermissionOptions,
  PluginOptions,
  PermissionRoute,
  GuardOptions,
  AuthState,
  DecryptHook,
} from "@/types/index";
