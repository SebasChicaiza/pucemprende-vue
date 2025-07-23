<script setup>
import { ref, watch, defineEmits } from 'vue'
import { useEventUsersStore } from '@/stores/eventUsers'
import OkModal from '@/components/OkModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  roles: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'success', 'error'])

const store = useEventUsersStore()

const newRoleName = ref('')
const editingRole = ref(null)
const editedRoleName = ref('')
const submittingRole = ref(false)

// Modals for feedback
const showOkModal = ref(false)
const okModalMessage = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')

// ConfirmationModal specific state
const confirmationModalRef = ref(null) // Ref for the ConfirmationModal instance
const showConfirmationModal = ref(false) // Re-introduce this to control visibility
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar') // Default value for cancel button

let onConfirmCallback = () => {}
let roleToDeleteId = null
let roleToDeleteName = null

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      newRoleName.value = ''
      editingRole.value = null
      editedRoleName.value = ''
      if (store.roles.length === 0) {
        store.fetchRoles()
      }
    }
  },
)

const handleCreateRole = async () => {
  if (!newRoleName.value.trim()) {
    errorMessage.value = 'El nombre del rol no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  submittingRole.value = true
  const success = await store.createRole(newRoleName.value.trim())
  if (success) {
    okModalMessage.value = `Rol "${newRoleName.value.trim()}" creado con éxito.`
    showOkModal.value = true
    newRoleName.value = ''
    emit('success', { message: okModalMessage.value })
  } else {
    errorMessage.value = store.error || 'Error al crear el rol.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  }
  submittingRole.value = false
}

const startEditRole = (role) => {
  editingRole.value = { ...role }
  editedRoleName.value = role.nombre
}

const cancelEditRole = () => {
  editingRole.value = null
  editedRoleName.value = ''
}

const handleUpdateRole = async () => {
  if (!editedRoleName.value.trim()) {
    errorMessage.value = 'El nombre del rol no puede estar vacío.'
    showErrorModal.value = true
    return
  }
  if (editingRole.value.nombre === editedRoleName.value.trim()) {
    errorMessage.value = 'El nuevo nombre es el mismo que el actual.'
    showErrorModal.value = true
    return
  }
  submittingRole.value = true
  const success = await store.updateRole(editingRole.value.id, editedRoleName.value.trim())
  if (success) {
    okModalMessage.value = `Rol actualizado a "${editedRoleName.value.trim()}" con éxito.`
    showOkModal.value = true
    cancelEditRole()
    emit('success', { message: okModalMessage.value })
  } else {
    errorMessage.value = store.error || 'Error al actualizar el rol.'
    showErrorModal.value = true
    emit('error', { message: errorMessage.value })
  }
  submittingRole.value = false
}

// Re-implement openConfirmationModal
const openConfirmationModal = ({ title, message, confirmText, cancelText, onConfirm }) => {
  confirmModalTitle.value = title
  confirmModalMessage.value = message
  confirmModalConfirmText.value = confirmText
  confirmModalCancelText.value = cancelText
  onConfirmCallback = onConfirm
  showConfirmationModal.value = true // Set ref to true to show the modal
  if (confirmationModalRef.value) {
    confirmationModalRef.value.show() // Call the exposed show method
  }
}

const handleDeleteRole = (role) => {
  roleToDeleteId = role.id
  roleToDeleteName = role.nombre
  openConfirmationModal({
    title: 'Eliminar Rol',
    message: `¿Estás seguro de que quieres eliminar el rol <strong>"${role.nombre}"</strong>? Esta acción no se puede deshacer.`,
    confirmText: 'Sí, Eliminar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      submittingRole.value = true
      const success = await store.deleteRole(roleToDeleteId)
      if (success) {
        okModalMessage.value = `Rol "${roleToDeleteName}" eliminado con éxito.`
        showOkModal.value = true
        emit('success', { message: okModalMessage.value })
      } else {
        errorMessage.value = store.error || 'Error al eliminar el rol.'
        showErrorModal.value = true
        emit('error', { message: errorMessage.value })
      }
      submittingRole.value = false
      roleToDeleteId = null
      roleToDeleteName = null
    },
  })
}

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false // Hide the parent's control flag
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false // Hide the parent's control flag
  roleToDeleteId = null
  roleToDeleteName = null
}

const handleOkModalClose = () => {
  showOkModal.value = false
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>Gestionar Roles</h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body d-flex flex-column">
        <div class="role-form">
          <h4>Crear Nuevo Rol</h4>
          <div class="input-group">
            <input
              type="text"
              v-model="newRoleName"
              placeholder="Nombre del nuevo rol"
              @keyup.enter="handleCreateRole"
              :disabled="submittingRole"
            />
            <button @click="handleCreateRole" :disabled="submittingRole">
              <i v-if="submittingRole" class="fas fa-spinner fa-spin"></i>
              <span v-else>Crear Rol</span>
            </button>
          </div>
        </div>

        <div class="role-list">
          <h4>Roles Existentes</h4>
          <ScrollBar max-height="300px">
            <p v-if="store.loading && props.roles.length === 0" class="loading-message">
              Cargando roles...
            </p>
            <p v-if="!store.loading && store.roles.length === 0" class="no-roles-message">
              No hay roles registrados.
            </p>
            <ul>
              <li v-for="role in props.roles" :key="role.id" class="role-item">
                <span v-if="editingRole && editingRole.id === role.id" class="role-name-edit">
                  <input
                    type="text"
                    v-model="editedRoleName"
                    @keyup.enter="handleUpdateRole"
                    :disabled="submittingRole"
                  />
                </span>
                <span v-else class="role-name">{{ role.nombre }}</span>
                <div class="role-actions">
                  <template v-if="editingRole && editingRole.id === role.id">
                    <button
                      @click="handleUpdateRole"
                      class="btn-action-save"
                      :disabled="submittingRole"
                    >
                      <i v-if="submittingRole" class="fas fa-spinner fa-spin"></i>
                      <span v-else><i class="fas fa-check"></i> Guardar</span>
                    </button>
                    <button
                      @click="cancelEditRole"
                      class="btn-action-cancel"
                      :disabled="submittingRole"
                    >
                      <i class="fas fa-times"></i> Cancelar
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="startEditRole(role)"
                      class="btn-action-edit"
                      :disabled="submittingRole"
                    >
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button
                      @click="handleDeleteRole(role)"
                      class="btn-action-delete"
                      :disabled="submittingRole"
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

.role-form {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #eee;
  flex-shrink: 0;
}

.role-form h4,
.role-list h4 {
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

.role-list {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.role-list h4 {
  flex-shrink: 0;
}

.role-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.role-item:last-child {
  border-bottom: none;
}

.role-name {
  font-size: 1.1em;
  color: #555;
  font-weight: 500;
  flex-grow: 1;
}

.role-name-edit {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.role-name-edit input {
  flex-grow: 1;
  padding: 8px 10px;
  border: 1px solid #007bff;
  border-radius: 5px;
  font-size: 1em;
  margin-right: 10px;
}

.role-actions {
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
.no-roles-message {
  text-align: center;
  color: #888;
  padding: 20px 0;
}
</style>
