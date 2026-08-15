# Vue Nuxt Permission

A powerful, unified permission and RBAC management library for **Vue 3**, **Nuxt 3**, and **Nuxt 4**.

Provides a declarative directive (`v-permission`), advanced route guards (`createPermissionGuard`, `globalGuard`), permission evaluation utilities, payload decryption hooks, Base64-encoded localStorage persistence, and multi-tiered caching.

[![GitHub](https://img.shields.io/badge/GitHub-vue--nuxt--permission-blue?style=flat&logo=github)](https://github.com/keroloszakaria/vue-nuxt-permission)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)](https://vuejs.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.x%20%7C%204.x-00DC82?style=flat&logo=nuxt.js)](https://nuxt.com/)

> Package: [npm](https://www.npmjs.com/package/vue-nuxt-permission) | Source: [GitHub](https://github.com/keroloszakaria/vue-nuxt-permission) | Docs: [vue-nuxt-permission.surge.sh](https://vue-nuxt-permission.surge.sh)

---

## Features

- 🛡️ **`v-permission` directive**: Declarative show/hide/remove elements based on permissions with `.once` and `:show` modifiers
- 🔐 **Encrypted Permissions & Decrypt Hook**: Built-in support for encrypted tokens, JWTs, and custom payload decrypt/transform hooks
- 🚦 **Advanced Route Guards**: `createPermissionGuard` factory & `globalGuard` with automatic fallback redirection and user permission synchronization
- ⚡ **Nuxt 3 & Nuxt 4 Module**: Native zero-config Nuxt module with auto-imported `usePermission()` composable and runtime plugin
- 🔄 **Singleton Reactive Store**: Global reactive permission state that instantly updates the DOM without needing manual component re-renders
- 🎯 **Rich Matching Modes**: Supports `exact`, `and`, `or`, `not`, `startWith`, `endWith`, and safe `regex` evaluation
- 💾 **Storage Persistence**: Transparent Base64-encoded storage persistence across page reloads (configurable via `persist: true/false`)
- 🚀 **High Performance Caching**: Multi-level cache layer with automatic and manual invalidation utilities
- 📘 **First-Class TypeScript**: Full type inference, autocompletion, and comprehensive typings

---

## Installation

### Install Package

```bash
npm install vue-nuxt-permission
```

Or with Yarn or pnpm:

```bash
yarn add vue-nuxt-permission
# or
pnpm add vue-nuxt-permission
```

### Setup for Nuxt 3

Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["dashboard.view", "user.create", "user.edit"],
    developmentMode: process.env.NODE_ENV === "development",
  },
});
```

The plugin and directive are automatically registered across your entire app.

Alternatively, add via Nuxt CLI:

```bash
npx nuxi module add vue-nuxt-permission
```

### Setup for Vue 3

Install the plugin in your app entry point:

```ts
// main.ts
import { createApp } from "vue";
import App from "./App.vue";
import { PermissionPlugin } from "vue-nuxt-permission";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["user.create", "user.view", "user.edit", "admin.panel"],
  developmentMode: process.env.NODE_ENV === "development",
});

app.mount("#app");
```

The directive and composables are now available throughout your app.

---

## Using the v-permission Directive

The `v-permission` directive controls element visibility based on user permissions.

### Basic Usage

```vue
<template>
  <!-- Element is removed from DOM if permission is missing -->
  <button v-permission="'user.create'">Create User</button>

  <!-- Multiple permissions (OR logic by default - any permission matches) -->
  <button v-permission="['user.edit', 'user.update']">Edit User</button>

  <!-- Admin-only section -->
  <section v-permission="'admin.panel'">
    <h2>Admin Dashboard</h2>
  </section>
</template>
```

### Understanding Remove vs Show Behavior

By default, elements without the required permission are **removed from the DOM entirely**.

Use the **`:show` modifier** to hide elements with `display: none` instead:

```vue
<template>
  <!-- Removed from DOM (not in page source) -->
  <button v-permission="'delete'">Delete</button>

  <!-- Hidden with CSS (in page source but not visible) -->
  <button v-permission:show="'delete'">Delete</button>
