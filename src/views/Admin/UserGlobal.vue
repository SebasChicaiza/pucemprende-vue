<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import Pagination from '@/components/Admin/PaginationComponent.vue'

import EditGlobalUserModal from '@/components/Admin/Usuarios/EditGlobalUserModal.vue'
import GlobalFilterModal from '@/components/Admin/Usuarios/GlobalFilterModal.vue'

import { useGlobalUsersStore } from '@/stores/globalUsers'

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
    const success = await store.updateUserStatus(userToChangeStatusId, 'Inactivo')
    if (success) {
      await nextTick()
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

const handleErrorModalClose = (msg = '') => {
  showErrorModal.value = false
  errorMessage.value = msg
}

const identificacionSearchQuery = ref('')
const nameSearchQuery = ref('')

const searchResults = ref([])
const activeSearchType = ref(null)

const performIdentificacionSearch = async () => {
  store.error = null
  activeSearchType.value = null
  searchResults.value = []

  if (identificacionSearchQuery.value.trim()) {
    activeSearchType.value = 'identificacion'
    const user = await store.searchUserByIdentificacion(identificacionSearchQuery.value.trim())
    if (user) {
      searchResults.value = [user]
    } else {
      store.error =
        store.error ||
        `No se encontró ningún usuario con la identificación: ${identificacionSearchQuery.value.trim()}`
      searchResults.value = []
    }
  } else {
    activeSearchType.value = null
    store.fetchUsers()
  }
  store.setCurrentPage(1)
}

const performNameSearch = () => {
  store.error = null
  activeSearchType.value = null
  searchResults.value = []

  if (nameSearchQuery.value.trim()) {
    activeSearchType.value = 'name'
    const query = nameSearchQuery.value.trim().toLowerCase()
    searchResults.value = store.users.filter(
      (user) =>
        (user.nombre && user.nombre.toLowerCase().includes(query)) ||
        (user.apellido && user.apellido.toLowerCase().includes(query)),
    )
    if (searchResults.value.length === 0) {
      store.error = `No se encontraron usuarios con el nombre/apellido: ${nameSearchQuery.value.trim()}`
    }
  } else {
    activeSearchType.value = null
    store.fetchUsers()
  }
  store.setCurrentPage(1)
}

watch(nameSearchQuery, (newVal, oldVal) => {
  if (newVal.trim() !== oldVal.trim() || (newVal.trim() === '' && oldVal.trim() !== '')) {
    performNameSearch()
  }
})

watch(identificacionSearchQuery, (newVal, oldVal) => {
  if (newVal.trim() !== oldVal.trim() || (newVal.trim() === '' && oldVal.trim() !== '')) {
    performIdentificacionSearch()
  }
})

const clearSearch = () => {
  identificacionSearchQuery.value = ''
  nameSearchQuery.value = ''
  activeSearchType.value = null
  searchResults.value = []
  store.setCurrentPage(1)
  store.error = null
  store.fetchUsers()
}

const showFilterModal = ref(false)
const currentFilters = computed(() => store.currentFilters)

const openFilterModal = async () => {
  await store.fetchRoles()
  if (store.error) {
    errorMessage.value = store.error
    showErrorModal.value = true
  } else {
    showFilterModal.value = true
  }
}

const handleApplyFilters = (newFilters) => {
  store.setFilters(newFilters)
  store.setCurrentPage(1)
  showFilterModal.value = false
}

const handleClearFilters = () => {
  store.setFilters({ role: '', status: '' })
  store.setCurrentPage(1)
  showFilterModal.value = false
}

// CORRECTED: Pass the full role objects from store.roles
const uniqueRoles = computed(() => {
  return store.roles
})

const statusOptions = ref(['Activo', 'Inactivo'])

const displayedUsers = computed(() => {
  let usersToProcess = []

  if (activeSearchType.value) {
    usersToProcess = searchResults.value
  } else {
    usersToProcess = store.users
  }

  let filtered = usersToProcess.filter((user) => {
    let matches = true

    if (store.currentFilters.role && user.rol !== store.currentFilters.role) {
      matches = false
    }

    if (store.currentFilters.status) {
      const userActualStatus = user.estado_borrado ? 'Inactivo' : 'Activo'
      if (userActualStatus !== store.currentFilters.status) {
        matches = false
      }
    }
    return matches
  })

  store.totalUsersCount = filtered.length

  const startIndex = (store.currentPage - 1) * store.itemsPerPage
  const endIndex = startIndex + store.itemsPerPage
  return filtered.slice(startIndex, endIndex)
})

const totalPages = computed(() => {
  return Math.ceil(store.totalUsersCount / store.itemsPerPage)
})

const handlePageChange = (page) => {
  store.setCurrentPage(page)
}

const showEditUserModal = ref(false)
const editUserInitialData = ref(null)

const availableRolesOptions = computed(() =>
  store.roles.map((role) => ({ id: role.id, nombre: role.nombre })),
)

const editUser = async (user) => {
  editUserInitialData.value = { ...user }
  await store.fetchRoles()
  if (store.error) {
    errorMessage.value = store.error
    showErrorModal.value = true
  } else {
    showEditUserModal.value = true
  }
}

const handleEditUserConfirmed = async (updatedUser) => {
  await nextTick()
  okModalMessage.value = `Usuario ${updatedUser.nombre} ${updatedUser.apellido} actualizado con éxito!`
  showOkModal.value = true
  showEditUserModal.value = false
  clearSearch()
}

const deactivateUser = (userId, userName) => {
  userToChangeStatusId = userId
  userToChangeStatusName = userName
  userToChangeStatusCurrentState = 'Activo'
  modalTitle.value = 'Desactivar Usuario'
  modalMessage.value = `¿Estás seguro de que quieres desactivar a ${userName}? Esto marcará su cuenta como inactiva.`
  modalConfirmText.value = 'Sí, Desactivar'
  universalDeleteModalRef.value.show()
}

const activateUser = (userId, userName) => {
  openConfirmationModal({
    title: 'Activar Usuario',
    message: `¿Estás seguro de que quieres **reactivar** a ${userName}? Esto marcará su cuenta como activa.`,
    confirmText: 'Sí, Activar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      const success = await store.updateUserStatus(userId, 'Activo')
      if (success) {
        await nextTick()
        okModalMessage.value = `Usuario ${userName} reactivado con éxito!`
        showOkModal.value = true
      } else {
        errorMessage.value = store.error || 'Error desconocido al activar el usuario.'
        showErrorModal.value = true
      }
    },
  })
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
                v-model="identificacionSearchQuery"
                @keyup.enter="performIdentificacionSearch"
              />
              <button
                v-if="identificacionSearchQuery"
                @click="clearSearch"
                class="clear-search-button"
              >
                &times;
              </button>
            </div>
            <div class="search-input-wrapper">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Buscar por nombre o apellido"
                class="search-input"
                v-model="nameSearchQuery"
                @input="performNameSearch"
              />
              <button v-if="nameSearchQuery" @click="clearSearch" class="clear-search-button">
                &times;
              </button>
            </div>
            <button class="btn btn-filter" @click="openFilterModal">
              <i class="fas fa-filter"></i> Filtros
            </button>
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
              </div>
            </div>
            <div class="user-identificacion">{{ user.identificacion }}</div>
            <div class="user-email-col">{{ user.email }}</div>
            <div class="user-access">
              <span class="access-badge" :class="user.rol?.replace(/\s/g, '') || ''">{{
                user.rol
              }}</span>
            </div>
            <div
              class="user-estado"
              :class="{
                'status-active': !user.estado_borrado,
                'status-inactive': user.estado_borrado,
              }"
            >
              {{ user.estado_borrado ? 'Inactivo' : 'Activo' }}
            </div>
            <div class="user-actions-buttons">
              <button @click="editUser(user)" class="btn btn-action-edit">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button
                v-if="!user.estado_borrado"
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

  <EditGlobalUserModal
    :show="showEditUserModal"
    :initialData="editUserInitialData"
    :rolesOptions="availableRolesOptions"
    @close="showEditUserModal = false"
    @edit-user="handleEditUserConfirmed"
    @error="handleErrorModalClose"
  />

  <GlobalFilterModal
    :show="showFilterModal"
    :rolesOptions="uniqueRoles"
    :statusOptions="statusOptions"
    :initialFilters="currentFilters"
    @close="showFilterModal = false"
    @apply-filters="handleApplyFilters"
    @clear-filters="handleClearFilters"
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
  flex-wrap: wrap; /* Allow wrapping for responsiveness */
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex-grow: 1; /* Allow inputs to grow */
  min-width: 180px; /* Minimum width for search inputs */
  max-width: 250px; /* Max width for search inputs */
}

.search-input {
  padding: 8px 10px 8px 35px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9em;
  width: 100%; /* Take full width of its wrapper */
  transition: border-color 0.2s;
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
  background-color: #e6ffed;
  color: #28a745;
}
.access-badge.Usuario {
  background-color: #e0f2f7;
  color: #17a2b8;
}
.access-badge.SuperAdmin {
  background-color: #ffe0b2;
  color: #ff8f00;
}
.access-badge.superjuanjo {
  background-color: #e1bee7;
  color: #9c27b0;
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
