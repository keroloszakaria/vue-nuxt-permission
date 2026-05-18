---
layout: home

hero:
  name: Vue Nuxt Permission
  text: "Declarative permission control"
  tagline: Define permissions once, use everywhere. Automatically removes unauthorized elements and guards routes with directives and composables.
  image:
    src: /logo.webp
    alt: Vue Nuxt Permission
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/keroloszakaria/vue-nuxt-permission

features:
  - icon: 🎯
    title: Declarative Control
    details: Use v-permission directive to show/hide content based on permissions. No conditional logic needed.
  - icon: 🔐
    title: Automatic Route Guards
    details: Protect routes instantly with middleware and guards. Redirect unauthorized users automatically.
  - icon: 🧩
    title: Multiple Evaluation Modes
    details: Support for AND, OR, NOT logic, wildcards, regex patterns, and complex permission expressions.
  - icon: ⚡
    title: Highly Reactive
    details: Permissions update instantly across your entire app. No manual refreshing or state management needed.
  - icon: 💾
    title: Built-in Storage
    details: Permissions are cached and persisted. Includes localStorage, sessionStorage, and custom storage adapters.
  - icon: 🌐
    title: Framework Agnostic
    details: Works with Vue 3, Nuxt 3, Nuxt 4, and any JavaScript framework. Single library for all your needs.
  - icon: 🚀
    title: SSR Safe
    details: Handles server-side rendering, hydration, and client-only scenarios gracefully.
  - icon: 📦
    title: Production Ready
    details: Lightweight, fully typed, battle-tested, and used in production across multiple teams.
---

## Why You Need This

Modern applications often struggle with permission and authorization:

- **Scattered permission logic** - Checking permissions across multiple components, routes, and services is messy
- **Inconsistent behavior** - Same permission checks in directives, guards, and components leads to bugs
- **Manual state management** - Managing permissions, caching, and refreshing requires boilerplate code
- **Route protection complexity** - Protecting routes and handling unauthorized access is error-prone
- **Reactive updates** - Updating permissions across the app without full page reload is difficult

**vue-nuxt-permission** solves all of these elegantly.

## Quick Example

### 1. Setup (Vue 3)

```ts
// main.ts
import { createApp } from "vue";
import PermissionPlugin from "vue-nuxt-permission";

const app = createApp(App);
app.use(PermissionPlugin, {
  permissions: ["read", "write", "admin"],
});
app.mount("#app");
```

Or set permissions dynamically after login:

```ts
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();
setPermissions(["read", "write", "admin"]);
```

### 2. Use in Templates

```vue
<!-- Hide content if user doesn't have permission -->
<template>
  <div>
    <h1>Public Section</h1>
    <AdminPanel v-permission="'admin'" />
    <EditButton v-permission="'write'" />
  </div>
</template>
```

### 3. Protect Routes

```ts
// router.ts
import { globalGuard } from "vue-nuxt-permission";

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
    }),
    loginPath: "/login",
    homePath: "/dashboard",
  });
});
```

### 4. Use in Code

```ts
// composables/useUserActions.ts
const { hasPermission, hasAny } = usePermission();

if (hasPermission("write")) {
  // Allow editing
}

if (hasAny(["admin", "moderator"])) {
  // Show moderation tools
}
```

That's it! Your app now has:

- ✅ Centralized permission management
- ✅ Automatic element visibility control
- ✅ Route-level protection
- ✅ Reactive permission updates
- ✅ Cached persistent permissions

## What Users Experience

**Without vue-nuxt-permission:**

- User sees disabled buttons for actions they can't perform
- Unauthorized routes are accessible but show error states
- Permission checks are duplicated everywhere
- Page reload required to update permissions

**With vue-nuxt-permission:**

- Unauthorized content is removed from DOM completely
- Routes are protected before rendering
- Permission logic defined once, used everywhere
- Permissions update in real-time
- Zero boilerplate code

## Installation

Get started in under a minute:

```bash
npm install vue-nuxt-permission
```

Then check out the [Getting Started](./getting-started) guide.

## When to Use

**Perfect for:**

- Admin dashboards with role-based access control
- SaaS platforms with multiple permission tiers
- Team collaboration apps with granular permissions
- Content management systems with editorial workflows
- Internal tools with feature-based permissions
- Progressive feature rollouts

**Maybe not needed for:**

- Simple public websites (no permission control)
- Apps with only authenticated vs unauthenticated
- One-permission-fits-all scenarios

## Key Concepts

### Permissions

Strings that represent abilities or roles. Examples: `'read'`, `'write'`, `'admin'`, `'moderator'`, `'delete'`.

### Directives

Use `v-permission` to automatically show/hide elements:

```vue
<button v-permission="'delete'">Delete</button>
```

### Composables

Use `usePermission()` to check permissions in JavaScript:

```ts
const { hasPermission, hasAny, hasAll } = usePermission();
```

### Guards

Protect routes with `globalGuard`:

```ts
import { globalGuard } from "vue-nuxt-permission";

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    getAuthState: () => ({ isAuthenticated: !!token }),
    loginPath: "/login",
  });
});
```

## Community & Support

- 📖 [Full Documentation](/getting-started)
- 🐛 [GitHub Issues](https://github.com/keroloszakaria/vue-nuxt-permission/issues)
- 💬 [GitHub Discussions](https://github.com/keroloszakaria/vue-nuxt-permission/discussions)
- 📦 [npm Package](https://www.npmjs.com/package/vue-nuxt-permission)

## License

MIT © [Kerolos Zakaria](https://github.com/keroloszakaria)
