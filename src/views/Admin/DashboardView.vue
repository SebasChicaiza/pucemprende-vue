<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <iframe
          title="PUCEMPRENDE_PBI"
          width="100%"
          height="100%"
          src="https://app.powerbi.com/view?r=eyJrIjoiYmNiMTZlMTEtNjhiMS00YjViLThlMzctMjgwMTM5Y2MzM2M1IiwidCI6IjU0NDc0ZmIzLTYzNTktNDBjMS1iNzI2LTVkNTZhN2RkMjk3NiIsImMiOjR9"
          frameborder="0"
          allowFullScreen="true"
        ></iframe>
      </div>
    </div>
  </div>
</template>
