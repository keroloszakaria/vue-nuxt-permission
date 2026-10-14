export default defineEventHandler((event) => ({
  permissions:
    getCookie(event, "permission_role") === "admin"
      ? ["public.read", "admin.read"]
      : ["public.read"],
}));
