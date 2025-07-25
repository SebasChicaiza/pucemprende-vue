<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  eventInfo: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'submit', 'error'])

const newProcessTitle = ref('')
const modalLoading = ref(false)
const modalError = ref('')

// Watch for changes in the 'show' prop to reset the form when the modal opens
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      newProcessTitle.value = '' // Clear the input when modal opens
      modalError.value = '' // Clear any previous errors
    }
  },
)

const createProcess = async () => {
  if (!newProcessTitle.value.trim()) {
    modalError.value = 'El título del proceso no puede estar vacío.'
    return
  }
  if (!props.eventInfo || !props.eventInfo.id) {
    modalError.value = 'No se ha seleccionado un evento válido.'
    return
  }

  modalLoading.value = true
  modalError.value = ''
  const token = localStorage.getItem('token')

  if (!token) {
    modalError.value = 'Token de autenticación no encontrado.'
    modalLoading.value = false
    emit('error', 'Token de autenticación no encontrado.')
    return
  }

  try {
    const payload = {
      titulo: newProcessTitle.value.trim(),
      evento_id: props.eventInfo.id,
    }

    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    emit('submit', response.data) // Emit the new process data
    emit('close') // Close the modal
  } catch (err) {
    console.error('Error creating evaluation process:', err.response?.data || err.message)
    modalError.value = `Error al crear el proceso de evaluación: ${err.response?.data?.message || err.message}`
    emit('error', modalError.value) // Emit error to parent
  } finally {
    modalLoading.value = false
  }
}

const closeModal = () => {
  emit('close')
}

// Helper function to format dates as DD/MM/YYYY
const formatShortDateWithSlashes = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0') // Month is 0-indexed
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
</script>

<template>
  <div v-if="show" class="modal-backdrop fade show">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Crear Nuevo Proceso de Evaluación</h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="eventInfo" class="event-details-section mb-4 p-3 rounded">
            <h6>Evento Seleccionado:</h6>
            <p class="mb-1"><strong>Nombre:</strong> {{ eventInfo.nombre }}</p>
            <p class="mb-1">
              <strong>Fechas:</strong>
              {{ formatShortDateWithSlashes(eventInfo.fecha_inicio) }} -
              {{ formatShortDateWithSlashes(eventInfo.fecha_fin) }}
            </p>
          </div>

          <div class="mb-3">
            <label for="processTitle" class="form-label">Título del Proceso:</label>
            <input
              type="text"
              class="form-control"
              id="processTitle"
              v-model="newProcessTitle"
              :class="{ 'is-invalid': modalError }"
              placeholder="Ej. Proceso de Evaluación Final"
            />
            <div v-if="modalError" class="invalid-feedback d-block">
              {{ modalError }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="closeModal"
            :disabled="modalLoading"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="createProcess"
            :disabled="modalLoading"
          >
            <span
              v-if="modalLoading"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            Crear Proceso
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050; /* Bootstrap modal backdrop z-index */
}

.modal-dialog {
  max-width: 500px;
  margin: 1.75rem auto;
}

.modal-content {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin-bottom: 0;
  line-height: 1.5;
  font-size: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 1rem;
}

.event-details-section {
  background-color: #e9f7ef; /* Light green background */
  border: 1px solid #c3e6cb; /* Green border */
  color: #155724; /* Dark green text */
}

.modal-footer {
  border-top: 1px solid #dee2e6;
  padding: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-control {
  border-radius: 0.3rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.invalid-feedback {
  color: #dc3545;
  font-size: 0.875em;
  margin-top: 0.25rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.3rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
