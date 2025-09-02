<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
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

// CONFIGURACIÓN DE CACHÉ Y AUTO-ACTUALIZACIÓN
const CACHE_KEYS = {
  USER_PROFILE: 'user_profile_cache',
  PERSONA_DATA: 'persona_data_cache',
  USER_STATS: 'user_stats_cache'
}

const CACHE_DURATION = {
  USER_PROFILE: 30 * 60 * 1000, // 30 minutos
  PERSONA_DATA: 30 * 60 * 1000, // 30 minutos
  USER_STATS: 30 * 60 * 1000,   // 30 minutos
}

// Variables para el auto-refresh
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutos
let refreshInterval = null

// FUNCIONES DE CACHÉ
const saveToCache = (key, data) => {
  try {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      userId: userProfile.value.id
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
    console.log(`Datos guardados en caché: ${key}`)
  } catch (error) {
    console.warn('Error guardando en caché:', error)
  }
}

const getFromCache = (key, maxAge = 30 * 60 * 1000) => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) {
      console.log(`No hay datos en caché para: ${key}`)
      return null
    }

    const cacheData = JSON.parse(cached)
    const now = Date.now()

    if (now - cacheData.timestamp > maxAge) {
      console.log(`Caché expirado para: ${key}`)
      localStorage.removeItem(key)
      return null
    }

    if (userProfile.value.id && cacheData.userId !== userProfile.value.id) {
      console.log(`Usuario diferente, invalidando caché: ${key}`)
      localStorage.removeItem(key)
      return null
    }

    console.log(`Datos obtenidos del caché: ${key}`)
    return cacheData.data
  } catch (error) {
    console.warn('Error leyendo caché:', error)
    localStorage.removeItem(key)
    return null
  }
}

const clearUserCache = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
  console.log('Caché de usuario limpiado')
}

// FUNCIONES DE AUTO-ACTUALIZACIÓN
const startAutoRefresh = () => {
  console.log('Iniciando auto-actualización cada 30 minutos')

  // Limpiar interval anterior si existe
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Establecer nuevo interval
  refreshInterval = setInterval(async () => {
    console.log('Ejecutando auto-actualización de datos...')
    await refreshUserData(true) // true = es auto-refresh
  }, AUTO_REFRESH_INTERVAL)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
    console.log('Auto-actualización detenida')
  }
}

const showErrorModal = ref(false)
const errorMessage = ref('')

// --- Existing Modals State ---
const showOkModal = ref(false)
const okModalMessage = ref('')
const universalDeleteModalRef = ref(null)

// --- Dynamic Confirmation Modal State ---
const showConfirmationModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

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

// FUNCIONES CON CACHÉ
const checkAuth = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return false
  }

  try {
    // Intentar obtener del caché primero
    const cachedProfile = getFromCache(CACHE_KEYS.USER_PROFILE, CACHE_DURATION.USER_PROFILE)

    if (cachedProfile) {
      userProfile.value = cachedProfile
      console.log('Perfil de usuario cargado desde caché')

      // Cargar datos relacionados (también con caché)
      await loadPersonaData()
      if (userProfile.value.id) {
        await loadUserStats()
      }
      return true
    }

    // Si no hay caché, hacer petición a la API
    console.log('Cargando perfil desde API...')
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

    // Guardar en caché
    saveToCache(CACHE_KEYS.USER_PROFILE, userData)

    // Cargar datos relacionados
    await loadPersonaData()
    if (userProfile.value.id) {
      await loadUserStats()
    }

    return true
  } catch (error) {
    console.error('Error verificando autenticación:', error)
    clearUserCache() // Limpiar caché en caso de error
    localStorage.removeItem('token')
    router.push('/login')
    return false
  }
}

const loadPersonaData = async () => {
  try {
    // Intentar obtener del caché primero
    const cachedPersona = getFromCache(CACHE_KEYS.PERSONA_DATA, CACHE_DURATION.PERSONA_DATA)

    if (cachedPersona) {
      personaData.value = cachedPersona
      console.log('Datos de persona cargados desde caché')
      return
    }

    // Si no hay caché y tenemos ID de usuario, hacer petición
    if (userProfile.value.id) {
      console.log('Cargando datos de persona desde API...')
      const token = localStorage.getItem('token')

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

        // Guardar en caché
        saveToCache(CACHE_KEYS.PERSONA_DATA, persona)
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
    // Intentar obtener del caché primero
    const cachedStats = getFromCache(CACHE_KEYS.USER_STATS, CACHE_DURATION.USER_STATS)

    if (cachedStats) {
      userStats.value = cachedStats
      console.log('Estadísticas cargadas desde caché')
      return
    }

    // Si no hay caché, hacer petición a la API
    console.log('Cargando estadísticas desde API...')
    const token = localStorage.getItem('token')

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
        const stats = {
          projectsCount: response.data.total_proyectos || 0,
          eventsCount: response.data.total_eventos || 0,
          teamsCount: response.data.total_equipos || 0,
        }

        userStats.value = stats

        // Guardar en caché
        saveToCache(CACHE_KEYS.USER_STATS, stats)

        console.log('Estadísticas cargadas y guardadas en caché:', stats)
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
    userStats.value = {
      projectsCount: 0,
      eventsCount: 0,
      teamsCount: 0,
    }
  }
}

// FUNCIÓN MODIFICADA PARA AUTO-ACTUALIZACIÓN
const refreshUserData = async (isAutoRefresh = false) => {
  if (!isAutoRefresh) {
    loading.value = true
  }

  console.log(isAutoRefresh ? 'Auto-actualización ejecutándose...' : 'Actualización manual ejecutándose...')

  // Limpiar caché
  clearUserCache()

  // Recargar datos
  await checkAuth()

  if (!isAutoRefresh) {
    loading.value = false
    okModalMessage.value = 'Datos actualizados correctamente'
    showOkModal.value = true
  } else {
    console.log('Auto-actualización completada silenciosamente')
  }
}

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

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false
}

const copyProfileLink = () => {
  const profileUrl = `${window.location.origin}/profile/${userProfile.value.id}`
  navigator.clipboard.writeText(profileUrl)
  okModalMessage.value = 'Enlace del perfil copiado!'
  showOkModal.value = true
}

const logout = () => {
  confirmModalTitle.value = 'Cerrar Sesión'
  confirmModalMessage.value = '¿Estás seguro que deseas cerrar sesión?'
  confirmModalConfirmText.value = 'Cerrar Sesión'
  confirmModalCancelText.value = 'Cancelar'

  onConfirmCallback = () => {
    // Detener auto-refresh antes de logout
    stopAutoRefresh()

    // Limpiar TODO el almacenamiento local
    clearUserCache()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('eventos')
    localStorage.removeItem('proyectos')
    router.push('/login')
  }

  showConfirmationModal.value = true
}

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

const fullName = computed(() => {
  if (personaData.value.nombre && personaData.value.apellido) {
    return `${personaData.value.nombre} ${personaData.value.apellido}`
  }
  return userProfile.value.name || 'Usuario'
})

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

  // Iniciar auto-actualización después de la carga inicial
  startAutoRefresh()
})

// Cleanup on unmount
onUnmounted(() => {
  stopAutoRefresh()
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
/* Resto de estilos sin cambios */
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
  gap: 16px;
  align-items: flex-end;
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

  .header-actions {
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
}
</style>
