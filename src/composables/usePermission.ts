import { clearPermissionCache } from "@/core/cache";
import { permissionScopeKey, type PermissionScope } from "@/core/scope";
import {
  configurePermission,
  getCurrentPermissions,
  getReactivePermissions,
} from "@/core/config";
import { checkPermissionSync, hasPermission } from "@/core/evaluator";
import type { PermissionValue } from "@/types";
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "@/utils/storage";
import { computed, getCurrentInstance, inject } from "vue";

/**
 * usePermission Composable
 * Reactive + Async + Cached Permission Checker
 *
 * Nuxt and scoped Vue components use an application/request-local store.
 * Standalone legacy consumers without a scope retain the global API.
 */
export function usePermission(explicitScope?: PermissionScope) {
  // Components automatically use their app-local scope. Nuxt middleware and
  // plugins can pass the same scope explicitly from the Nuxt app context.
  const scope =
    explicitScope ??
    (getCurrentInstance() ? inject(permissionScopeKey, null) : null);
  const permissionsRef = scope?.permissions ?? getReactivePermissions();

  // If the global ref is empty but we have a persisted snapshot in storage,
  // hydrate the global state once. This lets newly-mounted apps pick up
  // permissions saved during the previous session without an explicit call.
  if (
    !scope &&
    (!permissionsRef.value || permissionsRef.value.length === 0) &&
    getCurrentPermissions().length === 0
  ) {
    const stored = getPermissionsFromStorage();
    if (Array.isArray(stored) && stored.length > 0) {
      // Don't re-persist (storage already has it); just sync runtime state.
      configurePermission(stored, { persist: false });
    }
  }

  /**
   * can(rule)
   * Async permission evaluator
   */
  const can = async (rule: PermissionValue) => {
    return await hasPermission(rule, permissionsRef.value);
  };

  /**
   * canSync(rule)
   * Instant local check with the same matching semantics as async can()
   */
  const canSync = (rule: PermissionValue) =>
    checkPermissionSync(rule, permissionsRef.value);

  /**
   * refresh()
   * Clear cache and re-read the current permissions from storage so any
   * out-of-band updates (e.g., another tab or a direct storage write) are
   * picked up. If storage is empty, leaves the current global state alone.
   */
  const refresh = () => {
    if (scope) return scope.refresh();
    clearPermissionCache();
    const stored = getPermissionsFromStorage();
    if (Array.isArray(stored) && stored.length > 0) {
      configurePermission(stored, { persist: false });
    }
  };

  /**
   * setPermissions()
   */
  const setPermissions = (newPerms: string[]) => {
    if (!Array.isArray(newPerms)) {
      console.error("[v-permission] Permissions must be an array");
      return;
    }
    if (scope) {
      scope.setPermissions(newPerms);
      return;
    }
    clearPermissionCache();
    // configurePermission will update the reactive ref AND persist to storage
    // (persist defaults to true).
    configurePermission(newPerms);
    savePermissionsToStorage(newPerms);
  };

  /**
   * hasAll()
   */
  const hasAll = async (perms: string[]) => {
    // Empty array means no requirements, so always true
    if (!Array.isArray(perms) || perms.length === 0) return true;
    return await can({ permissions: perms, mode: "and" });
  };

  /**
   * hasAny()
   */
  const hasAny = async (perms: string[]) => {
    // Empty array or non-array should return false
    if (!Array.isArray(perms) || perms.length === 0) return false;
    return await can({ permissions: perms, mode: "or" });
  };

  return {
    permissions: computed(() => permissionsRef.value),
    can,
    hasPermission: can, // Alias for can() — used in docs & templates
    canSync,
    refresh,
    setPermissions,
    hasAll,
    hasAny,
  };
}
