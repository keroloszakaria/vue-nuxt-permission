import {
  clearPermissionCache,
  configurePermission,
  getReactivePermissions,
} from "@/core";
import { vPermission } from "@/directives/v-permission";
import type { PluginOptions } from "@/types";
import { normalizePermissions } from "@/utils/helpers";
import { getPermissionsFromStorage } from "@/utils/storage";
import type { App } from "vue";

export default {
  async install(app: App, options?: PluginOptions) {
    let permissions: string[] = [];

    if (options?.fetchPermissions) {
      try {
        permissions = await options.fetchPermissions();
      } catch (e) {
        console.error("[v-permission] Failed to fetch permissions:", e);
        permissions = getPermissionsFromStorage() ?? [];
      }
    } else if (options?.permissions) {
      permissions = normalizePermissions(options.permissions);
    } else {
      permissions = getPermissionsFromStorage() ?? [];
    }

    clearPermissionCache();
    // configurePermission also handles persistence based on the persist flag,
    // so we forward it here instead of saving twice.
    configurePermission(permissions, {
      developmentMode: options?.developmentMode,
      persist: options?.persist,
    });

    // Provide reactive permissions to components and directives
    const reactivePermissions = getReactivePermissions();
    app.provide("__v_permission_reactive__", reactivePermissions);

    app.directive("permission", vPermission);
  },
};
