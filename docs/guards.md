# Route Guards & Middleware

Protect routes based on user permissions with Nuxt middleware and Vue Router guards.

## Nuxt Middleware

### Basic Permission Middleware

Create a middleware to protect routes:

```typescript
// middleware/permission.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();

  // Get required permission from route meta
  const requiredPermission = to.meta.permission as string | undefined;

  if (!requiredPermission) {
    return; // No permission required
  }

  // Check if user has the required permission
  const hasAccess = await hasPermission(requiredPermission);

  if (!hasAccess) {
    // Redirect to unauthorized page
    return navigateTo("/unauthorized");
  }
});
```

### Usage in Pages

```vue
<!-- pages/admin/dashboard.vue -->
<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    <AdminContent />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "permission",
  permission: "admin.access",
});
</script>
```

### Multiple Permission Requirements

```typescript
// middleware/multi-permission.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission, hasAll, hasAny } = usePermission();

  const requiredPermissions = to.meta.permissions as string[] | undefined;
  const requireAll = to.meta.requireAllPermissions ?? false;

  if (!requiredPermissions || requiredPermissions.length === 0) {
    return;
  }

  let hasAccess = false;

  if (requireAll) {
    // User needs all permissions
    hasAccess = await hasAll(requiredPermissions);
  } else {
    // User needs at least one permission
    hasAccess = await hasAny(requiredPermissions);
  }

  if (!hasAccess) {
    return navigateTo("/unauthorized");
  }
});
```

Usage:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: "multi-permission",
  permissions: ["editor", "moderator"],
  requireAllPermissions: false, // At least one
});
</script>
```

### Authentication First

Ensure user is authenticated before checking permissions:

```typescript
// middleware/auth-permission.ts
export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();

  // Check authentication first
  if (!authStore.isAuthenticated) {
    return navigateTo("/login");
  }

  // Then check permissions
  const requiredPermission = to.meta.permission as string | undefined;

  if (requiredPermission) {
    const { hasPermission } = usePermission();

    if (!(await hasPermission(requiredPermission))) {
      return navigateTo("/unauthorized");
    }
  }
});
```

### Redirect to Previous Page

Save and redirect to previous page after granting permission:

```typescript
// middleware/permission-with-redirect.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();
  const requiredPermission = to.meta.permission as string | undefined;

  if (!requiredPermission) {
    return;
  }

  if (!(await hasPermission(requiredPermission))) {
    // Save intended destination
    const redirectTo = encodeURIComponent(to.fullPath);
    return navigateTo(`/request-access?redirect=${redirectTo}`);
  }
});
```

## Vue Router Guards

### globalGuard — Ready-to-Use Guard

`globalGuard` is a complete navigation guard that handles authentication, authorization, and redirects. It's the recommended way to protect routes in Vue 3 apps.

#### Basic Setup

```typescript
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";

const authRoutes = [
  { path: "/login", name: "login", component: LoginPage },
  { path: "/register", name: "register", component: RegisterPage },
];

const protectedRoutes = [
  {
    path: "dashboard",
    component: Dashboard,
  },
  {
    path: "users",
    component: UserManagement,
    meta: {
      checkPermission: true,
      permissions: ["manage-users"],
    },
  },
  {
    path: "settings",
    component: Settings,
    meta: {
      checkPermission: true,
      permissions: { permissions: ["admin", "settings"], mode: "and" },
    },
  },
];

const routes = [
  ...authRoutes,
  {
    path: "/",
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: protectedRoutes,
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    authRoutes,
    protectedRoutes,
    getAuthState: () => {
      const token = localStorage.getItem("token");
      return {
        isAuthenticated: !!token,
        permissions: [], // optional: override permissions source
      };
    },
    loginPath: "/login",
    homePath: "/dashboard",
  });
});

export default router;
```

#### How globalGuard Works

The guard runs these checks **in order**:

| Scenario                                             | Action                                                  |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Not authenticated + protected route (`requiresAuth`) | Redirect to `loginPath`                                 |
| Authenticated + auth route (e.g. `/login`)           | Redirect to `homePath`                                  |
| Route has `checkPermission: true` + `permissions`    | Check user's permissions                                |
| Permission denied                                    | Find first accessible route, or redirect to `loginPath` |
| All checks pass                                      | Allow navigation                                        |

::: tip Automatic inference (v2.0.9+)
A route's membership in `protectedRoutes` is treated as an implicit
`requiresAuth: true`, and any `permissions` declared on the matched
`protectedRoutes` entry are treated as an implicit `checkPermission: true`.

This means you no longer have to repeat `meta.requiresAuth` and
`meta.checkPermission` on every route — simply listing the route in
`protectedRoutes` is enough. Explicit `meta` flags continue to work and
still take precedence when set.
:::

#### Route Meta Options

```typescript
meta: {
  requiresAuth: true,           // Route needs authentication
  checkPermission: true,         // Enable permission checking
  permissions: 'admin',          // Required permission(s)
}
```

The `permissions` field accepts all permission formats:

```typescript
// Single permission
meta: { checkPermission: true, permissions: 'admin' }

