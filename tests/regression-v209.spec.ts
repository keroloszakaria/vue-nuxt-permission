import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import { usePermission } from "../src/composables/usePermission";
import { clearPermissionCache } from "../src/core/cache";
import { configurePermission, getCurrentPermissions } from "../src/core/config";
import { createPermissionGuard } from "../src/guards/createGuard";
import { globalGuard } from "../src/guards/globalGuard";
import PermissionPlugin from "../src/plugin";
import type { PermissionRoute } from "../src/types";
import {
  clearPermissionsFromStorage,
  getPermissionsFromStorage,
} from "../src/utils/storage";

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

describe("Regression: v2.0.9 fixes", () => {
  beforeEach(() => {
    clearPermissionCache();
    clearPermissionsFromStorage();
    configurePermission([], { persist: false });
  });

  afterEach(() => {
    clearPermissionCache();
    clearPermissionsFromStorage();
    configurePermission([], { persist: false });
  });

  describe("globalGuard: protectedRoutes-based inference", () => {
    it("denies unauthenticated user navigating to a protected route without meta.requiresAuth", async () => {
      // This is the security bug that affected aware-v2 and mujib:
      // routes had no meta flags, so the guard let everyone through.
      const protectedRoutes: PermissionRoute[] = [
        { path: "/dashboard" },
        { path: "/settings" },
      ];
      const to = createMockRoute("/dashboard"); // no meta
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        protectedRoutes,
        getAuthState: () => ({ isAuthenticated: false }),
        loginPath: "/login",
      });

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("allows authenticated user to navigate to a protected route without meta", async () => {
      const protectedRoutes: PermissionRoute[] = [{ path: "/dashboard" }];
      const to = createMockRoute("/dashboard");
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        protectedRoutes,
        getAuthState: () => ({ isAuthenticated: true }),
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("does not interfere with routes outside protectedRoutes", async () => {
      const to = createMockRoute("/landing"); // not in protectedRoutes
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        protectedRoutes: [{ path: "/dashboard" }],
        getAuthState: () => ({ isAuthenticated: false }),
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("respects permissions defined on the matched protectedRoutes entry", async () => {
      const protectedRoutes: PermissionRoute[] = [
        { path: "/admin", meta: { permissions: "admin.access" } },
      ];
      const to = createMockRoute("/admin"); // no meta on the route itself
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        protectedRoutes,
        getAuthState: () => ({
          isAuthenticated: true,
          user: { permissions: ["user.view"] },
        }),
        loginPath: "/login",
      });

      // User lacks admin.access → denied → falls back to loginPath
      expect(next).toHaveBeenCalledWith("/login");
    });
  });

  describe("globalGuard: authState.user.permissions fallback", () => {
    it("reads permissions from authState.user.permissions when authState.permissions is missing", async () => {
      // Pattern used by aware-v2 and mujib: getAuthState returns
      // { isAuthenticated, user } with no top-level permissions.
      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin.access",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        getAuthState: () => ({
          isAuthenticated: true,
          user: { permissions: ["admin.access", "user.view"] },
        }),
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("syncs discovered user permissions into the package state", async () => {
      expect(getCurrentPermissions()).toEqual([]);

      const to = createMockRoute("/dashboard");
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        protectedRoutes: [{ path: "/dashboard" }],
        getAuthState: () => ({
          isAuthenticated: true,
          user: { permissions: ["posts.read", "posts.write"] },
        }),
      });

      expect(getCurrentPermissions()).toEqual(["posts.read", "posts.write"]);
    });
  });

  describe("createPermissionGuard: same fixes as globalGuard", () => {
    it("denies unauthenticated user on protectedRoutes without meta", async () => {
      const guard = createPermissionGuard({
        protectedRoutes: [{ path: "/dashboard" }],
        getAuthState: () => ({ isAuthenticated: false }),
        loginPath: "/login",
      });
      const next = vi.fn();
      await guard(createMockRoute("/dashboard"), createMockRoute("/"), next);
      expect(next).toHaveBeenCalledWith("/login");
    });

    it("reads authState.user.permissions", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({
          isAuthenticated: true,
          user: { permissions: ["x"] },
        }),
      });
      const next = vi.fn();
      await guard(
        createMockRoute("/foo", { checkPermission: true, permissions: "x" }),
        createMockRoute("/"),
        next,
      );
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("Plugin: persist option is honored", () => {
    it("does NOT write to storage when persist is false", async () => {
      const app = createApp({});
      await app.use(PermissionPlugin, {
        permissions: ["scoped.only"],
        persist: false,
      });

      expect(getCurrentPermissions()).toEqual(["scoped.only"]);
      expect(getPermissionsFromStorage()).toBeNull();
    });
  });

  describe("usePermission: bound to global reactive state", () => {
    it("reflects external configurePermission updates without recreating composable", () => {
      const { permissions } = usePermission();
      expect(permissions.value).toEqual([]);

      configurePermission(["external.update"], { persist: false });
      expect(permissions.value).toEqual(["external.update"]);
    });

    it("reflects setPermissions calls made via a different composable instance", () => {
      const a = usePermission();
      const b = usePermission();

      b.setPermissions(["from.b"]);
      expect(a.permissions.value).toEqual(["from.b"]);
    });
  });
});
