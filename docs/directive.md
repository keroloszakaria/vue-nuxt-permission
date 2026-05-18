# v-permission Directive

The `v-permission` directive provides template-level permission checks with automatic DOM manipulation.

## Basic Usage

### Remove Element from DOM

When permission is denied, the element is removed from the DOM and replaced with a comment placeholder:

```vue
<template>
  <button v-permission="'admin.delete'">Delete User</button>
</template>
```

If the user doesn't have `admin.delete` permission, the button will be completely removed from the DOM and cannot be inspected in DevTools.

### Hide Element with CSS

Use the `:show` modifier to hide elements with `display: none` instead of removing them:

```vue
<template>
  <button v-permission:show="'admin.delete'">Delete User</button>
</template>
```

If permission is denied, the element stays in the DOM but is hidden. The space is preserved in the layout.

## Permission Value Formats

### Single String Permission

```vue
<template>
  <div v-permission="'user.view'">User management section</div>
</template>
```

### Array of Permissions (OR Logic)

Show element if user has ANY of the listed permissions:

```vue
<template>
  <!-- Visible if user has 'editor' OR 'moderator' -->
  <div v-permission="['editor', 'moderator']">
    Content creators can view this
  </div>
</template>
```

### Object with Mode

Complex permission logic with multiple modes:

```vue
<template>
  <!-- AND: User needs BOTH 'post.edit' AND 'post.publish' -->
  <div
    v-permission="{
      permissions: ['post.edit', 'post.publish'],
      mode: 'and',
    }"
  >
    Full post management
  </div>

  <!-- OR: User needs 'editor' OR 'admin' -->
  <div
    v-permission="{
      permissions: ['editor', 'admin'],
      mode: 'or',
    }"
  >
    Content editing
  </div>

  <!-- NOT: User does NOT have 'guest' -->
  <div
    v-permission="{
      permissions: ['guest'],
      mode: 'not',
    }"
  >
    Not visible to guests
  </div>
</template>
```

### Pattern Matching Modes

Match permissions using patterns:

```vue
<template>
  <!-- startWith: Permission starts with pattern -->
  <div
    v-permission="{
      permissions: ['admin.'],
      mode: 'startWith',
    }"
  >
    Any admin permission works
  </div>

  <!-- endWith: Permission ends with pattern -->
  <div
    v-permission="{
      permissions: ['.delete'],
      mode: 'endWith',
    }"
  >
    Any delete permission works
  </div>

  <!-- regex: Match with regex pattern -->
  <div
    v-permission="{
      permissions: ['[a-z]+\\.view'],
      mode: 'regex',
    }"
  >
    Any view permission works
  </div>
</template>
```

### Wildcard Permission

The wildcard `*` grants access to everything:

```vue
<template>
  <!-- Visible if user has wildcard permission or specific permission -->
  <div v-permission="'admin.access'">This works with '*' or 'admin.access'</div>
</template>
```

## Reactive Permissions

The directive automatically re-evaluates whenever the user's permissions
change globally (e.g., after `setPermissions()`, `configurePermission()`,
or a successful `globalGuard` resolution). You don't need to remount or
force-update the component — elements appear and disappear in real time.

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

function grantAdmin() {
  // Every `v-permission="'admin.access'"` element across the app
  // becomes visible immediately — no refresh needed.
  setPermissions(["admin.access"]);
}
</script>

<template>
  <button v-permission="'admin.access'">Admin only</button>
  <button @click="grantAdmin">Grant admin</button>
</template>
```

You can also bind the directive to a reactive value directly:

```vue
<script setup lang="ts">
import { ref } from "vue";

const requiredPermission = ref("user.view");
</script>

<template>
  <!-- Permission changes are reactive -->
  <div v-permission="requiredPermission">
    This updates when requiredPermission changes
  </div>

  <button @click="requiredPermission = 'admin.access'">
    Change Required Permission
  </button>
</template>
```

## Modifiers

### .once

Apply permission check only once at mount time. Subsequent permission changes won't update the element:

```vue
<template>
  <!-- Checked only once on mount -->
  <div v-permission.once="'admin.access'">
    This state won't change even if permissions are updated
  </div>
</template>

<script setup lang="ts">
const { refresh } = usePermission();

async function updatePermissions() {
  // Even after refresh, elements with .once won't update
  await refresh(["admin.access"]);
}
</script>
```

Use case: Elements that shouldn't change during the user's session, or performance optimization for large permission lists.

### .lazy

Skip evaluation on component re-renders if the permission value hasn't changed:

```vue
<script setup lang="ts">
import { ref } from "vue";

