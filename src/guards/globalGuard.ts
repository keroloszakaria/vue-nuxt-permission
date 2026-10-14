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

const LOG_PREFIX = "[v-permission:globalGuard]";

const defaultLoopBreaker = createRedirectLoopBreaker();
const scopedLoopBreakers = new WeakMap<object, ReturnType<typeof createRedirectLoopBreaker>>();

function getLoopBreaker(scope: object | undefined) {
  if (!scope) return defaultLoopBreaker;
  let breaker = scopedLoopBreakers.get(scope);
  if (!breaker) {
    breaker = createRedirectLoopBreaker();
    scopedLoopBreakers.set(scope, breaker);
  }
  return breaker;
}

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
    deniedPath,
    onNoAccess,
    onDenied,
    onAllowed,
  } = options;

  const scope = options.permissionScope;
  const breaker = getLoopBreaker(scope);
  const arrivedFromDenial = breaker.consume(to);

  try {
    const authState = getAuthState?.() ?? { isAuthenticated: false };
    const isAuthenticated = authState.isAuthenticated;
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
      // The guard itself just sent this user here because they have no
      // accessible route; bouncing them to homePath would loop forever.
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
          breaker,
        });
      }
    }

    onAllowed?.(to, from);
    next();
  } catch (e) {
    console.error(`${LOG_PREFIX} Unexpected error:`, e);
    if (to.path === loginPath) return next();
    breaker.mark(loginPath);
    next(loginPath);
  }
};

export default globalGuard;
