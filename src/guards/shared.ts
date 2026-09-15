import { getCurrentPermissions } from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type {
  AuthState,
  DecryptHook,
  GuardOptions,
  PermissionRoute,
} from "@/types";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

export const MAX_ROUTE_DEPTH = 50;

/**
 * Resolves the user's permissions from the auth state and always returns an
 * array. Encrypted / non-array payloads go through the decrypt hook; anything
 * that still isn't an array falls back to the globally configured permissions
 * instead of leaking an object into the evaluator.
 */
export async function resolveUserPermissions(
  authState: AuthState,
  decryptFn?: DecryptHook,
): Promise<string[]> {
  const rawPermissions =
    authState.permissions ??
    authState.user?.permissions ??
    getCurrentPermissions();

  if (Array.isArray(rawPermissions)) return rawPermissions;

  if (decryptFn && rawPermissions) {
    const decrypted = await decryptFn(rawPermissions);
    return Array.isArray(decrypted) ? decrypted : [];
  }

  return getCurrentPermissions();
}

const isNavigablePath = (path: string) =>
  !path.includes(":") && !path.includes("*");

/**
 * Finds the first route in protectedRoutes the user can access.
 * Skips dynamic routes (they can't be navigated to without params) and the
 * route currently being denied, so the fallback never redirects to itself.
 */
export async function findAccessibleRoute(
  routes: PermissionRoute[],
  userPermissions: string[],
  options: { excludePath?: string; logPrefix: string },
  basePath = "",
  depth = 0,
): Promise<string | null> {
  if (depth > MAX_ROUTE_DEPTH) {
    console.warn(`${options.logPrefix} Route nesting exceeds max depth`);
    return null;
  }

  for (const route of routes) {
    const fullPath = basePath + route.path;
    const requiredPermissions = route.meta?.permissions ?? "*";

    if (
      isNavigablePath(fullPath) &&
      fullPath !== options.excludePath &&
      (await hasPermission(requiredPermissions, userPermissions))
    ) {
      return fullPath;
    }

    if (route.children?.length) {
      const child = await findAccessibleRoute(
        route.children,
        userPermissions,
        options,
        fullPath,
        depth + 1,
      );
      if (child) return child;
    }
  }
  return null;
}

/**
 * Remembers that the guard just sent an authenticated user to a
 * "no access" destination. The very next navigation to that path is let
 * through instead of being bounced back to homePath, which is what used to
 * cause an infinite /login <-> /home redirect loop.
 *
 * Only a redirect (vue-router sets `to.redirectedFrom`) can consume the mark,
 * so a user typing the login URL manually is still sent to homePath.
 */
export function createRedirectLoopBreaker() {
  let pendingPath: string | null = null;

  return {
    mark(path: string) {
      pendingPath = path;
    },
    consume(to: RouteLocationNormalized): boolean {
      const matched =
        pendingPath !== null &&
        pendingPath === to.path &&
        Boolean(to.redirectedFrom);
      pendingPath = null;
      return matched;
    },
  };
}

export type RedirectLoopBreaker = ReturnType<typeof createRedirectLoopBreaker>;

/**
 * Handles an authenticated user who is denied and has no accessible
 * fallback route.
 */
export async function redirectWithoutAccess(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  options: Pick<GuardOptions, "deniedPath" | "onNoAccess"> & {
    loginPath: string;
    isAuthenticated: boolean;
    breaker: RedirectLoopBreaker;
  },
) {
  if (!options.isAuthenticated) return next(options.loginPath);

  await options.onNoAccess?.(to, from);

  const target = options.deniedPath ?? options.loginPath;
  if (target === to.path) return next();

  options.breaker.mark(target);
  return next(target);
}
