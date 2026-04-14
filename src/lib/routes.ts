/**
 * Route helpers shared between middleware and other server-side logic.
 */

/** Routes that require an active or trialing subscription to access. */
export const PROTECTED_ROUTES = ["/chat", "/account"] as const;

/** Returns true if the given pathname should be gated by the subscription. */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}
