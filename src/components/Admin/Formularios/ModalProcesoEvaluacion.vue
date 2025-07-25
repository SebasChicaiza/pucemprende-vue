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
  isEditing: {
    // NEW PROP: To indicate if the modal is for editing
    type: Boolean,
    default: false,
  },
  processData: {
    // NEW PROP: The process data to pre-fill for editing
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'submit', 'error'])

const newProcessTitle = ref('')
const modalLoading = ref(false)
const modalError = ref('')

// Watch for changes in the 'show' prop to reset/pre-fill the form
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      modalError.value = '' // Clear any previous errors
      if (props.isEditing && props.processData) {
        newProcessTitle.value = props.processData.titulo // Pre-fill for editing
      } else {
        newProcessTitle.value = '' // Clear for creation
      }
    }
  },
  { immediate: true },
) // Run immediately on component mount if 'show' is initially true

const saveProcess = async () => {
  // Renamed from createProcess to be more general
  if (!newProcessTitle.value.trim()) {
    modalError.value = 'El título del proceso no puede estar vacío.'
    return
  }
  if (!props.eventInfo && !props.isEditing) {
    // eventInfo is only required for new creation
    modalError.value = 'No se ha seleccionado un evento válido para crear el proceso.'
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
    let response
    if (props.isEditing && props.processData) {
      // EDIT existing process
      const payload = {
        titulo: newProcessTitle.value.trim(),
      }
      response = await axios.put(
        `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion/${props.processData.id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )
      emit('submit', { type: 'edit', data: response.data }) // Emit type for parent to distinguish
    } else {
      // CREATE new process
      const payload = {
        titulo: newProcessTitle.value.trim(),
        evento_id: props.eventInfo.id,
      }
      response = await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )
      emit('submit', { type: 'create', data: response.data }) // Emit type for parent to distinguish
    }

    emit('close') // Close the modal on success
  } catch (err) {
    console.error('Error saving evaluation process:', err.response?.data || err.message)
    modalError.value = `Error al guardar el proceso de evaluación: ${err.response?.data?.message || err.message}`
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
  <teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content fade-in">
        <h2 class="modal-title">
          {{ isEditing ? 'Editar Proceso de Evaluación' : 'Crear Nuevo Proceso de Evaluación' }}
          <i class="fa-solid fa-xmark close-modal-button" @click="closeModal"></i>
        </h2>

        <div class="modal-body-custom">
          <div
            v-if="eventInfo || (isEditing && processData && processData.evento)"
            class="event-details-section mb-4 p-3 rounded"
          >
            <h6>Evento Seleccionado:</h6>
            <p class="mb-1">
              <strong>Nombre:</strong> {{ (eventInfo || processData.evento).nombre }}
            </p>
            <p class="mb-1">
              <strong>Fechas:</strong>
              {{ formatShortDateWithSlashes((eventInfo || processData.evento).fecha_inicio) }} -
              {{ formatShortDateWithSlashes((eventInfo || processData.evento).fecha_fin) }}
            </p>
          </div>

          <div class="form-group mb-3">
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

        <div class="button-row-modal">
          <button type="button" class="btn btn-cancel" @click="closeModal" :disabled="modalLoading">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveProcess"
            :disabled="modalLoading"
          >
            <span
              v-if="modalLoading"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ isEditing ? 'Guardar Cambios' : 'Crear Proceso' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6); /* Darker, solid backdrop */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* High z-index */
  animation: fadeIn 0.3s ease-out;
}

/* Modal Content (the dialog box itself) */
.modal-content {
  background-color: #fff; /* Solid white background */
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 550px; /* Adjust max-width as needed */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Ensures content stays within rounded corners */
  transform: translateY(0); /* Reset transform from previous attempts */
  animation: slideIn 0.3s ease-out;
}

.modal-title {
  background-color: #174384; /* Header background color */
  color: white;
  padding: 18px 25px;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.close-modal-button {
  cursor: pointer;
  font-size: 1.8rem;
  transition: color 0.2s ease;
}

.close-modal-button:hover {
  color: #f0f0f0;
}

.modal-body-custom {
  padding: 25px;
  flex-grow: 1; /* Allows content to take available space */
  overflow-y: auto; /* Enable scrolling for content if it overflows */
}

.event-details-section {
  background-color: #e9f7ef;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.event-details-section h6 {
  font-weight: 700;
  margin-bottom: 10px;
  color: #0e3c17;
}

.event-details-section p {
  font-size: 0.95em;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 1rem;
  position: relative;
}

.form-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block; /* Ensure label takes full width */
}

.form-control {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-control:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.invalid-feedback {
  color: #dc3545;
  font-size: 0.875em;
  margin-top: 0.25rem;
}

.button-row-modal {
  padding: 15px 25px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background-color: #f8f8f8; /* Light background for footer */
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s,
    transform 0.1s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: 1px solid #007bff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
  border: 1px solid #6c757d;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
