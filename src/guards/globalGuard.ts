import { configurePermission, getCurrentPermissions } from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type { GuardOptions, PermissionRoute, PermissionValue } from "@/types";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

const MAX_ROUTE_DEPTH = 50;

/**
 * Find a matching node in protectedRoutes for the given target path.
 * Matches either by raw concatenated path (parent + child) or by direct
 * path equality at any nesting depth.
 */
function findProtectedRouteMatch(
  routes: PermissionRoute[],
  targetPath: string,
  basePath = "",
  depth = 0,
): PermissionRoute | null {
  if (depth > MAX_ROUTE_DEPTH) return null;
  for (const route of routes) {
    const fullPath = basePath + route.path;
    if (fullPath === targetPath || route.path === targetPath) return route;
    if (route.children?.length) {
      const child = findProtectedRouteMatch(
        route.children,
        targetPath,
        fullPath,
        depth + 1,
      );
      if (child) return child;
    }
  }
  return null;
}

/**
 * Global Permission Guard
 * ------------------------
 * A ready-to-use guard for Vue/Nuxt router.
 *
 * Example:
 * router.beforeEach((to, from, next) => globalGuard(to, from, next, {
 *   authRoutes,
 *   protectedRoutes,
 *   getAuthState: () => authStore.state,
 *   loginPath: '/login',
 *   homePath: '/'
 * }))
 */
export const globalGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  options: GuardOptions = {},
) => {
  const {
    authRoutes = [],
    protectedRoutes = [] as PermissionRoute[],
    getAuthState,
    loginPath = "/login",
    homePath = "/",
    onDenied,
    onAllowed,
  } = options;

  try {
    const authState = getAuthState?.() ?? { isAuthenticated: false };
    const isAuthenticated = authState.isAuthenticated;

    // Resolve user permissions with full fallback chain.
    // Many consumer projects expose them via authState.user.permissions and
    // never call setPermissions/configurePermission explicitly.
    const userPermissions =
      authState.permissions ??
      authState.user?.permissions ??
      getCurrentPermissions();

    // If we discovered permissions on the auth payload that the package
    // didn't know about yet, sync them so the directive/composable see them.
    if (
      Array.isArray(userPermissions) &&
      userPermissions.length > 0 &&
      getCurrentPermissions().length === 0
    ) {
      configurePermission(userPermissions);
    }

    const isAuthRoute = authRoutes.some((r) => r.path === to.path);

    // Membership in protectedRoutes implies auth + permission requirements,
    // even when the route's meta doesn't set requiresAuth/checkPermission.
    const matchedProtected = findProtectedRouteMatch(protectedRoutes, to.path);

    const requiresAuth =
      (to.meta?.requiresAuth ?? false) || matchedProtected !== null;

    const effectivePermissions: PermissionValue | undefined =
      to.meta?.permissions ?? matchedProtected?.meta?.permissions;

    const checkPermission =
      (to.meta?.checkPermission ?? false) ||
      (matchedProtected !== null && effectivePermissions !== undefined);

    if (!isAuthenticated && requiresAuth) {
      onDenied?.(to, from);
      return next(loginPath);
    }

    if (isAuthenticated && isAuthRoute) {
      onAllowed?.(to, from);
      return next(homePath);
    }

    if (checkPermission && effectivePermissions !== undefined) {
      const allowed = await hasPermission(
        effectivePermissions,
        userPermissions,
      );
      if (!allowed) {
        onDenied?.(to, from);
        const fallback = await findAccessibleRoute(
          protectedRoutes,
          userPermissions,
        );
        return next(fallback || loginPath);
      }
    }

    onAllowed?.(to, from);
    next();
  } catch (e) {
    console.error("[v-permission:globalGuard] Unexpected error:", e);
    next(loginPath);
  }
};

/**
 * Helper to find the first accessible route from protectedRoutes.
 * Includes depth protection against circular/deeply nested routes.
 */
async function findAccessibleRoute(
  routes: PermissionRoute[],
  userPermissions: string[],
  basePath = "",
  depth = 0,
): Promise<string | null> {
  if (depth > MAX_ROUTE_DEPTH) {
    console.warn("[v-permission:globalGuard] Route nesting exceeds max depth");
    return null;
  }

  for (const route of routes) {
    const fullPath = basePath + route.path;
    const requiredPermissions = route.meta?.permissions ?? "*";

    if (await hasPermission(requiredPermissions, userPermissions)) {
      return fullPath;
    }

    if (route.children?.length) {
      const child = await findAccessibleRoute(
        route.children,
        userPermissions,
        fullPath,
        depth + 1,
      );
      if (child) return child;
    }
  }
  return null;
}

export default globalGuard;
