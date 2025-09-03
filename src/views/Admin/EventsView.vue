<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useEventosStore } from '@/stores/eventos'
import { storeToRefs } from 'pinia'
import { useEventosInscritosStore } from '@/stores/useEventosInscritosStore'
import ManageSedesModal from '@/components/Admin/Eventos/ManageSedesModal.vue'
import ManageCategoriasModal from '@/components/Admin/Eventos/ManageCategoriasModal.vue'
const eventosInscritosStore = useEventosInscritosStore()

const isSuperAdmin = ref(false)
const isAdmin = ref(false)
const isUser = ref(false)

const checkrol = () => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user.rol_id == 1) {
    isAdmin.value = true
  } else if (user.rol_id == 2) {
    isUser.value = true
  } else if (user.rol_id == 8) {
    isSuperAdmin.value = true
  }
}

const ModalCrearEvento = defineAsyncComponent(
  () => import('@/components/Admin/Eventos/ModalCrearEvento.vue'),
)

const AdminEventCard = defineAsyncComponent(
  () => import('@/components/Admin/Eventos/AdminEventCard.vue'),
)
import LoaderComponent from '@/components/LoaderComponent.vue'

const router = useRouter()
const eventosStore = useEventosStore()

const showCreateEditModal = ref(false)
const showSedesModal = ref(false)
const showCategoriasModal = ref(false)

const openSedesModal = () => {
  showSedesModal.value = true
}

const openCategoriasModal = () => {
  showCategoriasModal.value = true
}

let searchTimeout = null

const {
  events,
  loading,
  error,
  currentPage,
  totalEvents,
  totalPages,
  searchQuery,
  currentEventToEdit,
} = storeToRefs(eventosStore)

const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (eventosStore.currentPage !== 1) {
      eventosStore.setCurrentPage(1)
    } else {
      eventosStore.fetchEvents()
    }
  }, 1500)
}

const handleSearchEnter = () => {
  clearTimeout(searchTimeout)
  eventosStore.setCurrentPage(1)
  eventosStore.fetchEvents()
}

watch(currentPage, () => {
  eventosStore.fetchEvents()
})

onMounted(() => {
  eventosStore.fetchEvents()
  eventosInscritosStore.fetchEventosInscritos()
  checkrol()
})

const openCreateModal = () => {
  eventosStore.clearCurrentEventToEdit()
  showCreateEditModal.value = true
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
  showSedesModal.value = false
  showCategoriasModal.value = false
  eventosStore.clearCurrentEventToEdit()
}

const handleModalSubmit = async (emittedEventData) => {
  showCreateEditModal.value = false
  eventosStore.clearCurrentEventToEdit()

  await eventosStore.fetchEvents()
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
        <div class="filter-controls mb-4">
          <div class="search-input-group">
            <input
              v-model="eventosStore.searchQuery"
              type="text"
              placeholder="Buscar por nombre"
              @input="handleSearchInput"
              @keyup.enter="handleSearchEnter"
            />
            <i class="fas fa-search search-icon"></i>
          </div>
          <div class="button-group">
            <button v-if="isSuperAdmin" class="btn btn-manage" @click="openSedesModal">
              <i class="fa-solid fa-pen"></i> Sedes
            </button>
            <button v-if="isSuperAdmin" class="btn btn-manage" @click="openCategoriasModal">
              <i class="fa-solid fa-pen"></i> Categorías
            </button>
            <button v-if="isSuperAdmin" class="btn btn-create" @click="openCreateModal">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3"
              v-for="event in events"
              :key="event.id"
            >
              <AdminEventCard
                :event="event"
                @edit-event="handleEditEvent"
                @view-event="handleViewEvent"
              />
            </div>
            <div v-if="events.length === 0 && !loading" class="col-12 text-center text-muted mt-5">
              No se encontraron eventos.
            </div>
          </div>

          <nav aria-label="Page navigation" v-if="totalPages > 1 && !loading">
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="prevPage">Anterior</a>
              </li>
              <li
                class="page-item"
                v-for="page in totalPages"
                :key="page"
                :class="{ active: page === currentPage }"
              >
                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="nextPage">Siguiente</a>
              </li>
            </ul>
          </nav>
        </div>
        <ModalCrearEvento
          :show="showCreateEditModal"
          :eventData="currentEventToEdit"
          @close="handleModalClose"
          @submit="handleModalSubmit"
        />
        <ManageSedesModal :show="showSedesModal" @close="handleModalClose" />
        <ManageCategoriasModal :show="showCategoriasModal" @close="handleModalClose" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-group {
  position: relative;
  flex-grow: 1;
}

.search-input-group input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input-group input:focus {
  border-color: #174384;
  outline: none;
}

.search-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0a0a0;
  pointer-events: none;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-create {
  background-color: #174384;
  color: white;
  box-shadow: 0 1px 3px rgba(40, 167, 69, 0.2);
}

.btn-create:hover {
  background-color: #14386b;
}

.btn-manage {
  background-color: #174384;
  color: white;
  box-shadow: 0 1px 3px rgba(23, 67, 132, 0.2);
}

.btn-manage:hover {
  background-color: #14386b;
}

.error-text {
  color: #dc3545;
  font-weight: 500;
  background-color: #fff0f0;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #dc3545;
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
