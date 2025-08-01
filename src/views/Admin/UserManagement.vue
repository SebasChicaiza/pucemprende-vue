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
import defaultAvatarImage from '@/assets/iconos/UserDefault.webp'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const showErrorModal = ref(false)
const errorMessage = ref('')

// --- Existing Modals State ---
const showOkModal = ref(false)
const okModalMessage = ref('')
const universalDeleteModalRef = ref(null)

// --- Dynamic Confirmation Modal State ---
const showConfirmationModal = ref(false) // Controls visibility of the dynamic modal
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

// Stores the callback function to execute when the dynamic confirmation is accepted
let onConfirmCallback = () => {}

// --- Profile specific state ---
const saving = ref(false)
const sendingVerification = ref(false)
const defaultAvatar = ref(defaultAvatarImage)

const userProfile = ref({
  id: null,
  name: '',
  email: '',
  avatar: null,
  email_verified_at: null,
  created_at: null,
  updated_at: null,
})

// Datos extendidos de la persona desde la API
const personaData = ref({
  id: null,
  nombre: '',
  apellido: '',
  telefono: '',
  identificacion: '',
  alumni: null,
  genero: '',
  creado_en: null,
  actualizado_en: null,
  estado_borrado: null,
  borrado_en: null,
})

const userStats = ref({
  projectsCount: 0,
  eventsCount: 0,
  teamsCount: 0,
})

// Placeholder functions for other modals
const handleOkModalClose = () => {
  showOkModal.value = false
}
const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
const handleDeleteConfirmed = () => {
  universalDeleteModalRef.value.hide()
  okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'
  showOkModal.value = true
}

// --- Handlers for the dynamic ConfirmationModal's events ---
const handleDynamicConfirm = () => {
  onConfirmCallback() // Execute the stored callback
  showConfirmationModal.value = false // Hide the modal after confirmation
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false // Just hide the modal on cancel
}

// --- Profile methods ---
const checkAuth = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return false
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Token inválido')
    }

    const userData = await response.json()
    userProfile.value = userData

    // Cargar datos de persona primero, luego estadísticas
    await loadPersonaData()

    // Cargar estadísticas solo si tenemos el ID del usuario
    if (userProfile.value.id) {
      await loadUserStats()
    }

    return true
  } catch (error) {
    console.error('Error verificando autenticación:', error)
    localStorage.removeItem('token')
    router.push('/login')
    return false
  }
}

const loadPersonaData = async () => {
  try {
    const token = localStorage.getItem('token')

    if (userProfile.value.id) {
      const personaResponse = await fetch(
        `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userProfile.value.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (personaResponse.ok) {
        const persona = await personaResponse.json()
        personaData.value = persona
      } else {
        console.warn('No se encontraron datos de persona para este usuario')
      }
    }
  } catch (error) {
    console.error('Error cargando datos de persona:', error)
  }
}

const loadUserStats = async () => {
  try {
    const token = localStorage.getItem('token')

    // Usar la API específica de estadísticas del usuario
    const statsResponse = await fetch(
      `${import.meta.env.VITE_URL_BACKEND}/api/usuario/estadisticas/${userProfile.value.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    )

    if (statsResponse.ok) {
      const response = await statsResponse.json()

      if (response.success && response.data) {
        userStats.value = {
          projectsCount: response.data.total_proyectos || 0,
          eventsCount: response.data.total_eventos || 0,
          teamsCount: response.data.total_equipos || 0,
        }

        console.log('Estadísticas cargadas:', userStats.value)
      } else {
        console.warn('No se pudieron obtener las estadísticas:', response.message)
        userStats.value = {
          projectsCount: 0,
          eventsCount: 0,
          teamsCount: 0,
        }
      }
    } else {
      console.warn('Error en la respuesta del servidor para estadísticas')
      userStats.value = {
        projectsCount: 0,
        eventsCount: 0,
        teamsCount: 0,
      }
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
    // Fallback: mantener valores en cero
    userStats.value = {
      projectsCount: 0,
      eventsCount: 0,
      teamsCount: 0,
    }
  }
}

const copyProfileLink = () => {
  const profileUrl = `${window.location.origin}/profile/${userProfile.value.id}`
  navigator.clipboard.writeText(profileUrl)
  okModalMessage.value = 'Enlace del perfil copiado!'
  showOkModal.value = true
}

// Nueva función para cerrar sesión
const logout = () => {
  confirmModalTitle.value = 'Cerrar Sesión'
  confirmModalMessage.value = '¿Estás seguro que deseas cerrar sesión?'
  confirmModalConfirmText.value = 'Cerrar Sesión'
  confirmModalCancelText.value = 'Cancelar'

  onConfirmCallback = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('eventos')
    localStorage.removeItem('proyectos')
    router.push('/login')
  }

  showConfirmationModal.value = true
}

// Remover funciones de edición
// const replacePhoto = () => { ... }
// const removePhoto = () => { ... }
// const handlePhotoChange = (event) => { ... }
// const saveChanges = async () => { ... }
// const cancelChanges = () => { ... }

const resendVerification = async () => {
  sendingVerification.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `${import.meta.env.VITE_URL_BACKEND}/api/email/verification-notification`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )

    if (response.ok) {
      okModalMessage.value = 'Email de verificación enviado!'
      showOkModal.value = true
    } else {
      throw new Error('Error enviando email')
    }
  } catch (error) {
    console.error('Error resending verification:', error)
    errorMessage.value = 'Error enviando email de verificación'
    showErrorModal.value = true
  } finally {
    sendingVerification.value = false
  }
}

