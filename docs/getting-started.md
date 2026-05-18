# Getting Started

Get up and running with vue-nuxt-permission in minutes. This guide covers the basic setup and your first permission checks.

## Before You Start

Ensure you have:

- Node.js 18+ (Node 20+ recommended for Nuxt 4)
- Vue 3 or Nuxt 3 / Nuxt 4
- npm, yarn, or pnpm

## Installation

```bash
npm install vue-nuxt-permission
```

## First Permission Setup

### Nuxt 3 / Nuxt 4

Add the module to your `nuxt.config.ts` (file lives in the project root in
both Nuxt 3 and Nuxt 4):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["read", "write", "delete", "admin"],
  },
});
```

### Vue 3

Install the plugin in your `main.ts`:

```ts
// main.ts
import { createApp } from "vue";
import PermissionPlugin from "vue-nuxt-permission";
import App from "./App.vue";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["read", "write", "delete", "admin"],
});

app.mount("#app");
```

## Your First Directive

The `v-permission` directive shows or hides elements based on permissions.

```vue
<template>
  <div class="post">
    <h1>Blog Post</h1>
    <p>Post content here...</p>

    <!-- Only shows if user has 'write' permission -->
    <button v-permission="'write'">Edit Post</button>

    <!-- Only shows if user has 'delete' permission -->
    <button v-permission="'delete'">Delete Post</button>

    <!-- Only shows if user has 'admin' permission -->
    <div v-permission="'admin'">
      <h3>Admin Controls</h3>
      <!-- Admin-only content -->
    </div>
  </div>
</template>
```

By default, elements without the required permission are completely removed from the DOM.

## Your First Composable

The `usePermission()` composable provides permission checking in JavaScript.

```vue
<template>
  <div>
    <button @click="editPost" :disabled="!canEdit">
      {{ canEdit ? "Edit" : "Not Allowed" }}
    </button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can, canSync } = usePermission();

// Sync check for immediate use in templates
const canEdit = canSync("write");

const editPost = async () => {
  if (await can("write")) {
    // Perform edit operation
  }
};
</script>
```

## Using Multiple Permissions

Check if user has multiple permissions with `hasAll()` or `hasAny()`:

```ts
import { usePermission } from "vue-nuxt-permission";

const { hasAny, hasAll } = usePermission();

// User must have BOTH permissions
const isEditor = await hasAll(["write", "review"]);

// User must have EITHER permission
const canModify = await hasAny(["write", "edit"]);
```

## Your First Route Guard

Protect routes based on permissions using Nuxt middleware. In Nuxt 4 the
middleware file lives under `app/middleware/`; in Nuxt 3 it lives at
`middleware/`. The file contents are identical.

```ts
// Nuxt 3: middleware/admin.ts
// Nuxt 4: app/middleware/admin.ts
export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  if (!(await can("admin"))) {
    return navigateTo("/");
  }
});
```

Then add the middleware to your route:

```vue
<!-- pages/admin/dashboard.vue -->
<template>
  <div>
    <h1>Admin Dashboard</h1>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});
</script>
```

## Real-World: Login & Permissions Flow

In real applications, you don't hardcode permissions. You get them from your API after login. Here's the complete flow:

### Step 1: Login & Set Permissions

After login, use `setPermissions()` to save the user's permissions (updates memory + localStorage):

```ts
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

const login = async (credentials) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const { user, token } = await response.json();

  // ✅ This saves permissions to memory AND localStorage
  setPermissions(Array.isArray(user?.permissions) ? user.permissions : []);
  // user.permissions = ["create-users", "view-dashboard", "edit-posts", ...]

  localStorage.setItem("token", token);
};
```

::: warning Common Mistake
Do not update only your auth token/user and forget `setPermissions()`. Your
UI and route checks (`v-permission`, `can`, `globalGuard`) read from the
permission store, so always sync permissions right after login and clear them
on logout.
:::

### Step 2: Protect Routes with globalGuard

Use `globalGuard` in your Vue Router to automatically protect routes:

```ts
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginPage },
    {
      path: "/",
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "dashboard",
          component: Dashboard,
        },
        {
          path: "users",
          component: UserManagement,
          meta: {
            checkPermission: true, // ← Enable permission check
            permissions: ["manage-users"], // ← Required permission(s)
          },
        },
      ],
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    authRoutes: [{ path: "/login" }],
    protectedRoutes: [
      { path: "dashboard" },
      { path: "users", meta: { permissions: ["manage-users"] } },
    ],
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
      user: authStore.user, // guard reads user.permissions automatically
    }),
    loginPath: "/login",
    homePath: "/dashboard",
  });
});
```

::: tip How globalGuard works

1. **Not authenticated + protected route** → redirects to `loginPath`
2. **Authenticated + auth route (e.g. /login)** → redirects to `homePath`
3. **Route in `protectedRoutes` with `meta.permissions`** → checks required permissions
4. **Permission denied** → tries to find an accessible route, or redirects to `loginPath`
   :::

### Step 3: Show/Hide UI Elements

Now use `v-permission` in templates to control what the user sees:

```vue
<template>
  <div>
    <h1>Dashboard</h1>

    <button v-permission="'create-users'">Add User</button>
    <button v-permission="'edit-posts'">Edit Post</button>
    <button v-permission="'delete-posts'">Delete Post</button>
  </div>
