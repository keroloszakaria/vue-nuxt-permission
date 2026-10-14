// @ts-ignore Nuxt provides this virtual module at runtime.
import { useNuxtApp } from "#app";
import { usePermission as useBasePermission } from "../composables/usePermission";
import type { PermissionScope } from "../core/scope";

/**
 * The Nuxt auto-imported composable works inside setup(), plugins and
 * route middleware, where Vue inject() alone may not be available.
 */
export function usePermissionScope(): PermissionScope {
  const app = useNuxtApp() as unknown as {
    $permissionScope?: PermissionScope;
  };
  if (!app.$permissionScope) {
    throw new Error(
      "[vue-nuxt-permission] Nuxt module scope is missing; add vue-nuxt-permission to modules",
    );
  }
  return app.$permissionScope;
}

export function usePermission() {
  return useBasePermission(usePermissionScope());
}
