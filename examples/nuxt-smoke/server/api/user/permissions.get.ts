export default defineEventHandler((event) => {
  const role = getCookie(event, "permission_role");
  if (role === "invalid") return { permissions: "admin.read" };
  if (role === "denied") {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return {
    permissions:
      role === "admin" ? ["public.read", "admin.read"] : ["public.read"],
  };
});
