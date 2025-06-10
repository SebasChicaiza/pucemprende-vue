<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue';
import PageHeaderRoute from '@/components/PageHeaderRoute.vue';
import LoaderComponent from '@/components/LoaderComponent.vue';
</script>

<template>
  <LoaderComponent v-if="loading"/>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <p>Este es el dashboard de admin</p>
      </div>
    </div>
  </div>
</template>
