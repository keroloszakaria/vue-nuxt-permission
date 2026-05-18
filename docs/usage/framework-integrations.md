# Framework Integrations

Using vue-nuxt-permission with Vue Router, Nuxt middleware, layouts, and stores.

## Vue Router Integration

### Global Router Guard

Protect routes with permission checking:

```ts
// router.ts
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";
import { ref } from "vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("./pages/Home.vue"),
    },
    {
      path: "/dashboard",
      component: () => import("./pages/Dashboard.vue"),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/admin",
      component: () => import("./pages/Admin.vue"),
      meta: {
        checkPermission: true,
        permissions: "admin",
      },
    },
    {
      path: "/editor",
      component: () => import("./pages/Editor.vue"),
      meta: {
        checkPermission: true,
        permissions: ["admin", "editor"],
      },
    },
  ],
});

// Create auth store
const authState = ref({
  isAuthenticated: false,
  permissions: [],
});

// Setup router guard
router.beforeEach((to, from, next) => {
  globalGuard(to, from, next, {
    getAuthState: () => authState.value,
    loginPath: "/login",
    homePath: "/",
    onAllowed: (to, from) => {
      console.log("Navigation allowed:", to.path);
    },
    onDenied: (to, from) => {
      console.log("Navigation denied:", to.path);
    },
  });
});

export default router;
```

### Route Meta Configuration

Define permissions in route metadata:

```ts
const routes = [
  // No authentication required
  {
    path: "/login",
    component: LoginPage,
  },

  // Requires authentication
  {
    path: "/profile",
    component: ProfilePage,
    meta: {
      requiresAuth: true,
    },
  },

  // Requires specific permission
  {
    path: "/admin",
    component: AdminPanel,
    meta: {
      checkPermission: true,
      permissions: "admin",
    },
  },

  // Requires any of multiple permissions
  {
    path: "/content",
    component: ContentManager,
    meta: {
      checkPermission: true,
      permissions: ["admin", "editor"],
    },
  },

  // Complex permission object
  {
    path: "/moderation",
    component: ModerationPanel,
    meta: {
      checkPermission: true,
      permissions: {
        permissions: ["admin", "moderator"],
        mode: "or",
      },
    },
  },

  // Nested routes with permissions
  {
    path: "/dashboard",
    component: DashboardLayout,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "analytics",
        component: Analytics,
        meta: {
          checkPermission: true,
          permissions: ["admin", "analyst"],
        },
      },
      {
        path: "reports",
        component: Reports,
        meta: {
          checkPermission: true,
          permissions: "admin",
        },
      },
    ],
  },
];
```

### Custom Navigation Guard

```ts
import { usePermission } from "vue-nuxt-permission";
import { RouteLocationNormalized } from "vue-router";

export const createPermissionGuard = () => {
  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next,
  ) => {
    const { can } = usePermission();

    // Skip guard for public routes
    if (!to.meta.requiresAuth && !to.meta.checkPermission) {
      return next();
    }

    // Check authentication
    if (to.meta.requiresAuth) {
      const isAuth = !!localStorage.getItem("token");
      if (!isAuth) {
        return next({ path: "/login", query: { redirect: to.fullPath } });
      }
    }

    // Check permissions
    if (to.meta.checkPermission && to.meta.permissions) {
      const allowed = await can(to.meta.permissions);
      if (!allowed) {
        return next({ path: "/forbidden" });
      }
    }

    next();
  };
};

// router.ts
router.beforeEach(createPermissionGuard());
```

## Nuxt Middleware

### Basic Middleware

Create a middleware file for permission checking:

```ts
// middleware/check-admin.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  const isAdmin = await can("admin");
  if (!isAdmin) {
    return navigateTo("/unauthorized");
  }
});
```

Apply to pages:

```vue
<!-- pages/admin/index.vue -->
<template>
  <AdminDashboard />
</template>

<script setup>
definePageMeta({
  middleware: "check-admin",
});
</script>
```

### Multiple Middleware

Chain multiple middleware:

```ts
// middleware/require-auth.ts
export default defineRouteMiddleware((to, from) => {
  const isAuthenticated = !!localStorage.getItem("authToken");
  if (!isAuthenticated) {
    return navigateTo("/login");
  }
});
```

```ts
// middleware/require-editor.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  const isEditor = await can({ permissions: ["admin", "editor"], mode: "or" });
  if (!isEditor) {
    return navigateTo("/forbidden");
  }
});
```

```vue
<!-- pages/editor.vue -->
<template>
  <EditorPanel />
</template>

<script setup>
definePageMeta({
  middleware: ["require-auth", "require-editor"],
});
</script>
```

### Middleware with Parameters

```ts
// middleware/check-permission.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  const requiredPermission = to.meta.permission as string;
  if (!requiredPermission) return;

  const allowed = await can(requiredPermission);
  if (!allowed) {
    return navigateTo("/forbidden");
  }
});
```

```vue
<!-- pages/content-manager.vue -->
<template>
  <ContentManager />
</template>

<script setup>
definePageMeta({
  middleware: "check-permission",
  permission: "content.manage",
});
</script>
```

## Layout-Level Permissions

### Conditional Layouts

```vue
<!-- app.vue or layouts/default.vue -->
<template>
  <div class="app">
    <!-- Admin layout -->
    <AdminLayout v-if="canSync('admin')" />

    <!-- Editor layout -->
    <EditorLayout v-else-if="canSync('editor')" />

    <!-- Default layout -->
    <DefaultLayout v-else />

    <RouterView />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

### Dynamic Layout Selection

```vue
<!-- app.vue -->
<template>
  <div>
    <component :is="layoutComponent">
      <RouterView />
    </component>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { usePermission } from "vue-nuxt-permission";
