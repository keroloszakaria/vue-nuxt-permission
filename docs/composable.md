# usePermission Composable

The `usePermission()` composable provides programmatic access to permission checks with full TypeScript support.

::: tip Safe to call anywhere (v2.0.9+)
`usePermission()` is bound to a singleton global reactive store, so it can
be called at module top level (outside `setup()` / a component) — typical
for auth bootstrap code that runs before any component mounts. The
`permissions` ref it returns is shared across every call site, so calling
`setPermissions()` from one module updates the directive and every other
consumer immediately.
:::

## Basic Usage

```typescript
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, canSync, permissions } = usePermission();

// Async check
if (await hasPermission("admin.delete")) {
  // User can delete
}

// Sync check (in templates, no await needed)
if (canSync("admin.delete")) {
  // User can delete
}
```

> **Tip:** `hasPermission` and `can` are aliases — use whichever you prefer.

## API Reference

### permissions

Get the current list of user permissions (reactive):

```typescript
import { usePermission } from "vue-nuxt-permission";

const { permissions } = usePermission();

// Reactive array of permission strings
console.log(permissions.value); // ['user.view', 'post.edit', 'admin.access']

// Watch for changes
watch(permissions, (newPermissions) => {
  console.log("Permissions updated:", newPermissions);
});
```

### hasPermission(permission)

Check if user has a specific permission. Supports all permission formats:

```typescript
const { hasPermission } = usePermission();

// Single permission string
await hasPermission("user.view");

// Array (OR logic)
await hasPermission(["editor", "admin"]);

// Object with mode
await hasPermission({
  permissions: ["post.edit", "post.publish"],
  mode: "and",
});

// Pattern matching
await hasPermission({
  permissions: ["admin."],
  mode: "startWith",
});

// Wildcard
await hasPermission("*");
```

Returns `boolean | Promise<boolean>` - Synchronous result if already cached, async otherwise.

### hasAll(permissions)

Check if user has ALL specified permissions (AND logic):

```typescript
const { hasAll } = usePermission();

// User needs both permissions
const canManageContent = await hasAll(["post.edit", "post.publish"]);

// Equivalent to:
// await hasPermission({
//   permissions: ['post.edit', 'post.publish'],
//   mode: 'and'
// })
```

### hasAny(permissions)

Check if user has ANY of the specified permissions (OR logic):

```typescript
const { hasAny } = usePermission();

// User needs at least one permission
const canViewContent = await hasAny(["user.view", "admin.access"]);

// Equivalent to:
// await hasPermission(['user.view', 'admin.access'])
```

### refresh()

Clear the permission cache and reload permissions from the current source (global config or storage):

```typescript
const { refresh } = usePermission();

// Clear cache and reload permissions
refresh();
```

### setPermissions(permissions)

Update user permissions at runtime. Persists to storage automatically:

```typescript
const { setPermissions } = usePermission();

// Set new permissions (replaces current ones)
setPermissions(["user.view", "post.edit", "admin.access"]);
```

### canSync(permission)

Synchronous permission check — instant, no `await` needed. Supports all modes including `startWith`, `endWith`, and `regex`:

```typescript
const { canSync } = usePermission();

const isAdmin = canSync("admin"); // No await
const canEditOrView = canSync(["edit", "view"]); // OR logic
const hasAll = canSync({ permissions: ["read", "write"], mode: "and" });
```

## Common Patterns

### Login & Set Permissions

The most common pattern — set permissions after API login:

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

async function handleLogin(email: string, password: string) {
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const { user, token } = await response.json();

  // ✅ Saves to memory AND localStorage (key: __v_permission__)
  setPermissions(user.permissions);

  localStorage.setItem("token", token);
  router.push("/dashboard");
}

async function handleLogout() {
  setPermissions([]); // Clear everything
  localStorage.removeItem("token");
  router.push("/login");
}
</script>
```

::: tip setPermissions vs configurePermission

- `setPermissions()` — clears the cache, updates memory, and persists to localStorage. Use this for login/logout flows.
- `configurePermission()` — lower-level: updates memory and (by default) persists to storage. Pass `{ persist: false }` to skip writes.
  :::

### Check Permissions on Mount

```vue
<script setup lang="ts">
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();
const canEdit = ref(false);

onMounted(async () => {
  canEdit.value = await hasPermission("post.edit");
});
</script>

<template>
  <button v-if="canEdit" @click="editPost">Edit Post</button>
</template>
```

### Conditional Logic in Methods

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, hasAll, hasAny } = usePermission();

async function deletePost(postId: string) {
  // Check permission before action
  if (!(await hasPermission("post.delete"))) {
    alert("You do not have permission to delete posts");
    return;
  }

  // Perform deletion
  await api.post.delete(postId);
}

async function approveContent(contentId: string) {
  // Multiple permissions required
  if (!(await hasAll(["content.review", "content.approve"]))) {
    alert("You do not have permission to approve content");
    return;
  }

  await api.content.approve(contentId);
}

async function viewAnalytics() {
  // User needs one of several roles
  if (!(await hasAny(["analytics.view", "admin.access", "moderator"]))) {
    alert("You cannot view analytics");
    return;
  }

  navigateTo("/analytics");
}
</script>
```

