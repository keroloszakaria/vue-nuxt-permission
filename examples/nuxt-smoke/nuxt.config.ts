export default defineNuxtConfig({
  srcDir: ".",
  modules: ["vue-nuxt-permission"],
  permission: {
    fetchPermissions: "/api/user/permissions",
    persist: false,
  },
});
