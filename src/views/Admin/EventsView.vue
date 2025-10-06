<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEventosStore } from '@/stores/eventos' // Import your Pinia store
import { storeToRefs } from 'pinia' // Important for destructuring reactive properties
import ManageCategoriasModal from '@/components/Admin/Eventos/ManageCategoriasModal.vue'
import ManageSedesModal from '@/components/Admin/Eventos/ManageSedesModal.vue'

// Import components. LoaderComponent is usually small, so no async for it.
import LoaderComponent from '@/components/LoaderComponent.vue'
const showCreateEditModal = ref(false)
const showMangeSedesModal = ref(false)
const showMangeCategoriasModal = ref(false)


// For potentially larger components or those not always visible, use defineAsyncComponent
import { defineAsyncComponent } from 'vue'
const ModalCrearEvento = defineAsyncComponent(() =>
  import('@/components/Admin/Eventos/ModalCrearEvento.vue')
)
const AdminEventCard = defineAsyncComponent(() =>
  import('@/components/Admin/Eventos/AdminEventCard.vue')
)

const router = useRouter()
const eventosStore = useEventosStore() // Instantiate the Pinia store

// Destructure reactive state and getters from the store using storeToRefs
const { events, error, loading, searchQuery, currentPage, itemsPerPage, totalEvents, totalPages, currentEventToEdit } = storeToRefs(eventosStore)

let searchTimeout = null

const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // If the search query changes and we are not on the first page, set to page 1
    // This will trigger the watch on 'currentPage' which then calls fetchEvents
    if (eventosStore.currentPage !== 1) {
      eventosStore.setCurrentPage(1)
    } else {
      // If already on page 1, just fetch events with the new search query
      eventosStore.fetchEvents()
    }
  }, 500) // Debounce for 500ms
}

const handleSearchEnter = () => {
  clearTimeout(searchTimeout) // Clear debounce immediately
  eventosStore.setCurrentPage(1) // Always go to the first page on Enter
  eventosStore.fetchEvents()
}

// Watch for changes in currentPage from the store and refetch events
watch(currentPage, () => {
  eventosStore.fetchEvents()
})

// Initial data fetch when the component is mounted
onMounted(() => {
  eventosStore.fetchEvents()
})

const openCreateModal = () => {
  eventosStore.clearCurrentEventToEdit() // Clear any previous edit data
  showCreateEditModal.value = true
}

const openSedesManage = () => {
  showMangeSedesModal.value = true
}

const openCategoriasManage = () => {
  showMangeCategoriasModal.value = true
}


const handleEditEvent = async (eventData) => {
  if (eventData && eventData.id) {
    await eventosStore.fetchEventDetailsForEdit(eventData.id)
    showCreateEditModal.value = true
  } else {
    console.error('No event ID found for editing.')
  }
}

const handleModalClose = () => {
  showCreateEditModal.value = false
  eventosStore.clearCurrentEventToEdit() // Clear event data when modal is closed
}

const handleModalSubmit = async () => {
  showCreateEditModal.value = false
  eventosStore.clearCurrentEventToEdit()
  await eventosStore.fetchEvents() // Refresh the list after form submission
  console.log('Event list refreshed after modal submission.')
}

const handleViewEvent = (eventId) => {
  router.push({ path: `/admin/eventos/${eventId}` })
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    eventosStore.setCurrentPage(page)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    eventosStore.setCurrentPage(currentPage.value + 1)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    eventosStore.setCurrentPage(currentPage.value - 1)
  }
}
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="d-flex align-items-center mb-3 gap-2 action-bar">
          <input v-model="searchQuery" type="text" placeholder="Buscar por nombre" class="form-control flex-grow-1"
            @input="handleSearchInput" @keyup.enter="handleSearchEnter" />
          <button class="btn btn-primary" @click="openCategoriasManage">
            <i class="fas fa-list"></i> <span class="d-none d-md-inline">Categorias</span>
          </button>
          <button class="btn btn-primary" @click="openSedesManage">
            <i class="fas fa-map-pin"></i> <span class="d-none d-md-inline">Sedes</span>
          </button>
          <button class="btn btn-default btn-icon-only" @click="openCreateModal">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row" v-if="!loading">
            <div class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3" v-for="event in events" :key="event.id">
              <AdminEventCard :event="event" @edit-event="handleEditEvent" @view-event="handleViewEvent" />
            </div>
            <div v-if="events.length === 0 && !loading" class="col-12 text-center text-muted mt-5">
              No se encontraron eventos.
            </div>
          </div>
          <div v-else class="text-center text-muted mt-5">
            Cargando eventos...
          </div>

          <nav aria-label="Page navigation" v-if="totalPages > 1 && !loading">
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="prevPage">Anterior</a>
              </li>
              <li class="page-item" v-for="page in totalPages" :key="page" :class="{ active: page === currentPage }">
                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="nextPage">Siguiente</a>
              </li>
            </ul>
          </nav>
        </div>
        <ModalCrearEvento :show="showCreateEditModal" :eventData="currentEventToEdit" @close="handleModalClose"
          @submit="handleModalSubmit" />
        <ManageSedesModal :show="showMangeSedesModal" @close="showMangeSedesModal = false" />
        <ManageCategoriasModal :show="showMangeCategoriasModal" @close="showMangeCategoriasModal = false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-text {
  color: red;
  font-weight: bold;
}

.form-control {
  flex-grow: 1;
}

.btn-primary {
  background-color: #174384;
  border-color: #174384;
}

.btn-primary:hover {
  background-color: #ffffff;
  border-color: #174384;
  color: #174384;
}

.btn-default {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
}

.btn-default:hover {
  background-color: #e2e6ea;
  border-color: #dae0e5;
}


/* CSS for a clean button layout */
.action-bar .btn {
  /* Ensure consistent height for all buttons */
  height: calc(1.5em + 0.75rem + 2px);
  white-space: nowrap; /* Prevent button text from wrapping */
  padding: 0.375rem 0.75rem; /* Standard Bootstrap padding */
}

/* Style for icon-only button to make it a square */
.btn-icon-only {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
}

/* Optional: Better spacing for buttons that mix icon and text */
.action-bar .btn i.fas {
    margin-right: 0.25rem;
}

/* On smaller screens (where d-md-inline hides the text), remove the right margin */
@media (max-width: 767.98px) {
    .action-bar .btn i.fas {
        margin-right: 0;
    }
}

.pagination {
  margin-top: 20px;
}

.page-item.active .page-link {
  background-color: #174384;
  border-color: #174384;
  color: white;
}

.page-link {
  color: #174384;
}

.page-link:hover {
  color: #0d284a;
}
</style>
