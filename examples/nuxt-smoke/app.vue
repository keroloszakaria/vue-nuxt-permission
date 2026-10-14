<script setup lang="ts">
const { canSync } = usePermission();
const role = computed(() => (canSync("admin.read") ? "admin" : "guest"));
</script>

<template>
  <main :data-permission-role="role">
    <span v-permission="'public.read'">Public</span>
    <span v-permission="'admin.read'">Admin</span>
  </main>
</template>
