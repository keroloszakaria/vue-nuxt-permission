import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Vue Nuxt Permission",
  description:
    "Unified, production-ready permission and RBAC system for Vue 3, Nuxt 3, and Nuxt 4.",

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#00DC82" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:locale", content: "en" }],
    ["meta", { property: "og:site_name", content: "Vue Nuxt Permission" }],
    [
      "meta",
      {
        property: "og:title",
        content: "Vue Nuxt Permission - Unified RBAC & Permission System",
      },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Unified permission system for Vue 3, Nuxt 3, and Nuxt 4 with directives, guards, decrypt hooks, and async support.",
      },
    ],
  ],

  themeConfig: {
    logo: { src: "/logo.svg", width: 26, height: 26 },

    siteTitle: "Vue Nuxt Permission",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/getting-started" },
      {
        text: "API",
        items: [
          { text: "Configuration", link: "/configuration" },
          { text: "v-permission Directive", link: "/directive" },
          { text: "usePermission Composable", link: "/composable" },
          { text: "Route Guards", link: "/guards" },
        ],
      },
      {
        text: "Ecosystem",
        items: [
          { text: "Quick Reference", link: "/quick-reference" },
          { text: "Advanced Usage & Decrypt", link: "/advanced" },
          { text: "AI Agent Integration", link: "/agent-integration" },
          { text: "FAQ & Troubleshooting", link: "/faq" },
          { text: "Migration Guide", link: "/migration" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
      {
        text: "v2.1.0",
        items: [
          { text: "Changelog", link: "/changelog" },
          {
            text: "npm Package",
            link: "https://www.npmjs.com/package/vue-nuxt-permission",
          },
          {
            text: "Nuxt Modules",
            link: "https://nuxt.com/modules/vue-nuxt-permission",
          },
        ],
      },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Installation & Setup", link: "/getting-started" },
          { text: "Installation Guide", link: "/installation" },
          { text: "Configuration", link: "/configuration" },
          { text: "Quick Reference", link: "/quick-reference" },
        ],
      },
      {
        text: "Core APIs",
        items: [
          { text: "v-permission Directive", link: "/directive" },
          { text: "usePermission Composable", link: "/composable" },
          { text: "Route Guards & Protection", link: "/guards" },
        ],
      },
      {
        text: "Advanced Topics",
        items: [
          { text: "Advanced & Decrypt Hooks", link: "/advanced" },
          { text: "AI Agent Integration", link: "/agent-integration" },
          { text: "FAQ & Troubleshooting", link: "/faq" },
          { text: "Migration Guide", link: "/migration" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/keroloszakaria/vue-nuxt-permission",
      },
      {
        icon: "npm",
        link: "https://www.npmjs.com/package/vue-nuxt-permission",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present Kerolos Zakaria • Jervis Tech",
    },

    editLink: {
      pattern:
        "https://github.com/keroloszakaria/vue-nuxt-permission/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});