import AdminLayout from "~/layouts/AdminLayout.vue";
import EditorLayout from "~/layouts/EditorLayout.vue";
import DefaultLayout from "~/layouts/DefaultLayout.vue";

const { canSync } = usePermission();

const layoutComponent = computed(() => {
  if (canSync("admin")) return AdminLayout;
  if (canSync("editor")) return EditorLayout;
  return DefaultLayout;
});
</script>
```

## Pinia Store Integration

### Permission Store

```ts
// stores/permission.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePermission } from "vue-nuxt-permission";
import { getPermissionsFromStorage } from "vue-nuxt-permission";

export const usePermissionStore = defineStore("permission", () => {
  const permissions = ref<string[]>([]);
  const { setPermissions, can } = usePermission();

  // Load permissions from storage on init
  const initPermissions = () => {
    const stored = getPermissionsFromStorage();
    if (stored) {
      permissions.value = stored;
    }
  };

  // Update permissions
  const updatePermissions = (newPerms: string[]) => {
    permissions.value = newPerms;
    setPermissions(newPerms);
  };

  // Clear permissions (logout)
  const clearPermissions = () => {
    permissions.value = [];
    setPermissions([]);
  };

  // Check permission
  const hasPermission = async (perm: string | string[]) => {
    return await can(perm);
  };

  // Computed properties
  const isAdmin = computed(() => permissions.value.includes("admin"));
  const isEditor = computed(() => permissions.value.includes("editor"));
  const isViewer = computed(() => permissions.value.length > 0);

  return {
    permissions,
    initPermissions,
    updatePermissions,
    clearPermissions,
    hasPermission,
    isAdmin,
    isEditor,
    isViewer,
  };
});
```

### Using Permission Store

```vue
<template>
  <div>
    <!-- Using computed properties -->
    <AdminPanel v-if="permStore.isAdmin" />
    <EditorPanel v-else-if="permStore.isEditor" />

    <!-- Computed properties in templates -->
    <div v-if="permStore.isAdmin" class="admin-controls">
      <!-- Admin controls -->
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { usePermissionStore } from "~/stores/permission";

const permStore = usePermissionStore();

onMounted(() => {
  permStore.initPermissions();
});

// Use in event handlers
const handleAction = async () => {
  const allowed = await permStore.hasPermission("action.perform");
  if (!allowed) {
    console.error("Not allowed");
    return;
  }
  // Perform action
};
</script>
```

## Authentication Integration

### Login with Permission Fetch

```vue
<template>
  <form @submit.prevent="handleLogin">
    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button type="submit">Login</button>
  </form>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { usePermission } from "vue-nuxt-permission";
import { usePermissionStore } from "~/stores/permission";

const router = useRouter();
const permStore = usePermissionStore();
const { setPermissions } = usePermission();

const email = ref("");
const password = ref("");

const handleLogin = async () => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, password: password.value }),
  });

  if (!response.ok) throw new Error("Login failed");

  const data = await response.json();

  // Support common backend shapes:
  // { user, token } OR { data: { user, token } }
  const user = data?.user ?? data?.data?.user;
  const token = data?.token ?? data?.data?.token;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  // Store token
  localStorage.setItem("authToken", token);

  // Update permissions once (store already calls setPermissions internally)
  permStore.updatePermissions(permissions);

  // Redirect to dashboard
  router.push("/dashboard");
};
</script>
```

> Tip: If you are not using a dedicated permission store, call
> `setPermissions(permissions)` directly after login and `setPermissions([])`
> on logout.

### Logout

```ts
// composables/useAuth.ts
import { useRouter } from "vue-router";
import { usePermission } from "vue-nuxt-permission";
import { usePermissionStore } from "~/stores/permission";

export const useAuth = () => {
  const router = useRouter();
  const permStore = usePermissionStore();
  const { setPermissions } = usePermission();

  const logout = async () => {
    // Notify server
    await fetch("/api/logout", { method: "POST" });

    // Clear local data
    localStorage.removeItem("authToken");
    setPermissions([]);
    permStore.clearPermissions();

    // Redirect to login
    router.push("/login");
  };

  return { logout };
};
```

## API Data Protection

### Checking Permissions Before API Calls

```ts
// composables/useProtectedAPI.ts
import { usePermission } from "vue-nuxt-permission";

export const useProtectedAPI = () => {
  const { can } = usePermission();

  const fetchProtectedData = async (endpoint: string, permission: string) => {
    const allowed = await can(permission);
    if (!allowed) {
      throw new Error("Insufficient permissions");
    }

    const response = await fetch(endpoint);
    return response.json();
  };

  return { fetchProtectedData };
};
```

Usage:

```vue
<script setup>
import { ref } from "vue";
import { useProtectedAPI } from "~/composables/useProtectedAPI";

const { fetchProtectedData } = useProtectedAPI();
const data = ref(null);

const loadAdminData = async () => {
  try {
    data.value = await fetchProtectedData("/api/admin/data", "admin");
  } catch (error) {
    console.error(error);
  }
};
</script>
```

## Error Handling

### Permission Denied Handler

```ts
// middleware/handle-permission-denied.ts
export default defineRouteMiddleware((to, from) => {
  // Add custom error handling
  if (to.meta.forbidden) {
    console.error(`Access to ${to.path} is forbidden`);
    // Custom error tracking
    if (window.__errorTracker) {
      window.__errorTracker.captureEvent({
        type: "permission_denied",
        path: to.path,
      });
    }
  }
});
```

### Error Page Component

```vue
<!-- pages/forbidden.vue -->
<template>
  <div class="error-page">
    <h1>403 - Access Forbidden</h1>
    <p>You don't have permission to access this resource.</p>
    <RouterLink to="/">Return to Home</RouterLink>
  </div>
</template>
```
