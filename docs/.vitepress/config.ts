import { defineConfig } from "vitepress";

export default defineConfig({
  title: "vue-nuxt-permission",
  description: "Production-ready permission management for Vue 3 and Nuxt 3",

  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    logo: { src: "/logo.webp", width: 24, height: 24 },

    siteTitle: "vue-nuxt-permission",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/getting-started" },
      {
        text: "API",
        items: [
          { text: "Configuration", link: "/configuration" },
          { text: "Directive", link: "/directive" },
          { text: "Composable", link: "/composable" },
          { text: "Guards", link: "/guards" },
        ],
      },
      {
        text: "Resources",
        items: [
          { text: "AI Agent Integration", link: "/agent-integration" },
          { text: "Advanced", link: "/advanced" },
          { text: "FAQ", link: "/faq" },
          { text: "Migration", link: "/migration" },
        ],
      },
      {
        text: "GitHub",
        link: "https://github.com/keroloszakaria/vue-nuxt-permission",
      },
    ],

    sidebar: {
      "/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/" },
            { text: "Installation & Setup", link: "/getting-started" },
            { text: "Configuration", link: "/configuration" },
          ],
        },
        {
          text: "API Reference",
          items: [
            { text: "v-permission Directive", link: "/directive" },
            { text: "usePermission Composable", link: "/composable" },
            { text: "Route Guards", link: "/guards" },
          ],
        },
        {
          text: "Advanced",
          items: [
            { text: "AI Agent Integration", link: "/agent-integration" },
            { text: "Advanced Usage", link: "/advanced" },
            { text: "FAQ", link: "/faq" },
            { text: "Migration Guide", link: "/migration" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/keroloszakaria/vue-nuxt-permission",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present vue-nuxt-permission",
    },

    editLink: {
      pattern:
        "https://github.com/keroloszakaria/vue-nuxt-permission/edit/main/docs/:path",
    },

    search: {
      provider: "local",
    },
  },

  markdown: {
    theme: "github-dark",
  },
});
