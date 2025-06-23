<script setup>
import { useRoute } from 'vue-router'
import { defineProps, computed } from 'vue';

const route = useRoute()

const props = defineProps({
  dynamicTitle: {
    type: String,
    default: ''
  },
  currentRouteName: {
    type: String,
    default: ''
  }
});

const displayedTitle = computed(() => {
  if (props.dynamicTitle) {
    return props.dynamicTitle;
  }
  return route.meta.title || 'Sin título';
});

const breadcrumbText = computed(() => {
  if (props.currentRouteName === 'Detalle evento') {
    // Specifically format for EventDetail route
    return `Eventos - ${displayedTitle.value}`;
  }
  // Fallback for other routes, using just the route's meta title or dynamic title
  return displayedTitle.value;
});
</script>

<template>
  <div class="page-header w-100 border-bottom d-flex">
    <h5 class="fw-semibold m-2 p-2">Home - {{ breadcrumbText }}</h5>
  </div>
</template>

<style scoped>
.page-header {
  font-size: 1.1rem;
}
</style>
