<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = route.meta.title || 'Sin título'
</script>

<template>
  <div class="page-header w-100 border-bottom d-flex">
    <h5 class="fw-semibold m-2 p-2">Home - {{ pageTitle }}</h5>
  </div>
</template>

<style scoped>
.page-header {
  font-size: 1.1rem;
}
</style>
