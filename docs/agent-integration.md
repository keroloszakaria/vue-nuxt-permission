# AI Agent Integration Prompts

Use this page when you want any AI coding agent (Copilot, Cursor, Claude Code,
ChatGPT, etc.) to integrate `vue-nuxt-permission` correctly in a real project.

The prompts below are copy-paste ready.

## Before You Paste a Prompt

Give the agent these project facts first:

- Framework: `Nuxt 3`, `Nuxt 4`, or `Vue 3`
- Where login happens (file/path)
- Shape of login response (where `user.permissions` lives)
- Your protected routes and login route path

This helps the agent wire permissions to your real auth flow instead of using
dummy examples.

## Universal Prompt (Any Project)

```text
Integrate `vue-nuxt-permission` into this project end-to-end using best
practices, without breaking existing behavior.

Requirements:
1) Install and configure the package for the current framework.
2) Wire permissions from the REAL login API response (not hardcoded). After
   successful login, call `setPermissions(...)` using the permissions returned
   by backend.
3) On logout, clear permission state with `setPermissions([])`.
4) Add/adjust route protection using `globalGuard` (or framework middleware)
   and keep redirects consistent with existing auth behavior.
5) Use `v-permission` for UI visibility in 2-3 relevant places (buttons,
   menu items, admin sections).
6) Keep SSR-safe behavior and avoid browser-only APIs on server execution.
7) Reuse existing auth store/state; do not introduce duplicate sources of
   truth for permissions.
8) Keep changes minimal and consistent with existing code style.

Auth details for this project:
- Login flow file(s): <replace>
- Login endpoint: <replace>
- Login response shape: <replace>
- Where token/user is stored: <replace>
- Protected routes: <replace>
- Login route: <replace>
- Home route after login: <replace>

Acceptance checks:
- After login, protected UI appears immediately without refresh.
- After logout, protected UI disappears immediately.
- Unauthorized route access redirects correctly.
- Existing tests/build still pass.

After implementation, show:
- Exact files changed
- Why each change was needed
- Any assumptions made
```

## Prompt for Nuxt 4 Projects

```text
Integrate `vue-nuxt-permission` in this Nuxt 4 project with production-ready
patterns.

Nuxt-specific constraints:
- Keep module config in `nuxt.config.ts`.
- If creating middleware, use Nuxt 4 paths (`app/middleware/*`) unless this
  repo uses a custom srcDir.
- Keep SSR-safe code paths.

Implementation requirements:
1) Add module registration and permission config in `nuxt.config.ts`.
2) Connect login success to `setPermissions(...)` using API response data.
3) Ensure logout clears permissions via `setPermissions([])`.
4) Add middleware/guard checks for protected pages.
5) Add `v-permission` usage to at least 2 real UI elements.
6) Do not hardcode permissions in app code except fallback defaults.

Use these project-specific values:
- Login file/path: <replace>
- API response shape for permissions: <replace>
- Middleware target pages: <replace>
- Redirect rules: <replace>

Output required:
- File diffs summary
- Verification steps and results
```

## Prompt for Vue 3 + Vue Router Projects

```text
Integrate `vue-nuxt-permission` into this Vue 3 + Vue Router app.

Requirements:
1) Install plugin in app bootstrap (`main.ts`) using existing app setup.
2) Hook login API success to `setPermissions(...)` from `usePermission()`.
3) Hook logout to `setPermissions([])`.
4) Add `globalGuard` in router with existing auth routes/protected routes.
5) Ensure permission data is derived from existing auth store/user object,
   including fallback for `user.permissions`.
6) Add 2-3 practical `v-permission` usages in current screens.
7) Keep behavior backward-compatible and minimal.

Project values:
- Router file: <replace>
- Login flow file: <replace>
- Auth store file: <replace>
- Permission field in response: <replace>

Acceptance checks:
- Login updates permissions reactively.
- Guard redirects unauthorized users correctly.
- Logout clears permissions and restricted UI.
```

## Best-Practice Rules You Can Add to Any Prompt

```text
Follow these rules:
- Prefer `setPermissions()` for runtime auth updates.
- Keep one permission source of truth (existing auth store + package state).
- Do not duplicate permission arrays in multiple stores.
- Keep permissions normalized to string[] before calling setPermissions.
- Use `v-permission` for view-level checks; use guard/middleware for route-level checks.
- Keep existing routes/components structure; avoid broad refactors.
```

## Quick Troubleshooting Prompt

If integration was done but behavior is wrong, ask your agent this:

```text
Audit current `vue-nuxt-permission` integration and fix issues without changing
public behavior.

Check specifically:
1) Login success calls setPermissions with actual API permissions.
2) Logout clears permissions.
3) Guard/middleware receives correct auth + permissions state.
4) `v-permission` updates reactively after auth changes.
5) No duplicate/competing permission stores.

Then provide a minimal patch and explain root causes.
```

## Copy-Paste Checklist for Teams

```text
[ ] Package installed and configured
[ ] Login -> setPermissions(apiPermissions)
[ ] Logout -> setPermissions([])
[ ] Guard/middleware protects private routes
[ ] v-permission used in real UI elements
[ ] Redirects verified (login/home/forbidden)
[ ] Build and tests pass
```
