import vue from "@vitejs/plugin-vue";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const authorName = typeof pkg.author === "object" ? pkg.author?.name || "Kerolos Zakaria" : pkg.author || "Kerolos Zakaria";
const banner = `/*! ${pkg.name} v${
  pkg.version
} | (c) ${new Date().getFullYear()} ${authorName} | ${pkg.license} License */`;

export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: "src",
      outDir: "dist",
      insertTypesEntry: true,
      cleanVueFileName: true,
      copyDtsFiles: false,
      compilerOptions: {
        // Suppress #app not found error - it's Nuxt internal
        skipLibCheck: true,
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },

  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        module: path.resolve(__dirname, "src/module.ts"),
        "runtime/plugin": path.resolve(__dirname, "src/runtime/plugin.ts"),
      },
      name: "VueNuxtPermission",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "vue",
        "vue-router",
        "crypto-js",
        "@nuxt/kit",
        "defu",
        "#app",
        "#imports",
        /^#app/,
      ],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          "@nuxt/kit": "NuxtKit",
          defu: "defu",
        },
        banner,
      },
    },
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: false,
  },

  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