</template>
```

**When to use each:**

- **Default (remove)**: Use for sensitive features you don't want in the DOM at all
- **`:show` modifier**: Use when you need the element in the DOM (for testing, styling, or keeping layout)

### Directive Modifiers

| Modifier | Behavior                            | Use Case                                  |
| -------- | ----------------------------------- | ----------------------------------------- |
| (none)   | Removes element from DOM            | Hide sensitive features completely        |
| `:show`  | Hides with `display: none`          | Keep in DOM for layout/testing            |
| `.once`  | Checks permission only on mount     | One-time permission check, ignore changes |
| `.lazy`  | Doesn't react to permission changes | Static permission check, ignore updates   |

**Example with modifiers:**

```vue
<template>
  <!-- Removed from DOM, updates reactively -->
  <button v-permission="'edit'">Edit</button>

  <!-- Hidden instead of removed, updates reactively -->
  <button v-permission:show="'delete'">Delete</button>

  <!-- Removed from DOM, checked only once on mount -->
  <button v-permission.once="'admin'">Admin Setup</button>

  <!-- Hidden, won't react to permission changes -->
  <div v-permission:show.lazy="'premium'">Premium Feature</div>
</template>
```

### Advanced: Complex Permission Objects

For more control, use permission objects with different evaluation modes:

```vue
<template>
  <!-- AND mode: User must have BOTH permissions -->
  <button
    v-permission="{ permissions: ['user.edit', 'user.approve'], mode: 'and' }"
  >
    Edit & Approve
  </button>

  <!-- Regex: Match patterns (e.g., any admin permission) -->
  <div v-permission="{ permissions: ['^admin\\..*'], mode: 'regex' }">
    All admin features here
  </div>

  <!-- Exact: Only exact matches (not substring) -->
  <button v-permission="{ permissions: ['admin'], mode: 'exact' }">
    Exact Admin
  </button>

  <!-- Start with pattern -->
  <section v-permission="{ permissions: ['user'], mode: 'startWith' }">
    User-related features
  </section>
</template>
```

---

## Permission Utilities

Check permissions programmatically in your code using the composable or utility functions.

### Using the Composable

Import `usePermission()` in any component:

```ts
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, hasAny, hasAll } = usePermission();

// Check a single permission
if (await hasPermission("user.edit")) {
  // User can edit
}

// Check if user has ANY of the listed permissions
if (await hasAny(["admin.panel", "moderator.panel"])) {
  // User is either admin or moderator
}

// Check if user has ALL listed permissions
if (await hasAll(["user.edit", "user.approve"])) {
  // User can both edit and approve
}
```

### Individual Utility Functions

You can also import functions directly:

```ts
import {
  hasPermission,
  clearPermissionCache,
  getCurrentPermissions,
} from "vue-nuxt-permission";

// Check permission (works outside components too)
const allowed = await hasPermission("user.delete");

// Get all current permissions
const perms = getCurrentPermissions();

// Clear the permission cache (useful after user login/logout)
clearPermissionCache();

// Update permissions dynamically
import { configurePermission } from "vue-nuxt-permission";
configurePermission(["user.view", "user.edit"]);
```

**Sync vs Async behavior:**

- `hasPermission()` is **async** - always returns a Promise
- Permissions are evaluated asynchronously, so always use `await` or `.then()`
- Cache makes subsequent checks very fast

---

## Controlling Element Visibility in Different Scenarios

### Hide Admin Features

```vue
<template>
  <nav>
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/admin" v-permission="'admin.access'">Admin</router-link>
  </nav>
</template>
```

### Show Different Content Based on Permissions

```vue
<template>
  <section v-if="isEditor">
    <!-- Show editing interface for editors -->
    <EditPanel v-permission="'content.edit'" />
  </section>

  <section v-if="isViewer" v-permission:show="'content.view'">
    <!-- Show read-only view for viewers -->
    <ViewPanel />
  </section>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