// Any of these (OR)
meta: { checkPermission: true, permissions: ['admin', 'editor'] }

// Complex mode
meta: { checkPermission: true, permissions: { permissions: ['admin', 'verified'], mode: 'and' } }
```

::: warning Important
If you don't use the `protectedRoutes` inference (v2.0.9+), then both
`checkPermission: true` AND `permissions` must be set in meta. With
`checkPermission` missing or false, the guard won't check permissions even
if `permissions` is defined.
:::

#### GuardOptions Reference

```typescript
interface GuardOptions {
  authRoutes?: Array<{ path: string }>; // Routes that don't need auth (login, register)
  protectedRoutes?: PermissionRoute[]; // Routes with permission metadata
  getAuthState?: () => AuthState; // Function returning auth state
  loginPath?: string; // Redirect path for unauthenticated (default: '/login')
  homePath?: string; // Redirect path for authenticated on auth pages (default: '/')
  onDenied?: (to, from) => void; // Callback when access is denied
  onAllowed?: (to, from) => void; // Callback when access is allowed
}

interface AuthState {
  isAuthenticated: boolean;
  permissions?: string[]; // Override permissions (optional)
  user?: {
    // User object (optional)
    permissions?: string[];
    [key: string]: any;
  };
}
```

#### Permission Resolution

The guard resolves permissions in this order (v2.0.9+):

1. `authState.permissions` (from `getAuthState()`)
2. `authState.user?.permissions` (auto-fallback so you don't have to flatten the user object)
3. Global config permissions (from `configurePermission()` / `setPermissions()`)

If permissions are discovered on `authState.user` and the package's global
state is still empty, the guard will automatically call `configurePermission`
with them. This keeps the `v-permission` directive and `usePermission()`
composable in sync after login — no extra wiring required.

```typescript
// Both of these work identically with globalGuard v2.0.9+:
getAuthState: () => ({
  isAuthenticated: true,
  permissions: authStore.user?.permissions || [],
});

// or simply
getAuthState: () => ({
  isAuthenticated: true,
  user: authStore.user, // { permissions: [...], ... }
});
```

#### Using with Pinia Auth Store

```typescript
import { useAuthStore } from "@/stores/auth";

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    authRoutes: [{ path: "/login" }, { path: "/register" }],
    protectedRoutes,
    getAuthState: () => {
      const auth = useAuthStore();
      return {
        isAuthenticated: auth.isAuthenticated,
        permissions: auth.user?.permissions || [],
        user: auth.user,
      };
    },
    loginPath: "/login",
    homePath: "/dashboard",
    onDenied: (to) => {
      console.warn(`Access denied to ${to.path}`);
    },
  });
});
```

#### Combining with Other Logic

You can add custom logic before or after globalGuard:

```typescript
router.beforeEach(async (to, from, next) => {
  // Custom logic before guard
  const { updateTitle } = useAppSettings();
  updateTitle(to.meta?.title || "My App");

  // Run the permission guard
  globalGuard(to, from, next, {
    authRoutes,
    protectedRoutes,
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
    }),
    loginPath: "/login",
    homePath: "/dashboard",
  });
});
```

### Manual Navigation Guard

```typescript
// router.ts or router/index.ts
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/admin",
      component: () => import("~/pages/admin.vue"),
      meta: {
        permission: "admin.access",
      },
    },
  ],
});

// Global before guard
router.beforeEach(async (to, from) => {
  // Get permission requirement from route meta
  const requiredPermission = to.meta.permission as string | undefined;

  if (!requiredPermission) {
    return true; // Allow navigation
  }

  // Check permission
  const { hasPermission } = usePermission();

  if (await hasPermission(requiredPermission)) {
    return true; // Allow navigation
  }

  return { name: "unauthorized" }; // Redirect to unauthorized page
});

