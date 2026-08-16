# Advanced Usage

## Server-Side Rendering (SSR)

### Handle SSR Restrictions

In SSR, the DOM APIs and `window` object are not available. The library handles this automatically:

```vue
<script setup lang="ts">
// Safe to use in both SSR and client-side
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

// Async permission check works in SSR
const canEdit = await hasPermission("post.edit");
</script>

<template>
  <!-- Directive works in SSR too -->
  <button v-permission="'post.edit'">Edit</button>
</template>
```

### Pre-fetch Permissions on Server

```typescript
// middleware/fetch-permissions.server.ts
export default defineRouteMiddleware(async (to, from) => {
  // This runs on server during initial render
  const { refresh } = usePermission();

  // Pre-fetch and cache permissions before component renders
  await refresh();
});
```

### Handle SSR Hydration

```typescript
// plugins/permission-hydration.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  // On client-side, rehydrate permissions
  // This ensures server-rendered state matches client state

  if (process.client) {
    const { refresh } = usePermission();
    await refresh();
  }
});
```

## Dynamic Permissions

### Load Permissions from API

```typescript
// composables/useRemotePermissions.ts
export const useRemotePermissions = () => {
  const { refresh } = usePermission();

  const loadUserPermissions = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/permissions`);
      const { permissions } = await response.json();

      // Update permissions in the system
      await refresh(permissions);

      return permissions;
    } catch (error) {
      console.error("Failed to load permissions:", error);
      throw error;
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    const response = await fetch(`/api/roles/${roleId}/permissions`);
    const { permissions } = await response.json();

    await refresh(permissions);
    return permissions;
  };

  return {
    loadUserPermissions,
    loadRolePermissions,
  };
};
```

### Handle Permission Changes

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { refresh, permissions } = usePermission();
const authStore = useAuthStore();

// Watch for user role changes
watch(
  () => authStore.user?.role,
  async (newRole) => {
    if (newRole) {
      console.log(`Role changed to ${newRole}, refreshing permissions...`);

      // Fetch new permissions for the role
      const response = await fetch(`/api/roles/${newRole}/permissions`);
      const { permissions } = await response.json();

      // Update permissions
      await refresh(permissions);

      // UI automatically updates through reactivity
      console.log("Permissions updated:", permissions.value);
    }
  }
);

// Watch permissions for any changes
watch(permissions, (newPerms) => {
  console.log("Permissions changed:", newPerms);
});
</script>
```

### Async Permission Loading with Loading State

```typescript
// composables/useAsyncPermissions.ts
export const useAsyncPermissions = () => {
  const { refresh } = usePermission();
  const isLoading = ref(true);
  const error = ref<string | null>(null);

  const loadPermissions = async (source: () => Promise<string[]>) => {
    isLoading.value = true;
    error.value = null;

    try {
      const permissions = await source();
      await refresh(permissions);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    loadPermissions,
  };
};
```

## Multiple Directive Instances

The directive handles multiple instances on the same page correctly:

```vue
<template>
  <div>
    <!-- Multiple directives on same page -->
    <button v-permission="'post.edit'" @click="edit">Edit</button>
    <button v-permission="'post.delete'" @click="delete">Delete</button>
    <button v-permission="'post.view'" @click="view">View</button>

    <!-- Same permission on multiple elements -->
    <div v-permission="'admin.access'">Admin section 1</div>
    <div v-permission="'admin.access'">Admin section 2</div>

    <!-- Nested permissions -->
    <div v-permission="'users.view'">
      <div v-permission="'users.edit'">
        Requires both users.view AND users.edit
      </div>
    </div>
  </div>
</template>
```

## Performance Optimization

### Cache Permission Results

```typescript
// composables/usePermissionCache.ts
export const usePermissionCache = () => {
  const { hasPermission } = usePermission();
  const cache = new Map<string, Promise<boolean>>();

  const checkPermission = (permission: string) => {
    if (!cache.has(permission)) {
      cache.set(permission, hasPermission(permission));
    }
    return cache.get(permission)!;
  };

  const clearCache = () => {
    cache.clear();
  };

  return {
    checkPermission,
    clearCache,
  };
};
```

### Batch Permission Checks

```typescript
// For multiple checks, use Promise.all for concurrency
const { hasPermission } = usePermission();

const [canEdit, canDelete, canPublish] = await Promise.all([
  hasPermission("post.edit"),
  hasPermission("post.delete"),
  hasPermission("post.publish"),
]);
```

### Lazy-Load Permission Checks

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

const canDelete = ref(false);

