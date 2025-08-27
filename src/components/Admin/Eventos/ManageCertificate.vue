<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import ErrorModal from '@/components/ErrorModal.vue'

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

const emit = defineEmits(['close', 'save'])

// --- STATE MANAGEMENT ---
// Roles
const availableRoles = ref([])
const selectedRoles = ref(new Set())
const loadingRoles = ref(false)

// PDF Certificates
const existingCertificates = ref([]) // Holds the list of PDFs fetched from the backend
const selectedCertificateId = ref(null) // ID of the currently active/selected certificate
const loadingCertificates = ref(false)
const isUploading = ref(false)
const localPdfs = ref([]) // NEW: Array to store locally uploaded PDF files

// Generic
const fileInputKey = ref(Date.now())
const showErrorModal = ref(false)
const errorMessage = ref('')

// --- COMPUTED PROPERTIES ---
// Combined list of existing and locally stored PDFs
const allCertificates = computed(() => {
  return [...existingCertificates.value, ...localPdfs.value]
})

// Get the full object of the selected certificate for preview
const selectedCertificate = computed(() => {
  if (!selectedCertificateId.value) return null
  return allCertificates.value.find((cert) => cert.id === selectedCertificateId.value)
})

// --- API FUNCTIONS ---
// Fetch all available roles
const fetchRoles = async () => {
  loadingRoles.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    loadingRoles.value = false
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/rolEvento`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    availableRoles.value = response.data
  } catch (error) {
    console.error('Error fetching event roles:', error)
    errorMessage.value = `No se pudieron cargar los roles: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
  } finally {
    loadingRoles.value = false
  }
}

// Fetch existing PDF certificates for the event
const fetchEventCertificates = async () => {
  if (!props.eventId) return
  loadingCertificates.value = true
  const token = localStorage.getItem('token')
  // This is a mock API endpoint. Replace with your actual endpoint.
  // For demonstration, I'll populate it with mock data.
  console.log(`Fetching certificates for event ${props.eventId}...`)
  try {
    // ---- START MOCK DATA ----
    // In a real scenario, you would make an API call here:
    // const response = await axios.get(`/api/eventos/${props.eventId}/certificados`, { headers: { Authorization: `Bearer ${token}` } });
    // existingCertificates.value = response.data;
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
    existingCertificates.value = [
      { id: 1, name: 'Certificado_Asistencia_General.pdf', url: '#' },
      { id: 2, name: 'Certificado_Ganador_Primer_Lugar.pdf', url: '#' },
    ]
    // ---- END MOCK DATA ----

    // If there are certificates, select the first one by default
    if (existingCertificates.value.length > 0 && !selectedCertificateId.value) {
      selectedCertificateId.value = existingCertificates.value[0].id
    }
  } catch (error) {
    console.error('Error fetching event certificates:', error)
    errorMessage.value = `No se pudieron cargar los certificados existentes: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
    existingCertificates.value = []
  } finally {
    loadingCertificates.value = false
  }
}

// --- EVENT HANDLERS ---
// Handle selection of roles
const toggleRole = (roleId) => {
  if (selectedRoles.value.has(roleId)) {
    selectedRoles.value.delete(roleId)
  } else {
    selectedRoles.value.add(roleId)
  }
}

// Handle multiple file uploads
const handleFileUpload = (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  for (const file of files) {
    if (file.type !== 'application/pdf') {
      errorMessage.value = `El archivo '${file.name}' no es un PDF y será omitido.`
      showErrorModal.value = true
      continue
    }
    // Store file directly in the localPdfs array
    const fileId = `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    localPdfs.value.push({
      id: fileId,
      name: file.name,
      file: file,
      url: URL.createObjectURL(file),
    })
  }

  fileInputKey.value = Date.now() // Reset file input
}

// Handle deleting a certificate
const deleteCertificate = async (certificateId) => {
  if (!confirm('¿Estás seguro de que quieres eliminar este certificado de evento?')) return

  // Check if the certificate is local
  if (String(certificateId).startsWith('local-')) {
    localPdfs.value = localPdfs.value.filter((cert) => cert.id !== certificateId)
  } else {
    // This part remains unchanged for server-side certificates
    const token = localStorage.getItem('token')
    try {
      // Replace with your actual delete endpoint
      // await axios.delete(`/api/certificados/${certificateId}`, { headers: { Authorization: `Bearer ${token}` } });

      // After successful deletion, refresh the list
      await fetchEventCertificates()
    } catch (error) {
      console.error('Error deleting certificate:', error)
      errorMessage.value = `Error al eliminar el certificado: ${error.response?.data?.message || error.message}`
      showErrorModal.value = true
    }
  }

  // If the deleted certificate was the selected one, clear the selection
  if (selectedCertificateId.value === certificateId) {
    selectedCertificateId.value = null
  }
}

// Close the modal
const closeModal = () => {
  emit('close')
}