const isEditor = await hasPermission("content.edit");
const isViewer = await hasPermission("content.view");
</script>
```

### Disable Controls Instead of Hiding

```vue
<template>
  <button @click="deleteItem" :disabled="!canDelete">Delete</button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();
const canDelete = await hasPermission("item.delete");

const deleteItem = async () => {
  if (await hasPermission("item.delete")) {
    // Delete the item
  }
};
</script>
```

---

## Permission Modes Reference

Different evaluation modes for complex permission logic:

| Mode           | Behavior                               | Example                                                                                         |
| -------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `or` (default) | User needs ANY permission in the list  | `v-permission="['admin', 'editor']"` → user is admin OR editor                                  |
| `and`          | User needs ALL permissions in the list | `v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }"` → admin AND verified       |
| `exact`        | Exact string match only, no substring  | `v-permission="{ permissions: ['admin'], mode: 'exact' }"`                                      |
| `startWith`    | Permission starts with pattern         | `v-permission="{ permissions: ['user.'], mode: 'startWith' }"` → any user.\* permission         |
| `endWith`      | Permission ends with pattern           | `v-permission="{ permissions: ['.edit'], mode: 'endWith' }"` → any \*.edit permission           |
| `regex`        | Regular expression matching            | `v-permission="{ permissions: ['^admin\\..*'], mode: 'regex' }"` → matches admin.\* permissions |

---

## Route Protection

Protect routes based on user authentication and permissions.

### Using globalGuard with Vue Router

The `globalGuard` function automatically handles authentication and permission checks:

```ts
// router/index.ts
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public routes
    {
      path: "/login",
      component: () => import("@/views/Login.vue"),
      meta: { isAuthRoute: true }, // Redirect authenticated users away
    },

    // Protected routes (require authentication)
    {
      path: "/dashboard",
      component: () => import("@/views/Dashboard.vue"),
      meta: { requiresAuth: true },
    },

    // Routes with specific permissions
    {
      path: "/admin",
      component: () => import("@/views/Admin.vue"),
      meta: {
        requiresAuth: true,
        checkPermission: true,
        permissions: ["admin.access"], // User must have this permission
      },
    },
  ],
});

// Setup the guard
router.beforeEach((to, from, next) => {
  globalGuard(to, from, next, {
    authRoutes: ["/login", "/register"], // Routes only for unauthenticated users
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
      permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
    }),
  });
});

export default router;
```

**Route Meta Fields:**

| Meta Field        | Type             | Description                                                                |
| ----------------- | ---------------- | -------------------------------------------------------------------------- |
| `requiresAuth`    | boolean          | Route requires user to be logged in                                        |
| `isAuthRoute`     | boolean          | Route is for unauthenticated users (login/register); redirect if logged in |
| `checkPermission` | boolean          | Check permissions for this route                                           |
| `permissions`     | string\|string[] | Required permission(s)                                                     |

**Common Patterns:**

```ts
// Require authentication + specific permission
{
  path: "/admin",
  component: Admin,
  meta: {
    requiresAuth: true,
    checkPermission: true,
    permissions: ["admin.access"],
  },
}

// Require multiple permissions (user must have all)
{
  path: "/moderation",
  component: Moderation,
  meta: {
    requiresAuth: true,
    checkPermission: true,
    permissions: ["moderator.access", "moderator.ban"],
  },
}

// Public route
{
  path: "/about",
  component: About,
  // No meta needed - accessible to everyone
}
```

### Using globalGuard with Nuxt 3 Middleware

In Nuxt 3, use a route middleware instead:

