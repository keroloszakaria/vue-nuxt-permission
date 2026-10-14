import { ref, type InjectionKey, type Ref } from "vue";
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "../utils/storage";

/**
 * A permission store belongs to one Vue/Nuxt application, not the Node.js process.
 * Nuxt passes its request-local useState() ref to keep SSR and hydration isolated.
 */
export interface PermissionScope {
  readonly permissions: Ref<string[]>;
  readonly persist: boolean;
  setPermissions(permissions: string[]): void;
  refresh(): void;
}

export const permissionScopeKey: InjectionKey<PermissionScope> = Symbol(
  "vue-nuxt-permission.scope",
);

export function createPermissionScope(
  initialPermissions: string[] = [],
  options: { state?: Ref<string[]>; persist?: boolean } = {},
): PermissionScope {
  if (!Array.isArray(initialPermissions)) {
    throw new TypeError("[vue-nuxt-permission] permissions must be an array");
  }

  const permissions = options.state ?? ref<string[]>([...initialPermissions]);
  const persist = options.persist !== false;

  const setPermissions = (next: string[]) => {
    if (!Array.isArray(next) || !next.every((p) => typeof p === "string")) {
      throw new TypeError(
        "[vue-nuxt-permission] permissions must be an array of strings",
      );
    }
    permissions.value = [...next];
    if (persist) savePermissionsToStorage(next);
  };

  const refresh = () => {
    if (!persist) return;
    const stored = getPermissionsFromStorage();
    if (Array.isArray(stored) && stored.every((p) => typeof p === "string")) {
      permissions.value = [...stored];
    }
  };

  return { permissions, persist, setPermissions, refresh };
}
