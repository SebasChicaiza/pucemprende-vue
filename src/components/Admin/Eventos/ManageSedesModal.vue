<script setup>
import { ref, watch, defineEmits, defineExpose } from 'vue'
import axios from 'axios'
import OkModal from '@/components/OkModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'success', 'error'])

const sedes = ref([])
const loading = ref(false)
const error = ref(null)
const newSedeName = ref('')
const editingSede = ref(null)
const editedSedeName = ref('')
const submittingSede = ref(false)

const showOkModal = ref(false)
const okModalMessage = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')

const confirmationModalRef = ref(null)
const showConfirmationModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

let onConfirmCallback = () => {}
let sedeToDeleteId = null
let sedeToDeleteName = null

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return {}
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
}

const fetchSedes = async () => {
  loading.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    loading.value = false
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/sede`, headers)
    sedes.value = response.data
    error.value = null
  } catch (err) {
    error.value = 'Error al cargar las sedes. Intente de nuevo más tarde.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      newSedeName.value = ''
      editingSede.value = null
      editedSedeName.value = ''
      fetchSedes()
    }
  },
)

const handleCreateSede = async () => {
  if (!newSedeName.value.trim()) {
    errorMessage.value = 'El nombre de la sede no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  submittingSede.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    submittingSede.value = false
    return
  }
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/sede`,
      { nombre: newSedeName.value.trim() },
      headers,
    )
    sedes.value.push(response.data)
    okModalMessage.value = `Sede "${newSedeName.value.trim()}" creada con éxito.`
    showOkModal.value = true
    newSedeName.value = ''
    emit('success', { message: okModalMessage.value })
  } catch (err) {
    errorMessage.value = 'Error al crear la sede.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  } finally {
    submittingSede.value = false
  }
}

const startEditSede = (sede) => {
  editingSede.value = { ...sede }
  editedSedeName.value = sede.nombre
}

const cancelEditSede = () => {
  editingSede.value = null
  editedSedeName.value = ''
}

const handleUpdateSede = async () => {
  if (!editedSedeName.value.trim()) {
    errorMessage.value = 'El nombre de la sede no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  if (editingSede.value.nombre === editedSedeName.value.trim()) {
    errorMessage.value = 'El nuevo nombre es el mismo que el actual.'
    showErrorModal.value = true
    return
  }
  submittingSede.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    submittingSede.value = false
    return
  }
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_URL_BACKEND}/api/sede/${editingSede.value.id}`,
      {
        nombre: editedSedeName.value.trim(),
      },
      headers,
    )
    const index = sedes.value.findIndex((s) => s.id === editingSede.value.id)
    if (index !== -1) {
      sedes.value[index] = response.data
    }
    okModalMessage.value = `Sede actualizada a "${editedSedeName.value.trim()}" con éxito.`
    showOkModal.value = true
    cancelEditSede()
    emit('success', { message: okModalMessage.value })
  } catch (err) {
    errorMessage.value = 'Error al actualizar la sede.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  } finally {
    submittingSede.value = false
  }
}

const openConfirmationModal = ({ title, message, confirmText, cancelText, onConfirm }) => {
  confirmModalTitle.value = title
  confirmModalMessage.value = message
  confirmModalConfirmText.value = confirmText
  confirmModalCancelText.value = cancelText
  onConfirmCallback = onConfirm
  showConfirmationModal.value = true
}

const handleDeleteSede = (sede) => {
  sedeToDeleteId = sede.id
  sedeToDeleteName = sede.nombre
  openConfirmationModal({
    title: 'Eliminar Sede',
    message: `¿Estás seguro de que quieres eliminar la sede <strong>"${sede.nombre}"</strong>? Esta acción no se puede deshacer.`,
    confirmText: 'Sí, Eliminar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      submittingSede.value = true
      const headers = getAuthHeaders()
      if (!headers.headers) {
        submittingSede.value = false
        return
      }
      try {
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/sede/${sedeToDeleteId}`,
          headers,
        )
        sedes.value = sedes.value.filter((s) => s.id !== sedeToDeleteId)
        okModalMessage.value = `Sede "${sedeToDeleteName}" eliminada con éxito.`
        showOkModal.value = true
        emit('success', { message: okModalMessage.value })
      } catch (err) {
        errorMessage.value = 'Error al eliminar la sede.'
        showErrorModal.value = true
        emit('error', { message: errorMessage.value })
      } finally {
        submittingSede.value = false
        sedeToDeleteId = null
        sedeToDeleteName = null
      }
    },
  })
}

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false
  sedeToDeleteId = null
  sedeToDeleteName = null
}

