<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import FilterModal from '@/components/Admin/Usuarios/FilterModal.vue'
import AddUserModal from '@/components/Admin/Usuarios/AddUserModal.vue'
import Pagination from '@/components/Admin/PaginationComponent.vue'
import ManageRolesModal from '@/components/Admin/Usuarios/ManageRolesModal.vue'
import { useEventUsersStore } from '@/stores/eventUsers'

const store = useEventUsersStore()
const loading = computed(() => store.loading)

const showErrorModal = ref(false)
const errorMessage = ref('')

const showOkModal = ref(false)
const okModalMessage = ref('')
const handleOkModalClose = () => {
  showOkModal.value = false
}

const showConfirmationModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')
let onConfirmCallback = () => {}

const openConfirmationModal = ({ title, message, confirmText, cancelText, onConfirm }) => {
  confirmModalTitle.value = title
  confirmModalMessage.value = message
  confirmModalConfirmText.value = confirmText
  confirmModalCancelText.value = cancelText
  onConfirmCallback = onConfirm
  showConfirmationModal.value = true
}

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false
}

const universalDeleteModalRef = ref(null)
const modalTitle = ref('')
const modalMessage = ref('')
const modalConfirmText = ref('')
let userToDeleteId = null
let userToDeleteName = null

const handleDeleteConfirmed = async () => {
  if (userToDeleteId) {
    const success = await store.deleteUserById(userToDeleteId)
    if (success) {
      okModalMessage.value = `Usuario ${userToDeleteName} desactivado con éxito!`
      showOkModal.value = true
    } else {
      errorMessage.value = store.error || 'Error desconocido al desactivar el usuario.'
      showErrorModal.value = true
    }
  }
  universalDeleteModalRef.value.hide()
  userToDeleteId = null
  userToDeleteName = null
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

const showFilterModal = ref(false)
const currentFilters = ref({
  event: '',
  role: '',
  status: '',
  alumni: '', // NEW: Add alumni to currentFilters
})

const openFilterModal = () => {
  showFilterModal.value = true
}

const handleApplyFilters = (newFilters) => {
  currentFilters.value = { ...newFilters }
  store.setCurrentPage(1)
  showFilterModal.value = false
}

const handleClearFilters = () => {
  currentFilters.value = { event: '', role: '', status: '', alumni: '' } // NEW: Clear alumni filter
  store.setCurrentPage(1)
  showFilterModal.value = false
}

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

const performSearch = async () => {
  store.error = null

  if (!searchQuery.value.trim()) {
    isSearching.value = false
    searchResults.value = []
    store.setCurrentPage(1)
    return
  }

  isSearching.value = true
  searchResults.value = []

  const persona = await store.searchPersonByCedula(searchQuery.value.trim())

  if (persona) {
    const searchedIdentificacion = persona.identificacion.trim()
    searchResults.value = store.users.filter(
      (user) =>
        user.persona &&
        user.persona.identificacion &&
        user.persona.identificacion.trim() === searchedIdentificacion,
    )
    if (searchResults.value.length === 0) {
      store.error =
        'Se encontró la persona, pero no hay asignaciones de usuario para esta cédula en eventos.'
    }
  } else {
    searchResults.value = []
    if (!store.error) {
      store.error = 'No se encontró la persona con la cédula especificada.'
    }
  }
  store.setCurrentPage(1)
}

const clearSearch = () => {
  searchQuery.value = ''
  isSearching.value = false
  searchResults.value = []
  store.setCurrentPage(1)
  store.error = null
}

const displayedUsers = computed(() => {
  let usersToPaginate = []

  if (isSearching.value && searchQuery.value.trim()) {
    usersToPaginate = searchResults.value
  } else {
    usersToPaginate = store.users.filter((user) => {
      let matches = true
      if (currentFilters.value.event && user.evento !== currentFilters.value.event) {
        matches = false
      }
      if (currentFilters.value.role && user.rol !== currentFilters.value.role) {
        matches = false
      }
      if (currentFilters.value.status && user.status !== currentFilters.value.status) {
        matches = false
      }
      // NEW: Apply alumni filter
      if (currentFilters.value.alumni !== '') {
        const alumniFilterValue = currentFilters.value.alumni === 'true' // Convert string to boolean
        if (user.persona && user.persona.alumni !== alumniFilterValue) {
          matches = false
        }
      }
      return matches
    })
  }

  store.totalUsersCount = usersToPaginate.length

  const startIndex = (store.currentPage - 1) * store.itemsPerPage
  const endIndex = startIndex + store.itemsPerPage
  return usersToPaginate.slice(startIndex, endIndex)
})

const totalPages = computed(() => {
  return Math.ceil(store.totalUsersCount / store.itemsPerPage)
})

const handlePageChange = (page) => {
  store.setCurrentPage(page)
}

const uniqueEvents = computed(() => {
  const events = store.users.map((user) => user.evento)
  return [...new Set(events)].sort()
})

const uniqueRoles = computed(() => {
  const roles = store.users.map((user) => user.rol)
  return [...new Set(roles)].sort()
})

const statusOptions = ref(['Activo', 'Inactivo'])

// NEW: Alumni filter options
const alumniOptions = ref([
  { label: 'Sí', value: 'true' },
  { label: 'No', value: 'false' },
])

const showAddUserModal = ref(false)
const addUserModalMode = ref('add')
const addUserInitialData = ref(null)

const openAddUserModal = () => {
  addUserModalMode.value = 'add'
  addUserInitialData.value = null
  showAddUserModal.value = true
}

const handleAddUserConfirmed = async (payload) => {
  const success = await store.addUserToEvent(
    { id: payload.persona_id },
    { id: payload.evento_id },
    { id: payload.rol_id },
  )

  console.log('Add user payload:', payload)

  if (success) {
    const personName = payload.person_name || 'Nuevo Usuario'
    const eventName = payload.event_name || 'Evento'
    const roleName = payload.role_name || 'Rol'

    okModalMessage.value = `Usuario ${personName} asignado a ${eventName} como ${roleName} con éxito!`
    showOkModal.value = true
    store.setCurrentPage(1)
    clearSearch()
  } else {
    errorMessage.value = store.error || 'Error desconocido al asignar usuario.'
    showErrorModal.value = true
  }
}

const handleEditUserConfirmed = async ({ id, person, event, role }) => {
  const success = await store.editUserAssignment(id, person, event, role)
  if (success) {
    okModalMessage.value = `Asignación de ${person.nombre} ${person.apellido} actualizada con éxito!`
    showOkModal.value = true
    clearSearch()
  } else {
    errorMessage.value = store.error || 'Error desconocido al actualizar la asignación.'
    showErrorModal.value = true
  }
}

const editUser = (user) => {
  addUserModalMode.value = 'edit'
  addUserInitialData.value = {
    id: user.id,
    persona_id: user.persona.id,
    evento_id: user.evento_id,
    rol_id: user.rol_id,
  }
  showAddUserModal.value = true
}

const deleteUser = (userId, userName) => {
  userToDeleteId = userId
  userToDeleteName = userName
  modalTitle.value = 'Eliminar Usuario'
  modalMessage.value = `¿Estás seguro de que quieres eliminar a ${userName} de este evento?, Esta accion no se puede deshacer.`
  modalConfirmText.value = 'Sí, Eliminar'
  universalDeleteModalRef.value.show()
}

const activateUser = (userId, userName) => {
  openConfirmationModal({
    title: 'Activar Usuario',
    message: `¿Estás seguro de que quieres **reactivar** a ${userName} en este evento?`,
    confirmText: 'Sí, Activar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      const success = await store.activateUserById(userId)
      if (success) {
        okModalMessage.value = `Usuario ${userName} reactivado con éxito!`
        showOkModal.value = true
      } else {
        errorMessage.value = store.error || 'Error desconocido al activar el usuario.'
        showErrorModal.value = true
      }
    },
  })
}

