# createGuard Function

Create custom Vue Router navigation guards with permission checking.

## Overview

The `createGuard()` function creates a reusable navigation guard factory for protecting routes with permission-based access control.

## Import

```ts
import { createPermissionGuard } from "vue-nuxt-permission";
```

## Usage

### Basic Setup

```ts
// router.ts
import { createRouter, createWebHistory } from "vue-router";
import { createPermissionGuard } from "vue-nuxt-permission";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/admin",
      component: AdminPanel,
      meta: {
        checkPermission: true,
        permissions: "admin",
      },
    },
  ],
});

// Create the guard with options
router.beforeEach((to, from, next) => {
  createPermissionGuard({
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
      permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
    }),
    loginPath: "/login",
    homePath: "/",
  })(to, from, next);
});

export default router;
```

## API

### Function Signature

```ts
function createPermissionGuard(options: GuardOptions) {
  return (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => void
}
```

## GuardOptions

### `getAuthState`

Callback to get current authentication and permission state.

**Type**: `() => AuthState`

**Example**:

```ts
getAuthState: () => ({
  isAuthenticated: !!localStorage.getItem("token"),
  permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
});
```

### `authRoutes`

Routes that require authentication to be redirected from.

**Type**: `Array<{ path: string }>`

**Example**:

```ts
authRoutes: [{ path: "/login" }, { path: "/register" }];
```

### `protectedRoutes`

Routes that have permission requirements.

**Type**: `PermissionRoute[]`

**Example**:

```ts
protectedRoutes: [
  {
    path: "/admin",
    meta: { permissions: "admin" },
  },
  {
    path: "/dashboard",
    meta: { permissions: ["admin", "editor"] },
    children: [
      {
        path: "analytics",
        meta: { permissions: "analyst" },
      },
    ],
  },
];
```

### `loginPath`

Path to redirect to when not authenticated.

**Type**: `string`

**Default**: `"/login"`

**Example**:

```ts
loginPath: "/login";
```

### `homePath`

Path to redirect authenticated users away from auth routes.

**Type**: `string`

**Default**: `"/"`

**Example**:

```ts
homePath: "/dashboard";
```

### `deniedPath`

Where an authenticated user goes when a route is denied and no other protected
route is accessible. The guard lets this redirect through even when it is an
auth route, so it never loops back to `homePath`.

**Type**: `string`

**Default**: `loginPath`

**Example**:

```ts
deniedPath: "/403";
```

### `onNoAccess`

Called (and awaited) right before redirecting an authenticated user who has no
accessible route. Useful for clearing the session.

**Type**: `(to: RouteLocationNormalized, from: RouteLocationNormalized) => void | Promise<void>`

**Example**:

```ts
onNoAccess: () => authStore.clearSession();
```

### `onDenied`

Callback when access is denied.

**Type**: `(to: RouteLocationNormalized, from: RouteLocationNormalized) => void`

**Example**:

```ts
onDenied: (to, from) => {
  console.log(`Access denied to ${to.path}`);
  logSecurityEvent({ type: "permission_denied", path: to.path });
};
```

### `onAllowed`

Callback when access is allowed.

**Type**: `(to: RouteLocationNormalized, from: RouteLocationNormalized) => void`

**Example**:

```ts
onAllowed: (to, from) => {
  console.log(`Access allowed to ${to.path}`);
  analyticsTrack({ event: "route_access", path: to.path });
};
```

## Route Meta Configuration

### `requiresAuth`

Route requires user to be authenticated.

```ts
{
  path: "/dashboard",
  component: Dashboard,
  meta: {
    requiresAuth: true,
  },
}
```

### `checkPermission`

Route requires permission check.

```ts
{
  path: "/admin",
  component: AdminPanel,
  meta: {
    checkPermission: true,
    permissions: "admin",
  },
}
```

### `permissions`

Permission required for route access.

```ts
{
  path: "/editor",
  component: EditorPanel,
  meta: {
    checkPermission: true,
    // String
    permissions: "editor",

    // Array (OR logic)
    // permissions: ["editor", "admin"],

    // Object (complex logic)
    // permissions: {
    //   permissions: ["admin", "verified"],
    //   mode: "and",
    // },
  },
}
```

## Examples

### Complete Setup

