# Installation

Get vue-nuxt-permission set up in your project with these step-by-step instructions.

## Install Package

Choose your package manager:

### npm

```bash
npm install vue-nuxt-permission
```

### Yarn

```bash
yarn add vue-nuxt-permission
```

### pnpm

```bash
pnpm add vue-nuxt-permission
```

## Setup for Nuxt 3 / Nuxt 4

The recommended way to use vue-nuxt-permission inside Nuxt is as a module.
The same module works for both Nuxt 3 and Nuxt 4 — no separate package or
adapter is needed.

::: tip Nuxt 4 directory layout
Nuxt 4 moved the application source into an `app/` directory by default
(`srcDir: 'app/'`). Configuration files (`nuxt.config.ts`, `package.json`,
`tsconfig.json`) stay in the project root, but the following directories
live **under `app/`** in Nuxt 4:

- `app/middleware/` (was `middleware/` in Nuxt 3)
- `app/pages/`, `app/layouts/`, `app/components/`, `app/composables/`

Examples throughout these docs use the Nuxt 3 paths (`middleware/`, `pages/`).
If you are on Nuxt 4 with the default layout, prefix them with `app/`.
Everything else (auto-imports, module config, `nuxt.config.ts` keys) is
identical.
:::

### 1. Add to nuxt.config.ts

```ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    // Your permission configuration
  },
});
```

### 2. Configure Permissions

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    // Define your permissions
    permissions: ["read", "write", "admin"],

    // Save to localStorage on install (default: true)
    persist: true,
  },
});
```

### 3. Use in Your App

The plugin automatically installs the directive and composable. Start using them immediately:

```vue
<!-- pages/admin.vue -->
<template>
  <div>
    <h1 v-permission="'admin'">Admin Dashboard</h1>
    <button v-permission="'write'">Edit</button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

const canDelete = await hasPermission("delete");
</script>
```

## Setup for Vue 3

For standalone Vue 3 applications (without Nuxt).

### 1. Install Plugin

```ts
// main.ts
import { createApp } from "vue";
import PermissionPlugin from "vue-nuxt-permission";
import App from "./App.vue";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["read", "write", "admin"],
  persist: true, // Save to localStorage (default)
});

app.mount("#app");
```

app.mount("#app");

````

### 2. Configure TypeScript (Optional)

For better type hints, create a declaration file:

```ts
// types/permission.d.ts
import "vue-nuxt-permission";

declare module "vue-nuxt-permission" {
  interface PermissionConfig {
    permissions: "read" | "write" | "admin";
  }
}
````

### 3. Use in Components

```vue
<!-- components/Dashboard.vue -->
<template>
  <div>
    <button v-permission="'write'">Edit</button>
    <AdminPanel v-permission="'admin'" />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, hasAny } = usePermission();

const canEdit = await hasPermission("write");
</script>
```

## Plugin Registration Details

The plugin automatically:

- Installs the `v-permission` directive globally
- Provides the `usePermission()` composable
- Sets up Nuxt middleware integration (Nuxt 3 and Nuxt 4)
- Initializes permission storage

You don't need to do anything extra - just install the module.

## Verify Installation

To verify everything is working, create a simple test:

### Nuxt

```ts
// middleware/permission-check.ts
export default defineRouteMiddleware(() => {
  const { hasPermission } = usePermission();

  console.log("Permissions loaded:", hasPermission);
});
```

### Vue

```ts
// src/main.ts
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();
console.log("Plugin installed:", typeof hasPermission === "function");
```

## Troubleshooting

### Directive Not Found

Make sure the module is added to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
});
```

### usePermission() is Undefined

Ensure the plugin is installed before using it:

```ts
// Nuxt - automatic, no extra setup needed

// Vue - make sure to call app.use() before mounting
app.use(PermissionPlugin, { permissions: [...] })
app.mount('#app')
```

### Permissions Not Loading

Make sure permissions are set after login using `setPermissions()`:

```ts
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();
setPermissions(["read", "write", "admin"]);
```

## Next Steps

- [Getting Started](./getting-started) - Initial setup examples
- [Configuration](./configuration) - Detailed configuration options
- [Quick Reference](./quick-reference) - Common patterns
