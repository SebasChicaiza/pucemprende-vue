<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import Pagination from '@/components/Admin/PaginationComponent.vue'
import { useEventosStore } from '@/stores/eventos'
import ModalProcesoEvaluacion from '@/components/Admin/Formularios/ModalProcesoEvaluacion.vue' // Updated import path and name

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const showErrorModal = ref(false)
const errorMessage = ref('')

const procesosEvaluacion = ref([])

const eventosStore = useEventosStore()

const currentPage = ref(1)
const itemsPerPage = ref(6)

const eventSearchQuery = ref('')
const showEventSuggestions = ref(false)
const selectedEventForFilter = ref(null)

const processSearchQuery = ref('')

const showOkModal = ref(false)
const okModalMessage = ref('')
const universalDeleteModalRef = ref(null)
const modalTitle = ref('')
const modalMessage = ref('')
const modalWarning = ref('')
const modalConfirmText = ref('')

const showCreateProcessModal = ref(false)
const currentProcessToEdit = ref(null) // NEW: Holds the process data for editing
const isEditing = ref(false) // NEW: Flag to indicate edit mode

const showConfirmationModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

let onConfirmCallback = () => {}

const handleOkModalClose = () => {
  showOkModal.value = false
}
const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
const handleDeleteConfirmed = () => {
  universalDeleteModalRef.value.hide()
  okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'
  showOkModal.value = true
}

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false
}

const openCreateProcessModal = () => {
  if (selectedEventForFilter.value) {
    isEditing.value = false // Set to create mode
    currentProcessToEdit.value = null // Clear any previous edit data
    showCreateProcessModal.value = true
  } else {
    errorMessage.value =
      'Por favor, seleccione un evento primero para crear un proceso de evaluación.'
    showErrorModal.value = true
  }
}

