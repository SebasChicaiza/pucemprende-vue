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

const categorias = ref([])
const loading = ref(false)
const error = ref(null)
const newCategoriaName = ref('')
const editingCategoria = ref(null)
const editedCategoriaName = ref('')
const submittingCategoria = ref(false)

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
let categoriaToDeleteId = null
let categoriaToDeleteName = null

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

const fetchCategorias = async () => {
  loading.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    loading.value = false
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/categoria`, headers)
    categorias.value = response.data
    error.value = null
  } catch (err) {
    error.value = 'Error al cargar las categorías. Intente de nuevo más tarde.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      newCategoriaName.value = ''
      editingCategoria.value = null
      editedCategoriaName.value = ''
      fetchCategorias()
    }
  },
)

const handleCreateCategoria = async () => {
  if (!newCategoriaName.value.trim()) {
    errorMessage.value = 'El nombre de la categoría no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  submittingCategoria.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    submittingCategoria.value = false
    return
  }
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/categoria`,
      { nombre: newCategoriaName.value.trim() },
      headers,
    )
    categorias.value.push(response.data)
    okModalMessage.value = `Categoría "${newCategoriaName.value.trim()}" creada con éxito.`
    showOkModal.value = true
    newCategoriaName.value = ''
    emit('success', { message: okModalMessage.value })
  } catch (err) {
    errorMessage.value = 'Error al crear la categoría.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  } finally {
    submittingCategoria.value = false
  }
}

const startEditCategoria = (categoria) => {
  editingCategoria.value = { ...categoria }
  editedCategoriaName.value = categoria.nombre
}


const cancelEditCategoria = () => {
  editingCategoria.value = null
  editedCategoriaName.value = ''
}

const handleUpdateCategoria = async () => {
  if (!editedCategoriaName.value.trim()) {
    errorMessage.value = 'El nombre de la categoría no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  if (editingCategoria.value.nombre === editedCategoriaName.value.trim()) {
    errorMessage.value = 'El nuevo nombre es el mismo que el actual.'
    showErrorModal.value = true
    return
  }
  submittingCategoria.value = true
  const headers = getAuthHeaders()
  if (!headers.headers) {
    submittingCategoria.value = false
    return
  }
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_URL_BACKEND}/api/categoria/${editingCategoria.value.id}`,
      {
        nombre: editedCategoriaName.value.trim(),
      },
      headers,
    )
    const index = categorias.value.findIndex((c) => c.id === editingCategoria.value.id)
    if (index !== -1) {
      categorias.value[index] = response.data
    }
    okModalMessage.value = `Categoría actualizada a "${editedCategoriaName.value.trim()}" con éxito.`
    showOkModal.value = true
    cancelEditCategoria()
    emit('success', { message: okModalMessage.value })
  } catch (err) {
    errorMessage.value = 'Error al actualizar la categoría.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  } finally {
    submittingCategoria.value = false
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

const handleDeleteCategoria = (categoria) => {
  categoriaToDeleteId = categoria.id
  categoriaToDeleteName = categoria.nombre
  openConfirmationModal({
    title: 'Eliminar Categoría',
    message: `¿Estás seguro de que quieres eliminar la categoría <strong>"${categoria.nombre}"</strong>? Esta acción no se puede deshacer.`,
    confirmText: 'Sí, Eliminar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      submittingCategoria.value = true
      const headers = getAuthHeaders()
      if (!headers.headers) {
        submittingCategoria.value = false
        return
      }
      try {
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/categoria/${categoriaToDeleteId}`,
          headers,
        )
        categorias.value = categorias.value.filter((c) => c.id !== categoriaToDeleteId)
        okModalMessage.value = `Categoría "${categoriaToDeleteName}" eliminada con éxito.`
        showOkModal.value = true
        emit('success', { message: okModalMessage.value })
      } catch (err) {
        errorMessage.value = 'Error al eliminar la categoría.'
        showErrorModal.value = true
        emit('error', { message: errorMessage.value })
      } finally {
        submittingCategoria.value = false
        categoriaToDeleteId = null
        categoriaToDeleteName = null
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
  categoriaToDeleteId = null
  categoriaToDeleteName = null
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
        <h3>Gestionar Categorías</h3>
        <button class="close-button" @click="handleCloseModal">&times;</button>
      </div>
      <div class="modal-body d-flex flex-column">
        <div class="sede-form">
          <h4>Crear Nueva Categoría</h4>
          <div class="input-group">
            <input
              type="text"
              v-model="newCategoriaName"
              placeholder="Nombre de la nueva categoría"
              @keyup.enter="handleCreateCategoria"
              :disabled="submittingCategoria"
            />
            <button @click="handleCreateCategoria" :disabled="submittingCategoria">
              <i v-if="submittingCategoria" class="fas fa-spinner fa-spin"></i>
              <span v-else>Crear Categoría</span>
            </button>
          </div>
        </div>

        <div class="sede-list">
          <h4>Categorías Existentes</h4>
          <ScrollBar max-height="300px">
            <p v-if="loading && categorias.length === 0" class="loading-message">
              Cargando categorías...
            </p>
            <p v-if="!loading && categorias.length === 0" class="no-sedes-message">
              No hay categorías registradas.
            </p>
            <p v-if="error" class="error-message">{{ error }}</p>
            <ul>
              <li v-for="categoria in categorias" :key="categoria.id" class="sede-item">
                <span
                  v-if="editingCategoria && editingCategoria.id === categoria.id"
                  class="sede-name-edit"
                >
                  <input
                    type="text"
                    v-model="editedCategoriaName"
                    @keyup.enter="handleUpdateCategoria"
                    :disabled="submittingCategoria"
                  />
                </span>
                <span v-else class="sede-name">{{ categoria.nombre }}</span>
                <div class="sede-actions">
                  <template v-if="editingCategoria && editingCategoria.id === categoria.id">
                    <button
                      @click="handleUpdateCategoria"
                      class="btn-action-save"
                      :disabled="submittingCategoria"
                    >
                      <i v-if="submittingCategoria" class="fas fa-spinner fa-spin"></i>
                      <span v-else><i class="fas fa-check"></i> Guardar</span>
                    </button>
                    <button
                      @click="cancelEditCategoria"
                      class="btn-action-cancel"
                      :disabled="submittingCategoria"
                    >
                      <i class="fas fa-times"></i> Cancelar
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="startEditCategoria(categoria)"
                      class="btn-action-edit"
                      :disabled="submittingCategoria"
                    >
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button
                      @click="handleDeleteCategoria(categoria)"
                      class="btn-action-delete"
                      :disabled="submittingCategoria"
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
    <LoaderComponent v-if="loading || submittingCategoria" />
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