const permission = ref("user.view");
const counter = ref(0);
</script>

<template>
  <!-- Without .lazy: Re-evaluated every render -->
  <div v-permission="permission">Normal evaluation</div>

  <!-- With .lazy: Only re-evaluated if permission ref changes -->
  <div v-permission.lazy="permission">Lazy evaluation (better performance)</div>

  <!-- This re-render won't trigger permission evaluation with .lazy -->
  <button @click="counter++">Re-render {{ counter }}</button>
</template>
```

Use case: Performance optimization when permissions don't change frequently but components re-render often.

## Combining Modifiers

Modifiers can be combined:

```vue
<template>
  <!-- Check once and lazily (no further updates) -->
  <div v-permission.once.lazy="'admin.access'">Set it and forget it</div>
</template>
```

## Directive Arguments

### :show

Hide element instead of removing it:

```vue
<template>
  <!-- Removed from DOM when permission denied -->
  <div v-permission="'editor'">Visible editors only</div>

  <!-- Hidden but in DOM when permission denied -->
  <div v-permission:show="'editor'">Hidden but present in DOM</div>
</template>
```

## Common Patterns

### Conditional Button States

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

const canDelete = ref(false);

onMounted(async () => {
  canDelete.value = await hasPermission("user.delete");
});
</script>

<template>
  <!-- Hide button entirely -->
  <button v-permission="'user.delete'" @click="deleteUser">Delete</button>

  <!-- Or disable button instead -->
  <button @click="deleteUser" :disabled="!canDelete">Delete</button>
</template>
```

### Multiple Sections by Role

```vue
<template>
  <div class="dashboard">
    <!-- User section -->
    <section v-permission="'user.view'">
      <h2>Users</h2>
      <UserList />
    </section>

    <!-- Editor section -->
    <section v-permission="'editor'">
      <h2>Manage Content</h2>
      <EditorPanel />
    </section>

    <!-- Admin section -->
    <section v-permission="'admin.access'">
      <h2>Admin Controls</h2>
      <AdminPanel />
    </section>
  </div>
</template>
```

### Hierarchical Permissions

```vue
<template>
  <!-- User level -->
  <div v-permission="'user.view'">User access</div>

  <!-- Editor level (needs all) -->
  <div
    v-permission="{
      permissions: ['user.view', 'post.edit'],
      mode: 'and',
    }"
  >
    Editor access
  </div>

  <!-- Admin level -->
  <div v-permission="'admin.access'">Admin access</div>
</template>
```

### Form Field Access Control

```vue
<form>
  <input v-model="user.name" />
  
  <!-- Only show email field if user can edit -->
  <input 
    v-permission="'user.edit:email'"
    v-model="user.email" 
  />
  
  <!-- Only show admin field if admin -->
  <input 
    v-permission="'admin.config'"
    v-model="user.role" 
  />
  
  <button v-permission="'user.edit'">
    Save Changes
  </button>
</form>
```

## How It Works

### Remove Mode (Default)

When permission is denied and no `:show` modifier is used:

1. Element is replaced with a comment node `<!-- v-permission -->`
2. Element is removed from the DOM
3. Space is not reserved in layout
4. Element can be restored if permission is granted

### Show Mode (:show)

When permission is denied with `:show` modifier:

1. Element stays in the DOM
2. CSS `display: none` is applied
3. Space is reserved in layout (display: none removes space)
4. Element is easily shown/hidden by changing display

### Restoration

When permission is granted after being denied:

1. Comment placeholder is replaced with the original element
2. Element re-enters the DOM
3. Original display value is restored
4. All handlers and state are preserved

## Edge Cases

### Root Element Removal

The directive works on root elements too:

```vue
<template>
  <button v-permission="'admin'">Admin Only</button>
</template>

<!-- If denied: button is removed and replaced with comment -->
<!-- If allowed: button is rendered normally -->
```

### Nested Directives

Multiple permission checks work correctly:

```vue
<template>
  <div v-permission="'view'">
    Parent check

    <button v-permission="'edit'">Requires both 'view' AND 'edit'</button>
  </div>
</template>
```

### Dynamic Content

Works with v-for, v-if, and other directives:

```vue
<template>
  <template v-for="item in items" :key="item.id">
    <!-- Permission check inside v-for -->
    <div v-permission="item.requiredPermission">
      {{ item.name }}
    </div>
  </template>
</template>
```