### Watch Permissions for Changes

```vue
<script setup lang="ts">
import { watch } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { permissions } = usePermission();

// React to permission changes
watch(permissions, (newPerms) => {
  console.log("User permissions changed:", newPerms);

  // Could trigger UI updates, role changes, etc.
  reloadUserInterface();
});
</script>
```

### Update After User Action

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { setPermissions, refresh } = usePermission();

async function promoteToModerator() {
  // API call to promote user
  await api.user.setRole(userId, "moderator");

  // Fetch new permissions and update
  const res = await fetch(`/api/user/${userId}/permissions`);
  const { permissions } = await res.json();
  setPermissions(permissions);

  // UI updates automatically through reactive permissions
}

async function logout() {
  // Clear all permissions (memory + localStorage)
  setPermissions([]);
}
</script>
```

### Async Permission Loading

```typescript
// composables/useAdminAccess.ts
import { usePermission } from "vue-nuxt-permission";

export const useAdminAccess = () => {
  const { hasPermission, hasAll } = usePermission();

  return {
    canManageUsers: () => hasPermission("users.manage"),
    canManageContent: () => hasPermission("content.moderate"),
    isFullAdmin: () => hasAll(["admin.users", "admin.content", "admin.system"]),
    canAccessAnalytics: () => hasPermission("analytics.view"),
  };
};

// In component
const { canManageUsers, isFullAdmin } = useAdminAccess();

if (await canManageUsers()) {
  // Show user management section
}
```

### Protect Component Actions

```vue
<script setup lang="ts">
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, hasAll } = usePermission();
const isProcessing = ref(false);

async function handleBulkDelete(items: Item[]) {
  // Check permission before starting
  if (!(await hasPermission("item.delete"))) {
    showError("You do not have permission to delete items");
    return;
  }

  isProcessing.value = true;
  try {
    // Process deletion
    await api.items.deleteMany(items.map((i) => i.id));
    showSuccess(`Deleted ${items.length} items`);
  } finally {
    isProcessing.value = false;
  }
}

async function handleApproveAll(items: Item[]) {
  if (!(await hasAll(["review.approve", "review.publish"]))) {
    showError("You do not have permission to approve and publish");
    return;
  }

  isProcessing.value = true;
  try {
    await api.items.approveMany(items.map((i) => i.id));
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <button
    @click="handleBulkDelete(selectedItems)"
    :disabled="isProcessing || !selectedItems.length"
  >
    Delete Selected
  </button>
</template>
```

## TypeScript Usage

### Type-Safe Permissions

```typescript
// types/permissions.ts
export type Permission =
  | "user.view"
  | "user.create"
  | "user.edit"
  | "user.delete"
  | "post.view"
  | "post.create"
  | "post.edit"
  | "post.delete"
  | "admin.access";

// Usage with type safety
import type { Permission } from "~/types/permissions";
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

// ✓ TypeScript checks this
await hasPermission("user.view");

// ✗ Type error - invalid permission
await hasPermission("invalid.permission");
```

### Custom Composable with Types

```typescript
// composables/usePermissions.ts
import type { Permission } from "~/types/permissions";
import { usePermission } from "vue-nuxt-permission";

export const usePermissions = () => {
  const { hasPermission, hasAll, hasAny } = usePermission();

  return {
    canViewUsers: () => hasPermission("user.view" as Permission),
    canManageUsers: () =>
      hasAll(["user.view", "user.edit", "user.delete"] as Permission[]),
    isContentEditor: () => hasAny(["editor", "admin.access"] as Permission[]),
  };
};
```

## Performance Considerations

### Caching

Permission checks are cached for performance. Subsequent checks are instant:

```typescript
const { hasPermission } = usePermission();

// First call: evaluates and caches
await hasPermission("user.view"); // ~1ms

// Subsequent calls: returns from cache
await hasPermission("user.view"); // <0.1ms
```

### Batch Checks

For multiple permission checks, consider batching:

```typescript
const { hasAll, hasAny } = usePermission();

// Instead of multiple individual checks:
// const can1 = await hasPermission('perm1')
// const can2 = await hasPermission('perm2')
// const can3 = await hasPermission('perm3')

// Use batch operations:
const [can1, can2, can3] = await Promise.all([
  hasPermission("perm1"),
  hasPermission("perm2"),
  hasPermission("perm3"),
]);
```

### Avoid Over-Checking

Cache results in ref if checking same permission repeatedly:

```typescript
const { hasPermission } = usePermission()
const canEdit = ref(false)

// Check once on mount
onMounted(async () => {
  canEdit.value = await hasPermission('post.edit')
})

// Use cached ref instead of checking every time
<button v-if="canEdit" @click="edit">Edit</button>
```