```ts
// router.ts
import { createRouter, createWebHistory } from "vue-router";
import { createPermissionGuard } from "vue-nuxt-permission";
import { useAuthStore } from "~/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      component: () => import("~/pages/login.vue"),
    },
    {
      path: "/dashboard",
      component: () => import("~/pages/dashboard.vue"),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/admin",
      component: () => import("~/pages/admin.vue"),
      meta: {
        checkPermission: true,
        permissions: "admin",
      },
    },
    {
      path: "/editor",
      component: () => import("~/pages/editor.vue"),
      meta: {
        checkPermission: true,
        permissions: ["admin", "editor"],
      },
    },
  ],
});

// Setup guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  createPermissionGuard({
    getAuthState: () => ({
      isAuthenticated: authStore.isLoggedIn,
      permissions: authStore.user?.permissions || [],
    }),
    authRoutes: [{ path: "/login" }],
    protectedRoutes: [
      {
        path: "/admin",
        meta: { permissions: "admin" },
      },
    ],
    loginPath: "/login",
    homePath: "/dashboard",
    onAllowed: (to) => {
      console.log(`Navigating to ${to.path}`);
    },
    onDenied: (to) => {
      console.log(`Access denied to ${to.path}`);
    },
  })(to, from, next);
});

export default router;
```

### With Pinia Store

```ts
// stores/auth.ts
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    permissions: (state) => state.user?.permissions || [],
  },
});

// main.ts
import { createPermissionGuard } from "vue-nuxt-permission";

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  createPermissionGuard({
    getAuthState: () => ({
      isAuthenticated: authStore.isLoggedIn,
      permissions: authStore.permissions,
    }),
    loginPath: "/login",
  })(to, from, next);
});
```

### Nested Routes

```ts
const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "dashboard",
        component: AdminDashboard,
        meta: {
          checkPermission: true,
          permissions: "admin.dashboard",
        },
      },
      {
        path: "users",
        component: UserManager,
        meta: {
          checkPermission: true,
          permissions: "admin.users",
        },
      },
      {
        path: "settings",
        component: AdminSettings,
        meta: {
          checkPermission: true,
          permissions: {
            permissions: ["admin.settings", "admin.all"],
            mode: "or",
          },
        },
      },
    ],
  },
];
```

### Complex Permission Logic

```ts
const routes = [
  {
    path: "/content",
    component: ContentManager,
    meta: {
      checkPermission: true,
      permissions: {
        permissions: ["content.manage", "admin"],
        mode: "or",
      },
    },
  },
  {
    path: "/moderation",
    component: ModerationPanel,
    meta: {
      checkPermission: true,
      permissions: {
        permissions: ["moderator", "verified"],
        mode: "and",
      },
    },
  },
];
```

### Error Handling

```ts
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  createPermissionGuard({
    getAuthState: () => {
      try {
        return {
          isAuthenticated: authStore.isLoggedIn,
          permissions: authStore.permissions,
        };
      } catch (error) {
        console.error("Auth state error:", error);
        return {
          isAuthenticated: false,
          permissions: [],
        };
      }
    },
    loginPath: "/login",
    onDenied: (to, from) => {
      // Log security event
      logSecurityEvent({
        type: "access_denied",
        path: to.path,
        user: authStore.user?.id,
        timestamp: new Date(),
      });

      // Show user-friendly message
      showNotification({
        type: "error",
        message: "You don't have permission to access this page",
      });
    },
  })(to, from, next);
});
```

## Type Definitions

```ts
interface GuardOptions {
  authRoutes?: Array<{ path: string }>;
  protectedRoutes?: PermissionRoute[];
  getAuthState?: () => AuthState;
  loginPath?: string;
  homePath?: string;
  deniedPath?: string;
  onNoAccess?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void | Promise<void>;
  decrypt?: DecryptHook;
  transform?: DecryptHook;
  onDenied?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
  onAllowed?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
}

interface AuthState {
  isAuthenticated: boolean;
  permissions?: string[];
  user?: {
    permissions?: string[];
    [key: string]: any;
  };
}

interface PermissionRoute {
  path: string;
  meta?: RouteMetaWithPermissions;
  children?: PermissionRoute[];
  [key: string]: any;
}

interface RouteMetaWithPermissions {
  requiresAuth?: boolean;
  checkPermission?: boolean;
  permissions?: PermissionValue;
  isAuthRoute?: boolean;
  [key: string]: any;
}
```

## Best Practices

1. **Always provide `getAuthState`** - The guard needs to know current auth status
2. **Define auth routes** - List routes users should be redirected from when authenticated
3. **Handle callbacks** - Use `onDenied` for logging and analytics
4. **Validate permissions server-side** - Never trust client-side checks alone
5. **Clear permissions on logout** - Ensure guards respect logged-out state

## Common Patterns

### Route-Based Access Control

```ts
{
  path: "/admin",
  meta: {
    checkPermission: true,
    permissions: "admin",
  },
},
{
  path: "/editor",
  meta: {
    checkPermission: true,
    permissions: ["admin", "editor"],
  },
},
```

### Feature-Based Access Control

```ts
{
  path: "/beta-features",
  meta: {
    checkPermission: true,
    permissions: "beta-access",
  },
},
```

### Role-Based Access Control

```ts
{
  path: "/super-admin",
  meta: {
    checkPermission: true,
    permissions: "super-admin",
  },
},
```