const showManageRolesModal = ref(false)
const openManageRolesModal = () => {
  showManageRolesModal.value = true
  store.fetchRoles().then((success) => {
    if (!success) {
      errorMessage.value = store.error || 'Error al cargar roles para gestión.'
      showErrorModal.value = true
    }
  })
}

const handleRoleOperationSuccess = ({ message }) => {
  okModalMessage.value = message
  showOkModal.value = true
  store.fetchRoles()
  store.fetchUsers()
}

const handleRoleOperationError = ({ message }) => {
  errorMessage.value = message
  showErrorModal.value = true
}

onMounted(() => {
  store.fetchUsers().then((success) => {
    if (!success) {
      errorMessage.value = store.error
      showErrorModal.value = true
    }
  })
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="users-header">
          <div class="total-users">
            Todos los usuarios <span>{{ store.totalUsersCount }}</span>
          </div>
          <div class="users-actions">
            <div class="search-input-wrapper">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Buscar por cédula"
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="performSearch"
              />
              <button v-if="searchQuery" @click="clearSearch" class="clear-search-button">
                &times;
              </button>
            </div>
            <button class="btn btn-filter" @click="openFilterModal">
              <i class="fas fa-filter"></i> Filters
            </button>
            <button class="btn btn-secondary manage-roles-btn" @click="openManageRolesModal">
              <i class="fas fa-user-tag"></i> Gestionar Roles
            </button>
            <button class="btn btn-primary add-user-btn" @click="openAddUserModal">
              <i class="fas fa-plus"></i> Añadir usuario
            </button>
          </div>
        </div>

        <div class="user-list-header">
          <div class="header-item">Usuario</div>
          <div class="header-item">Rol en el evento</div>
          <div class="header-item">Evento</div>
          <div class="header-item">Alumni</div>
          <div class="header-item">Estado</div>
          <div class="header-item header-actions">Acciones</div>
        </div>

        <div class="user-list-body">
          <p v-if="!displayedUsers.length && !loading && !store.error" class="no-users-message">
            No hay usuarios registrados para eventos con los filtros o búsqueda aplicados.
          </p>
          <p v-if="store.error" class="no-users-message error-message">{{ store.error }}</p>
          <div v-for="user in displayedUsers" :key="user.id" class="user-item">
            <div class="user-info">
              <div class="user-avatar">
                <img src="/src/assets/iconos/UserDefault.webp" alt="User Avatar" />
              </div>
              <div class="user-details">
                <div class="user-name">{{ user.persona.nombre }} {{ user.persona.apellido }}</div>
                <div class="user-email">{{ user.persona.identificacion }}</div>
              </div>
            </div>
            <div class="user-access">
              <span class="access-badge" :class="user.rol.replace(/\s/g, '')">{{ user.rol }}</span>
            </div>
            <div class="user-evento">{{ user.evento }}</div>
            <div class="user-alumni">
              <span
                :class="{ 'alumni-yes': user.persona.alumni, 'alumni-no': !user.persona.alumni }"
              >
                {{ user.persona.alumni ? 'Sí' : 'No' }}
              </span>
            </div>
            <div
              class="user-estado"
              :class="{
                'status-active': user.status === 'Activo',
                'status-inactive': user.status === 'Inactivo',
              }"
            >
              {{ user.status }}
            </div>
            <div class="user-actions-buttons">
              <button @click="editUser(user)" class="btn btn-action-edit">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button
                v-if="user.status === 'Activo'"
                @click="deleteUser(user.id, `${user.persona.nombre} ${user.persona.apellido}`)"
                class="btn btn-action-delete"
              >
                <i class="fas fa-trash"></i>
              </button>
              <button
                v-else
                @click="activateUser(user.id, `${user.persona.nombre} ${user.persona.apellido}`)"
                class="btn btn-action-activate"
              >
                <i class="fas fa-check"></i>
              </button>
            </div>
          </div>
        </div>
        <Pagination
          :currentPage="store.currentPage"
          :totalPages="totalPages"
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
    :confirmButtonText="modalConfirmText"
    @confirmed="handleDeleteConfirmed"
  />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />

  <FilterModal
    :show="showFilterModal"
    :eventsOptions="uniqueEvents"
    :rolesOptions="uniqueRoles"
    :statusOptions="statusOptions"
    :alumniOptions="alumniOptions"
    :initialFilters="currentFilters"
    @close="showFilterModal = false"
    @apply-filters="handleApplyFilters"
    @clear-filters="handleClearFilters"
  />

  <AddUserModal
    :show="showAddUserModal"
    :mode="addUserModalMode"
    :initialData="addUserInitialData"
    @close="showAddUserModal = false"
    @add-user="handleAddUserConfirmed"
    @edit-user="handleEditUserConfirmed"
  />

  <ManageRolesModal
    :show="showManageRolesModal"
    :roles="store.roles"
    @close="showManageRolesModal = false"
    @success="handleRoleOperationSuccess"
    @error="handleRoleOperationError"
  />
</template>

<style scoped>
/* General Layout */
.d-flex {
  display: flex;
}

.flex-grow-1 {
  flex-grow: 1;
}

.flex-column {
  flex-direction: column;
}

.p-4 {
  padding: 1.5rem;
}

.overflow-y-scroll {
  overflow-y: auto;
}

/* User List Header */
.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.total-users {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.total-users span {
  color: #888;
  font-weight: 400;
  margin-left: 5px;
}

.users-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 10px 8px 35px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9em;
  width: 200px;
  transition: border-color 0.2s;
  flex-grow: 1;
}

.search-input:focus {
  border-color: #007bff;
  outline: none;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  pointer-events: none;
}

.clear-search-button {
  background: none;
  border: none;
  font-size: 1.2em;
  color: #999;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.clear-search-button:hover {
  color: #666;
}

.btn-filter {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-filter:hover {
  background-color: #e0e0e0;
}

.manage-roles-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.manage-roles-btn:hover {
  background-color: #5a6268;
}

.add-user-btn {
  background-color: #174384;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.add-user-btn:hover {
  background-color: #123466;
}

/* User List Grid Header */
.user-list-header {
  display: grid;
  grid-template-columns: 1.8fr 1.2fr 1.5fr 0.8fr 0.8fr 100px; /* Added 0.8fr for Alumni */
  gap: 10px;
  padding: 12px 15px;
  background-color: #234e8f;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  color: #fff;
  font-size: 0.9em;
  border-radius: 8px 8px 0 0;
}

.header-actions {
  text-align: right;
}

/* User List Body */
.user-list-body {
  background-color: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.user-item {
  display: grid;
  grid-template-columns: 1.8fr 1.2fr 1.5fr 0.8fr 0.8fr 100px; /* Added 0.8fr for Alumni */
  gap: 10px;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.user-item:last-child {
  border-bottom: none;
}

.user-item:hover {
  background-color: #f9f9f9;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e0e0e0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-weight: 500;
  color: #333;
}

.user-email {
  font-size: 0.85em;
  color: #888;
}

.user-access {
  display: flex;
  gap: 5px;
}

.access-badge {
  background-color: #e0f2f7;
  color: #007bff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 500;
  white-space: nowrap;
}
.access-badge.AdminEvento {
  background-color: #e6ffed;
  color: #28a745;
}
.access-badge.Jurado {
  background-color: #fff3cd;
  color: #ffc107;
}
.access-badge.Miembro {
  background-color: #e0f2f7;
  color: #17a2b8;
}
.access-badge.Gestor {
  background-color: #d1ecf1;
  color: #0c5460;
}
.access-badge.Mentor {
  background-color: #e2e3e5;
  color: #383d41;
}
.access-badge.Staff {
  background-color: #fdeded;
  color: #721c24;
}

.user-evento {
  font-size: 0.9em;
  color: #666;
}

/* Alumni Styling - Centered */
.user-alumni {
  font-size: 0.9em;
  font-weight: 500;
  text-align: left; /* Centering the content */
}

.user-alumni .alumni-yes {
  color: #28a745;
  background-color: #e6ffed;
  padding: 4px 8px;
  border-radius: 4px;
}

.user-alumni .alumni-no {
  color: #dc3545;
  background-color: #fdeded;
  padding: 4px 8px;
  border-radius: 4px;
}

.user-estado {
  font-size: 0.9em;
  font-weight: 500;
}

.status-active {
  color: #28a745;
}

.status-inactive {
  color: #dc3545;
}

.user-actions-buttons {
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-action-edit,
.btn-action-delete,
.btn-action-activate {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1em;
  padding: 5px;
  border-radius: 4px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.btn-action-edit:hover {
  background-color: #eaf5ff;
  color: #0056b3;
}

.btn-action-delete {
  color: #dc3545;
}

.btn-action-delete:hover {
  background-color: #ffebeb;
  color: #a71d2a;
}

.btn-action-activate {
  color: #28a745;
}

.btn-action-activate:hover {
  background-color: #e6ffed;
  color: #1e7e34;
}

.no-users-message {
  padding: 20px;
  text-align: center;
  color: #888;
}
.no-users-message.error-message {
  color: #dc3545;
  font-weight: bold;
}
</style>