export default router;
```

### Guard Specific Routes

```typescript
// router.ts
const router = createRouter({
  routes: [
    {
      path: "/admin",
      component: AdminLayout,
      beforeEnter: async (to, from) => {
        const { hasPermission } = usePermission();

        if (!(await hasPermission("admin.access"))) {
          return { name: "unauthorized" };
        }
      },
      children: [
        {
          path: "dashboard",
          component: AdminDashboard,
        },
        {
          path: "users",
          component: UserManagement,
          beforeEnter: async (to, from) => {
            const { hasPermission } = usePermission();

            if (!(await hasPermission("users.manage"))) {
              return { name: "unauthorized" };
            }
          },
        },
      ],
    },
  ],
});
```

## Permission Hierarchies

### Implement Role-Based Access

```typescript
// middleware/role-based.ts
export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();
  const { hasPermission } = usePermission();

  const requiredRole = to.meta.role as string | undefined;

  if (!requiredRole) {
    return;
  }

  // Map roles to permission strings
  const rolePermissions: Record<string, string[]> = {
    admin: ["admin.access", "users.manage", "content.moderate"],
    moderator: ["content.moderate", "users.view"],
    editor: ["content.edit", "content.publish"],
  };

  const currentRole = authStore.user?.role;
  const permissions = rolePermissions[currentRole] ?? [];

  if (!permissions.includes(requiredRole)) {
    return navigateTo("/unauthorized");
  }
});
```

Usage:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: "role-based",
  role: "admin",
});
</script>
```

## Common Patterns

### Nested Admin Routes

```typescript
// middleware/admin.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission()

  // All admin routes require admin.access
  if (!await hasPermission('admin.access')) {
    return navigateTo('/unauthorized')
  }
})

// pages/admin/users.vue
<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
  // Additional permission checks in page
})

const { hasPermission } = usePermission()
const canDeleteUsers = await hasPermission('users.delete')
</script>
```

### Feature Flags with Permissions

```typescript
// middleware/feature-flag.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();

  // Check if feature is enabled for user
  const featureFlags = to.meta.features as string[] | undefined;

  if (featureFlags) {
    for (const feature of featureFlags) {
      if (!(await hasPermission(feature))) {
        return navigateTo("/feature-not-available");
      }
    }
  }
});
```

### Conditional Redirects

```typescript
// middleware/smart-redirect.ts
export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();
  const { hasPermission } = usePermission();

  // Redirect non-authenticated users
  if (!authStore.isAuthenticated) {
    return navigateTo("/login");
  }

  // Redirect to appropriate dashboard based on role
  if (to.path === "/dashboard") {
    if (await hasPermission("admin.access")) {
      return navigateTo("/dashboard/admin");
    } else if (await hasPermission("editor")) {
      return navigateTo("/dashboard/editor");
    } else {
      return navigateTo("/dashboard/user");
    }
  }
});
```

### Permission Refresh Before Navigation

```typescript
// middleware/refresh-permissions.ts
export default defineRouteMiddleware(async (to, from) => {
  const { refresh } = usePermission();

  // Refresh permissions on route change
  // Useful for permission changes in background
  try {
    await refresh();
  } catch (error) {
    console.error("Failed to refresh permissions:", error);
  }
});
```

## Error Handling

### Catch Permission Errors

```typescript
// middleware/error-handling.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();
  const requiredPermission = to.meta.permission as string | undefined;

  if (!requiredPermission) {
    return;
  }

  try {
    const hasAccess = await hasPermission(requiredPermission);

    if (!hasAccess) {
      return navigateTo("/unauthorized");
    }
  } catch (error) {
    console.error("Permission check failed:", error);

    // Fail safely
    return navigateTo("/error");
  }
});
```

### Logging Permission Denials

```typescript
// middleware/audit-permissions.ts
export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();
  const { hasPermission } = usePermission();
  const requiredPermission = to.meta.permission as string | undefined;

  if (!requiredPermission) {
    return;
  }

  const hasAccess = await hasPermission(requiredPermission);

  if (!hasAccess) {
    // Log denied access attempt
    console.warn(
      `Permission denied for user ${authStore.user?.id}: ` +
        `trying to access ${to.path} (requires ${requiredPermission})`,
    );

    return navigateTo("/unauthorized");
  }
});
```

## Best Practices

### Keep Middleware Lightweight

```typescript
// ✓ Good - quick checks
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();

  if (to.meta.permission) {
    if (!(await hasPermission(to.meta.permission))) {
      return navigateTo("/unauthorized");
    }
  }
});

// ✗ Avoid - heavy computation
export default defineRouteMiddleware(async (to, from) => {
  // Don't do API calls, data fetching, etc. here
  const data = await fetch("/api/complex-data");
});
```

### Use Specific Permissions

```typescript
// ✓ Good - specific permissions
meta: {
  permission: "users.delete";
}

// ✗ Avoid - too broad
meta: {
  permission: "admin";
}
```

### Type-Safe Meta

```typescript
// Extend route meta with types
declare module "vue-router" {
  interface RouteMeta {
    permission?: string;
    permissions?: string[];
    requireAllPermissions?: boolean;
    role?: string;
  }
}
```
