import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePermission } from "../src/composables/usePermission";
import { clearPermissionCache } from "../src/core/cache";
import { configurePermission } from "../src/core/config";
import {
  clearPermissionsFromStorage,
  savePermissionsToStorage,
} from "../src/utils/storage";

describe("usePermission Composable", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([]);
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
    clearPermissionsFromStorage();
  });

  describe("permissions reactive property", () => {
    it("returns reactive permissions array", () => {
      configurePermission(["user.view", "user.edit"]);
      const { permissions } = usePermission();

      expect(permissions.value).toEqual(["user.view", "user.edit"]);
    });

    it("initializes from global config", () => {
      configurePermission(["admin", "moderator"]);
      const { permissions } = usePermission();

      expect(permissions.value).toContain("admin");
      expect(permissions.value).toContain("moderator");
    });

    it("initializes from storage when no global config", () => {
      const storedPerms = ["stored.perm1", "stored.perm2"];
      savePermissionsToStorage(storedPerms);

      const { permissions } = usePermission();
      expect(permissions.value).toEqual(storedPerms);
    });

    it("initializes as empty array when nothing configured", () => {
      const { permissions } = usePermission();
      expect(permissions.value).toEqual([]);
    });
  });

  describe("can() async method", () => {
    beforeEach(() => {
      configurePermission(["post.view", "post.edit", "user.manage"]);
    });

    it("checks single string permission", async () => {
      const { can } = usePermission();

      const allowed = await can("post.view");
      expect(allowed).toBe(true);
    });

    it("returns false for missing permission", async () => {
      const { can } = usePermission();

      const allowed = await can("admin.access");
      expect(allowed).toBe(false);
    });

    it("checks array of permissions (OR logic)", async () => {
      const { can } = usePermission();

      const allowed = await can(["post.view", "admin.access"]);
      expect(allowed).toBe(true);
    });

    it("checks complex permission objects", async () => {
      const { can } = usePermission();

      const allowed = await can({
        permissions: ["post.view", "post.edit"],
        mode: "and",
      });
      expect(allowed).toBe(true);
    });

    it("allows universal wildcard", async () => {
      const { can } = usePermission();

      const allowed = await can("*");
      expect(allowed).toBe(true);
    });

    it("handles errors gracefully", async () => {
      const { can } = usePermission();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // This should not throw
      const allowed = await can(undefined as any);
      expect(allowed).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("canSync() sync method", () => {
    beforeEach(() => {
      configurePermission(["editor", "moderator", "viewer"]);
    });

    it("checks string permission synchronously", () => {
      const { canSync } = usePermission();

      const allowed = canSync("editor");
      expect(allowed).toBe(true);
    });

    it("returns false for missing permission", () => {
      const { canSync } = usePermission();

      const allowed = canSync("admin");
      expect(allowed).toBe(false);
    });

    it("checks array permissions (OR logic)", () => {
      const { canSync } = usePermission();

      const allowed = canSync(["admin", "editor", "user"]);
      expect(allowed).toBe(true);
    });

    it("checks AND mode permissions", () => {
      configurePermission(["perm1", "perm2", "perm3"]);
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["perm1", "perm2"],
        mode: "and",
      });
      expect(allowed).toBe(true);
    });

    it("checks NOT mode permissions", () => {
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["admin"],
        mode: "not",
      });
      expect(allowed).toBe(true);
    });

    it("returns false for invalid permission objects", () => {
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["something"],
        mode: "invalidmode" as any,
      });
      expect(allowed).toBe(false);
    });

    it("supports regex in sync mode", () => {
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["^editor.*"],
        mode: "regex",
      });
      expect(allowed).toBe(true);
    });

    it("supports startWith in sync mode", () => {
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["edit"],
        mode: "startWith",
      });
      expect(allowed).toBe(true);
    });

    it("supports endWith in sync mode", () => {
      const { canSync } = usePermission();

      const allowed = canSync({
        permissions: ["ator"],
        mode: "endWith",
      });
      expect(allowed).toBe(true);
    });

    it("handles wildcard", () => {
      const { canSync } = usePermission();

      const allowed = canSync("*");
      expect(allowed).toBe(true);
    });
  });

  describe("refresh() method", () => {
    it("clears cache and reloads from global config", async () => {
      configurePermission(["initial.perm"]);
      const { permissions, refresh, can } = usePermission();

      // Initial state
      expect(permissions.value).toEqual(["initial.perm"]);
      let canView = await can("initial.perm");
      expect(canView).toBe(true);

      // Reconfigure
      configurePermission(["updated.perm"]);
      refresh();

      expect(permissions.value).toEqual(["updated.perm"]);
      canView = await can("initial.perm");
      expect(canView).toBe(false);
    });

    it("reloads from storage after refresh", () => {
      const storedPerms = ["from.storage"];
      savePermissionsToStorage(storedPerms);

      const { permissions, refresh } = usePermission();
      refresh();

      expect(permissions.value).toEqual(storedPerms);
    });

    it("clears permission cache on refresh", async () => {
      configurePermission(["test.perm"]);
      const { can, refresh } = usePermission();

      // First call should cache
      let result = await can("test.perm");
      expect(result).toBe(true);

      // Reconfigure and refresh
      configurePermission([]);
      refresh();

      // Should recompute, not use cache
      result = await can("test.perm");
      expect(result).toBe(false);
    });
  });

  describe("setPermissions() method (NEW)", () => {
    it("updates permissions reactively", () => {
      const { permissions, setPermissions } = usePermission();

      setPermissions(["new.perm1", "new.perm2"]);
      expect(permissions.value).toEqual(["new.perm1", "new.perm2"]);
    });

    it("persists updated permissions to storage", () => {
      const { setPermissions } = usePermission();

      setPermissions(["persisted.perm"]);

      // Verify it's in storage
      const stored = localStorage.getItem("__v_permission__");
      expect(stored).toBeTruthy();
    });

    it("clears cache when setting new permissions", async () => {
      configurePermission(["old.perm"]);
      const { can, setPermissions } = usePermission();

      let result = await can("old.perm");
      expect(result).toBe(true);

      setPermissions(["new.perm"]);

      result = await can("old.perm");
      expect(result).toBe(false);

      result = await can("new.perm");
      expect(result).toBe(true);
    });

    it("rejects non-array input gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { permissions, setPermissions } = usePermission();

      setPermissions("not.an.array" as any);

      // Permissions should not be updated
      expect(Array.isArray(permissions.value)).toBe(true);

      consoleSpy.mockRestore();
    });

    it("handles empty array", () => {
      configurePermission(["something"]);
      const { permissions, setPermissions } = usePermission();

      setPermissions([]);
      expect(permissions.value).toEqual([]);
    });
  });

  describe("hasAll() method (NEW)", () => {
    beforeEach(() => {
      configurePermission(["post.view", "post.edit", "post.delete"]);
    });

    it("returns true when user has all permissions", async () => {
      const { hasAll } = usePermission();

      const allowed = await hasAll(["post.view", "post.edit"]);
      expect(allowed).toBe(true);
    });

    it("returns false when user lacks one permission", async () => {
      const { hasAll } = usePermission();

      const allowed = await hasAll(["post.view", "post.publish"]);
      expect(allowed).toBe(false);
    });

    it("returns true for empty array", async () => {
      const { hasAll } = usePermission();

      const allowed = await hasAll([]);
      expect(allowed).toBe(true);
    });

    it("handles single permission", async () => {
      const { hasAll } = usePermission();

      const allowed = await hasAll(["post.view"]);
      expect(allowed).toBe(true);
    });

    it("is case-sensitive", async () => {
      const { hasAll } = usePermission();

      const allowed = await hasAll(["Post.View"]);
      expect(allowed).toBe(false);
    });
  });

  describe("hasAny() method (NEW)", () => {
    beforeEach(() => {
      configurePermission(["editor", "moderator"]);
    });

    it("returns true when user has any permission", async () => {
      const { hasAny } = usePermission();

      const allowed = await hasAny(["admin", "editor", "viewer"]);
      expect(allowed).toBe(true);
    });

    it("returns false when user has none", async () => {
      const { hasAny } = usePermission();

      const allowed = await hasAny(["admin", "superuser"]);
      expect(allowed).toBe(false);
    });

    it("returns false for empty array", async () => {
      const { hasAny } = usePermission();

      const allowed = await hasAny([]);
      expect(allowed).toBe(false);
    });

    it("returns false for non-array input", async () => {
      const { hasAny } = usePermission();

      const allowed = await hasAny("not.array" as any);
      expect(allowed).toBe(false);
    });

    it("handles single permission in array", async () => {
      const { hasAny } = usePermission();

      const allowed = await hasAny(["editor"]);
      expect(allowed).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("updates permissions and reflects in can() checks", async () => {
      const { permissions, can, setPermissions } = usePermission();

      setPermissions(["first.perm"]);
      expect(await can("first.perm")).toBe(true);
      expect(await can("second.perm")).toBe(false);

      setPermissions(["second.perm"]);
      expect(await can("first.perm")).toBe(false);
      expect(await can("second.perm")).toBe(true);
    });

    it("uses hasAll/hasAny for complex checks", async () => {
      const { setPermissions, hasAll, hasAny } = usePermission();

      setPermissions(["read", "write"]);

      expect(await hasAll(["read", "write"])).toBe(true);
      expect(await hasAll(["read", "delete"])).toBe(false);
      expect(await hasAny(["read", "delete"])).toBe(true);
      expect(await hasAny(["delete", "execute"])).toBe(false);
    });

    it("survives permission changes without cache issues", async () => {
      const { can, setPermissions, refresh } = usePermission();

      setPermissions(["perm1"]);
      expect(await can("perm1")).toBe(true);

      // refresh() clears cache and re-hydrates from storage when global is
      // empty. Since setPermissions persisted ["perm1"], refresh keeps it.
      refresh();
      expect(await can("perm1")).toBe(true);

      setPermissions(["perm1", "perm2"]);
      expect(await can("perm1")).toBe(true);
      expect(await can("perm2")).toBe(true);
    });
  });
});
