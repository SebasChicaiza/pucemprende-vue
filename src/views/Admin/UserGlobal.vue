<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios' // Keep axios for direct calls if needed, though store abstracts it
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import Pagination from '@/components/Admin/PaginationComponent.vue'
// import FilterModal from '@/components/Admin/Usuarios/FilterModal.vue'; // Not needed for global users yet
// import AddUserModal from '@/components/Admin/Usuarios/AddUserModal.vue'; // Not needed for global users yet
import ManageRolesModal from '@/components/Admin/Usuarios/ManageRolesModal.vue'

import { useGlobalUsersStore } from '@/stores/globalUsers' // Import the new global user store

const store = useGlobalUsersStore()
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
let userToChangeStatusId = null
let userToChangeStatusName = null
let userToChangeStatusCurrentState = null

const handleDeleteConfirmed = async () => {
  if (userToChangeStatusId) {
    // For global users, "delete" means deactivating
    const success = await store.updateUserStatus(userToChangeStatusId, 'Inactivo') // Assuming 'Inactivo' is the status for deactivated
    if (success) {
      okModalMessage.value = `Usuario ${userToChangeStatusName} desactivado con éxito!`
      showOkModal.value = true
    } else {
      errorMessage.value = store.error || 'Error desconocido al desactivar el usuario.'
      showErrorModal.value = true
    }
  }
  universalDeleteModalRef.value.hide()
  userToChangeStatusId = null
  userToChangeStatusName = null
  userToChangeStatusCurrentState = null
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

// Search by Identificacion
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

const performSearch = async () => {
  store.error = null // Clear previous errors

  if (!searchQuery.value.trim()) {
    isSearching.value = false
    searchResults.value = []
    store.setCurrentPage(1)
    store.fetchUsers() // Re-fetch all users if search is cleared
    return
  }

  isSearching.value = true
  searchResults.value = [] // Clear previous search results

  const user = await store.searchUserByIdentificacion(searchQuery.value.trim())

  if (user) {
    searchResults.value = [user] // If found, add to search results
  } else {
    searchResults.value = []
    // The store.error will already be set by searchUserByIdentificacion if not found
  }
  store.setCurrentPage(1) // Reset pagination for search results
}

const clearSearch = () => {
  searchQuery.value = ''
  isSearching.value = false
  searchResults.value = []
  store.setCurrentPage(1)
  store.error = null
  store.fetchUsers() // Re-fetch all users when search is cleared
}

// Displayed users for the table (handles search and pagination)
const displayedUsers = computed(() => {
  let usersToPaginate = []

  if (isSearching.value && searchQuery.value.trim()) {
    usersToPaginate = searchResults.value
  } else {
    usersToPaginate = store.users // Use all users from the store
  }

  // Apply any filtering if needed (currently no filters implemented for global users)
  // For now, no filtering logic here, but it would go here if you add it later.

  store.totalUsersCount = usersToPaginate.length // Update total count for pagination

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

// Action buttons (edit/deactivate/activate)
const editUser = (user) => {
  // Logic for editing a global user
  // This will likely open a modal similar to AddUserModal but for global user details
  console.log('Edit user:', user)
  errorMessage.value = 'Funcionalidad de edición de usuario global no implementada aún.'
  showErrorModal.value = true
}

const deactivateUser = (userId, userName) => {
  userToChangeStatusId = userId
  userToChangeStatusName = userName
  userToChangeStatusCurrentState = 'Activo'
  modalTitle.value = 'Desactivar Usuario'
  modalMessage.value = `¿Estás seguro de que quieres desactivar a ${userName}? Podrás reactivarlo más tarde.`
  modalConfirmText.value = 'Sí, Desactivar'
  universalDeleteModalRef.value.show()
}

const activateUser = (userId, userName) => {
  openConfirmationModal({
    title: 'Activar Usuario',
    message: `¿Estás seguro de que quieres **reactivar** a ${userName}?`,
    confirmText: 'Sí, Activar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      const success = await store.updateUserStatus(userId, 'Activo')
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
  store.fetchRoles() // Re-fetch roles
  store.fetchUsers() // Re-fetch users to update roles in table
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
                placeholder="Buscar por identificación"
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="performSearch"
              />
              <button v-if="searchQuery" @click="clearSearch" class="clear-search-button">
                &times;
              </button>
            </div>
            <!-- Filter button can be added later if global user filters are needed -->
            <!-- <button class="btn btn-filter" @click="openFilterModal">
              <i class="fas fa-filter"></i> Filters
            </button> -->
            <button class="btn btn-secondary manage-roles-btn" @click="openManageRolesModal">
              <i class="fas fa-user-tag"></i> Gestionar Roles
            </button>
            <!-- Add user button can be added later if global user creation is needed -->
            <!-- <button class="btn btn-primary add-user-btn" @click="openAddUserModal">
              <i class="fas fa-plus"></i> Añadir usuario
            </button> -->
          </div>
        </div>

        <div class="user-list-header">
          <div class="header-item">Usuario</div>
          <div class="header-item">Identificación</div>
          <div class="header-item">Email</div>
          <div class="header-item">Rol</div>
          <div class="header-item">Estado</div>
          <div class="header-item header-actions">Acciones</div>
        </div>

        <div class="user-list-body">
          <p v-if="!displayedUsers.length && !loading && !store.error" class="no-users-message">
            No hay usuarios registrados con los filtros o búsqueda aplicados.
          </p>
          <p v-if="store.error" class="no-users-message error-message">{{ store.error }}</p>
          <div v-for="user in displayedUsers" :key="user.id" class="user-item">
            <div class="user-info">
              <div class="user-avatar">
                <img src="/src/assets/iconos/UserDefault.webp" alt="User Avatar" />
              </div>
              <div class="user-details">
                <div class="user-name">{{ user.nombre }} {{ user.apellido }}</div>
                <div class="user-email">{{ user.usuario }}</div>
                <!-- Displaying 'usuario' as email for now based on sample -->
              </div>
            </div>
            <div class="user-identificacion">{{ user.identificacion }}</div>
            <div class="user-email-col">{{ user.email }}</div>
            <div class="user-access">
              <span class="access-badge" :class="user.rol.replace(/\s/g, '')">{{ user.rol }}</span>
            </div>
            <div
              class="user-estado"
              :class="{
                'status-active': user.estado && user.estado.toLowerCase() === 'activo',
                'status-inactive':
                  (user.estado && user.estado.toLowerCase() === 'inactivo') || user.estado_borrado,
              }"
            >
              {{ user.estado }}
            </div>
            <div class="user-actions-buttons">
              <button @click="editUser(user)" class="btn btn-action-edit">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button
                v-if="user.estado && user.estado.toLowerCase() === 'activo'"
                @click="deactivateUser(user.id, `${user.nombre} ${user.apellido}`)"
                class="btn btn-action-delete"
              >
                <i class="fas fa-trash"></i>
              </button>
              <button
                v-else
                @click="activateUser(user.id, `${user.nombre} ${user.apellido}`)"
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
  grid-template-columns: 1.5fr 1fr 1.5fr 0.8fr 0.8fr 100px; /* Adjusted columns for global user data */
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
  grid-template-columns: 1.5fr 1fr 1.5fr 0.8fr 0.8fr 100px; /* Adjusted columns */
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

.user-identificacion,
.user-email-col {
  font-size: 0.9em;
  color: #666;
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
.access-badge.Admin {
  /* Assuming 'Admin' is a global role */
  background-color: #e6ffed;
  color: #28a745;
}
.access-badge.Usuario {
  /* Assuming 'Usuario' is a global role */
  background-color: #e0f2f7;
  color: #17a2b8;
}
/* Add more roles as needed */

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
