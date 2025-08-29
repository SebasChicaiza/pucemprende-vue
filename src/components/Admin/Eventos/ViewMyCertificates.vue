<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import ErrorModal from '@/components/ErrorModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { useEventosStore } from '@/stores/eventos'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  eventId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['close'])

// --- STATE MANAGEMENT ---
const myCertificates = ref([])
const loadingCertificates = ref(false)
const selectedCertificateUrl = ref(null)
const selectedEventId = ref(null)
const showErrorModal = ref(false)
const errorMessage = ref('')
const eventSearchQuery = ref('')

const eventosStore = useEventosStore()

// --- COMPUTED PROPERTIES ---
const filteredEvents = computed(() => {
  if (!eventSearchQuery.value) {
    return eventosStore.allEventsList
  }
  const query = eventSearchQuery.value.toLowerCase()
  return eventosStore.allEventsList.filter((event) => event.nombre.toLowerCase().includes(query))
})

const showLoader = computed(() => {
  return eventosStore.loadingAllEvents || loadingCertificates.value
})

// --- API FUNCTIONS ---
const fetchCertificates = async (eventId) => {
  if (!eventId) return
  loadingCertificates.value = true
  const token = localStorage.getItem('token')
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId}/mis-certificados`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    myCertificates.value = response.data.certificados.map((cert) => ({
      id: cert.id,
      filename: cert.filename,
      url: `data:application/pdf;base64,${cert.pdf_base64}`,
    }))
    selectedCertificateUrl.value =
      myCertificates.value.length > 0 ? myCertificates.value[0].url : null
  } catch (error) {
    console.error('Error fetching certificates:', error)
    errorMessage.value = `No se pudieron cargar los certificados: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
    myCertificates.value = []
  } finally {
    loadingCertificates.value = false
  }
}

const downloadCertificate = async (certificateId, filename) => {
  const token = localStorage.getItem('token')
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos/${selectedEventId.value}/mis-certificados/${certificateId}/descargar`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      },
    )
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Error downloading certificate:', error)
    errorMessage.value = `Error al descargar el certificado: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
  }
}

// --- EVENT HANDLERS ---
const handleEventSelection = (eventId) => {
  selectedEventId.value = eventId
  const selectedEvent = eventosStore.allEventsList.find((event) => event.id === eventId)
  if (selectedEvent) {
    eventSearchQuery.value = selectedEvent.nombre
  }
  fetchCertificates(eventId)
}

const closeModal = () => {
  emit('close')
}

// --- LIFECYCLE & WATCHERS ---
watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      selectedEventId.value = props.eventId
      await eventosStore.fetchAllEventsForFilter()

      if (eventosStore.allEventsList.length > 0) {
        const initialEvent = eventosStore.allEventsList.find(
          (event) => event.id === Number(props.eventId),
        )
        if (initialEvent) {
          selectedEventId.value = initialEvent.id
          eventSearchQuery.value = initialEvent.nombre
        }
        fetchCertificates(selectedEventId.value)
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="show" class="modal-backdrop fade show"></div>
  <div
    v-if="show"
    class="modal fade show"
    tabindex="-1"
    style="display: block"
    @click.self="closeModal"
  >
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Mis Certificados</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <LoaderComponent v-if="showLoader" />
          <ScrollBar>
            <div class="mb-4">
              <h6>Seleccionar evento:</h6>
              <div class="dropdown">
                <input
                  type="text"
                  class="form-control dropdown-toggle"
                  placeholder="Buscar evento..."
                  v-model="eventSearchQuery"
                  :disabled="eventosStore.loadingAllEvents"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                />
                <ul class="dropdown-menu w-100" aria-labelledby="dropdownMenuButton1">
                  <li v-if="filteredEvents.length === 0">
                    <span class="dropdown-item-text text-muted">No se encontraron eventos.</span>
                  </li>
                  <li v-else v-for="event in filteredEvents" :key="event.id">
                    <a
                      class="dropdown-item"
                      :class="{ active: selectedEventId === event.id }"
                      href="#"
                      @click.prevent="handleEventSelection(event.id)"
                    >
                      {{ event.nombre }}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <hr />

            <div>
              <h6>Certificados disponibles:</h6>
              <div v-if="myCertificates.length === 0" class="text-center text-muted py-3">
                No tienes certificados disponibles para este evento.
              </div>
              <ul v-else class="list-group">
                <li
                  v-for="cert in myCertificates"
                  :key="cert.id"
                  class="list-group-item d-flex justify-content-between align-items-center"
                  :class="{ active: selectedCertificateUrl === cert.url }"
                  @click="selectedCertificateUrl = cert.url"
                >
                  <span>{{ cert.filename }}</span>
                  <button
                    class="btn btn-primary btn-sm"
                    @click.stop="downloadCertificate(cert.id, cert.filename)"
                  >
                    <i class="fas fa-download me-2"></i>Descargar
                  </button>
                </li>
              </ul>
            </div>
            <div v-if="selectedCertificateUrl" class="pdf-preview-container mt-4">
              <h6>Vista Previa:</h6>
              <div class="pdf-viewer">
                <embed
                  :src="selectedCertificateUrl"
                  type="application/pdf"
                  width="100%"
                  height="400px"
                />
              </div>
            </div>
          </ScrollBar>
        </div>
      </div>
    </div>
  </div>
  <ErrorModal
    :show="showErrorModal"
    :message="errorMessage"
    @close="showErrorModal = false"
    style="z-index: 1060"
  />
</template>

<style scoped>
.modal-backdrop {
  opacity: 0.5;
}
.modal {
  z-index: 1055;
}
.pdf-preview-container {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.pdf-viewer {
  border: 1px solid #eee;
  border-radius: 4px;
}
.list-group-item {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.list-group-item.active {
  background-color: #174384;
  color: #fff;
}
.list-group-item.active span {
  font-weight: bold;
}
.list-group-item.active .btn-outline-info {
  color: #fff;
  border-color: #fff;
}
</style>