```ts
// middleware/auth.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();

  // Check if user is authenticated
  const token = useCookie("auth_token");
  if (!token.value) {
    return navigateTo("/login");
  }

  // Check if route requires specific permissions
  if (to.meta.requiresPermission) {
    const allowed = await hasPermission(to.meta.permissions as string);
    if (!allowed) {
      return navigateTo("/unauthorized");
    }
  }
});
```

Then apply to pages:

```vue
<!-- pages/admin.vue -->
<script setup>
definePageMeta({
  middleware: "auth",
  requiresPermission: true,
  permissions: "admin.access",
});
</script>
```

---

## Route Guards (`createPermissionGuard` & `globalGuard`)

### Built-in `createPermissionGuard` Factory

`vue-nuxt-permission` exports a built-in guard factory that supports route protection, authentication state resolution, permission checks, and automatic synchronization:

```ts
import { createPermissionGuard } from "vue-nuxt-permission";

const guard = createPermissionGuard({
  loginPath: "/login",
  homePath: "/dashboard",
  authRoutes: ["/login", "/register"],
  protectedRoutes: [
    { path: "/admin", permissions: ["admin.access"] },
    { path: "/users", permissions: { mode: "or", value: ["user.view", "admin.access"] } },
  ],
  getAuthState: () => ({
    isAuthenticated: !!localStorage.getItem("auth_token"),
    permissions: JSON.parse(localStorage.getItem("user_permissions") || "[]"),
  }),
  onDenied: (to, from) => {
    console.warn(`[Guard] Access denied to ${to.path}`);
  },
  fallbackRedirect: "/unauthorized", // or a function: (to, from) => `/unauthorized?target=${to.path}`
});

router.beforeEach(guard);
```

---

## Encrypted Permissions & Decryption Hook

In secure environments, backends often deliver permissions encrypted (e.g. AES ciphertext, encoded tokens, or nested JWT claims). `vue-nuxt-permission` provides first-class decryption and transformation hooks.

### 1. Global Hook (`setDecryptHook`)

```ts
import { setDecryptHook } from "vue-nuxt-permission";

// Define a global decryption hook (sync or async)
setDecryptHook(async (encryptedPayload) => {
  // e.g., decrypt AES payload or parse JWT
  const decrypted = await decryptPayload(encryptedPayload);
  return decrypted.permissions; // returns string[]
});
```

### 2. Plugin Option (`decrypt` / `transform`)

```ts
// Vue 3 Plugin
app.use(PermissionPlugin, {
  permissions: "ENCRYPTED_BASE64_OR_AES_STRING",
  decrypt: async (encrypted) => {
    return await myAuthService.decryptPermissions(encrypted);
  },
});

// Or dynamically during configurePermission
import { configurePermission } from "vue-nuxt-permission";

configurePermission(encryptedToken, {
  decrypt: (raw) => decodeJwtPermissions(raw),
  persist: true,
});
```

When a `decrypt` hook is provided:
- Encrypted payloads passed to `configurePermission()` or `fetchPermissions` are automatically decrypted before permission evaluation.
- Decrypted permissions are seamlessly synchronized into the reactive store and cached.

---

## Debugging & Troubleshooting

### Enable Debug Logging

To see detailed logs during development, enable `developmentMode`:

```ts
// Nuxt 3
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    permissions: ["user.view", "user.edit"],
    developmentMode: true, // Enable in development
  },
});

// Vue 3
app.use(PermissionPlugin, {
  permissions: ["user.view", "user.edit"],
  developmentMode: process.env.NODE_ENV === "development",
});
```

When enabled, you'll see console messages like:

```
[v-permission:core] Evaluated permission "user.edit": ALLOWED
[v-permission:core] Removing element from DOM
```

### Common Issues & Solutions

**Issue: Elements not hiding even though permission is missing**

```
❌ Problem:
<button v-permission="'unknown.permission'">Delete</button>
<!-- Button still shows -->

✅ Solution: Make sure the permission exists in your configuration
export default defineNuxtConfig({
  permission: {
    permissions: ["user.edit", "unknown.permission"], // Add it
  },
});
```

