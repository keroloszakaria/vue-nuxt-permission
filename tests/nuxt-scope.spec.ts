import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import {
  createPermissionScope,
  parseFetchedPermissions,
  permissionScopeKey,
} from "../src/core/scope";
import { configurePermission, getCurrentPermissions } from "../src/core/config";
import { createPermissionDirective } from "../src/directives/v-permission";
import { usePermission } from "../src/composables/usePermission";
import PermissionPlugin from "../src/plugin";

describe("Nuxt request-local permission scope", () => {
  beforeEach(() => {
    localStorage.clear();
    configurePermission([], { persist: false });
  });
  afterEach(() => {
    localStorage.clear();
    configurePermission([], { persist: false });
  });

  it("never shares permissions between concurrent request scopes", async () => {
    const alice = createPermissionScope(["alice.read"], { persist: false });
    const bob = createPermissionScope(["bob.write"], { persist: false });

    const [a, b] = await Promise.all([
      Promise.resolve().then(() => usePermission(alice)),
      Promise.resolve().then(() => usePermission(bob)),
    ]);

    expect(await a.can("alice.read")).toBe(true);
    expect(await a.can("bob.write")).toBe(false);
    expect(await b.can("alice.read")).toBe(false);
    expect(await b.can("bob.write")).toBe(true);
    expect(getCurrentPermissions()).toEqual([]);

    bob.setPermissions(["bob.admin"]);
    expect(a.canSync("alice.read")).toBe(true);
    expect(a.canSync("bob.admin")).toBe(false);
    expect(b.canSync("bob.admin")).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it("scopes injected composables to each Vue app instance", () => {
    const makeComponent = () =>
      defineComponent({
        setup() {
          const { canSync } = usePermission();
          return () => h("div", canSync("team.admin") ? "allowed" : "denied");
        },
      });

    const adminScope = createPermissionScope(["team.admin"], { persist: false });
    const guestScope = createPermissionScope(["team.read"], { persist: false });
    const admin = mount(makeComponent(), {
      global: { provide: { [permissionScopeKey]: adminScope } },
    });
    const guest = mount(makeComponent(), {
      global: { provide: { [permissionScopeKey]: guestScope } },
    });

    expect(admin.text()).toBe("allowed");
    expect(guest.text()).toBe("denied");
    admin.unmount();
    guest.unmount();
  });

  it("rehydrates through an externally supplied per-request ref", () => {
    const hydrated = ref(["server.read"]);
    const server = createPermissionScope([], { state: hydrated, persist: false });
    expect(server.permissions.value).toEqual(["server.read"]);
    server.setPermissions(["server.updated"]);
    expect(hydrated.value).toEqual(["server.updated"]);
  });

  it("keeps SSR directive checks request-local and fails closed", () => {
    const first = createPermissionScope(["secret.read"], { persist: false });
    const second = createPermissionScope([], { persist: false });
    const allowed = createPermissionDirective(first);
    const denied = createPermissionDirective(second);
    const binding = { value: "secret.read" } as any;

    expect(allowed.getSSRProps(binding)).toEqual({});
    expect(denied.getSSRProps(binding)).toEqual({
      style: { display: "none" },
    });
  });

  it("reacts to permission changes in only the bound directive scope", async () => {
    const scope = createPermissionScope([], { persist: false });
    const other = createPermissionScope(["admin"], { persist: false });
    const wrapper = mount({
      template: `<div><button v-permission="'admin'">Manage</button></div>`,
    }, {
      global: {
        directives: { permission: createPermissionDirective(scope) },
      },
    });

    expect(wrapper.find("button").exists()).toBe(false);
    other.setPermissions([]);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(false);
    scope.setPermissions(["admin"]);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("Nuxt permission loader validation", () => {
  it("accepts arrays and wrapped arrays", () => {
    expect(parseFetchedPermissions(["read"])).toEqual(["read"]);
    expect(parseFetchedPermissions({ permissions: ["write"] })).toEqual(["write"]);
  });

  it("fails closed on malformed or privileged-looking responses", () => {
    for (const input of [
      undefined,
      { permissions: "admin" },
      { permissions: [42] },
      { role: "admin" },
      null,
    ]) {
      expect(() => parseFetchedPermissions(input)).toThrow(TypeError);
    }
  });
});

describe("Vue async plugin bootstrap", () => {
  it("registers the directive synchronously while async permissions load", async () => {
    let release: (permissions: string[]) => void = () => {};
    const pending = new Promise<string[]>((resolve) => {
      release = resolve;
    });
    const app = createApp({});
    app.use(PermissionPlugin, { fetchPermissions: () => pending, persist: false });

    expect(app.directive("permission")).toBeDefined();
    expect(getCurrentPermissions()).toEqual([]);

    release(["user.read"]);
    await vi.waitFor(() => {
      expect(getCurrentPermissions()).toEqual(["user.read"]);
    });
  });
});

describe("SSR scoped route guards", () => {
  it("clears scoped permissions on logout guard execution", async () => {
    const { createPermissionGuard } = await import("../src/guards/createGuard");
    const scope = createPermissionScope(["admin.read"], { persist: false });
    const next = vi.fn();
    const guard = createPermissionGuard({
      permissionScope: scope,
      getAuthState: () => ({ isAuthenticated: false }),
    });
    await guard(
      { path: "/public", meta: {} } as any,
      { path: "/" } as any,
      next,
    );
    expect(scope.permissions.value).toEqual([]);
    expect(next).toHaveBeenCalledWith();
  });

  const makeRoute = (path: string, permissions?: string) => ({
    path,
    fullPath: path,
    name: path,
    matched: [],
    params: {},
    query: {},
    hash: "",
    meta: permissions ? { checkPermission: true, permissions } : {},
    redirectedFrom: undefined,
  });

  it("createPermissionGuard denies a guest even if legacy global state grants admin", async () => {
    const { createPermissionGuard } = await import("../src/guards/createGuard");
    const scope = createPermissionScope(["user.read"], { persist: false });
    configurePermission(["admin.read"], { persist: false });
    const next = vi.fn();
    await createPermissionGuard({
      permissionScope: scope,
      getAuthState: () => ({ isAuthenticated: true }),
      loginPath: "/login",
    })(
      makeRoute("/admin", "admin.read") as any,
      makeRoute("/") as any,
      next,
    );
    expect(next).toHaveBeenCalledWith("/login");
    expect(scope.permissions.value).toEqual(["user.read"]);
  });

  it("globalGuard does not copy other user permissions into a scoped request", async () => {
    const { globalGuard } = await import("../src/guards/globalGuard");
    const alice = createPermissionScope(["team.admin"], { persist: false });
    const bob = createPermissionScope(["team.read"], { persist: false });
    const check = async (permissionScope: typeof alice) => {
      const next = vi.fn();
      await globalGuard(
        makeRoute("/dashboard", "team.admin") as any,
        makeRoute("/") as any,
        next,
        {
          permissionScope,
          getAuthState: () => ({ isAuthenticated: true }),
          loginPath: "/login",
        },
      );
      return next;
    };
    const [aliceNext, bobNext] = await Promise.all([check(alice), check(bob)]);
    expect(aliceNext).toHaveBeenCalledWith();
    expect(bobNext).toHaveBeenCalledWith("/login");
    expect(alice.permissions.value).toEqual(["team.admin"]);
    expect(bob.permissions.value).toEqual(["team.read"]);
  });

  it("rejects malformed per-request grants instead of using global permissions", async () => {
    const { globalGuard } = await import("../src/guards/globalGuard");
    const scope = createPermissionScope(["old.admin"], { persist: false });
    const next = vi.fn();
    await globalGuard(
      makeRoute("/dashboard", "old.admin") as any,
      makeRoute("/") as any,
      next,
      {
        permissionScope: scope,
        getAuthState: () => ({ isAuthenticated: true, permissions: "old.admin" as any }),
        loginPath: "/login",
      },
    );
    expect(next).toHaveBeenCalledWith("/login");
    expect(scope.permissions.value).toEqual([]);
  });
});

describe("Nuxt permission endpoint validation", () => {
  it("only accepts canonical same-origin paths", async () => {
    const { isSafePermissionEndpoint } = await import("../src/utils/permissionEndpoint");
    expect(isSafePermissionEndpoint("/api/user/permissions")).toBe(true);
    expect(isSafePermissionEndpoint("/api/user/permissions?reload=1")).toBe(true);

    for (const input of [
      "//attacker.example/permissions",
      "/\\attacker.example/permissions",
      "/%5cattacker.example",
      "/%2Fattacker.example",
      "https://attacker.example/api",
      "javascript:alert(1)",
      " /api/permissions",
      "/api/permissions\n",
      undefined,
    ]) {
      expect(isSafePermissionEndpoint(input)).toBe(false);
    }
  });
});
