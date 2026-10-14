# Nuxt SSR security and permission loading

This module is a UI/route permission helper. **It is not a server-side
authorization mechanism**: every protected API endpoint must independently
check the authenticated user's permissions.

## Per-request state

Nuxt creates a separate permission scope for every request with `useState`,
then hydrates that scope in the browser. The Nuxt auto-imported
`usePermission()` reads the current Nuxt app's scope, even in route middleware.
Components importing `usePermission` directly also receive the scope through
Vue injection. Standalone low-level helpers such as `configurePermission()`
and `getCurrentPermissions()` are legacy process-global APIs; never use
them for per-request authorization during Nuxt SSR.

## Fetch from a request-aware endpoint

```ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    fetchPermissions: "/api/me/permissions",
    persist: false,
  },
});
```

Use an authenticated same-origin endpoint that returns either
`["user.read"]` or `{ "permissions": ["user.read"] }`. Nuxt waits for the
response before rendering. On the server the request-aware fetch forwards
same-origin cookies; the endpoint must enforce authentication itself.
If the API fails, returns malformed data, or is unavailable, permissions
fall back to `[]` (deny by default). Avoid network permission lookups in
the untrusted browser as the sole access-control authority.

Nuxt module options **do not accept callback functions** for
`fetchPermissions`; Nuxt `runtimeConfig` cannot serialize them.
If a function is necessary, use a regular Nuxt plugin and the auto-imported
`usePermission().setPermissions()`.

## Route guards and middleware

Nuxt's auto-imported `usePermission()` and `usePermissionScope()` use the
same request-local permissions. Prefer Nuxt route middleware when protecting
pages:

```ts
// middleware/admin.ts
export default defineNuxtRouteMiddleware(() => {
  const { canSync } = usePermission();
  if (!canSync("admin.read")) {
    return navigateTo("/login");
  }
});
```

When using the exported Vue Router helpers in Nuxt SSR, **always supply the
scope**. Without `permissionScope`, the legacy guards can read the
process-global configuration for backwards compatibility and must not be
used as per-request authorization:

```ts
const scope = usePermissionScope();
const guard = createPermissionGuard({
  permissionScope: scope,
  getAuthState: () => ({ isAuthenticated: true }),
  protectedRoutes: [
    { path: "/admin", meta: { permissions: "admin.read" } },
  ],
});
```

If `getAuthState()` supplies current permissions, the guard synchronizes
those permissions to the provided scope (never to the global store). The
authenticated state must come from your own verified session; neither a
client-provided permission array nor localStorage establishes authentication.

## SSR display limitation

The `v-permission` directive hides denied elements during SSR, but their
contents can still appear in the HTML source. Never put secrets or
server-protected data into templates based only on this directive. Enforce
authorization before fetching/rendering sensitive data.

Permission persistence is optional. For user-specific permissions,
`persist: false` avoids reusing stale localStorage snapshots after a
role change or account switch.
