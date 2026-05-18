import { clearPermissionCache } from "@/core/cache";
import {
  configurePermission,
  getCurrentPermissions,
  getReactivePermissions,
} from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type { PermissionValue } from "@/types";
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "@/utils/storage";
import { computed } from "vue";

/**
 * usePermission Composable
 * Reactive + Async + Cached Permission Checker
 *
 * The returned `permissions` reflects the global reactive state, so any call
 * to `configurePermission` or `setPermissions` (from anywhere in the app)
 * will be observed automatically.
 */
export function usePermission() {
  // Bind to the global reactive permissions ref. This way the composable
  // always reflects the current state, even if it was called at module
  // top level (a pattern some consumers rely on).
  const permissionsRef = getReactivePermissions();

  // If the global ref is empty but we have a persisted snapshot in storage,
  // hydrate the global state once. This lets newly-mounted apps pick up
  // permissions saved during the previous session without an explicit call.
  if (
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
   * Instant local check — simplified fallback
   */
  const canSync = (rule: PermissionValue) => {
    const current = permissionsRef.value;
    if (rule === "*") return true;
    if (typeof rule === "string") return current.includes(rule);
    if (Array.isArray(rule)) {
      if (rule.includes("*")) return true;
      return rule.some((r) => current.includes(r));
    }
    if (typeof rule === "object" && rule.permissions && rule.mode) {
      const { permissions: p, mode } = rule;
      if (!Array.isArray(p) || p.length === 0) return false;
      if (p.includes("*")) return true;
      if (mode === "and") return p.every((v) => current.includes(v));
      if (mode === "or") return p.some((v) => current.includes(v));
      if (mode === "not") return !p.some((v) => current.includes(v));
      if (mode === "startWith")
        return p.some((pat) => current.some((u) => u.startsWith(pat)));
      if (mode === "endWith")
        return p.some((pat) => current.some((u) => u.endsWith(pat)));
      if (mode === "regex")
        return p.some((pat) => {
          try {
            const r = new RegExp(pat);
            return current.some((u) => r.test(u));
          } catch {
            return false;
          }
        });
    }
    return false;
  };

  /**
   * refresh()
   * Clear cache and re-read the current permissions from storage so any
   * out-of-band updates (e.g., another tab or a direct storage write) are
   * picked up. If storage is empty, leaves the current global state alone.
   */
  const refresh = () => {
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