// Only check when needed
const showDeleteButton = () => {
  canDelete.value = await hasPermission("post.delete");
};
</script>

<template>
  <div>
    <!-- Don't render until permission is checked -->
    <button v-if="canDelete" @click="deletePost">Delete</button>

    <!-- Or show placeholder while loading -->
    <Suspense>
      <template #default>
        <button @click="showDeleteButton">Delete</button>
      </template>
      <template #fallback>
        <span>Loading...</span>
      </template>
    </Suspense>
  </div>
</template>
```

## Edge Cases

### Circular Permission Dependencies

```typescript
// Handle complex permission dependencies
const { hasAll } = usePermission();

// A requires B and C
// B requires A (circular)
// Resolved by flattening: A requires C

const canAccessA = await hasAll(["permission.b", "permission.c"]);
```

### Permission Timing Issues

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

// Permissions might not be loaded immediately
// Use Suspense to handle this
defineAsyncComponent({
  setup: async () => {
    const canView = await hasPermission("view");

    if (!canView) {
      throw createError("Unauthorized");
    }

    return MyComponent;
  },
});
</script>
```

### Handle Stale Permissions

```typescript
// Implement permission expiry
class PermissionManager {
  private lastRefresh: number | null = null;
  private refreshInterval = 5 * 60 * 1000; // 5 minutes

  async checkAndRefresh() {
    const now = Date.now();

    if (!this.lastRefresh || now - this.lastRefresh > this.refreshInterval) {
      const { refresh } = usePermission();
      await refresh();
      this.lastRefresh = now;
    }
  }
}
```

## Custom Permission Middleware

### Implement Custom Logic

```typescript
// composables/useCustomPermissions.ts
export const useCustomPermissions = () => {
  const { hasPermission, hasAll, hasAny } = usePermission();

  return {
    // Check if can perform action on owned resource
    canEditOwned: async (userId: string, ownerId: string) => {
      if (userId === ownerId) {
        return true; // Can edit own resources
      }
      return await hasPermission("admin.edit");
    },

    // Time-based permission
    canAccessDuringBusinessHours: async () => {
      const hour = new Date().getHours();
      const inBusinessHours = hour >= 9 && hour < 17;

      return inBusinessHours || (await hasPermission("admin.access"));
    },

    // Location-based permission
    canAccessFromLocation: async (allowedLocations: string[]) => {
      const userLocation = await getUserLocation();

      return (
        allowedLocations.includes(userLocation) ||
        (await hasPermission("admin.access"))
      );
    },

    // Rate-limited permission
    canPerformAction: (() => {
      const actionCounts = new Map<string, number>();

      return async (action: string, limit: number) => {
        const count = actionCounts.get(action) ?? 0;

        if (count >= limit) {
          return await hasPermission("admin.bypass-limits");
        }

        actionCounts.set(action, count + 1);
        return true;
      };
    })(),
  };
};
```

## Integration Patterns

### With Pinia State Management

```typescript
// stores/permissionStore.ts
import { defineStore } from "pinia";
import { usePermission } from "vue-nuxt-permission";

export const usePermissionStore = defineStore("permission", () => {
  const { hasPermission, hasAll, hasAny, refresh, permissions } =
    usePermission();

  const canEdit = ref(false);
  const canDelete = ref(false);
  const canAdmin = ref(false);

  const initializePermissions = async () => {
    canEdit.value = await hasPermission("post.edit");
    canDelete.value = await hasPermission("post.delete");
    canAdmin.value = await hasPermission("admin.access");
  };

  const updatePermissions = async (newPerms: string[]) => {
    await refresh(newPerms);
    await initializePermissions();
  };

  return {
    permissions: computed(() => permissions.value),
    canEdit,
    canDelete,
    canAdmin,
    initializePermissions,
    updatePermissions,
  };
});
```

### With Error Boundaries

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();
const error = ref<string | null>(null);

const safeCheck = async (permission: string) => {
  try {
    return await hasPermission(permission);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Permission check failed";
    return false;
  }
};
</script>

<template>
  <div v-if="error" class="error-banner">
    {{ error }}
  </div>


  <div v-else-if="safeCheck('admin')">Admin content</div>
