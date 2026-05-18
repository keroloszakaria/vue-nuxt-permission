import {
  addImports,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from "@nuxt/kit";
import { defu } from "defu";

export interface ModuleOptions {
  permissions?: string[];
  developmentMode?: boolean;
  fetchPermissions?: string | (() => Promise<string[]>);
  persist?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "vue-nuxt-permission",
    configKey: "permission",
    compatibility: {
      // Supports Nuxt 3.x and Nuxt 4.x.
      // The module uses only stable @nuxt/kit APIs (addPlugin, addImports,
      // runtimeConfig) and the runtime plugin uses defineNuxtPlugin from
      // #app — both unchanged in Nuxt 4.
      nuxt: ">=3.0.0",
    },
  },

  defaults: {
    permissions: [],
    developmentMode: false,
    persist: true,
  },

  setup(options, nuxt) {
    // Validate options early
    if (options.permissions && !Array.isArray(options.permissions)) {
      throw new TypeError("[vue-nuxt-permission] permissions must be an array");
    }

    if (
      options.fetchPermissions &&
      typeof options.fetchPermissions !== "string" &&
      typeof options.fetchPermissions !== "function"
    ) {
      throw new TypeError(
        "[vue-nuxt-permission] fetchPermissions must be a URL string or async function",
      );
    }

    const resolver = createResolver(import.meta.url);

    // Register runtime plugin
    addPlugin(resolver.resolve("./runtime/plugin"));

    // Auto-import usePermission composable
    addImports({
      name: "usePermission",
      from: "vue-nuxt-permission",
    });

    // Expose options to runtime via runtimeConfig (merge, don't overwrite)
    nuxt.options.runtimeConfig.public.permission = defu(
      nuxt.options.runtimeConfig.public.permission as Record<string, unknown>,
      {
        permissions: options.permissions,
        developmentMode: options.developmentMode,
        persist: options.persist,
        // Functions can't be serialized to runtimeConfig — only pass URL strings
        fetchPermissions:
          typeof options.fetchPermissions === "string"
            ? options.fetchPermissions
            : undefined,
      },
    );
  },
});
