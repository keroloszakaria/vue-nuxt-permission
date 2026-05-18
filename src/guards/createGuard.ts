import { configurePermission, getCurrentPermissions } from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type { GuardOptions, PermissionRoute, PermissionValue } from "@/types";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

const MAX_ROUTE_DEPTH = 50;

function joinPath(base: string, segment: string): string {
  if (!base) return segment;
  if (segment.startsWith("/")) return segment;
  return base.endsWith("/") ? base + segment : base + "/" + segment;
}

function findProtectedRouteMatch(
  routes: PermissionRoute[],
  targetPath: string,
  basePath = "",
  depth = 0,
): PermissionRoute | null {
  if (depth > MAX_ROUTE_DEPTH) return null;
  for (const route of routes) {
    const fullPath = joinPath(basePath, route.path);
    if (fullPath === targetPath) return route;
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
 * createPermissionGuard
 * ---------------------
 * Generates a dynamic permission guard for any Vue or Nuxt router.
 *
 * Example:
 * router.beforeEach(createPermissionGuard({
 *   loginPath: '/login',
 *   homePath: '/',
 *   onDenied: (to) => console.warn('Denied:', to.path)
 * }))
 */
export const createPermissionGuard = (options: GuardOptions = {}) => {
  const {
    authRoutes = [],
    protectedRoutes = [] as PermissionRoute[],
    getAuthState,
    loginPath = "/login",
    homePath = "/",
    onDenied,
    onAllowed,
  } = options;

  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    try {
      const authState = getAuthState?.() ?? { isAuthenticated: false };
      const isAuthenticated = authState.isAuthenticated;

      const userPermissions =
        authState.permissions ??
        authState.user?.permissions ??
        getCurrentPermissions();

      if (
        Array.isArray(userPermissions) &&
        userPermissions.length > 0 &&
        getCurrentPermissions().length === 0
      ) {
        configurePermission(userPermissions);
      }

      const isAuthRoute = authRoutes.some((r) => r.path === to.path);

      const matchedProtected = findProtectedRouteMatch(
        protectedRoutes,
        to.path,
      );

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
      console.error("[v-permission:guard] Unexpected error:", e);
      next(loginPath);
    }
  };
};

/**
 * Recursively finds a route that the user has permission to access.
 * Includes depth protection against circular/deeply nested routes.
 */
async function findAccessibleRoute(
  routes: PermissionRoute[],
  userPermissions: string[],
  basePath = "",
  depth = 0,
): Promise<string | null> {
  if (depth > MAX_ROUTE_DEPTH) {
    console.warn("[v-permission:guard] Route nesting exceeds max depth");
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
