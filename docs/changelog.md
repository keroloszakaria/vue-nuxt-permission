# Changelog

All notable changes to vue-nuxt-permission are documented here. This project follows semantic versioning.

## Semantic Versioning

This project follows [semantic versioning](https://semver.org/):

- **MAJOR** version: Breaking changes to the public API
- **MINOR** version: New features that are backward-compatible
- **PATCH** version: Bug fixes and improvements that are backward-compatible

## Version Format

Versions are formatted as `MAJOR.MINOR.PATCH`, for example: `1.2.3`.

---

## [Unreleased]

Features and changes currently in development but not yet released.

### Planned

- Support for async permission validators
- Built-in permission role mapping utilities
- Improved TypeScript inference for permission objects
- Web Worker support for large permission sets

---

## [2.0.9]

Bug-fix release that hardens the guard, plugin, directive, and composable
without changing any existing call signatures. Drop-in upgrade from 2.0.8.

### Fixed

- **`globalGuard` / `createPermissionGuard`** — a route's membership in
  `protectedRoutes` now correctly implies `requiresAuth: true`, and
  `permissions` declared on those entries implicitly enable
  `checkPermission`. Previously, the guard silently skipped checks when
  consumers omitted the `meta` flags.
- **`globalGuard` permission source** — if `authState.permissions` is not
  supplied, the guard now falls back to `authState.user?.permissions` and
  auto-syncs discovered permissions into the package's global state so that
  `v-permission` and `usePermission()` stay in sync after login.
- **`PermissionPlugin` / `configurePermission`** — `persist: false` is now
  honored end-to-end; the plugin no longer writes to localStorage when the
  option is disabled.
- **`v-permission` directive** — now reactively re-evaluates when global
  permissions change (e.g., after `setPermissions()`), without relying on
  the host component re-rendering. The `.once` modifier still opts out.
- **`usePermission()` composable** — bound to a singleton reactive store so
  it is safe to call at module top level. The returned `permissions` ref is
  shared across all call sites, and `refresh()` only re-hydrates from
  storage when storage actually has data (no longer wipes in-memory state).

### Notes

No API changes. Existing apps that already pass explicit `meta.requiresAuth`
and `meta.checkPermission` flags continue to work unchanged.

### Nuxt 4 compatibility

The Nuxt module is now built against `@nuxt/kit` v4 and verified on both
Nuxt 3.x and Nuxt 4.x. No consumer changes are required — the same
`nuxt.config.ts` `modules: ['vue-nuxt-permission']` registration works in
both. When running on Nuxt 4 (default `srcDir: 'app/'`), place middleware
under `app/middleware/` instead of `middleware/`; the module itself is
unaffected.

---

## [1.0.0] - 2024-01-15

Initial stable release of vue-nuxt-permission.

### Added

- ✅ **v-permission directive** with multiple modes (show, remove)
- ✅ **usePermission() composable** with async and sync checking
- ✅ **globalGuard** for Vue Router integration
- ✅ **Multiple permission modes**: and, or, not, startWith, endWith, regex
- ✅ **localStorage persistence** with Base64 encoding
- ✅ **Permission caching** for performance optimization
- ✅ **Development mode** with detailed logging
- ✅ **Full TypeScript support** with comprehensive type definitions
- ✅ **Nuxt 3 module integration** with auto-registration
- ✅ **Vue 3 plugin support** for standalone Vue apps
- ✅ **Reactive permission arrays** (Ref<string[]> support)
- ✅ **Async permission fetching** via fetchPermissions option
- ✅ **SSR-safe** directive and composable
- ✅ **Comprehensive documentation** and examples

### Features

#### v-permission Directive

- **Default mode**: Removes element from DOM if permission denied
- **:show modifier**: Hides element with display:none if permission denied
- **Multiple permissions**: Array syntax for OR logic
- **Complex permissions**: Object syntax with mode selection
- **Pattern matching**: startWith, endWith, regex modes
- **Debug logging**: enabled in developmentMode

#### usePermission() Composable

- `can(rule)` - Async permission evaluation
- `canSync(rule)` - Synchronous permission check
- `hasAll(permissions)` - Check all permissions present
- `hasAny(permissions)` - Check any permission present
- `setPermissions(perms)` - Update permissions at runtime
- `refresh()` - Clear cache and reload permissions
- Returns reactive permission array

#### globalGuard

- Vue Router integration
- Authentication checking (requiresAuth meta)
- Permission validation (checkPermission meta)
- Fallback route resolution
- Custom callbacks (onAllowed, onDenied)
- Circular route depth protection

#### Configuration Options

- `permissions` - Static or reactive permission array
- `developmentMode` - Enable debug logging
- `fetchPermissions()` - Async permission fetching
- `persist` - localStorage persistence toggle

### Fixed

- Initial configuration handling for both Nuxt and Vue
- localStorage fallback when fetchPermissions fails
- Hydration safety in SSR environments
- Cache invalidation on permission updates

### Security

- Base64 encoding for localStorage storage
- Input validation for permission objects
- Regex pattern validation
- Defense against circular route references

---

## Breaking Changes Guide

### From 0.x to 1.0

If you were using a 0.x version, note the following changes:

#### Plugin Installation

**Before (0.x)**:

```ts
import VueNuxtPermission from "vue-nuxt-permission";
app.use(VueNuxtPermission);
```

**After (1.0)**:

```ts
import { PermissionPlugin } from "vue-nuxt-permission";
app.use(PermissionPlugin, { permissions: [...] });
```

#### Configuration

**Before (0.x)**:

```ts
configurePermission(["admin"]);
```

**After (1.0)**:

```ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
});
```

#### Exports

**Before (0.x)**:

```ts
import { hasPermission, usePermissionCheck } from "vue-nuxt-permission";
```

**After (1.0)**:

```ts
import { hasPermission, usePermission } from "vue-nuxt-permission";
```

#### Composable Methods

**Before (0.x)**:

```ts
const { checkPermission, updatePermissions } = usePermissionCheck();
```

**After (1.0)**:

```ts
const { can, setPermissions } = usePermission();
```

---

## Backward Compatibility

Vue-nuxt-permission maintains backward compatibility within major versions. Specifically:

- ✅ New methods are added without breaking existing ones
- ✅ New options are added to configuration without changing required options
- ✅ New permission modes are added alongside existing modes
- ✅ TypeScript types are expanded to be more permissive
- ❌ Breaking changes only occur in new major versions

---

## Future Releases

### Planned for 1.1.0

- [ ] Custom permission validators
- [ ] Built-in permission maps/roles
- [ ] Permission middleware for Nuxt
- [ ] Better error messages

### Planned for 2.0.0

- [ ] Alternative storage backends (IndexedDB, sessionStorage)
- [ ] GraphQL permission queries
- [ ] Real-time permission sync
- [ ] Granular permission caching strategies

---

## Release Schedule

New releases are published when features are complete and tested. We aim to release:

- **Patch releases** (bug fixes): weekly or as needed
- **Minor releases** (features): monthly
- **Major releases** (breaking changes): annually or as needed

---

## Reporting Issues

Found a bug? See something unexpected? Report it on [GitHub Issues](https://github.com/keroloszakaria/vue-nuxt-permission/issues).

When reporting, include:

- Vue/Nuxt version
- vue-nuxt-permission version
- Minimal reproduction code
- Expected vs actual behavior
- Console errors or warnings

---

## Contributing

Contributions are welcome! See the main repository for contribution guidelines.

---

## Support

- 📚 **Documentation**: [Official Docs](https://github.com/keroloszakaria/vue-nuxt-permission/tree/main/docs)
- 💬 **Discussions**: GitHub Discussions
- 🐛 **Issues**: GitHub Issues
- 📦 **Package**: [npm](https://www.npmjs.com/package/vue-nuxt-permission)
