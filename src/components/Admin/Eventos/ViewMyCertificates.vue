<script setup>
import { ref, watch } from 'vue'
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

const eventosStore = useEventosStore()

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
    myCertificates.value = response.data.certificados
    if (myCertificates.value.length > 0) {
      selectedCertificateUrl.value = myCertificates.value[0].url
    }
  } catch (error) {
    console.error('Error fetching certificates:', error)
    errorMessage.value = `No se pudieron cargar los certificados: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
    myCertificates.value = []
  } finally {
    loadingCertificates.value = false
  }
}

// --- EVENT HANDLERS ---
const handleSelectChange = () => {
  fetchCertificates(selectedEventId.value)
}

const closeModal = () => {
  emit('close')
}

// --- LIFECYCLE & WATCHERS ---
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      selectedEventId.value = props.eventId
      eventosStore.fetchAllEventsForFilter().then(() => {
        if (eventosStore.allEventsList.length > 0) {
          fetchCertificates(selectedEventId.value)
        }
      })
    }
  },
)

watch(selectedEventId, (newId) => {
  if (newId) {
    fetchCertificates(newId)
  }
})
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
          <LoaderComponent v-if="eventosStore.loadingAllEvents" />
          <ScrollBar>
            <div class="mb-4">
              <h6>Seleccionar evento:</h6>
              <select
                v-model="selectedEventId"
                class="form-select"
                :disabled="eventosStore.loadingAllEvents"
                @change="handleSelectChange"
              >
                <option v-if="!selectedEventId" disabled selected value>
                  Seleccione un evento
                </option>
                <option
                  v-for="event in eventosStore.allEventsList"
                  :key="event.id"
                  :value="event.id"
                >
                  {{ event.nombre }}
                </option>
              </select>
            </div>

            <hr />

            <div>
              <h6>Certificados disponibles:</h6>
              <LoaderComponent v-if="loadingCertificates" />
              <div v-else-if="myCertificates.length === 0" class="text-center text-muted py-3">
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
                  <span>{{ cert.descripcion }}</span>
                  <button class="btn btn-outline-info btn-sm">
                    <i class="fas fa-eye me-2"></i>Ver
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
  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="showErrorModal = false" />
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