// Computed para mostrar el nombre completo
const fullName = computed(() => {
  if (personaData.value.nombre && personaData.value.apellido) {
    return `${personaData.value.nombre} ${personaData.value.apellido}`
  }
  return userProfile.value.name || 'Usuario'
})

// Computed para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return 'No disponible'
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Initialize on mount
onMounted(async () => {
  loading.value = true
  await checkAuth()
  loading.value = false
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <!-- Contenido del perfil -->
        <div class="profile-container" v-if="!loading">
          <div class="profile-card">
            <!-- Header con avatar y acciones -->
            <div class="profile-header">
              <div class="avatar-section">
                <img
                  :src="userProfile.avatar || defaultAvatar"
                  :alt="fullName"
                  class="profile-avatar"
                />
                <div class="verification-badge" v-if="userProfile.email_verified_at">
                  <i class="fas fa-check-circle"></i>
                </div>
              </div>

              <div class="header-actions">
                <button class="btn-logout" @click="logout">
                  <i class="fas fa-sign-out-alt"></i>
                  Cerrar Sesión
                </button>
              </div>
            </div>

            <!-- Información del usuario -->
            <div class="profile-info">
              <h1 class="user-name">{{ fullName }}</h1>
              <p class="user-email">{{ userProfile.email }}</p>
              <p v-if="userProfile.email_verified_at" class="verification-status verified">
                <i class="fas fa-check-circle"></i>
                Email verificado
              </p>
              <p v-else class="verification-status unverified">
                <i class="fas fa-exclamation-circle"></i>
                Email no verificado
              </p>

              <!-- Datos detallados de la persona -->
              <div class="user-details" v-if="personaData.id">
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-label">Nombre:</span>
                    <span class="detail-value">{{ personaData.nombre || 'No disponible' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Apellido:</span>
                    <span class="detail-value">{{ personaData.apellido || 'No disponible' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Identificación:</span>
                    <span class="detail-value">{{
                      personaData.identificacion || 'No disponible'
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">{{ personaData.telefono || 'No disponible' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Género:</span>
                    <span class="detail-value">{{
                      personaData.genero === 'M'
                        ? 'Masculino'
                        : personaData.genero === 'F'
                          ? 'Femenino'
                          : 'No especificado'
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Alumni:</span>
                    <span
                      class="detail-value badge"
                      :class="personaData.alumni ? 'badge-success' : 'badge-secondary'"
                    >
                      {{ personaData.alumni ? 'Sí' : 'No' }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Miembro desde:</span>
                    <span class="detail-value">{{ formatDate(personaData.creado_en) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Última actualización:</span>
                    <span class="detail-value">{{ formatDate(personaData.actualizado_en) }}</span>
                  </div>
                </div>
              </div>

              <!-- Mensaje si no hay datos de persona -->
              <div
                v-else
                class="no-persona-data"
                style="
                  padding: 16px;
                  background: #fff3cd;
                  border: 1px solid #ffeaa7;
                  border-radius: 8px;
                  margin: 16px 0;
                "
              >
                <p>
                  <i class="fas fa-exclamation-triangle"></i> No se encontraron datos adicionales de
                  persona para este usuario.
                </p>
              </div>

              <div style="margin: 20px 0; text-align: center; color: #6b7280; font-weight: 500">
                Has participado en:
              </div>

              <!-- Estadísticas del usuario -->
              <div class="user-stats">
                <div class="stat">
                  <span class="stat-number">{{ userStats.projectsCount || 0 }}</span>
                  <span class="stat-label">Proyectos</span>
                </div>
                <div class="stat">
                  <span class="stat-number">{{ userStats.eventsCount || 0 }}</span>
                  <span class="stat-label">Eventos</span>
                </div>
                <div class="stat">
                  <span class="stat-number">{{ userStats.teamsCount || 0 }}</span>
                  <span class="stat-label">Equipos</span>
                </div>
              </div>

              <!-- Sección de verificación de email si no está verificado -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modales existentes -->
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

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />
</template>

<style scoped>
/* Profile Content Styles */
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  justify-content: center;
}

.profile-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 700px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.avatar-section {
  position: relative;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e5e7eb;
}

.verification-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #3b82f6;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
}

.verification-badge i {
  color: white;
  font-size: 12px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.btn-primary {
  padding: 8px 16px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.profile-info {
  margin-bottom: 32px;
  text-align: center;
}

.user-name {
  font-size: 32px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.user-email {
  color: #6b7280;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.user-stats {
  display: flex;
  gap: 32px;
  margin-top: 24px;
  justify-content: center;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #111827;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  color: #111827;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-with-icon {
  position: relative;
}

.input-with-icon i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.input-with-icon .form-input {
  padding-left: 40px;
}

.photo-upload {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
}

.current-photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #d1d5db;
}

.upload-actions {
  display: flex;
  gap: 8px;
}

.btn-replace,
.btn-remove {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-remove {
  color: #dc2626;
  border-color: #dc2626;
}

.hidden-input {
  display: none;
}

.form-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-save {
  padding: 10px 20px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verification-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin: 8px 0;
  justify-content: center;
}

.verification-status.verified {
  color: #10b981;
}

.verification-status.unverified {
  color: #f59e0b;
}

.form-help {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  text-align: center;
}

.verification-section {
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  text-align: center;
}

.verification-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin: 8px 0;
  justify-content: center;
}

.btn-verify {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-primary:hover,
.btn-replace:hover {
  background: #1f2937;
}

.btn-remove:hover {
  background: #fee2e2;
}

.user-details {
  margin: 24px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.detail-value {
  color: #111827;
  font-size: 14px;
  text-align: right;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-logout {
  padding: 8px 16px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
/* Responsive para detalles */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .detail-value {
    text-align: left;
  }
}
</style>
