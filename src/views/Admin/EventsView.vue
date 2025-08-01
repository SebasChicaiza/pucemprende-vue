<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useEventosStore } from '@/stores/eventos' // Importa tu store
import { storeToRefs } from 'pinia' // Necesario para desestructurar propiedades reactivas del store
import { useEventosInscritosStore } from '@/stores/useEventosInscritosStore'
const eventosInscritosStore = useEventosInscritosStore()

// Carga asíncrona de componentes grandes o usados con menos frecuencia
const ModalCrearEvento = defineAsyncComponent(
  () => import('@/components/Admin/Eventos/ModalCrearEvento.vue'),
)
const AdminEventCard = defineAsyncComponent(
  () => import('@/components/Admin/Eventos/AdminEventCard.vue'),
)
// LoaderComponent es pequeño, no suele necesitar carga asíncrona
import LoaderComponent from '@/components/LoaderComponent.vue'

const router = useRouter()
const eventosStore = useEventosStore() // Instancia el store

const showCreateEditModal = ref(false)
let searchTimeout = null

// Desestructura las propiedades reactivas del store usando storeToRefs
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
    // Al cambiar el query de búsqueda, siempre vamos a la primera página
    if (eventosStore.currentPage !== 1) {
      eventosStore.setCurrentPage(1) // Esto disparará el watcher de currentPage
    } else {
      eventosStore.fetchEvents() // Si ya estamos en la primera página, simplemente busca
    }
  }, 500)
}

const handleSearchEnter = () => {
  clearTimeout(searchTimeout)
  eventosStore.setCurrentPage(1) // Siempre ir a la primera página con Enter
  eventosStore.fetchEvents()
}

// Observar cambios en currentPage del store para recargar eventos
watch(currentPage, () => {
  eventosStore.fetchEvents()
})

// Observar cambios en searchQuery del store (opcional, si lo modificas fuera del v-model)
// watch(searchQuery, (newVal, oldVal) => {
//     // Puedes agregar lógica aquí si la query cambia de forma externa y necesitas una acción inmediata
//     if (newVal === '' && oldVal !== '' && !loading.value) {
//         eventosStore.fetchEvents();
//     }
// });

onMounted(() => {
  eventosStore.fetchEvents() // Carga inicial de eventos al montar el componente
  eventosInscritosStore.fetchEventosInscritos() // Actualiza eventos inscritos del usuario actual
})

const openCreateModal = () => {
  eventosStore.clearCurrentEventToEdit() // Asegúrate de limpiar el evento a editar antes de abrir el modal para crear
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
  eventosStore.clearCurrentEventToEdit() // Limpia el evento editado al cerrar el modal
}

const handleModalSubmit = async (emittedEventData) => {
  showCreateEditModal.value = false
  eventosStore.clearCurrentEventToEdit()

  await eventosStore.fetchEvents() // Recargar la lista de eventos después de crear/editar
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
        <div class="d-flex align-items-center mb-3 gap-2">
          <input
            v-model="eventosStore.searchQuery"
            type="text"
            placeholder="Buscar por nombre"
            class="form-control"
            @input="handleSearchInput"
            @keyup.enter="handleSearchEnter"
          />
          <button class="btn btn-default" @click="openCreateModal">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row" v-if="!loading">
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
          <div v-else class="text-center text-muted mt-5">Cargando eventos...</div>

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

.btn-default {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
}

.btn-default:hover {
  background-color: #e2e6ea;
  border-color: #dae0e5;
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
