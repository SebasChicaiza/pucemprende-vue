<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue';
import PageHeaderRoute from '@/components/PageHeaderRoute.vue';
</script>

<template>
  <div class="d-flex">
    <Sidebar />

    <div class="flex-grow-1" style="min-height: 100vh;">
      <PageHeaderRoute />

      <div class="p-4">
        <p>Este es el dashboard de admin</p>
      </div>
    </div>
  </div>
</template>
