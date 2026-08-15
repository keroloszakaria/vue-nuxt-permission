import { isRef, ref, type Ref } from "vue";
import type {
  ConfigurePermissionOptions,
  DecryptHook,
  GlobalConfig,
  PermissionsArray,
} from "../types";
import { savePermissionsToStorage } from "../utils/storage";

export type { GlobalConfig };

const globalConfig: GlobalConfig = {
  permissions: null,
  developmentMode: false,
  decrypt: undefined,
};

// Global reactive permissions - synchronized with globalConfig
const globalReactivePermissions = ref<string[]>([]);

export const getDecryptHook = (): DecryptHook | undefined => globalConfig.decrypt;

export const setDecryptHook = (hook?: DecryptHook): void => {
  globalConfig.decrypt = hook;
};

export const configurePermission = (
  permissions: PermissionsArray | any,
  options?: ConfigurePermissionOptions,
) => {
  const decryptFn =
    options?.decrypt ?? options?.transform ?? globalConfig.decrypt;
  if (options?.decrypt || options?.transform) {
    globalConfig.decrypt = options.decrypt ?? options.transform;
  }
  globalConfig.developmentMode = options?.developmentMode ?? false;

  if (isRef(permissions)) {
    const refPerms = permissions as Ref<any>;
    globalConfig.permissions = refPerms;
    if (decryptFn && refPerms.value && !Array.isArray(refPerms.value)) {
      const decrypted = decryptFn(refPerms.value);
      if (decrypted instanceof Promise) {
        decrypted.then((res) => {
          const perms = Array.isArray(res) ? res : [];
          refPerms.value = perms;
          globalReactivePermissions.value = perms;
          if (options?.persist !== false) {
            savePermissionsToStorage(perms);
          }
        });
        return;
      } else {
        const perms = Array.isArray(decrypted) ? decrypted : [];
        refPerms.value = perms;
      }
    }
    const currentVal = Array.isArray(refPerms.value) ? refPerms.value : [];
    globalReactivePermissions.value = currentVal;
    if (options?.persist !== false) {
      savePermissionsToStorage(currentVal);
    }
    return;
  }

  // Handle decrypt for raw non-array or encrypted payload
  if (
    decryptFn &&
    permissions !== null &&
    permissions !== undefined &&
    !Array.isArray(permissions)
  ) {
    const decrypted = decryptFn(permissions);
    if (decrypted instanceof Promise) {
      decrypted.then((res) => {
        const perms = Array.isArray(res) ? res : [];
        globalConfig.permissions = perms;
        globalReactivePermissions.value = perms;
        if (options?.persist !== false) {
          savePermissionsToStorage(perms);
        }
      });
      return;
    } else {
      const perms = Array.isArray(decrypted) ? decrypted : [];
      globalConfig.permissions = perms;
      globalReactivePermissions.value = perms;
      if (options?.persist !== false) {
        savePermissionsToStorage(perms);
      }
      return;
    }
  }

  const permsArray = Array.isArray(permissions) ? permissions : [];
  globalConfig.permissions = permsArray;
  globalReactivePermissions.value = permsArray;

  // Persist to storage so permissions survive page reloads
  if (options?.persist !== false) {
    savePermissionsToStorage(permsArray);
  }
};

export const getReactivePermissions = () => globalReactivePermissions;

export const getCurrentPermissions = (): string[] => {
  const { permissions } = globalConfig;
  if (!permissions) return [];

  if (isRef(permissions)) {
    const val = permissions.value;
    return Array.isArray(val) ? val : [];
  }
  return Array.isArray(permissions) ? permissions : [];
};

export const isDevMode = () => globalConfig.developmentMode;

export default globalConfig;

