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
    let permissions: any = [];
    const decryptFn = options?.decrypt ?? options?.transform;

    if (options?.fetchPermissions) {
      try {
        const fetched = await options.fetchPermissions();
        if (decryptFn && fetched && !Array.isArray(fetched)) {
          const decrypted = await decryptFn(fetched);
          permissions = Array.isArray(decrypted) ? decrypted : [];
        } else {
          permissions = normalizePermissions(fetched);
        }
      } catch (e) {
        console.error("[v-permission] Failed to fetch permissions:", e);
        permissions = getPermissionsFromStorage() ?? [];
      }
    } else if (options?.permissions !== undefined) {
      if (decryptFn && options.permissions && !Array.isArray(options.permissions)) {
        const decrypted = await decryptFn(options.permissions);
        permissions = Array.isArray(decrypted) ? decrypted : [];
      } else {
        permissions = normalizePermissions(options.permissions);
      }
    } else {
      permissions = getPermissionsFromStorage() ?? [];
    }

    clearPermissionCache();
    // configurePermission also handles persistence based on the persist flag,
    // so we forward it here instead of saving twice.
    configurePermission(permissions, {
      developmentMode: options?.developmentMode,
      persist: options?.persist,
      decrypt: options?.decrypt,
      transform: options?.transform,
    });

    // Provide reactive permissions to components and directives
    const reactivePermissions = getReactivePermissions();
    app.provide("__v_permission_reactive__", reactivePermissions);

    app.directive("permission", vPermission);
  },
};