// NEW: Function to open modal in edit mode
const openEditProcessModal = async (processId) => {
  loading.value = true // Show main loader while fetching specific process
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    loading.value = false
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion/${processId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    currentProcessToEdit.value = response.data
    selectedEventForFilter.value = response.data.evento // Ensure event info is available for the modal
    isEditing.value = true // Set to edit mode
    showCreateProcessModal.value = true // Open the modal
  } catch (err) {
    console.error('Error fetching process for edit:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los detalles del proceso para edición: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
  } finally {
    loading.value = false
  }
}

const handleCreateProcessModalClose = () => {
  showCreateProcessModal.value = false
  currentProcessToEdit.value = null // Clear data when modal closes
  isEditing.value = false // Reset mode
}

// Modified to handle both create and edit submissions
const handleNewProcessCreated = async (payload) => {
  if (payload.type === 'create') {
    okModalMessage.value = `Proceso "${payload.data.titulo}" creado exitosamente.`
  } else if (payload.type === 'edit') {
    okModalMessage.value = `Proceso "${payload.data.titulo}" actualizado exitosamente.`
  }
  showOkModal.value = true
  await fetchProcesosEvaluacion() // Re-fetch processes to update the list
}

async function fetchProcesosEvaluacion() {
  loading.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    loading.value = false
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion/`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    procesosEvaluacion.value = response.data
  } catch (err) {
    console.error('Error fetching procesos de evaluacion:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los procesos de evaluación: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
  } finally {
    loading.value = false
  }
}

const filteredEventSuggestions = computed(() => {
  if (!eventSearchQuery.value) {
    return eventosStore.allEventsList
  }
  const query = eventSearchQuery.value.toLowerCase()
  return eventosStore.allEventsList.filter((event) => event.nombre.toLowerCase().includes(query))
})

const onEventInput = () => {
  selectedEventForFilter.value = null
  showEventSuggestions.value = true
}

const selectEventSuggestion = (event) => {
  eventSearchQuery.value = event.nombre
  selectedEventForFilter.value = event
  showEventSuggestions.value = false
  currentPage.value = 1
}

const clearEventInput = () => {
  eventSearchQuery.value = ''
  selectedEventForFilter.value = null
  showEventSuggestions.value = false
  currentPage.value = 1
}

const filteredAndPaginatedProcesosEvaluacion = computed(() => {
  let filtered = procesosEvaluacion.value

  if (selectedEventForFilter.value) {
    filtered = filtered.filter(
      (proceso) => proceso.evento && proceso.evento.id === selectedEventForFilter.value.id,
    )
  } else if (eventSearchQuery.value) {
    const eventQuery = eventSearchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (proceso) => proceso.evento && proceso.evento.nombre.toLowerCase().includes(eventQuery),
    )
  }

  if (processSearchQuery.value) {
    const processQuery = processSearchQuery.value.toLowerCase()
    filtered = filtered.filter((proceso) => proceso.titulo.toLowerCase().includes(processQuery))
  }

  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filtered.slice(start, end)
})

const totalPages = computed(() => {
  let filtered = procesosEvaluacion.value
  if (selectedEventForFilter.value) {
    filtered = filtered.filter(
      (proceso) => proceso.evento && proceso.evento.id === selectedEventForFilter.value.id,
    )
  } else if (eventSearchQuery.value) {
    const eventQuery = eventSearchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (proceso) => proceso.evento && proceso.evento.nombre.toLowerCase().includes(eventQuery),
    )
  }
  if (processSearchQuery.value) {
    const processQuery = processSearchQuery.value.toLowerCase()
    filtered = filtered.filter((proceso) => proceso.titulo.toLowerCase().includes(processQuery))
  }
  return Math.ceil(filtered.length / itemsPerPage.value)
})

const handlePageChange = (page) => {
  currentPage.value = page
}

const formatShortDateWithSlashes = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const bannerContent = computed(() => {
  if (selectedEventForFilter.value) {
    const event = selectedEventForFilter.value
    const startDate = formatShortDateWithSlashes(event.fecha_inicio)
    const endDate = formatShortDateWithSlashes(event.fecha_fin)
    return {
      title: `Evento encontrado: ${event.nombre}`,
      dates: `${startDate} - ${endDate}`,
      showCreateButton: true,
    }
  } else {
    return {
      title: 'Seleccione un evento para crear su proceso de evaluación',
      dates: null,
      showCreateButton: false,
    }
  }
})

onMounted(() => {
  fetchProcesosEvaluacion()
  eventosStore.fetchAllEventsForFilter()
  document.addEventListener('click', onClickOutsideEventSearch)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutsideEventSearch)
})

const onClickOutsideEventSearch = (event) => {
  const autocompleteWrapper = document.getElementById('event-autocomplete-wrapper')
  if (autocompleteWrapper && !autocompleteWrapper.contains(event.target)) {
    showEventSuggestions.value = false
  }
}

watch(eventSearchQuery, (newVal, oldVal) => {
  if (selectedEventForFilter.value && newVal !== selectedEventForFilter.value.nombre) {
    selectedEventForFilter.value = null
  }
})

watch(processSearchQuery, () => {
  currentPage.value = 1
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="forms-header">
          <h1>Crear formularios para calificar proyecto diversos eventos</h1>
          <div class="search-and-create-section">
            <div class="autocomplete-wrapper" id="event-autocomplete-wrapper">
              <div class="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Busca un evento"
                  class="search-input"
                  v-model="eventSearchQuery"
                  @input="onEventInput"
                  @focus="showEventSuggestions = true"
                />
                <i class="fas fa-search search-icon"></i>
                <button v-if="eventSearchQuery" class="clear-button" @click="clearEventInput">
                  &times;
                </button>
              </div>
              <ul
                v-if="showEventSuggestions && filteredEventSuggestions.length > 0"
                class="suggestions-list"
              >
                <li
                  v-for="event in filteredEventSuggestions"
                  :key="event.id"
                  @click="selectEventSuggestion(event)"
                >
                  {{ event.nombre }}
                </li>
              </ul>
            </div>
            <div class="search-input-wrapper">
              <input
                type="text"
                placeholder="Busca un proceso de evaluacion"
                class="search-input"
                v-model="processSearchQuery"
              />
              <i class="fas fa-search search-icon"></i>
              <button
                v-if="processSearchQuery"
                class="clear-button"
                @click="processSearchQuery = ''"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <div class="event-info-banner">
          <span><i class="fas fa-info-circle me-2"></i>{{ bannerContent.title }}</span>
          <span v-if="bannerContent.dates" class="d-flex align-items-center">
            <i class="fas fa-calendar-alt me-2"></i>{{ bannerContent.dates }}
            <button
              v-if="bannerContent.showCreateButton"
              class="btn btn-primary btn-sm ms-3 create-process-banner-btn"
              @click="openCreateProcessModal"
            >
              <i class="fas fa-plus-circle me-2"></i>Crear un proceso de evaluación
            </button>
          </span>
        </div>

        <h2 class="section-title">Procesos de evaluación</h2>
        <div class="evaluation-process-grid">
          <div
            v-if="filteredAndPaginatedProcesosEvaluacion.length === 0 && !loading"
            class="no-data-message"
          >
            No hay procesos de evaluación disponibles que coincidan con el filtro.
          </div>
          <div
            v-for="proceso in filteredAndPaginatedProcesosEvaluacion"
            :key="proceso.id"
            class="evaluation-card"
          >
            <h3 class="process-title">{{ proceso.titulo }}</h3>
            <p class="event-name">{{ proceso.evento.nombre }}</p>
            <p class="event-dates">
              <i class="fas fa-calendar-alt me-1"></i>
              {{ formatShortDateWithSlashes(proceso.evento.fecha_inicio) }} -
              {{ formatShortDateWithSlashes(proceso.evento.fecha_fin) }}
            </p>
            <div class="card-actions">
              <button class="btn btn-primary templates-button">
                <i class="fas fa-star me-2"></i>Plantillas de evaluacion
              </button>
              <!-- NEW: Edit button -->
              <button class="btn btn-edit-process" @click="openEditProcessModal(proceso.id)">
                <i class="fas fa-pencil-alt"></i>
              </button>
            </div>
            <p class="event-description">
              {{
                proceso.evento.descripcion.length > 100
                  ? proceso.evento.descripcion.slice(0, 100) + '...'
                  : proceso.evento.descripcion
              }}
            </p>
          </div>
        </div>

        <Pagination
          :currentPage="currentPage"
          :totalPages="totalPages"
          :maxVisibleButtons="5"
          @page-changed="handlePageChange"
        />
      </div>
    </div>
  </div>

  <OkModal
    :show="showOkModal"
    :message="okModalMessage"
    :duration="1000"
    @close="handleOkModalClose"
  />

  <ModalProcesoEvaluacion
    :show="showCreateProcessModal"
    :eventInfo="selectedEventForFilter"
    :isEditing="isEditing"
    :processData="currentProcessToEdit"
    @close="handleCreateProcessModalClose"
    @submit="handleNewProcessCreated"
    @error="handleErrorModalClose"
  />

  <ConfirmationModal
    :show="showConfirmationModal"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :confirmText="confirmModalConfirmText"
    :cancelText="confirmModalCancelText"
    @confirm="handleDynamicConfirm"
    @cancel="handleDynamicCancel"
  />

  <DeleteModal
    ref="universalDeleteModalRef"
    :title="modalTitle"
    :message="modalMessage"
    :warning="modalWarning"
    :confirmButtonText="modalConfirmText"
    @confirmed="handleDeleteConfirmed"
  />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />
</template>

<style scoped>
.forms-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.forms-header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0;
}

.search-and-create-section {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap; /* Allows wrapping on smaller screens */
}

.autocomplete-wrapper {
  position: relative;
  flex-grow: 1;
  max-width: 300px; /* Max width for event search */
}

/* Ensure both search inputs have similar styling and flex properties */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex-grow: 1; /* Allows it to grow within its parent */
  width: 100%; /* Take full width of its parent (autocomplete-wrapper or search-and-create-section) */
}

.search-input {
  flex-grow: 1;
  padding: 10px 15px 10px 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95em;
  width: 100%; /* Important for flex-grow to work as expected */
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007bff;
  outline: none;
}

.search-icon {
  position: absolute;
  left: 15px;
  color: #888;
}

.clear-button {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.2em;
  color: #999;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.clear-button:hover {
  color: #666;
}

.suggestions-list {
  position: absolute;
  top: 100%; /* Position below the input */
  left: 0;
  right: 0;
  border: 1px solid #ddd;
  border-top: none;
  background-color: white;
  z-index: 10; /* Ensure it's above other content */
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 0 0 8px 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions-list li {
  padding: 10px 15px;
  cursor: pointer;
  color: #333;
  font-size: 0.95em;
}

.suggestions-list li:hover {
  background-color: #f0f0f0;
}

/* The original "Crear un proceso de evaluación" button is now part of the banner */
.create-process-btn {
  display: none; /* Hide the old button */
}

.event-info-banner {
  background-color: #e0f2f7;
  color: #174384;
  padding: 15px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  font-weight: 600;
  flex-wrap: wrap;
  gap: 10px;
}

.create-process-banner-btn {
  background-color: #28a745; /* A green color for "create" */
  border-color: #28a745;
  color: white;
  padding: 8px 15px; /* Adjust padding for a smaller button in the banner */
  font-size: 0.85em; /* Adjust font size */
  border-radius: 6px;
  display: flex; /* To align icon and text */
  align-items: center;
  gap: 5px;
}

.create-process-banner-btn:hover {
  background-color: #218838;
  border-color: #1e7e34;
}

.section-title {
  font-size: 1.7rem;
  color: #333;
  margin-bottom: 25px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.evaluation-process-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.evaluation-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  padding: 25px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease-in-out;
}

.evaluation-card:hover {
  transform: translateY(-5px);
}

.process-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #174384;
  margin-bottom: 10px;
}

.event-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.event-dates {
  font-size: 0.95em;
  color: #777;
  margin-bottom: 15px;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto; /* Pushes action buttons to the bottom */
  margin-bottom: 15px;
  gap: 10px;
}

.templates-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-grow: 1; /* Allow it to take available space */
  transition: background-color 0.2s;
}

.templates-button:hover {
  background-color: #0056b3;
}

.btn-edit-process {
  background-color: #ffc107; /* Yellow for edit */
  color: #333;
  border: none;
  padding: 10px 12px; /* Smaller padding for icon button */
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-edit-process:hover {
  background-color: #e0a800;
}

.event-description {
  font-size: 0.9em;
  color: #666;
  line-height: 1.5;
  text-align: justify;
  flex-grow: 1; /* Allows description to take available space */
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
}

.pagination-button {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 15px;
  cursor: pointer;
  font-size: 1em;
  color: #555;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.pagination-button:hover {
  background-color: #e0e0e0;
  border-color: #ccc;
}

.pagination-page {
  font-weight: 600;
  color: #174384;
  padding: 8px 12px;
  border-radius: 8px;
}

.no-data-message {
  grid-column: 1 / -1; /* Span across all columns */
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 1.2em;
  background-color: #f8f8f8;
  border-radius: 12px;
  margin-top: 20px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .forms-header h1 {
    font-size: 1.5rem;
  }

  .search-and-create-section {
    flex-direction: column;
    align-items: stretch;
  }

  .autocomplete-wrapper {
    max-width: 100%;
  }
  .search-input-wrapper {
    max-width: 100%; /* Ensure both inputs take full width when stacked */
  }

  .event-info-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .evaluation-process-grid {
    grid-template-columns: 1fr;
  }

  .evaluation-card {
    padding: 20px;
  }

  .process-title {
    font-size: 1.2rem;
  }

  .event-name {
    font-size: 1em;
  }

  .templates-button {
    font-size: 0.85em;
    padding: 8px 12px;
  }
}
</style>
