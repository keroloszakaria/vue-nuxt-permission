export default defineNuxtRouteMiddleware((to) => {
  const scope = usePermissionScope();
  if (to.path === "/admin" && !scope.permissions.value.includes("admin.read")) {
    return navigateTo("/", { redirectCode: 302 });
  }
});
