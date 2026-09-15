import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import { clearPermissionCache } from "../src/core/cache";
import { configurePermission } from "../src/core/config";
import { createPermissionDecryptor } from "../src/crypto";
import { createPermissionGuard } from "../src/guards/createGuard";
import { globalGuard } from "../src/guards/globalGuard";
import type { GuardOptions, PermissionRoute } from "../src/types";
import { clearPermissionsFromStorage } from "../src/utils/storage";

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

const authRoutes = [{ path: "/login" }];
const from0 = createMockRoute("/");

const protectedRoutes: PermissionRoute[] = [
  { path: "/dashboard", meta: { permissions: ["dashboard.view"] } },
  { path: "/cases", meta: { permissions: ["cases.view"] } },
  { path: "/cases/view/:id", meta: { permissions: "*" } },
];

const routeMeta = (path: string, routes = protectedRoutes) =>
  routes.find((r) => r.path === path)?.meta ?? {};

type GuardFn = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => Promise<unknown>;

/**
 * Drives a guard like vue-router does: follows redirects until the guard
 * lets a navigation through. Returns the visited paths.
 */
async function navigate(
  guard: GuardFn,
  startPath: string,
  routes: PermissionRoute[] = protectedRoutes,
  maxHops = 10,
) {
  const visited: string[] = [];
  const from = createMockRoute("/");
  let path = startPath;
  let redirectedFrom: RouteLocationNormalized | undefined;

  for (let hop = 0; hop < maxHops; hop++) {
    visited.push(path);
    const to = { ...createMockRoute(path, routeMeta(path, routes)), redirectedFrom };
    let target: unknown;
    await guard(to, from, ((arg?: unknown) => {
      target = arg;
    }) as NavigationGuardNext);

    if (typeof target !== "string") return { visited, settled: true };
    redirectedFrom ??= to;
    path = target;
  }

  return { visited, settled: false };
}

const asGlobal =
  (options: GuardOptions): GuardFn =>
  (to, from, next) =>
    globalGuard(to, from, next, options);

describe("Regression: redirect loop for authenticated users without access", () => {
  beforeEach(() => {
    clearPermissionCache();
    clearPermissionsFromStorage();
    configurePermission([], { persist: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    clearPermissionCache();
    clearPermissionsFromStorage();
    vi.restoreAllMocks();
  });

  const baseOptions = (overrides: Partial<GuardOptions> = {}): GuardOptions => ({
    authRoutes,
    protectedRoutes,
    loginPath: "/login",
    homePath: "/dashboard",
    getAuthState: () => ({ isAuthenticated: true, permissions: [] }),
    ...overrides,
  });

  describe.each([
    ["globalGuard", (o: GuardOptions) => asGlobal(o)],
    ["createPermissionGuard", (o: GuardOptions) => createPermissionGuard(o)],
  ])("%s", (_name, makeGuard) => {
    it("settles on loginPath instead of looping when nothing is accessible", async () => {
      const result = await navigate(makeGuard(baseOptions()), "/dashboard");

      expect(result.settled).toBe(true);
      expect(result.visited).toEqual(["/dashboard", "/login"]);
    });

    it("still bounces authenticated users off loginPath on a normal visit", async () => {
      const result = await navigate(
        makeGuard(
          baseOptions({
            getAuthState: () => ({
              isAuthenticated: true,
              permissions: ["dashboard.view"],
            }),
          }),
        ),
        "/login",
      );

      expect(result.visited).toEqual(["/login", "/dashboard"]);
    });

    it("only lets the redirect through, not a later manual visit to loginPath", async () => {
      const guard = makeGuard(baseOptions());
      const next = vi.fn();

      await guard(createMockRoute("/dashboard", routeMeta("/dashboard")), from0, next);
      expect(next).toHaveBeenCalledWith("/login");

      next.mockClear();
      await guard(createMockRoute("/login"), from0, next);
      expect(next).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to deniedPath and calls onNoAccess", async () => {
      const onNoAccess = vi.fn();
      const result = await navigate(
        makeGuard(baseOptions({ deniedPath: "/403", onNoAccess })),
        "/dashboard",
      );

      expect(result.visited).toEqual(["/dashboard", "/403"]);
      expect(result.settled).toBe(true);
      expect(onNoAccess).toHaveBeenCalledTimes(1);
    });

    it("does not pick dynamic routes or the denied route as fallback", async () => {
      const result = await navigate(
        makeGuard(
          baseOptions({
            getAuthState: () => ({
              isAuthenticated: true,
              permissions: ["cases.view"],
            }),
          }),
        ),
        "/dashboard",
      );

      expect(result.visited).toEqual(["/dashboard", "/cases"]);
    });

    it("treats an encrypted (non-array) payload without a decrypt hook as no permissions", async () => {
      const result = await navigate(
        makeGuard(
          baseOptions({
            getAuthState: () => ({
              isAuthenticated: true,
              user: { permissions: { iv: "x", data: "y" } },
            }),
          }),
        ),
        "/dashboard",
      );

      expect(result.settled).toBe(true);
      expect(result.visited).toEqual(["/dashboard", "/login"]);
    });

    it("does not loop when the guard throws while already on loginPath", async () => {
      const result = await navigate(
        makeGuard(
          baseOptions({
            getAuthState: () => {
              throw new Error("boom");
            },
          }),
        ),
        "/dashboard",
      );

      expect(result.settled).toBe(true);
      expect(result.visited).toEqual(["/dashboard", "/login"]);
    });
  });

  it("globalGuard decrypts a Laravel AES payload through the decrypt option", async () => {
    const payload = {
      iv: "bo69KYKGwWwTMnXCy8RdtA==",
      data: "zGWAVZZnxMN1EQOlazhloBWBw6yW7YKms/3lw9G7+zpW50UfB5W7SJWhFEQa52qn",
    };
    const routes: PermissionRoute[] = [
      { path: "/dashboard", meta: { permissions: ["consultation-report"] } },
    ];
    const result = await navigate(
      asGlobal(
        baseOptions({
          decrypt: createPermissionDecryptor(
            "base64:JdVOOP6UH8ly/dtvvNqNvtdLtFsbMpyNp0oGMXW2wA8=%",
          ),
          protectedRoutes: routes,
          getAuthState: () => ({
            isAuthenticated: true,
            user: { permissions: payload },
          }),
        }),
      ),
      "/dashboard",
      routes,
    );

    expect(result.visited).toEqual(["/dashboard"]);
  });
});
