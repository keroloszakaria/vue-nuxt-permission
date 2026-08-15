// @ts-ignore
import { defineNuxtPlugin, useRuntimeConfig } from "#app";
// @ts-ignore
import type { NuxtApp } from "#app";
import { PermissionPlugin } from "../index";

export default defineNuxtPlugin(async (nuxtApp: NuxtApp) => {
  const cfg = useRuntimeConfig().public.permission as any;

  if (!cfg) {
    console.warn("[v-permission] No configuration found");
    return;
  }

  let fetchFn: (() => Promise<string[]>) | undefined;

  if (typeof cfg.fetchPermissions === "string") {
    fetchFn = async () => {
      try {
        const r = await fetch(cfg.fetchPermissions);
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return await r.json();
      } catch (e) {
        console.error("[v-permission] Failed to fetch permissions:", e);
        return [];
      }
    };
  } else if (typeof cfg.fetchPermissions === "function") {
    fetchFn = cfg.fetchPermissions;
  }

  try {
    nuxtApp.vueApp.use(PermissionPlugin as any, {
      permissions: cfg.permissions,
      developmentMode: cfg.developmentMode,
      fetchPermissions: fetchFn,
      persist: cfg.persist,
    });
  } catch (e) {
    console.error("[v-permission] Failed to install plugin:", e);
  }
});