const handleOkModalClose = () => {
  showOkModal.value = false
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

defineExpose({
  openConfirmationModal,
})
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>Gestionar Sedes</h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body d-flex flex-column">
        <div class="sede-form">
          <h4>Crear Nueva Sede</h4>
          <div class="input-group">
            <input
              type="text"
              v-model="newSedeName"
              placeholder="Nombre de la nueva sede"
              @keyup.enter="handleCreateSede"
              :disabled="submittingSede"
            />
            <button @click="handleCreateSede" :disabled="submittingSede">
              <i v-if="submittingSede" class="fas fa-spinner fa-spin"></i>
              <span v-else>Crear Sede</span>
            </button>
          </div>
        </div>

        <div class="sede-list">
          <h4>Sedes Existentes</h4>
          <ScrollBar max-height="300px">
            <p v-if="loading && sedes.length === 0" class="loading-message">Cargando sedes...</p>
            <p v-if="!loading && sedes.length === 0" class="no-sedes-message">
              No hay sedes registradas.
            </p>
            <p v-if="error" class="error-message">{{ error }}</p>
            <ul>
              <li v-for="sede in sedes" :key="sede.id" class="sede-item">
                <span v-if="editingSede && editingSede.id === sede.id" class="sede-name-edit">
                  <input
                    type="text"
                    v-model="editedSedeName"
                    @keyup.enter="handleUpdateSede"
                    :disabled="submittingSede"
                  />
                </span>
                <span v-else class="sede-name">{{ sede.nombre }}</span>
                <div class="sede-actions">
                  <template v-if="editingSede && editingSede.id === sede.id">
                    <button
                      @click="handleUpdateSede"
                      class="btn-action-save"
                      :disabled="submittingSede"
                    >
                      <i v-if="submittingSede" class="fas fa-spinner fa-spin"></i>
                      <span v-else><i class="fas fa-check"></i> Guardar</span>
                    </button>
                    <button
                      @click="cancelEditSede"
                      class="btn-action-cancel"
                      :disabled="submittingSede"
                    >
                      <i class="fas fa-times"></i> Cancelar
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="startEditSede(sede)"
                      class="btn-action-edit"
                      :disabled="submittingSede"
                    >
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button
                      @click="handleDeleteSede(sede)"
                      class="btn-action-delete"
                      :disabled="submittingSede"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </template>
                </div>
              </li>
            </ul>
          </ScrollBar>
        </div>
      </div>
    </div>
    <LoaderComponent v-if="loading || submittingSede" />
  </div>

  <OkModal
    :show="showOkModal"
    :message="okModalMessage"
    :duration="1000"
    @close="handleOkModalClose"
  />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />

  <ConfirmationModal
    style="z-index: 1050"
    ref="confirmationModalRef"
    :show="showConfirmationModal"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :confirmButtonText="confirmModalConfirmText"
    :cancelText="confirmModalCancelText"
    @confirm="handleDynamicConfirm"
    @cancel="handleDynamicCancel"
  />
</template>

<style scoped>
/* Keep existing styles as is */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #999;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
}

.close-button:hover {
  color: #666;
}

.modal-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.sede-form {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #eee;
  flex-shrink: 0;
}

.sede-form h4,
.sede-list h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #174384;
  font-size: 1.2em;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex-grow: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
}

.input-group input:focus {
  border-color: #007bff;
  outline: none;
}

.input-group button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 5px;
}

.input-group button:hover:not(:disabled) {
  background-color: #218838;
}

.input-group button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.sede-list {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.sede-list h4 {
  flex-shrink: 0;
}

.sede-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sede-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.sede-item:last-child {
  border-bottom: none;
}

.sede-name {
  font-size: 1.1em;
  color: #555;
  font-weight: 500;
  flex-grow: 1;
}

.sede-name-edit {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.sede-name-edit input {
  flex-grow: 1;
  padding: 8px 10px;
  border: 1px solid #007bff;
  border-radius: 5px;
  font-size: 1em;
  margin-right: 10px;
}

.sede-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.btn-action-edit,
.btn-action-delete,
.btn-action-save,
.btn-action-cancel {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1em;
  padding: 8px;
  border-radius: 5px;
  transition:
    background-color 0.2s,
    color 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.btn-action-edit {
  color: #007bff;
}
.btn-action-edit:hover:not(:disabled) {
  background-color: #eaf5ff;
}

.btn-action-delete {
  color: #dc3545;
}
.btn-action-delete:hover:not(:disabled) {
  background-color: #ffebeb;
}

.btn-action-save {
  background-color: #007bff;
  color: white;
}
.btn-action-save:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-action-cancel {
  background-color: #6c757d;
  color: white;
}
.btn-action-cancel:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-action-edit:disabled,
.btn-action-delete:disabled,
.btn-action-save:disabled,
.btn-action-cancel:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  color: #888;
}

.loading-message,
.no-sedes-message {
  text-align: center;
  color: #888;
  padding: 20px 0;
}
.error-message {
  text-align: center;
  color: #dc3545;
  padding: 20px 0;
}
</style>
