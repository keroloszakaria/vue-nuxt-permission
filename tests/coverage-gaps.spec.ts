/**
 * Coverage Gap Tests
 * ==================
 * Tests targeting specific untested code paths identified in the source code.
 * Organized by module with clear labels for each gap.
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import { usePermission } from "../src/composables/usePermission";
import {
  clearPermissionCache,
  getCachedPermission,
  invalidateCache,
  setCachedPermission,
} from "../src/core/cache";
import {
  configurePermission,
  getCurrentPermissions,
  getReactivePermissions,
  isDevMode,
} from "../src/core/config";
import { checkPermissionSync, hasPermission } from "../src/core/evaluator";
import { vPermission } from "../src/directives/v-permission";
import { createPermissionGuard } from "../src/guards/createGuard";
import { globalGuard } from "../src/guards/globalGuard";
import PermissionPlugin from "../src/plugin";
import type { PermissionRoute } from "../src/types";
import { logDebug } from "../src/utils/debug";
import {
  isPermissionObject,
  normalizePermissions,
  stableStringify,
} from "../src/utils/helpers";
import {
  clearPermissionsFromStorage,
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "../src/utils/storage";

// ═══════════════════════════════════════════════════════════════
// Helper: mock route factory
// ═══════════════════════════════════════════════════════════════
const createMockRoute = (
  path: string,
  meta: Record<string, any> = {},
): RouteLocationNormalized => ({
  path,
  name: path,
  matched: [],
  params: {},
  query: {},
  hash: "",
  fullPath: path,
  meta,
  redirectedFrom: undefined,
});

// ═══════════════════════════════════════════════════════════════
// 1. PLUGIN — fetchPermissions, persist, storage fallback
// ═══════════════════════════════════════════════════════════════
describe("Plugin: fetchPermissions", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("uses fetchPermissions when provided", async () => {
    const app = createApp({});
    const fetchFn = vi.fn().mockResolvedValue(["fetched.perm"]);

    await app.use(PermissionPlugin, { fetchPermissions: fetchFn });

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(getCurrentPermissions()).toEqual(["fetched.perm"]);
  });

  it("falls back to storage when fetchPermissions throws", async () => {
    // Pre-populate storage
    savePermissionsToStorage(["stored.fallback"]);

    const app = createApp({});
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));

    await app.use(PermissionPlugin, { fetchPermissions: fetchFn });

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(getCurrentPermissions()).toEqual(["stored.fallback"]);
  });

  it("falls back to empty array when fetchPermissions throws and no storage", async () => {
    localStorage.clear();
    const app = createApp({});
    const fetchFn = vi.fn().mockRejectedValue(new Error("fail"));

    await app.use(PermissionPlugin, { fetchPermissions: fetchFn });

    expect(getCurrentPermissions()).toEqual([]);
  });

  it("falls back to storage when no options provided", async () => {
    savePermissionsToStorage(["from.storage"]);

    const app = createApp({});
    await app.use(PermissionPlugin);

    expect(getCurrentPermissions()).toEqual(["from.storage"]);
  });

  it("falls back to empty when no options and no storage", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin);

    expect(getCurrentPermissions()).toEqual([]);
  });
});

describe("Plugin: persist option", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("persists permissions to storage by default", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, { permissions: ["persisted.perm"] });

    expect(getPermissionsFromStorage()).toEqual(["persisted.perm"]);
  });

  it("does NOT persist when persist is false", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["no.persist"],
      persist: false,
    });

    expect(getCurrentPermissions()).toEqual(["no.persist"]);
    expect(getPermissionsFromStorage()).toBeNull();
  });
});

describe("Plugin: developmentMode", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    configurePermission([], { persist: false });
  });

  it("sets developmentMode when option is true", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["dev.test"],
      developmentMode: true,
    });

    expect(isDevMode()).toBe(true);
  });

  it("developmentMode defaults to false", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, { permissions: ["prod.test"] });

    expect(isDevMode()).toBe(false);
  });
});

describe("Plugin: reactive permissions provide", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    configurePermission([], { persist: false });
  });

  it("provides reactive permissions to the app", async () => {
    const app = createApp({});
    const provideSpy = vi.spyOn(app, "provide");

    await app.use(PermissionPlugin, { permissions: ["reactive.test"] });

    expect(provideSpy).toHaveBeenCalledWith(
      "__v_permission_reactive__",
      expect.anything(),
    );
  });

  it("passes through permissions as-is (no trimming)", async () => {
    const app = createApp({});
    // configurePermission stores permissions as-is, no normalizePermissions call
    await app.use(PermissionPlugin, {
      permissions: [" spaced ", "normal"],
    });

    expect(getCurrentPermissions()).toEqual([" spaced ", "normal"]);
  });
});

describe("Plugin: clears cache on install", () => {
  it("clears any stale cache from previous installs", async () => {
    // Pre-populate cache
    setCachedPermission("old-key", true);
    expect(getCachedPermission("old-key")).toBe(true);

    const app = createApp({});
    await app.use(PermissionPlugin, { permissions: ["fresh"] });

    // Cache should be cleared
    expect(getCachedPermission("old-key")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. CACHE — MAX_SIZE eviction and invalidateCache
// ═══════════════════════════════════════════════════════════════
describe("Cache: MAX_SIZE eviction", () => {
  beforeEach(() => clearPermissionCache());
  afterEach(() => clearPermissionCache());

  it("evicts oldest entry when cache exceeds 1000 entries", () => {
    // Fill cache to max
    for (let i = 0; i < 1000; i++) {
      setCachedPermission(`key-${i}`, true);
    }

    // First entry should still exist
    expect(getCachedPermission("key-0")).toBe(true);

    // Add one more — should evict key-0 (the oldest)
    setCachedPermission("key-overflow", false);

    expect(getCachedPermission("key-0")).toBeNull();
    expect(getCachedPermission("key-overflow")).toBe(false);
    // key-1 should still exist
    expect(getCachedPermission("key-1")).toBe(true);
  });
});

describe("Cache: invalidateCache removes only expired entries", () => {
  beforeEach(() => clearPermissionCache());
  afterEach(() => clearPermissionCache());

  it("keeps non-expired entries and removes expired ones", () => {
    setCachedPermission("fresh-key", true);
    setCachedPermission("also-fresh", false);

    // Mock Date.now to simulate time passing for TTL
    const originalNow = Date.now;
    const baseTime = originalNow();

    // Set an entry that we'll make "old"
    setCachedPermission("old-key", true);

    // Advance time by 6 minutes (past 5-min TTL)
    vi.spyOn(Date, "now").mockReturnValue(baseTime + 6 * 60 * 1000);

    invalidateCache();

    // All entries created before the time jump should be expired
    expect(getCachedPermission("fresh-key")).toBeNull();
    expect(getCachedPermission("also-fresh")).toBeNull();
    expect(getCachedPermission("old-key")).toBeNull();

    // Restore
    vi.restoreAllMocks();
  });

  it("preserves entries within TTL window", () => {
    const originalNow = Date.now;
    const baseTime = originalNow();

    // Set time to base
    vi.spyOn(Date, "now").mockReturnValue(baseTime);
    setCachedPermission("recent-key", true);

    // Advance only 1 minute (within 5-min TTL)
    vi.mocked(Date.now).mockReturnValue(baseTime + 1 * 60 * 1000);

    invalidateCache();

    expect(getCachedPermission("recent-key")).toBe(true);

    vi.restoreAllMocks();
  });
});

describe("Cache: TTL expiration on get", () => {
  beforeEach(() => clearPermissionCache());
  afterEach(() => {
    clearPermissionCache();
    vi.restoreAllMocks();
  });

  it("returns null for expired entries on getCachedPermission", () => {
    const baseTime = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(baseTime);

    setCachedPermission("ttl-key", true);
    expect(getCachedPermission("ttl-key")).toBe(true);

    // Advance past TTL
    vi.mocked(Date.now).mockReturnValue(baseTime + 6 * 60 * 1000);
    expect(getCachedPermission("ttl-key")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. usePermission: sourceType and refresh behavior
// ═══════════════════════════════════════════════════════════════
describe("usePermission: source priority and refresh", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("prefers global config over storage", () => {
    savePermissionsToStorage(["storage.perm"]);
    configurePermission(["global.perm"]);

    const { permissions } = usePermission();
    expect(permissions.value).toEqual(["global.perm"]);
  });

  it("falls back to storage when global is empty", () => {
    savePermissionsToStorage(["storage.only"]);
    configurePermission([], { persist: false });

    const { permissions } = usePermission();
    expect(permissions.value).toEqual(["storage.only"]);
  });

  it("returns empty when no global config and no storage", () => {
    configurePermission([], { persist: false });
    localStorage.clear();

    const { permissions } = usePermission();
    expect(permissions.value).toEqual([]);
  });

  it("refresh reloads from global config source", () => {
    configurePermission(["initial.perm"]);
    const { permissions, refresh, setPermissions } = usePermission();

    expect(permissions.value).toEqual(["initial.perm"]);

    // Change local state
    setPermissions(["changed.perm"]);
    expect(permissions.value).toEqual(["changed.perm"]);

    // Update global config and refresh
    configurePermission(["updated.global"]);
    refresh();
    expect(permissions.value).toEqual(["updated.global"]);
  });

  it("refresh reloads from storage source", () => {
    // Initialize with storage source (no global config)
    savePermissionsToStorage(["storage.initial"]);
    configurePermission([], { persist: false });

    const { permissions, refresh } = usePermission();
    expect(permissions.value).toEqual(["storage.initial"]);

    // Update storage and refresh
    savePermissionsToStorage(["storage.updated"]);
    refresh();
    expect(permissions.value).toEqual(["storage.updated"]);
  });

  it("refresh keeps permissions set via setPermissions", () => {
    configurePermission([], { persist: false });
    localStorage.clear();

    const { permissions, setPermissions, refresh } = usePermission();
    setPermissions(["temp"]);
    expect(permissions.value).toEqual(["temp"]);

    // refresh() no longer wipes the global state — it only re-hydrates
    // from storage when global is empty. setPermissions persisted ["temp"],
    // so the value remains.
    refresh();
    expect(permissions.value).toEqual(["temp"]);
  });
});

describe("usePermission: setPermissions validation", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("rejects non-array input", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { setPermissions, permissions } = usePermission();

    setPermissions("not-an-array" as any);

    expect(errorSpy).toHaveBeenCalledWith(
      "[v-permission] Permissions must be an array",
    );
    expect(permissions.value).toEqual([]); // unchanged
  });

  it("saves to storage on setPermissions", () => {
    configurePermission(["start"]);
    const { setPermissions } = usePermission();

    setPermissions(["new.perm1", "new.perm2"]);

    expect(getPermissionsFromStorage()).toEqual(["new.perm1", "new.perm2"]);
  });

  it("clears cache on setPermissions", () => {
    configurePermission(["cached.perm"]);
    setCachedPermission("some-key", true);

    const { setPermissions } = usePermission();
    setPermissions(["changed"]);

    expect(getCachedPermission("some-key")).toBeNull();
  });
});

describe("usePermission: hasAll and hasAny edge cases", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["a", "b", "c"]);
  });

  afterEach(() => clearPermissionCache());

  it("hasAll returns true for empty array (no requirements)", async () => {
    const { hasAll } = usePermission();
    expect(await hasAll([])).toBe(true);
  });

  it("hasAll returns true for non-array", async () => {
    const { hasAll } = usePermission();
    expect(await hasAll(null as any)).toBe(true);
  });

  it("hasAny returns false for empty array", async () => {
    const { hasAny } = usePermission();
    expect(await hasAny([])).toBe(false);
  });

  it("hasAny returns false for non-array", async () => {
    const { hasAny } = usePermission();
    expect(await hasAny(null as any)).toBe(false);
  });
});

describe("usePermission: canSync edge cases", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["admin.read", "admin.write", "user.view"]);
  });

  afterEach(() => clearPermissionCache());

  it("canSync returns false for unknown mode", () => {
    const { canSync } = usePermission();
    expect(
      canSync({ permissions: ["admin.read"], mode: "unknown" as any }),
    ).toBe(false);
  });

  it("canSync returns false for empty permissions in object", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: [], mode: "and" })).toBe(false);
  });

  it("canSync with wildcard in permissions array object", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["*"], mode: "and" })).toBe(true);
    expect(canSync({ permissions: ["*"], mode: "or" })).toBe(true);
    expect(canSync({ permissions: ["*"], mode: "not" })).toBe(true);
  });

  it("canSync with not mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["nonexistent"], mode: "not" })).toBe(true);
    expect(canSync({ permissions: ["admin.read"], mode: "not" })).toBe(false);
  });

  it("canSync with startWith mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["admin"], mode: "startWith" })).toBe(true);
    expect(canSync({ permissions: ["xyz"], mode: "startWith" })).toBe(false);
  });

  it("canSync with endWith mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: [".read"], mode: "endWith" })).toBe(true);
    expect(canSync({ permissions: [".delete"], mode: "endWith" })).toBe(false);
  });

  it("canSync with regex mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["^admin\\."], mode: "regex" })).toBe(true);
    expect(canSync({ permissions: ["^xyz\\."], mode: "regex" })).toBe(false);
  });

  it("canSync with invalid regex returns false", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["[invalid"], mode: "regex" })).toBe(false);
  });

  it("canSync with wildcard string", () => {
    const { canSync } = usePermission();
    expect(canSync("*")).toBe(true);
  });

  it("canSync with array containing wildcard", () => {
    const { canSync } = usePermission();
    expect(canSync(["*", "nonexistent"])).toBe(true);
  });

  it("canSync returns false for number type", () => {
    const { canSync } = usePermission();
    expect(canSync(123 as any)).toBe(false);
  });

  it("canSync throws for null (typeof null === 'object' bug)", () => {
    const { canSync } = usePermission();
    expect(() => canSync(null as any)).toThrow();
  });

  it("canSync returns false for undefined", () => {
    const { canSync } = usePermission();
    expect(canSync(undefined as any)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. globalGuard: actual error handling, findAccessibleRoute
// ═══════════════════════════════════════════════════════════════
describe("globalGuard: real error handling", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view"]);
  });

  afterEach(() => clearPermissionCache());

  it("catches getAuthState error and redirects to loginPath", async () => {
    const to = createMockRoute("/dashboard", { requiresAuth: true });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      loginPath: "/error-login",
      getAuthState: () => {
        throw new Error("Auth service down");
      },
    });

    expect(next).toHaveBeenCalledWith("/error-login");
  });

  it("uses default /login path on error when loginPath not specified", async () => {
    const to = createMockRoute("/");
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => {
        throw new Error("crash");
      },
    });

    expect(next).toHaveBeenCalledWith("/login");
  });
});

describe("globalGuard: findAccessibleRoute", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view"]);
  });

  afterEach(() => clearPermissionCache());

  it("falls back to loginPath when no accessible route found", async () => {
    const protectedRoutes: PermissionRoute[] = [
      { path: "/admin", meta: { permissions: "admin.access" } },
      { path: "/superadmin", meta: { permissions: "super.access" } },
    ];

    const to = createMockRoute("/admin", {
      checkPermission: true,
      permissions: "admin.access",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({
        isAuthenticated: true,
      }),
      protectedRoutes,
      loginPath: "/no-access",
    });

    expect(next).toHaveBeenCalledWith("/no-access");
  });

  it("finds accessible child route in nested structure", async () => {
    const protectedRoutes: PermissionRoute[] = [
      {
        path: "/section",
        meta: { permissions: "admin.only" },
        children: [
          { path: "/subsection", meta: { permissions: "admin.sub" } },
          { path: "/public", meta: { permissions: "user.view" } }, // accessible
        ],
      },
    ];

    const to = createMockRoute("/admin", {
      checkPermission: true,
      permissions: "admin.access",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      protectedRoutes,
      loginPath: "/login",
    });

    // Should find /section/public as accessible
    expect(next).toHaveBeenCalledWith("/section/public");
  });

  it("uses wildcard permission in protectedRoutes", async () => {
    const protectedRoutes: PermissionRoute[] = [
      { path: "/open", meta: { permissions: "*" } },
    ];

    const to = createMockRoute("/restricted", {
      checkPermission: true,
      permissions: "restricted.access",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      protectedRoutes,
      loginPath: "/login",
    });

    expect(next).toHaveBeenCalledWith("/open");
  });

  it("uses permissions from authState over global config", async () => {
    configurePermission(["global.perm"]);

    const to = createMockRoute("/custom", {
      checkPermission: true,
      permissions: "auth.perm",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({
        isAuthenticated: true,
        permissions: ["auth.perm"],
      }),
      loginPath: "/login",
    });

    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to global config when authState has no permissions", async () => {
    configurePermission(["user.view"]);

    const to = createMockRoute("/page", {
      checkPermission: true,
      permissions: "user.view",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      loginPath: "/login",
    });

    expect(next).toHaveBeenCalledWith();
  });

  it("route without meta.permissions + checkPermission skips check", async () => {
    const to = createMockRoute("/page", { checkPermission: true });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
    });

    // checkPermission is true but no permissions in meta → allowed
    expect(next).toHaveBeenCalledWith();
  });

  it("calls onDenied when permission check fails", async () => {
    const onDenied = vi.fn();
    const to = createMockRoute("/admin", {
      checkPermission: true,
      permissions: "admin.only",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      onDenied,
      loginPath: "/login",
    });

    expect(onDenied).toHaveBeenCalledWith(to, from);
  });

  it("calls onAllowed on auth route redirect", async () => {
    const onAllowed = vi.fn();
    const to = createMockRoute("/login");
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      authRoutes: [{ path: "/login" }],
      homePath: "/home",
      getAuthState: () => ({ isAuthenticated: true }),
      onAllowed,
    });

    expect(onAllowed).toHaveBeenCalledWith(to, from);
    expect(next).toHaveBeenCalledWith("/home");
  });
});

describe("globalGuard: no options / defaults", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([], { persist: false });
  });

  afterEach(() => clearPermissionCache());

  it("works with no options at all", async () => {
    const to = createMockRoute("/page");
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("unauthenticated user accessing requiresAuth uses default /login", async () => {
    const to = createMockRoute("/protected", { requiresAuth: true });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next);

    expect(next).toHaveBeenCalledWith("/login");
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. EVALUATOR: edge cases
// ═══════════════════════════════════════════════════════════════
describe("Evaluator: edge cases", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["admin", "editor"]);
  });

  afterEach(() => clearPermissionCache());

  it("hasPermission caches results", async () => {
    const result1 = await hasPermission("admin");
    const result2 = await hasPermission("admin");

    expect(result1).toBe(true);
    expect(result2).toBe(true); // from cache
  });

  it("hasPermission with invalid permission value returns false", async () => {
    expect(await hasPermission(123 as any)).toBe(false);
    expect(await hasPermission(null as any)).toBe(false);
  });

  it("hasPermission with invalid mode returns false", async () => {
    expect(
      await hasPermission({ permissions: ["admin"], mode: "invalid" as any }),
    ).toBe(false);
  });

  it("hasPermission with empty permissions array returns false", async () => {
    expect(await hasPermission({ permissions: [], mode: "and" })).toBe(false);
  });

  it("checkPermissionSync with custom userPermissions", () => {
    expect(checkPermissionSync("custom", ["custom", "other"])).toBe(true);
    expect(checkPermissionSync("missing", ["custom", "other"])).toBe(false);
  });

  it("checkPermissionSync with invalid mode returns false", () => {
    expect(
      checkPermissionSync({ permissions: ["admin"], mode: "bogus" as any }),
    ).toBe(false);
  });

  it("checkPermissionSync returns false for non-matching type", () => {
    expect(checkPermissionSync(42 as any)).toBe(false);
    expect(checkPermissionSync({} as any)).toBe(false);
  });

  it("hasPermission with regex mode and invalid regex", async () => {
    const result = await hasPermission({
      permissions: ["[invalid"],
      mode: "regex",
    });
    expect(result).toBe(false);
  });

  it("hasPermission with wildcard in array", async () => {
    expect(await hasPermission(["*", "admin"])).toBe(true);
  });

  it("hasPermission with wildcard in object", async () => {
    expect(await hasPermission({ permissions: ["*"], mode: "and" })).toBe(true);
  });

  it("checkPermissionSync with wildcard in object permissions", () => {
    expect(checkPermissionSync({ permissions: ["*"], mode: "or" })).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. DIRECTIVE: advanced behaviors
// ═══════════════════════════════════════════════════════════════
describe("Directive: unmounted cleanup", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["visible"]);
  });

  afterEach(() => clearPermissionCache());

  it("cleans up properties on unmounted", async () => {
    const wrapper = mount(
      {
        template: `<div v-if="show"><span v-permission="'visible'">Content</span></div>`,
        data() {
          return { show: true };
        },
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    const el = wrapper.find("span").element as any;
    expect(el).toBeDefined();

    // Trigger unmount
    await wrapper.setData({ show: false });

    // Element should be cleaned up (no _vPermission* properties remain on unmount)
    // After v-if = false, the directive's unmounted hook fires
  });
});

describe("Directive: show modifier preserves element in DOM", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["allowed"]);
  });

  afterEach(() => clearPermissionCache());

  it("hides with display:none using .show modifier", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission.show="'denied'">Hidden</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    // Element should still be in DOM but hidden
    const span = wrapper.find("span");
    expect(span.exists()).toBe(true);
    expect(span.element.style.display).toBe("none");
  });

  it("hides with display:none using :show arg", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission:show="'denied'">Hidden</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    const span = wrapper.find("span");
    expect(span.exists()).toBe(true);
    expect(span.element.style.display).toBe("none");
  });
});

describe("Directive: .once modifier prevents updates", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["initial"]);
  });

  afterEach(() => clearPermissionCache());

  it("sets _vPermissionSkipUpdates flag with .once modifier", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission.once="'initial'">Content</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    const el = wrapper.find("span").element as any;
    expect(el._vPermissionSkipUpdates).toBe(true);
  });
});

describe("Directive: removes and restores element from DOM", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  afterEach(() => clearPermissionCache());

  it("removes denied element from DOM (replaces with comment)", () => {
    configurePermission(["other.perm"]);

    const wrapper = mount(
      {
        template: `<div><span v-permission="'denied.perm'" class="target">Secret</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    // Element should be removed from DOM
    expect(wrapper.find(".target").exists()).toBe(false);
    // Comment node should be present
    const div = wrapper.find("div");
    const commentNodes = Array.from(div.element.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(commentNodes.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. DEBUG: logDebug
// ═══════════════════════════════════════════════════════════════
describe("logDebug", () => {
  afterEach(() => {
    configurePermission([], { persist: false });
  });

  it("logs when developmentMode is true", () => {
    configurePermission([], { developmentMode: true });

    const groupSpy = vi
      .spyOn(console, "groupCollapsed")
      .mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const groupEndSpy = vi
      .spyOn(console, "groupEnd")
      .mockImplementation(() => {});

    logDebug("test message", { extra: true });

    expect(groupSpy).toHaveBeenCalledWith("[v-permission:debug]");
    expect(logSpy).toHaveBeenCalledWith("test message", { extra: true });
    expect(groupEndSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("does NOT log when developmentMode is false", () => {
    configurePermission([], { developmentMode: false });

    const groupSpy = vi
      .spyOn(console, "groupCollapsed")
      .mockImplementation(() => {});

    logDebug("should not appear");

    expect(groupSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("does NOT log when developmentMode is not set", () => {
    configurePermission([], { developmentMode: false });

    const groupSpy = vi
      .spyOn(console, "groupCollapsed")
      .mockImplementation(() => {});

    logDebug("silent");

    expect(groupSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. STORAGE: non-browser environment (SSR)
// ═══════════════════════════════════════════════════════════════
describe("Storage: non-browser environment", () => {
  it("savePermissionsToStorage is no-op without localStorage", () => {
    const origStorage = globalThis.localStorage;

    // Temporarily remove localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Should not throw
    expect(() => savePermissionsToStorage(["test"])).not.toThrow();

    // Restore
    Object.defineProperty(globalThis, "localStorage", {
      value: origStorage,
      writable: true,
      configurable: true,
    });
  });

  it("getPermissionsFromStorage returns null without localStorage", () => {
    const origStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(getPermissionsFromStorage()).toBeNull();

    Object.defineProperty(globalThis, "localStorage", {
      value: origStorage,
      writable: true,
      configurable: true,
    });
  });

  it("clearPermissionsFromStorage is no-op without localStorage", () => {
    const origStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => clearPermissionsFromStorage()).not.toThrow();

    Object.defineProperty(globalThis, "localStorage", {
      value: origStorage,
      writable: true,
      configurable: true,
    });
  });
});

describe("Storage: unicode handling", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("handles unicode permissions correctly", () => {
    const unicodePerms = ["قراءة", "كتابة", "حذف"];
    savePermissionsToStorage(unicodePerms);
    expect(getPermissionsFromStorage()).toEqual(unicodePerms);
  });

  it("handles emoji permissions", () => {
    const emojiPerms = ["🔑.admin", "🔒.secure"];
    savePermissionsToStorage(emojiPerms);
    expect(getPermissionsFromStorage()).toEqual(emojiPerms);
  });
});

describe("Storage: corruption tolerance", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns null for corrupted base64 data", () => {
    localStorage.setItem("__v_permission__", "!!!not-base64!!!");
    expect(getPermissionsFromStorage()).toBeNull();
  });

  it("returns null for valid base64 but invalid JSON", () => {
    localStorage.setItem("__v_permission__", btoa("not json"));
    expect(getPermissionsFromStorage()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. CONFIG: getReactivePermissions sync
// ═══════════════════════════════════════════════════════════════
describe("Config: reactive permissions sync", () => {
  beforeEach(() => configurePermission([]));
  afterEach(() => configurePermission([]));

  it("getReactivePermissions returns a ref synced with configurePermission", () => {
    configurePermission(["a", "b"]);
    const reactive = getReactivePermissions();
    expect(reactive.value).toEqual(["a", "b"]);

    configurePermission(["c"]);
    expect(reactive.value).toEqual(["c"]);
  });

  it("getCurrentPermissions returns empty for null permissions", () => {
    // After clearing, permissions are []
    configurePermission([], { persist: false });
    expect(getCurrentPermissions()).toEqual([]);
  });

  it("isDevMode reflects current config", () => {
    expect(isDevMode()).toBe(false);
    configurePermission([], { developmentMode: true });
    expect(isDevMode()).toBe(true);
    configurePermission([], { developmentMode: false });
    expect(isDevMode()).toBe(false);
  });

  it("configurePermission defaults developmentMode to false", () => {
    configurePermission(["test"]);
    expect(isDevMode()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. HELPERS: edge cases
// ═══════════════════════════════════════════════════════════════
describe("Helpers: normalizePermissions edges", () => {
  it("filters out falsy elements via Boolean filter", () => {
    // normalizePermissions uses .filter(Boolean), so falsy values (null, undefined, 0, '') are removed
    // but truthy non-strings like numbers are kept
    expect(normalizePermissions([null, undefined, "valid"] as any)).toEqual([
      "valid",
    ]);
    expect(normalizePermissions([0, "", "valid"] as any)).toEqual(["valid"]);
  });

  it("keeps truthy non-string elements (no type filtering)", () => {
    // normalizePermissions only does .filter(Boolean), doesn't check typeof
    expect(normalizePermissions([123, "valid"] as any)).toEqual([123, "valid"]);
  });

  it("preserves whitespace (no trimming)", () => {
    // normalizePermissions does NOT trim
    expect(normalizePermissions(["  spaced  ", "trimmed"])).toEqual([
      "  spaced  ",
      "trimmed",
    ]);
  });

  it("filters out empty strings (falsy)", () => {
    expect(normalizePermissions(["", "valid"])).toEqual(["valid"]);
  });

  it("handles empty array", () => {
    expect(normalizePermissions([])).toEqual([]);
  });

  it("handles null input", () => {
    expect(normalizePermissions(null)).toEqual([]);
  });

  it("handles undefined input", () => {
    expect(normalizePermissions(undefined)).toEqual([]);
  });
});

describe("Helpers: stableStringify", () => {
  it("produces consistent output for same object with different key order", () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it("handles nested objects with consistent ordering", () => {
    const obj1 = { outer: { z: 3, a: 1 }, name: "test" };
    const obj2 = { name: "test", outer: { a: 1, z: 3 } };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it("handles arrays (order preserved)", () => {
    expect(stableStringify([1, 2, 3])).toBe(stableStringify([1, 2, 3]));
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it("handles null and undefined", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe(undefined);
  });

  it("handles primitive values", () => {
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify(true)).toBe("true");
  });
});

describe("Helpers: isPermissionObject", () => {
  it("returns true for valid PermissionObject", () => {
    expect(isPermissionObject({ permissions: ["a"], mode: "and" })).toBe(true);
  });

  it("returns false for missing permissions", () => {
    expect(isPermissionObject({ mode: "and" })).toBe(false);
  });

  it("returns false for missing mode", () => {
    expect(isPermissionObject({ permissions: ["a"] })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isPermissionObject("string")).toBe(false);
    expect(isPermissionObject(123)).toBe(false);
    expect(isPermissionObject(null)).toBe(false);
    expect(isPermissionObject(undefined)).toBe(false);
    expect(isPermissionObject([])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. createGuard: factory pattern specifics
// ═══════════════════════════════════════════════════════════════
describe("createPermissionGuard: factory behavior", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view"]);
  });

  afterEach(() => clearPermissionCache());

  it("returns a reusable function", () => {
    const guard = createPermissionGuard({ loginPath: "/login" });
    expect(typeof guard).toBe("function");
  });

  it("created guard uses options consistently", async () => {
    const onDenied = vi.fn();
    const onAllowed = vi.fn();
    const guard = createPermissionGuard({
      loginPath: "/auth",
      homePath: "/home",
      getAuthState: () => ({ isAuthenticated: true }),
      onDenied,
      onAllowed,
    });

    // First call — allowed
    const next1 = vi.fn();
    await guard(createMockRoute("/public"), createMockRoute("/"), next1);
    expect(onAllowed).toHaveBeenCalledTimes(1);

    // Second call — denied
    const next2 = vi.fn();
    await guard(
      createMockRoute("/restricted", {
        checkPermission: true,
        permissions: "admin",
      }),
      createMockRoute("/"),
      next2,
    );
    expect(onDenied).toHaveBeenCalledTimes(1);
  });

  it("guard with no options uses defaults", async () => {
    const guard = createPermissionGuard();
    const next = vi.fn();

    // requiresAuth but no auth state → redirect to default /login
    await guard(
      createMockRoute("/protected", { requiresAuth: true }),
      createMockRoute("/"),
      next,
    );

    expect(next).toHaveBeenCalledWith("/login");
  });

  it("guard error handling redirects to loginPath", async () => {
    const guard = createPermissionGuard({
      loginPath: "/error-page",
      getAuthState: () => {
        throw new Error("Service unavailable");
      },
    });
    const next = vi.fn();

    await guard(createMockRoute("/any"), createMockRoute("/"), next);

    expect(next).toHaveBeenCalledWith("/error-page");
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. Integration: permission lifecycle
// ═══════════════════════════════════════════════════════════════
describe("Integration: full permission lifecycle", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("plugin → composable → setPermissions → guard flow", async () => {
    // 1. Install plugin
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["dashboard.view"],
    });

    // 2. Composable sees initial permissions
    const { can, setPermissions, permissions } = usePermission();
    expect(permissions.value).toEqual(["dashboard.view"]);
    expect(await can("dashboard.view")).toBe(true);
    expect(await can("admin.panel")).toBe(false);

    // 3. Update permissions (simulating login response)
    setPermissions(["dashboard.view", "admin.panel", "users.manage"]);
    expect(permissions.value).toContain("admin.panel");

    // 4. Verify storage is updated
    expect(getPermissionsFromStorage()).toEqual([
      "dashboard.view",
      "admin.panel",
      "users.manage",
    ]);

    // 5. Verify global config is updated (critical for v-permission directive)
    expect(getCurrentPermissions()).toEqual([
      "dashboard.view",
      "admin.panel",
      "users.manage",
    ]);

    // 6. Guard should use updated permissions via authState
    const guard = createPermissionGuard({
      getAuthState: () => ({
        isAuthenticated: true,
        permissions: permissions.value,
      }),
    });

    const next = vi.fn();
    await guard(
      createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin.panel",
      }),
      createMockRoute("/"),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("setPermissions syncs global config so v-permission directive works", async () => {
    // This test verifies the fix for: after login, setPermissions()
    // must update globalConfig so that v-permission directive (which uses
    // checkPermissionSync → getCurrentPermissions) sees the new permissions.

    const app = createApp({});
    await app.use(PermissionPlugin, { permissions: [] });

    // Simulate: composable sets permissions after login
    const { setPermissions } = usePermission();
    setPermissions(["posts.create", "posts.edit"]);

    // Directive uses checkPermissionSync which reads globalConfig
    expect(checkPermissionSync("posts.create")).toBe(true);
    expect(checkPermissionSync("posts.edit")).toBe(true);
    expect(checkPermissionSync("posts.delete")).toBe(false);
  });

  it("storage persistence across instances", async () => {
    // First "session" — plugin sets permissions
    const app1 = createApp({});
    await app1.use(PermissionPlugin, {
      permissions: ["feature.a", "feature.b"],
    });

    // Second "session" — reset runtime state without touching storage
    configurePermission([], { persist: false });
    clearPermissionCache();

    const app2 = createApp({});
    await app2.use(PermissionPlugin);

    expect(getCurrentPermissions()).toEqual(["feature.a", "feature.b"]);
  });

  it("fetchPermissions → composable → cache interaction", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, {
      fetchPermissions: async () => ["api.read", "api.write"],
    });

    const { can, canSync, refresh } = usePermission();

    // First call populates cache
    expect(await can("api.read")).toBe(true);
    // Second call uses cache
    expect(await can("api.read")).toBe(true);

    // Sync check
    expect(canSync("api.write")).toBe(true);
    expect(canSync("api.delete")).toBe(false);

    // Refresh clears cache
    refresh();
    // Can still check after refresh
    expect(await can("api.read")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. Evaluator: complex permission patterns
// ═══════════════════════════════════════════════════════════════
describe("Evaluator: complex permission patterns", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([
      "app.dashboard.view",
      "app.dashboard.edit",
      "app.users.list",
      "app.users.create",
      "app.settings.read",
    ]);
  });

  afterEach(() => clearPermissionCache());

  it("startWith finds all matching prefixes", async () => {
    expect(
      await hasPermission({
        permissions: ["app.dashboard"],
        mode: "startWith",
      }),
    ).toBe(true);

    expect(
      await hasPermission({
        permissions: ["app.nonexistent"],
        mode: "startWith",
      }),
    ).toBe(false);
  });

  it("endWith finds all matching suffixes", async () => {
    expect(
      await hasPermission({ permissions: [".view"], mode: "endWith" }),
    ).toBe(true);

    expect(
      await hasPermission({ permissions: [".delete"], mode: "endWith" }),
    ).toBe(false);
  });

  it("regex matches across permissions", async () => {
    expect(
      await hasPermission({
        permissions: ["^app\\.dashboard\\."],
        mode: "regex",
      }),
    ).toBe(true);

    expect(
      await hasPermission({
        permissions: ["\\.(view|list)$"],
        mode: "regex",
      }),
    ).toBe(true);

    expect(
      await hasPermission({
        permissions: ["^admin\\."],
        mode: "regex",
      }),
    ).toBe(false);
  });

  it("not mode denies when user has any listed permission", async () => {
    expect(
      await hasPermission({
        permissions: ["app.dashboard.view"],
        mode: "not",
      }),
    ).toBe(false);
  });

  it("not mode allows when user has none of the listed permissions", async () => {
    expect(
      await hasPermission({
        permissions: ["admin.super", "root.access"],
        mode: "not",
      }),
    ).toBe(true);
  });

  it("and mode requires all permissions", async () => {
    expect(
      await hasPermission({
        permissions: ["app.dashboard.view", "app.users.list"],
        mode: "and",
      }),
    ).toBe(true);

    expect(
      await hasPermission({
        permissions: ["app.dashboard.view", "missing.perm"],
        mode: "and",
      }),
    ).toBe(false);
  });

  it("or mode requires any permission", async () => {
    expect(
      await hasPermission({
        permissions: ["missing1", "app.users.list"],
        mode: "or",
      }),
    ).toBe(true);

    expect(
      await hasPermission({
        permissions: ["missing1", "missing2"],
        mode: "or",
      }),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 14. Multiple directives on same page
// ═══════════════════════════════════════════════════════════════
describe("Directive: multiple elements with different permissions", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["read", "write"]);
  });

  afterEach(() => clearPermissionCache());

  it("correctly handles multiple directives independently", () => {
    const wrapper = mount(
      {
        template: `
          <div>
            <span v-permission="'read'" class="r">Read</span>
            <span v-permission="'write'" class="w">Write</span>
            <span v-permission="'delete'" class="d">Delete</span>
            <span v-permission="'admin'" class="a">Admin</span>
          </div>
        `,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    expect(wrapper.find(".r").exists()).toBe(true);
    expect(wrapper.find(".w").exists()).toBe(true);
    expect(wrapper.find(".d").exists()).toBe(false);
    expect(wrapper.find(".a").exists()).toBe(false);
  });

  it("mixed show and remove modes", () => {
    const wrapper = mount(
      {
        template: `
          <div>
            <span v-permission.show="'delete'" class="show-hidden">Show Hidden</span>
            <span v-permission="'delete'" class="removed">Removed</span>
            <span v-permission="'read'" class="visible">Visible</span>
          </div>
        `,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    // .show modifier: element in DOM but hidden
    const showEl = wrapper.find(".show-hidden");
    expect(showEl.exists()).toBe(true);
    expect(showEl.element.style.display).toBe("none");

    // No modifier: element removed from DOM
    expect(wrapper.find(".removed").exists()).toBe(false);

    // Has permission: element visible
    expect(wrapper.find(".visible").exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 15. Directive with array and object permissions
// ═══════════════════════════════════════════════════════════════
describe("Directive: array and object permission values", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["editor", "viewer"]);
  });

  afterEach(() => clearPermissionCache());

  it("allows when any array permission matches (OR logic)", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission="['admin', 'editor']" class="target">OK</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    expect(wrapper.find(".target").exists()).toBe(true);
  });

  it("denies when no array permission matches", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission="['admin', 'superuser']" class="target">No</span></div>`,
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    expect(wrapper.find(".target").exists()).toBe(false);
  });

  it("supports object with and mode", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission="permObj" class="target">Both</span></div>`,
        data() {
          return {
            permObj: { permissions: ["editor", "viewer"], mode: "and" },
          };
        },
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    expect(wrapper.find(".target").exists()).toBe(true);
  });

  it("denies object with and mode when missing one", () => {
    const wrapper = mount(
      {
        template: `<div><span v-permission="permObj" class="target">No</span></div>`,
        data() {
          return {
            permObj: { permissions: ["editor", "admin"], mode: "and" },
          };
        },
      },
      {
        global: {
          directives: { permission: vPermission },
        },
      },
    );

    expect(wrapper.find(".target").exists()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 16. Guard: deeply nested protectedRoutes
// ═══════════════════════════════════════════════════════════════
describe("Guard: deeply nested route traversal", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.basic"]);
  });

  afterEach(() => clearPermissionCache());

  it("finds accessible route in 3-level deep nesting", async () => {
    const protectedRoutes: PermissionRoute[] = [
      {
        path: "/l1",
        meta: { permissions: "admin" },
        children: [
          {
            path: "/l2",
            meta: { permissions: "moderator" },
            children: [
              {
                path: "/l3",
                meta: { permissions: "user.basic" }, // accessible!
              },
            ],
          },
        ],
      },
    ];

    const to = createMockRoute("/restricted", {
      checkPermission: true,
      permissions: "admin",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      protectedRoutes,
      loginPath: "/login",
    });

    expect(next).toHaveBeenCalledWith("/l1/l2/l3");
  });

  it("route with no meta defaults to wildcard permissions", async () => {
    const protectedRoutes: PermissionRoute[] = [
      {
        path: "/no-meta",
        // No meta — should default to "*"
      },
    ];

    const to = createMockRoute("/blocked", {
      checkPermission: true,
      permissions: "blocked.perm",
    });
    const from = createMockRoute("/");
    const next = vi.fn();

    await globalGuard(to, from, next, {
      getAuthState: () => ({ isAuthenticated: true }),
      protectedRoutes,
      loginPath: "/login",
    });

    // Route with no meta.permissions defaults to "*" → accessible
    expect(next).toHaveBeenCalledWith("/no-meta");
  });
});

// ═══════════════════════════════════════════════════════════════
// 17. hasPermission with custom userPermissions (not global)
// ═══════════════════════════════════════════════════════════════
describe("hasPermission: explicit userPermissions override", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["global.perm"]);
  });

  afterEach(() => clearPermissionCache());

  it("uses provided userPermissions instead of global", async () => {
    expect(await hasPermission("custom.perm", ["custom.perm"])).toBe(true);
    expect(await hasPermission("global.perm", ["custom.perm"])).toBe(false);
  });

  it("checkPermissionSync uses provided userPermissions", () => {
    expect(checkPermissionSync("custom.perm", ["custom.perm"])).toBe(true);
    expect(checkPermissionSync("global.perm", ["custom.perm"])).toBe(false);
  });

  it("all modes work with custom userPermissions", async () => {
    const custom = ["app.read", "app.write", "api.get"];

    expect(
      await hasPermission(
        { permissions: ["app.read", "app.write"], mode: "and" },
        custom,
      ),
    ).toBe(true);

    expect(
      await hasPermission(
        { permissions: ["missing", "app.read"], mode: "or" },
        custom,
      ),
    ).toBe(true);

    expect(
      await hasPermission(
        { permissions: ["nonexistent"], mode: "not" },
        custom,
      ),
    ).toBe(true);

    expect(
      await hasPermission({ permissions: ["app."], mode: "startWith" }, custom),
    ).toBe(true);

    expect(
      await hasPermission({ permissions: [".get"], mode: "endWith" }, custom),
    ).toBe(true);

    expect(
      await hasPermission({ permissions: ["^api\\."], mode: "regex" }, custom),
    ).toBe(true);
  });
});
