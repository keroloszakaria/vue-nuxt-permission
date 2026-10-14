import {
  configurePermission,
  getCurrentPermissions,
  getDecryptHook,
} from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type { GuardOptions, PermissionRoute, PermissionValue } from "@/types";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import {
  MAX_ROUTE_DEPTH,
  createRedirectLoopBreaker,
  findAccessibleRoute,
  redirectWithoutAccess,
  resolveUserPermissions,
} from "./shared";

const LOG_PREFIX = "[v-permission:guard]";

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
    deniedPath,
    onNoAccess,
    onDenied,
    onAllowed,
  } = options;

  const loopBreaker = createRedirectLoopBreaker();

  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const arrivedFromDenial = loopBreaker.consume(to);

    try {
      const authState = getAuthState?.() ?? { isAuthenticated: false };
      const isAuthenticated = authState.isAuthenticated;
      const scope = options.permissionScope;

      const decryptFn =
        options.decrypt ?? options.transform ??
        (scope ? undefined : getDecryptHook());

      const authPermissions =
        authState.permissions ?? authState.user?.permissions;
      let userPermissions = await resolveUserPermissions(
        authState,
        decryptFn,
        scope?.permissions.value,
      );

      if (scope) {
        if (!isAuthenticated) {
          userPermissions = [];
          scope.setPermissions([]);
        } else if (authPermissions !== undefined) {
          scope.setPermissions(userPermissions);
        }
      } else if (
        userPermissions.length > 0 &&
        getCurrentPermissions().length === 0
      ) {
        configurePermission(userPermissions, {
          decrypt: decryptFn,
        });
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
        if (arrivedFromDenial) return next();
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
            { excludePath: to.path, logPrefix: LOG_PREFIX },
          );
          if (fallback) return next(fallback);
          return redirectWithoutAccess(to, from, next, {
            loginPath,
            deniedPath,
            onNoAccess,
            isAuthenticated,
            breaker: loopBreaker,
          });
        }
      }

      onAllowed?.(to, from);
      next();
    } catch (e) {
      console.error(`${LOG_PREFIX} Unexpected error:`, e);
      if (to.path === loginPath) return next();
      loopBreaker.mark(loginPath);
      next(loginPath);
    }
  };
};
