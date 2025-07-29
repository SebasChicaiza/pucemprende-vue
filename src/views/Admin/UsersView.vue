<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const showErrorModal = ref(false)
const errorMessage = ref('')

const showOkModal = ref(false)
const okModalMessage = ref('')
const showReactivateConfirmModal = ref(false)
const modalTitle = ref('')
const modalMessage = ref('')
const modalWarning = ref('')
const modalConfirmText = ref('')
const universalDeleteModalRef = ref(null)

const handleOkModalClose = () => {
  showOkModal.value = false
}
const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
const handleReactivateConfirm = () => {
  /* Logic to reactivate */ showReactivateConfirmModal.value = false
  okModalMessage.value = 'Evento reactivado con éxito (simulado)!'
  showOkModal.value = true
}
const handleReactivateCancel = () => {
  showReactivateConfirmModal.value = false
}
const handleDeleteConfirmed = () => {
  /* Logic to delete */ universalDeleteModalRef.value.hide()
  okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'
  showOkModal.value = true
}

// Reactive variable to store the user's role ID
const userRoleId = ref(null)

onMounted(() => {
  // Retrieve user data from localStorage
  const userDataString = localStorage.getItem('user')
  if (userDataString) {
    try {
      const userData = JSON.parse(userDataString)
      userRoleId.value = userData.rol_id
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e)
      // Handle error, e.g., set a default role or redirect
      userRoleId.value = null // Or a default role if desired
    }
  } else {
    // Handle case where user data is not in localStorage, e.g., redirect to login
    console.warn('User data not found in localStorage.')
    userRoleId.value = null // Or a default role
  }
})

// Computed property to determine if General System Users option should be shown
const showGeneralUsersOption = computed(() => {
  return userRoleId.value === 8 // Show if rol_id is 8
})

// Computed property to determine if Event Users option should be shown
const showEventUsersOption = computed(() => {
  return userRoleId.value === 8 || userRoleId.value === 1 // Show if rol_id is 8 OR 1
})

const selectUserManagementOption = (option) => {
  if (option === 'general') {
    router.push('/admin/usuarios/generales')
  } else if (option === 'events') {
    router.push('/admin/usuarios/eventos')
  }
}
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="user-management-container">
          <h2 class="section-main-title mb-4">Gestión de Usuarios</h2>
          <p class="section-description mb-5">
            En esta sección, puedes administrar los diferentes tipos de usuarios del sistema.
            Selecciona una opción a continuación para empezar a editar o visualizar la información
            de los usuarios.
          </p>

          <div class="row g-4 justify-content-center">
            <!-- Option 1: General System Users (Conditionally rendered) -->
            <div class="col-12 col-md-6 col-lg-5" v-if="showGeneralUsersOption">
              <div class="user-option-card" @click="selectUserManagementOption('general')">
                <div class="icon-wrapper mb-3">
                  <i class="fas fa-users fa-3x option-icon"></i>
                </div>
                <h3 class="option-title">Editar Usuarios Generales del Sistema</h3>
                <p class="option-description">
                  Administra todos los usuarios registrados en la plataforma, incluyendo su
                  información básica, roles y permisos globales. Ideal para la gestión de
                  administradores, moderadores y usuarios estándar del sistema.
                </p>

                <button class="btn btn-outline-primary mt-3">
                  Gestionar Usuarios <i class="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            <!-- Option 2: Event Users (Conditionally rendered) -->
            <div class="col-12 col-md-6 col-lg-5" v-if="showEventUsersOption">
              <div class="user-option-card" @click="selectUserManagementOption('events')">
                <div class="icon-wrapper mb-3">
                  <i class="fas fa-user-tag fa-3x option-icon"></i>
                </div>
                <h3 class="option-title">Editar Usuarios de Eventos</h3>
                <p class="option-description">
                  Gestiona los usuarios específicamente asociados a eventos, como Staff, Jurado,
                  Miembro, Mentor, Gestor y administradores de eventos. Enfocado en la
                  administración de roles y datos relacionados con eventos específicos.
                </p>
                <button class="btn btn-outline-primary mt-3">
                  Gestionar Usuarios <i class="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            <!-- Message if no options are available -->
            <div v-if="!showGeneralUsersOption && !showEventUsersOption" class="col-12">
              <p class="text-center text-muted">No tienes permisos para gestionar usuarios.</p>
            </div>
          </div>
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

  <ConfirmationModal
    :show="showReactivateConfirmModal"
    title="Reactivar Evento"
    message="¿Estás seguro de que quieres reactivar este evento? El evento volverá a estar visible y activo."
    confirmText="Sí, Reactivar"
    cancelText="Cancelar"
    @confirm="handleReactivateConfirm"
    @cancel="handleReactivateCancel"
  />

  <DeleteModal
    ref="universalDeleteModalRef"
    :title="modalTitle"
    :message="modalMessage"
    :warning="modalWarning"
    :confirmButtonText="modalConfirmText"
    @confirmed="handleDeleteConfirmed"
  />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />
</template>

<style scoped>
.user-management-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 0;
  text-align: center;
}

.section-main-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #174384;
}

.section-description {
  font-size: 1.1rem;
  color: #6c757d;
  line-height: 1.6;
  max-width: 700px;
  margin: 0 auto 2.5rem auto;
}

.user-option-card {
  background-color: #ffffff;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}

.user-option-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #174384;
}

.icon-wrapper {
  color: #174384;
  margin-bottom: 1.5rem;
}

.option-icon {
  font-size: 4rem;
}

.option-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #343a40;
  margin-bottom: 1rem;
}

.option-description {
  font-size: 0.95rem;
  color: #6c757d;
  line-height: 1.5;
  flex-grow: 1;
}

.btn-outline-primary {
  border-color: #174384;
  color: #174384;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  transition: all 0.3s ease;
}

.btn-outline-primary:hover {
  background-color: #174384;
  color: #ffffff;
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .section-main-title {
    font-size: 2rem;
  }
  .section-description {
    font-size: 1rem;
  }
  .user-option-card {
    padding: 2rem;
  }
  .option-title {
    font-size: 1.4rem;
  }
  .option-icon {
    font-size: 3.5rem;
  }
}

@media (max-width: 576px) {
  .user-management-container {
    padding: 1rem;
  }
  .section-main-title {
    font-size: 1.8rem;
  }
  .section-description {
    font-size: 0.9rem;
  }
  .user-option-card {
    padding: 1.5rem;
  }
  .option-title {
    font-size: 1.2rem;
  }
  .option-icon {
    font-size: 3rem;
  }
}
</style>
