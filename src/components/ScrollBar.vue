<template>
  <div class="modal-body-scrollable" :style="{ 'max-height': actualMaxHeight }">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Optional prop to set a custom max-height for the scrollable area.
  // If not provided, it will typically flex-grow within its parent.
  maxHeight: {
    type: [String, Number],
    default: null, // No specific max-height by default, relies on flex-grow
  },
});

const actualMaxHeight = computed(() => {
  // If a maxHeight is provided, use it. Otherwise, let flex-grow handle it.
  if (props.maxHeight) {
    return typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
  }
  return null; // Let CSS (flex-grow) manage the height
});
</script>

<style scoped>
.modal-body-scrollable {
  flex-grow: 1; /* Allows this component to fill available vertical space in a flex parent */
  overflow-y: auto; /* Enables vertical scrolling when content overflows */
  padding-right: 15px; /* Add padding to prevent content from touching scrollbar */
}

/* Custom Scrollbar Styles (for Webkit browsers like Chrome, Safari) */
.modal-body-scrollable::-webkit-scrollbar {
  width: 5px; /* Width of the scrollbar */
}

.modal-body-scrollable::-webkit-scrollbar-track {
  background: #E4EFFF; /* Color of the scrollbar track */
  border-radius: 10px;
}

.modal-body-scrollable::-webkit-scrollbar-thumb {
  background: #63A2FF; /* Color of the scrollbar thumb */
  border-radius: 10px;
}

.modal-body-scrollable::-webkit-scrollbar-thumb:hover {
  background: #63A2FF; /* Color of the scrollbar thumb on hover */
  cursor: pointer;
}
</style>