**Issue: Route guard not redirecting unauthorized users**

```
❌ Problem:
// Guard isn't blocking access to /admin

✅ Solution: Ensure getAuthState returns correct values
router.beforeEach((to, from, next) => {
  globalGuard(to, from, next, {
    getAuthState: () => ({
      // Make sure this reflects actual auth state
      isAuthenticated: !!localStorage.getItem("token"),
      permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
    }),
  });
});
```

**Issue: Permissions not updating after login**

```
❌ Problem:
const { hasPermission } = usePermission();
// Permission still shows false after user logs in

✅ Solution: Update permissions after login, clear cache
import { configurePermission, clearPermissionCache } from "vue-nuxt-permission";

async function login(credentials) {
  const response = await fetch("/api/login", { method: "POST", body: JSON.stringify(credentials) });
  const user = await response.json();

  // Store new permissions
  localStorage.setItem("permissions", JSON.stringify(user.permissions));

  // Clear old cache and update
  clearPermissionCache();
  configurePermission(user.permissions);
}
```

**Issue: Directive is reactive but I want it to check once on mount**

```
❌ Problem:
<div v-permission="permission">Content</div>
<!-- Updates when permission changes -->

✅ Solution: Use the .once modifier
<div v-permission.once="permission">Content</div>
<!-- Only checks on mount -->
```

**Issue: Element in DOM but I want it completely hidden**

```
❌ Problem:
<div v-permission:show="'admin'">Admin</div>
<!-- Element is in DOM, only hidden with CSS -->

✅ Solution: Remove :show modifier
<div v-permission="'admin'">Admin</div>
<!-- Element removed from DOM completely -->
```

**Issue: Composable says permission exists but directive hides element**

```
❌ Problem:
const { hasPermission } = usePermission();
await hasPermission("edit") // Returns true
// But <div v-permission="'edit'"> is hidden

✅ Solution: This usually means the permissions aren't synchronized
// Make sure all calls use the same permission definitions
// Use the exact same string: "edit" vs "user.edit" are different
```

### Quick Diagnostic Checklist

Before opening an issue:

- [ ] Is `developmentMode: true` enabled to see logs?
- [ ] Are permissions defined in the initial configuration?
- [ ] Did you call `clearPermissionCache()` after updating permissions?
- [ ] Are you using the exact same permission string everywhere? (case-sensitive)
- [ ] Is the route guard's `getAuthState()` returning correct values?
- [ ] Are you using `await` with `hasPermission()` since it's async?
- [ ] Did you reload the page after updating permissions in localStorage?

---

## Summary

**Key Takeaways:**

1. **Installation**: Use Nuxt module or Vue plugin depending on your setup
2. **Directives**: Use `v-permission` for UI elements, `:show` to hide instead of remove
3. **Permissions**: Define all permissions upfront in configuration
4. **Utilities**: Use `hasPermission`, `hasAny`, `hasAll` for programmatic checks
5. **Routes**: Protect routes with metadata and `globalGuard` or custom middleware
6. **Debugging**: Enable `developmentMode` and check console logs
7. **Updates**: Clear cache with `clearPermissionCache()` after permission changes

For more detailed documentation, see the [complete guide](./docs).

---

### v2.0.0

- Add `.lazy` and `.once` directive modifiers
- Rename `configurePermissionDirective` → `configurePermission`
- Optional `userPermissions` param in `hasPermission`
- Improved Base64 storage & caching
- Enhanced examples and docs

---

## Author

**Kerolos Zakaria**  
[Portfolio](https://keroloszakaria.surge.sh) • [GitHub](https://github.com/keroloszakaria) • [VS Code Marketplace](https://marketplace.visualstudio.com/publishers/keroloszakaria) • [npm](https://www.npmjs.com/settings/keroloszakaria/packages) • [LinkedIn](https://linkedin.com/in/keroloszakaria)

## License

MIT © 2025 Kerolos Zakaria
