/**
 * Reject protocol-relative/external URLs and origin-changing path spellings
 * before passing request credentials to a Nuxt same-origin permission API.
 */
export function isSafePermissionEndpoint(input: unknown): input is string {
  if (
    typeof input !== "string" ||
    !input.startsWith("/") ||
    input.startsWith("//") ||
    input.trim() !== input ||
    /[\\\u0000-\u001f\u007f]/.test(input) ||
    /%(?:2f|5c)/i.test(input)
  ) {
    return false;
  }

  try {
    const origin = "http://nuxt-permission.invalid";
    const parsed = new URL(input, origin);
    return parsed.origin === origin && parsed.pathname.startsWith("/");
  } catch {
    return false;
  }
}
