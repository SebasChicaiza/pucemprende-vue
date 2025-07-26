<!-- components/Admin/Usuarios/EditGlobalUserModal.vue -->
<script setup>
import { ref, watch, defineEmits, defineProps, onMounted, onUnmounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import axios from 'axios'
import LoaderComponent from '@/components/LoaderComponent.vue'

const props = defineProps({
  show: Boolean,
  initialData: Object,
  rolesOptions: Array,
})

const emit = defineEmits(['close', 'edit-user', 'error'])

const editUserModalRef = ref(null)
let bsModal = null

const userId = ref(null)
const userData = ref(null)
const editedEmail = ref('')
const editedRoleId = ref(null)
const editedClave = ref('') // NEW: For the password field
const modalLoading = ref(false)
const modalError = ref('')

onMounted(() => {
  if (editUserModalRef.value) {
    bsModal = new Modal(editUserModalRef.value, { backdrop: 'static', keyboard: false })
    editUserModalRef.value.addEventListener('hidden.bs.modal', () => {
      emit('close')
      userId.value = null
      userData.value = null
      editedEmail.value = ''
      editedRoleId.value = null
      editedClave.value = '' // Reset password field
      modalLoading.value = false
      modalError.value = ''
    })
  }
})

onUnmounted(() => {
  if (bsModal) {
    bsModal.dispose()
    bsModal = null
  }
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      bsModal?.show()
      modalError.value = ''
      if (props.initialData) {
        userData.value = { ...props.initialData }
        userId.value = props.initialData.id
        editedEmail.value = props.initialData.email
        editedRoleId.value = props.initialData.rol_id
        editedClave.value = '' // Password field should always be empty on open for security
      }
    } else {
      bsModal?.hide()
    }
  },
)

const closeModal = () => {
  emit('close')
}

const saveChanges = async () => {
  if (!editedEmail.value.trim() || editedRoleId.value === null) {
    modalError.value = 'El email y el rol son campos obligatorios.'
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
      email: editedEmail.value.trim(),
      rol_id: editedRoleId.value,
    }

    // Only add clave to payload if it's not empty
    if (editedClave.value.trim()) {
      payload.clave = editedClave.value.trim()
    }

    const response = await axios.put(
      `${import.meta.env.VITE_URL_BACKEND}/api/usuario/${userId.value}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    emit('edit-user', response.data)
  } catch (err) {
    console.error('Error updating user:', err.response?.data || err.message)
    modalError.value = `Error al guardar cambios: ${err.response?.data?.message || err.message}`
    emit('error', modalError.value)
  } finally {
    modalLoading.value = false
  }
}
</script>

<template>
  <teleport to="body">
    <div
      class="modal fade"
      tabindex="-1"
      aria-labelledby="editGlobalUserModalLabel"
      aria-hidden="true"
      ref="editUserModalRef"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editGlobalUserModalLabel">Editar Usuario Global</h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
          </div>

          <div class="modal-body-custom">
            <LoaderComponent v-if="modalLoading" />
            <div v-else-if="userData">
              <div class="user-info-section mb-4 p-3 rounded">
                <h6>Información del Usuario:</h6>
                <p class="mb-1">
                  <strong>Nombre Completo:</strong> {{ userData.nombre }} {{ userData.apellido }}
                </p>
                <p class="mb-1"><strong>Identificación:</strong> {{ userData.identificacion }}</p>
                <p class="mb-1"><strong>Usuario:</strong> {{ userData.usuario }}</p>
              </div>

              <div class="form-group mb-3">
                <label for="userEmail" class="form-label">Email:</label>
                <input
                  type="email"
                  class="form-control"
                  id="userEmail"
                  v-model="editedEmail"
                  :class="{ 'is-invalid': modalError }"
                  placeholder="ejemplo@correo.com"
                />
                <div v-if="modalError" class="invalid-feedback d-block">
                  {{ modalError }}
                </div>
              </div>

              <div class="form-group mb-3">
                <label for="userRole" class="form-label">Rol:</label>
                <select
                  class="form-control"
                  id="userRole"
                  v-model="editedRoleId"
                  :class="{ 'is-invalid': modalError }"
                >
                  <option :value="null" disabled>Seleccione un rol</option>
                  <option v-for="role in rolesOptions" :key="role.id" :value="role.id">
                    {{ role.nombre }}
                  </option>
                </select>
                <div v-if="modalError" class="invalid-feedback d-block">
                  {{ modalError }}
                </div>
              </div>

              <!-- NEW: Clave (Password) field -->
              <div class="form-group mb-3">
                <label for="userClave" class="form-label">Nueva Contraseña (opcional):</label>
                <input
                  type="password"
                  class="form-control"
                  id="userClave"
                  v-model="editedClave"
                  placeholder="Dejar vacío para no cambiar"
                />
                <div v-if="modalError" class="invalid-feedback d-block">
                  <!-- Add specific validation for password if needed -->
                </div>
              </div>
            </div>
            <p v-else-if="!modalLoading && modalError" class="text-danger">{{ modalError }}</p>
            <p v-else-if="!modalLoading">No se pudo cargar la información del usuario.</p>
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
              @click="saveChanges"
              :disabled="modalLoading"
            >
              <span
                v-if="modalLoading"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-header {
  background-color: #174384;
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

.btn-close {
  background: transparent
    url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e")
    center / 1em auto no-repeat;
  border: 0;
  border-radius: 0.375rem;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  font-size: 1.25rem;
  padding: 0.5rem;
}

.btn-close:hover {
  opacity: 1;
}

.modal-content {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 550px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-body-custom {
  padding: 25px;
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
}

.user-info-section {
  background-color: #f8f9fa;
  border: 1px solid #e2e6ea;
  color: #343a40;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.user-info-section h6 {
  font-weight: 700;
  margin-bottom: 10px;
  color: #212529;
}

.user-info-section p {
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
  display: block;
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

.modal-footer {
  padding: 15px 25px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background-color: #f8f8f8;
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
</style>
