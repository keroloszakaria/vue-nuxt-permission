// vite.config.ts
import vue from "file:///D:/Jervis%20Tech/Jervis%20Labs/Vue%20Nuxt%20Permission/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import fs from "fs";
import path from "path";
import { defineConfig } from "file:///D:/Jervis%20Tech/Jervis%20Labs/Vue%20Nuxt%20Permission/node_modules/vite/dist/node/index.js";
import dts from "file:///D:/Jervis%20Tech/Jervis%20Labs/Vue%20Nuxt%20Permission/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "D:\\Jervis Tech\\Jervis Labs\\Vue Nuxt Permission";
var pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
var banner = `/*! ${pkg.name} v${pkg.version} | (c) ${(/* @__PURE__ */ new Date()).getFullYear()} ${pkg.author} | ${pkg.license} License */`;
var vite_config_default = defineConfig({
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
        skipLibCheck: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src"),
      "@core": path.resolve(__vite_injected_original_dirname, "./src/core"),
      "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils")
    }
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__vite_injected_original_dirname, "src/index.ts"),
        module: path.resolve(__vite_injected_original_dirname, "src/module.ts")
      },
      name: "VueNuxtPermission",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "cjs"}`
    },
    rollupOptions: {
      external: ["vue", "vue-router", "@nuxt/kit", "defu"],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          "@nuxt/kit": "NuxtKit",
          defu: "defu"
        },
        banner
      }
    },
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: false
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxKZXJ2aXMgVGVjaFxcXFxKZXJ2aXMgTGFic1xcXFxWdWUgTnV4dCBQZXJtaXNzaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxKZXJ2aXMgVGVjaFxcXFxKZXJ2aXMgTGFic1xcXFxWdWUgTnV4dCBQZXJtaXNzaW9uXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9KZXJ2aXMlMjBUZWNoL0plcnZpcyUyMExhYnMvVnVlJTIwTnV4dCUyMFBlcm1pc3Npb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgdnVlIGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWVcIjtcclxuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgZHRzIGZyb20gXCJ2aXRlLXBsdWdpbi1kdHNcIjtcclxuY29uc3QgcGtnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoXCIuL3BhY2thZ2UuanNvblwiLCBcInV0Zi04XCIpKTtcclxuY29uc3QgYmFubmVyID0gYC8qISAke3BrZy5uYW1lfSB2JHtcclxuICBwa2cudmVyc2lvblxyXG59IHwgKGMpICR7bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpfSAke3BrZy5hdXRob3J9IHwgJHtwa2cubGljZW5zZX0gTGljZW5zZSAqL2A7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHZ1ZSgpLFxyXG4gICAgZHRzKHtcclxuICAgICAgZW50cnlSb290OiBcInNyY1wiLFxyXG4gICAgICBvdXREaXI6IFwiZGlzdFwiLFxyXG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxyXG4gICAgICBjbGVhblZ1ZUZpbGVOYW1lOiB0cnVlLFxyXG4gICAgICBjb3B5RHRzRmlsZXM6IGZhbHNlLFxyXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcclxuICAgICAgICAvLyBTdXBwcmVzcyAjYXBwIG5vdCBmb3VuZCBlcnJvciAtIGl0J3MgTnV4dCBpbnRlcm5hbFxyXG4gICAgICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0sXHJcblxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKSxcclxuICAgICAgXCJAY29yZVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL2NvcmVcIiksXHJcbiAgICAgIFwiQHV0aWxzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvdXRpbHNcIiksXHJcbiAgICB9LFxyXG4gIH0sXHJcblxyXG4gIGJ1aWxkOiB7XHJcbiAgICBsaWI6IHtcclxuICAgICAgZW50cnk6IHtcclxuICAgICAgICBpbmRleDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvaW5kZXgudHNcIiksXHJcbiAgICAgICAgbW9kdWxlOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9tb2R1bGUudHNcIiksXHJcbiAgICAgIH0sXHJcbiAgICAgIG5hbWU6IFwiVnVlTnV4dFBlcm1pc3Npb25cIixcclxuICAgICAgZm9ybWF0czogW1wiZXNcIiwgXCJjanNcIl0sXHJcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0LCBlbnRyeU5hbWUpID0+XHJcbiAgICAgICAgYCR7ZW50cnlOYW1lfS4ke2Zvcm1hdCA9PT0gXCJlc1wiID8gXCJtanNcIiA6IFwiY2pzXCJ9YCxcclxuICAgIH0sXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGV4dGVybmFsOiBbXCJ2dWVcIiwgXCJ2dWUtcm91dGVyXCIsIFwiQG51eHQva2l0XCIsIFwiZGVmdVwiXSxcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgZ2xvYmFsczoge1xyXG4gICAgICAgICAgdnVlOiBcIlZ1ZVwiLFxyXG4gICAgICAgICAgXCJ2dWUtcm91dGVyXCI6IFwiVnVlUm91dGVyXCIsXHJcbiAgICAgICAgICBcIkBudXh0L2tpdFwiOiBcIk51eHRLaXRcIixcclxuICAgICAgICAgIGRlZnU6IFwiZGVmdVwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYmFubmVyLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgIG91dERpcjogXCJkaXN0XCIsXHJcbiAgICBlbXB0eU91dERpcjogZmFsc2UsXHJcbiAgfSxcclxuXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiBcImpzZG9tXCIsXHJcbiAgICBpbmNsdWRlOiBbXCJ0ZXN0cy8qKi8qLnNwZWMudHNcIl0sXHJcbiAgICBzZXR1cEZpbGVzOiBbXCJ0ZXN0cy9zZXR1cC50c1wiXSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VSxPQUFPLFNBQVM7QUFDNVYsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUpoQixJQUFNLG1DQUFtQztBQUt6QyxJQUFNLE1BQU0sS0FBSyxNQUFNLEdBQUcsYUFBYSxrQkFBa0IsT0FBTyxDQUFDO0FBQ2pFLElBQU0sU0FBUyxPQUFPLElBQUksSUFBSSxLQUM1QixJQUFJLE9BQ04sV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWSxDQUFDLElBQUksSUFBSSxNQUFNLE1BQU0sSUFBSSxPQUFPO0FBRWpFLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLElBQUk7QUFBQSxNQUNGLFdBQVc7QUFBQSxNQUNYLFFBQVE7QUFBQSxNQUNSLGtCQUFrQjtBQUFBLE1BQ2xCLGtCQUFrQjtBQUFBLE1BQ2xCLGNBQWM7QUFBQSxNQUNkLGlCQUFpQjtBQUFBO0FBQUEsUUFFZixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDbEMsU0FBUyxLQUFLLFFBQVEsa0NBQVcsWUFBWTtBQUFBLE1BQzdDLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxJQUNqRDtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU87QUFBQSxRQUNMLE9BQU8sS0FBSyxRQUFRLGtDQUFXLGNBQWM7QUFBQSxRQUM3QyxRQUFRLEtBQUssUUFBUSxrQ0FBVyxlQUFlO0FBQUEsTUFDakQ7QUFBQSxNQUNBLE1BQU07QUFBQSxNQUNOLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUNyQixVQUFVLENBQUMsUUFBUSxjQUNqQixHQUFHLFNBQVMsSUFBSSxXQUFXLE9BQU8sUUFBUSxLQUFLO0FBQUEsSUFDbkQ7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxPQUFPLGNBQWMsYUFBYSxNQUFNO0FBQUEsTUFDbkQsUUFBUTtBQUFBLFFBQ04sU0FBUztBQUFBLFVBQ1AsS0FBSztBQUFBLFVBQ0wsY0FBYztBQUFBLFVBQ2QsYUFBYTtBQUFBLFVBQ2IsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFFQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsb0JBQW9CO0FBQUEsSUFDOUIsWUFBWSxDQUFDLGdCQUFnQjtBQUFBLEVBQy9CO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
