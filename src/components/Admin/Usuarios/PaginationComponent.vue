<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  maxVisibleButtons: {
    type: Number,
    default: 5
  }
});

const emit = defineEmits(['page-changed']);

const startPage = computed(() => {
  if (props.currentPage === 1) {
    return 1;
  }
  if (props.currentPage === props.totalPages) {
    return Math.max(1, props.totalPages - props.maxVisibleButtons + 1);
  }
  return Math.max(1, props.currentPage - Math.floor(props.maxVisibleButtons / 2));
});

const pages = computed(() => {
  const range = [];
  for (
    let i = startPage.value;
    i <= Math.min(props.totalPages, startPage.value + props.maxVisibleButtons - 1);
    i++
  ) {
    range.push({
      name: i,
      isDisabled: i === props.currentPage
    });
  }
  return range;
});

const isInFirstPage = computed(() => {
  return props.currentPage === 1;
});

const isInLastPage = computed(() => {
  return props.currentPage === props.totalPages;
});

const goToPage = (page) => {
  emit('page-changed', page);
};

const nextPage = () => {
  emit('page-changed', props.currentPage + 1);
};

const previousPage = () => {
  emit('page-changed', props.currentPage - 1);
};
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination-container">
    <ul class="pagination">
      <li class="pagination-item">
        <button
          type="button"
          @click="previousPage"
          :disabled="isInFirstPage"
          aria-label="Go to previous page"
          class="pagination-button"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
      </li>

      <li
        v-for="page in pages"
        :key="page.name"
        class="pagination-item"
      >
        <button
          type="button"
          @click="goToPage(page.name)"
          :disabled="page.isDisabled"
          :class="{ 'is-active': page.isDisabled }"
          class="pagination-button page-number"
          :aria-label="`Go to page ${page.name}`"
        >
          {{ page.name }}
        </button>
      </li>

      <li class="pagination-item">
        <button
          type="button"
          @click="nextPage"
          :disabled="isInLastPage"
          aria-label="Go to next page"
          class="pagination-button"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 10px 0;
  border-top: 1px solid #eee;
  background-color: #fcfcfc;
  border-radius: 0 0 8px 8px;
}

.pagination {
  list-style-type: none;
  display: flex;
  padding: 0;
  margin: 0;
  align-items: center;
}

.pagination-item {
  margin: 0 5px;
}

.pagination-button {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 40px;
  cursor: pointer;
  font-size: 0.9em;
  color: #333;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-button:hover:not(:disabled) {
  background-color: #e9e9e9;
  border-color: #bbb;
}

.pagination-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f5f5f5;
  color: #888;
}

.pagination-button.is-active {
  background-color: #174384;
  color: #fff;
  border-color: #174384;
  font-weight: bold;
}

.pagination-button.is-active:hover {
  background-color: #123466;
  border-color: #123466;
}

.pagination-button i {
  font-size: 0.8em;
}
</style>