// Save all changes
const handleSaveChanges = async (apiEndpoint) => {
  const token = localStorage.getItem('token')
  const uploadPromises = []
  isUploading.value = true

  // Send locally stored PDFs to the specified API endpoint
  for (const localPdf of localPdfs.value) {
    const formData = new FormData()
    formData.append('file', localPdf.file)
    formData.append('evento_id', props.eventId)

    const promise = axios.post(apiEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    })
    uploadPromises.push(promise)
  }

  try {
    await Promise.all(uploadPromises)
    console.log('Todos los archivos locales han sido subidos.')

    // Now, save the rest of the configuration
    const dataToSave = {
      eventId: props.eventId,
      roles: Array.from(selectedRoles.value),
      activeCertificateId: selectedCertificateId.value,
    }
    console.log('Saving certificate configuration:', dataToSave)
    emit('save', dataToSave)
    closeModal()
  } catch (error) {
    console.error('Error al subir archivos:', error)
    errorMessage.value = `Error al subir uno o más archivos: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
  } finally {
    isUploading.value = false
    localPdfs.value = [] // Clear local storage after successful upload
  }
}

// --- LIFECYCLE & WATCHERS ---
// When the modal is shown, fetch all necessary data
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      fetchRoles()
      fetchEventCertificates()
      // Clear local PDFs when the modal is opened
      localPdfs.value = []
    }
  },
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
          <h5 class="modal-title">Administrar Certificado del Evento</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-4">
            <h6><i class="fas fa-users me-2"></i>Seleccionar roles para este certificado</h6>
            <p class="text-muted small">
              Selecciona los roles que recibirán este certificado al finalizar el evento.
            </p>
            <div v-if="loadingRoles" class="text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando roles...</span>
              </div>
            </div>
            <div v-else class="role-checkbox-grid">
              <div
                v-for="role in availableRoles"
                :key="role.id"
                class="form-check form-check-inline"
              >
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`role-${role.id}`"
                  :checked="selectedRoles.has(role.id)"
                  @change="toggleRole(role.id)"
                />
                <label class="form-check-label" :for="`role-${role.id}`">{{ role.nombre }}</label>
              </div>
            </div>
          </div>

          <hr />

          <div class="mt-4">
            <h6><i class="fas fa-file-pdf me-2"></i>Certificados de Evento (PDF)</h6>
            <div class="upload-box mb-3">
              <label for="pdf-upload" class="btn btn-primary animated-btn">
                <i class="fas fa-upload me-2"></i>Subir Nuevos Certificados
              </label>
              <input
                type="file"
                id="pdf-upload"
                @change="handleFileUpload"
                accept=".pdf"
                multiple
                hidden
                :key="fileInputKey"
              />
              <p class="text-muted small mt-2">Puedes seleccionar varios archivos a la vez.</p>
              <div v-if="isUploading" class="mt-2">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2">Subiendo archivos...</span>
              </div>
            </div>

            <div class="certificate-list-container">
              <h6 class="mb-3">Certificados Disponibles</h6>
              <div v-if="loadingCertificates" class="text-center">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="allCertificates.length === 0" class="text-center text-muted py-3">
                No hay certificados de evento subidos para este evento.
              </div>
              <ul v-else class="list-group">
                <li
                  v-for="cert in allCertificates"
                  :key="cert.id"
                  class="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="radio"
                      name="certificateSelection"
                      :id="`cert-${cert.id}`"
                      :value="cert.id"
                      v-model="selectedCertificateId"
                    />
                    <label class="form-check-label" :for="`cert-${cert.id}`">
                      {{ cert.name }}
                    </label>
                  </div>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteCertificate(cert.id)">
                    <i class="fas fa-trash"></i>
                  </button>
                </li>
              </ul>
            </div>

            <div v-if="selectedCertificate" class="pdf-preview-container mt-4">
              <h6 class="mb-3">Vista Previa: {{ selectedCertificate.name }}</h6>
              <div class="pdf-viewer">
                <embed
                  :src="selectedCertificate.url"
                  type="application/pdf"
                  width="100%"
                  height="400px"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary animated-btn" @click="closeModal">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary animated-btn"
            @click="handleSaveChanges('/api/certificados/upload')"
          >
            <i class="fas fa-save me-2"></i>Guardar Cambios
          </button>
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
.role-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.form-check-inline {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}
.form-check-inline:hover {
  background-color: #f8f9fa;
  border-color: #174384;
}
.form-check-input {
  margin-right: 8px;
}
.upload-box {
  text-align: center;
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background-color: #fdfdfd;
}
.certificate-list-container {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f8f9fa;
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
.animated-btn {
  transition: all 0.2s ease-in-out;
}
.btn-primary {
  background-color: #174384;
  border-color: #174384;
}
.btn-primary:hover {
  background-color: #14386b;
  border-color: #14386b;
}
.list-group-item .form-check {
  flex-grow: 1;
}
</style>
