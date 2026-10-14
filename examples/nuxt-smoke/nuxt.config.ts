export default defineNuxtConfig({
  srcDir: ".",
  modules: ["../../dist/module.mjs"],
  permission: {
    fetchPermissions: "/api/user/permissions",
    persist: false,
  },
});