</template>
```

### Step 4: Logout & Clear Permissions

```ts
const logout = () => {
  const { setPermissions } = usePermission();

  setPermissions([]); // Clears memory + localStorage
  localStorage.removeItem("token");
  router.push("/login");
};
```

### Complete Login Example

Here's a full login composable for a real project:

```ts
// Nuxt 3: composables/useAuth.ts
// Nuxt 4: app/composables/useAuth.ts
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";
import { useRouter } from "vue-router";

export function useAuth() {
  const router = useRouter();
  const { setPermissions } = usePermission();
  const user = ref<{ permissions?: string[] } | null>(null);
  const isAuthenticated = ref(false);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error("Invalid credentials");
    }

    const { data } = await res.json();

    // Save token
    localStorage.setItem("token", data.token);

    // Save user
    user.value = data.user;
    isAuthenticated.value = true;

    // ✅ Save permissions (memory + localStorage under "__v_permission__")
    setPermissions(
      Array.isArray(data.user?.permissions) ? data.user.permissions : [],
    );

    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("token");
    user.value = null;
    isAuthenticated.value = false;
    setPermissions([]);
    router.push("/login");
  };

  return { user, isAuthenticated, login, logout };
}
```

## Common Scenarios

### Admin Dashboard

Only admin users should see the admin section:

```vue
<template>
  <div>
    <AdminPanel v-permission="'admin'" />
  </div>
</template>
```

### Edit Controls

Show edit/delete buttons only when user has permission:

```vue
<template>
  <div class="card">
    <h2>{{ item.title }}</h2>
    <button v-permission="'edit-posts'">Edit</button>
    <button v-permission="'delete-posts'">Delete</button>
  </div>
</template>
```

### Feature Flags

Use permissions as feature flags:

```vue
<template>
  <div>
    <!-- New feature only visible if user has 'beta-features' -->
    <BetaFeature v-permission="'beta-features'" />
  </div>
</template>
```

### Conditional Rendering with Logic

```ts
const { hasPermission, hasAny } = usePermission();

// Show advanced options if user is moderator or admin
const showAdvanced = await hasAny(["moderator", "admin"]);

// Only allow deletion if user is owner AND has delete permission
const canDelete = isOwner && (await hasPermission("delete"));
```

## Next Steps

- [Configuration](./configuration) - Configure permissions and storage
- [Directive Reference](./api/v-permission) - Complete directive API
- [Composable Reference](./api/usePermission) - Complete composable API
- [Guards Reference](./guards) - globalGuard and route protection
- [Quick Reference](./quick-reference) - Copy-paste patterns
- [Advanced Usage](./usage/advanced) - Complex scenarios

## Troubleshooting

### `__v_permission__` Not Appearing in localStorage

You're probably using `configurePermission()` instead of `setPermissions()`:

```ts
// ❌ Wrong — only updates memory, NOT localStorage
configurePermission(userData.permissions);

// ✅ Correct — updates memory AND localStorage
const { setPermissions } = usePermission();
setPermissions(userData.permissions);
```

### Elements Still Showing Without Permission

Make sure permissions are set after login:

```ts
const { setPermissions } = usePermission();
setPermissions(["read", "write", "admin"]);
```

### usePermission() is Undefined

Ensure the plugin is properly installed:

```ts
// Nuxt: Add to modules list
modules: ['vue-nuxt-permission']

// Vue: Call before mount
app.use(PermissionPlugin, { permissions: [...] })
```

### Route Not Protected

Make sure the route has both `checkPermission: true` AND `permissions` in meta:

```ts
{
  path: '/admin',
  component: AdminPage,
  meta: {
    requiresAuth: true,
    checkPermission: true,              // ← Must be true
    permissions: ['admin-access'],       // ← Required permission
  }
}
```