</template>
```

---

## Encrypted Permissions & Decryption Hook

In many enterprise or secure cloud environments, permissions are received in an encrypted format (e.g. encrypted AES ciphertext string, encoded binary payload, or nested within an encrypted JWT).

`vue-nuxt-permission` includes built-in support for synchronous and asynchronous decryption hooks.

### Built-in AES login payload decryption

Use `createPermissionCrypto` when the login response contains encrypted
`roles` and `permissions` fields in this shape:

```ts
interface EncryptedPayload {
  iv: string;   // Base64 AES-CBC initialization vector
  data: string; // Base64 ciphertext
}
```

Configure the same secret used by the API and decrypt the user before storing
it in your authentication store:

```env
VITE_CRYPTO_SECRET_KEY=base64:your-shared-secret
```

```ts
import {
  configurePermission,
  createPermissionCrypto,
} from "vue-nuxt-permission";

const permissionCrypto = createPermissionCrypto(
  import.meta.env.VITE_CRYPTO_SECRET_KEY,
);

async function login(credentials) {
  const response = await api.post("/login", credentials);
  const user = permissionCrypto.decryptAuthPayload(response.data.user);

  // Both values are now ready for the application.
  authStore.user = user;
  authStore.roles = user.roles;
  configurePermission(user.permissions);
}
```

`decryptAuthPayload()` preserves all other user properties. It accepts a field
list when an API uses different encrypted keys:

```ts
const user = permissionCrypto.decryptAuthPayload(response.data.user, [
  "roles",
  "permissions",
  "abilities",
]);
```

Already-decoded arrays are left unchanged. Missing, malformed, or incorrectly
encrypted fields become empty arrays so permission checks fail closed.

For a single value, use the same instance directly:

```ts
const encrypted = permissionCrypto.encrypt(["users.view"]);
const permissions = permissionCrypto.decrypt<string[]>(encrypted);
```

::: warning Security boundary
`VITE_` variables are included in the browser bundle. This feature protects the
payload format but does not replace server-side authorization. Every protected
API must still validate the authenticated user's roles and permissions.
:::

### Built-in decrypt hook

Use `createPermissionDecryptor` when only the permission list is encrypted and
you want to keep the existing hook-based configuration:

```ts
import {
  createPermissionDecryptor,
  PermissionPlugin,
} from "vue-nuxt-permission";

app.use(PermissionPlugin, {
  permissions: encryptedPermissions,
  decrypt: createPermissionDecryptor(import.meta.env.VITE_CRYPTO_SECRET_KEY),
});
```

### 1. Global Decryption Hook (`setDecryptHook`)

Configure a global hook that runs automatically whenever raw non-array permission payloads are passed into the system:

```typescript
import { setDecryptHook, configurePermission } from "vue-nuxt-permission";

// Define the global decrypt handler (supports async promises)
setDecryptHook(async (encryptedPayload: string) => {
  const decrypted = await authCryptoService.decrypt(encryptedPayload);
  // Must return string[]
  return decrypted.permissions;
});
```

### 2. Plugin & Configuration Hook (`decrypt` / `transform`)

You can also provide the decrypt hook directly during plugin installation or `configurePermission`:

```typescript
// main.ts (Vue 3)
import { createApp } from "vue";
import { PermissionPlugin } from "vue-nuxt-permission";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: "ENCRYPTED_AUTH_TOKEN_FROM_SERVER",
  decrypt: async (token) => {
    const claims = await parseSecureJwt(token);
    return claims.scope.split(" "); // returns string[]
  },
  persist: true, // Persists the decrypted permissions securely in Base64 storage
});
```

### 3. Automatic Synchronization

When using `decrypt` or `setDecryptHook`:
- `fetchPermissions` URLs that return encrypted strings are automatically decrypted.
- Permissions passed as `Ref<string>` or reactive payloads are decrypted before being committed to state.
- Decrypted permissions are automatically persisted (if `persist: true`) and cached.

---

## Dynamic Route Guard Factory (`createPermissionGuard`)

`vue-nuxt-permission` provides a universal router guard generator for Vue Router and Nuxt 3/4.

```typescript
// router/guards.ts
import { createPermissionGuard } from "vue-nuxt-permission";

export const permissionGuard = createPermissionGuard({
  loginPath: "/login",
  homePath: "/dashboard",
  authRoutes: ["/login", "/register", "/forgot-password"],
  protectedRoutes: [
    { path: "/admin", permissions: ["admin.access"] },
    {
      path: "/reports",
      permissions: { mode: "or", value: ["reports.view", "admin.access"] },
    },
  ],
  getAuthState: () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return {
      isAuthenticated: Boolean(token),
      permissions: user?.permissions || [],
    };
  },
  onDenied: (to, from) => {
    console.warn(`[Guard] Access denied to ${to.path}`);
  },
  fallbackRedirect: (to, from) => {
    return `/unauthorized?target=${encodeURIComponent(to.fullPath)}`;
  },
});
```

