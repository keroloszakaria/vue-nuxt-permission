// @ts-ignore Nuxt provides this virtual module at runtime.
import { defineNuxtPlugin, useRequestFetch, useRuntimeConfig, useState } from "#app";
import {
  createPermissionScope,
  parseFetchedPermissions,
  permissionScopeKey,
} from "../core/scope";
import { createPermissionDirective } from "../directives/v-permission";
// @ts-ignore Nuxt provides this virtual module at runtime.
import type { NuxtApp } from "#app";

interface RuntimePermissionConfig {
  permissions?: string[];
  fetchPermissions?: string;
  persist?: boolean;
}

/**
 * One scope per Nuxt app/request. The Nuxt useState ref is request-local on
 * the server and serialized to the client for hydration.
 */
export default defineNuxtPlugin(async (nuxtApp: NuxtApp) => {
  const cfg = (useRuntimeConfig().public.permission ?? {}) as RuntimePermissionConfig;
  const initial = Array.isArray(cfg.permissions) ? cfg.permissions : [];
  const requestState = useState<string[]>(
    "vue-nuxt-permission:permissions",
    () => [...initial],
  );
  const scope = createPermissionScope(initial, {
    state: requestState,
    persist: cfg.persist !== false,
  });

  nuxtApp.vueApp.provide(permissionScopeKey, scope);
  nuxtApp.vueApp.directive("permission", createPermissionDirective(scope));
  // Nuxt composables also run in route middleware without a Vue component.
  nuxtApp.provide("permissionScope", scope);

  if (!cfg.fetchPermissions) return;

  // Server: forward same-origin request headers with useRequestFetch.
  // Client: useRequestFetch uses the regular Nuxt $fetch implementation.
  // Await initialization so middleware and rendering see consistent permissions.
  const requestFetch = useRequestFetch();
  try {
    const payload = (await requestFetch(cfg.fetchPermissions)) as unknown;
    const permissions = parseFetchedPermissions(payload);
    scope.setPermissions(permissions);
  } catch (error) {
    // Never restore unverified cached permissions after a failed request.
    scope.setPermissions([]);
    console.error("[vue-nuxt-permission] Failed to fetch permissions:", error);
  }
});
