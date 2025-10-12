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
  USER_STATS: 'user_stats_cache',
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
const userProfile = ref({
  id: null,
  name: '',
  email: '',
  avatar: null,
  email_verified_at: null,
  created_at: null,
  updated_at: null,
})

const saveToCache = (key, data) => {
  try {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      userId: userProfile.value.id,
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Error guardando en caché:', error)
  }
}

const getFromCache = (key, maxAge = 30 * 60 * 1000) => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const cacheData = JSON.parse(cached)
    const now = Date.now()

    if (now - cacheData.timestamp > maxAge) {
      localStorage.removeItem(key)
      return null
    }

    if (userProfile.value.id && cacheData.userId !== userProfile.value.id) {
      localStorage.removeItem(key)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.warn('Error leyendo caché:', error)
    localStorage.removeItem(key)
    return null
  }
}

const clearUserCache = () => {
  Object.values(CACHE_KEYS).forEach((key) => localStorage.removeItem(key))
}

// FUNCIONES DE AUTO-ACTUALIZACIÓN
const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(async () => {
    await refreshUserData(true) // auto-refresh silencioso
  }, AUTO_REFRESH_INTERVAL)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
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

// Listas y loaders de participación
const loadingMyEvents = ref(false)
const loadingMyProjects = ref(false)
const loadingMyTeams = ref(false)

const myEvents = ref([])    // [{ id, nombre, fecha_inicio, fecha_fin, ... }]
const myProjects = ref([])  // [{ id, titulo, descripcion, estado, ... }]
const myTeams = ref([])     // [{ equipo_id/id, nombre, evento_nombre, proyecto_titulo, ... }]

// Estado de pestañas y “loaded” por recurso
const activeTab = ref('eventos')
const loaded = ref({ eventos: false, proyectos: false, equipos: false })

// Carga consolidada (rápida) de participación
const loadMyParticipaciones = async () => {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/me/participaciones`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    myEvents.value = Array.isArray(data?.eventos) ? data.eventos : []
    myProjects.value = Array.isArray(data?.proyectos) ? data.proyectos : []
    myTeams.value = Array.isArray(data?.equipos) ? data.equipos : []
    loaded.value = { eventos: true, proyectos: true, equipos: true }
  } catch (err) {
    // Si falla, se hará lazy por pestaña
    console.warn('Fallo /me/participaciones, se usará lazy por pestaña:', err.response?.data || err.message)
  }
}

// Cargadores individuales (APIs “me/*”)
const loadMyEvents = async () => {
  if (loaded.value.eventos) return
  loadingMyEvents.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/me/eventos`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    myEvents.value = Array.isArray(data) ? data : (data?.data ?? [])
    loaded.value.eventos = true
  } catch (err) {
    console.error('Error cargando mis eventos:', err.response?.data || err.message)
    myEvents.value = []
  } finally {
    loadingMyEvents.value = false
  }
}

const loadMyProjects = async () => {
  if (loaded.value.proyectos) return
  loadingMyProjects.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/me/proyectos`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    myProjects.value = Array.isArray(data) ? data : (data?.data ?? [])
    loaded.value.proyectos = true
  } catch (err) {
    console.error('Error cargando mis proyectos:', err.response?.data || err.message)
    myProjects.value = []
  } finally {
    loadingMyProjects.value = false
  }
}

const loadMyTeams = async () => {
  if (loaded.value.equipos) return
  loadingMyTeams.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/me/equipos`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    myTeams.value = Array.isArray(data) ? data : (data?.data ?? [])
    loaded.value.equipos = true
  } catch (err) {
    console.error('Error cargando mis equipos:', err.response?.data || err.message)
    myTeams.value = []
  } finally {
    loadingMyTeams.value = false
  }
}

// Cambiar de pestaña y hacer lazy load si falta
const selectTab = async (tab) => {
  activeTab.value = tab
  if (tab === 'eventos') await loadMyEvents()
  if (tab === 'proyectos') await loadMyProjects()
  if (tab === 'equipos') await loadMyTeams()
}

// FUNCIONES CON CACHÉ
const checkAuth = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return false
  }

  try {
    const cachedProfile = getFromCache(CACHE_KEYS.USER_PROFILE, CACHE_DURATION.USER_PROFILE)

    if (cachedProfile) {
      userProfile.value = cachedProfile
      await loadPersonaData()
      if (userProfile.value.id) await loadUserStats()
      return true
    }

    const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) throw new Error('Token inválido')

    const userData = await response.json()
    userProfile.value = userData
    saveToCache(CACHE_KEYS.USER_PROFILE, userData)

    await loadPersonaData()
    if (userProfile.value.id) await loadUserStats()

    return true
  } catch (error) {
    console.error('Error verificando autenticación:', error)
    clearUserCache()
    localStorage.removeItem('token')
    router.push('/login')
    return false
  }
}

// const personaData = ref({
//   id: null,
//   nombre: '',
//   apellido: '',
//   telefono: '',
//   identificacion: '',
//   alumni: null,
//   genero: '',
//   creado_en: null,
//   actualizado_en: null,
//   estado_borrado: null,
//   borrado_en: null,
// })

const loadPersonaData = async () => {
  try {
    const cachedPersona = getFromCache(CACHE_KEYS.PERSONA_DATA, CACHE_DURATION.PERSONA_DATA)
    if (cachedPersona) {
      personaData.value = cachedPersona
      return
    }

    if (userProfile.value.id) {
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
    const cachedStats = getFromCache(CACHE_KEYS.USER_STATS, CACHE_DURATION.USER_STATS)
    if (cachedStats) {
      userStats.value = cachedStats
      return
    }

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
        saveToCache(CACHE_KEYS.USER_STATS, stats)
      } else {
        userStats.value = { projectsCount: 0, eventsCount: 0, teamsCount: 0 }
      }
    } else {
      userStats.value = { projectsCount: 0, eventsCount: 0, teamsCount: 0 }
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
    userStats.value = { projectsCount: 0, eventsCount: 0, teamsCount: 0 }
  }
}

// FUNCIÓN MODIFICADA PARA AUTO-ACTUALIZACIÓN
const refreshUserData = async (isAutoRefresh = false) => {
  if (!isAutoRefresh) loading.value = true

  clearUserCache()
  await checkAuth()

  // Reiniciar flags y recargar participación
  loaded.value = { eventos: false, proyectos: false, equipos: false }
  await loadMyParticipaciones()
  await selectTab(activeTab.value)

  if (!isAutoRefresh) {
    loading.value = false
    okModalMessage.value = 'Datos actualizados correctamente'
    showOkModal.value = true
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
    stopAutoRefresh()
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
  // Cargar participación del usuario (consolidado + lazy de la pestaña activa)
  await loadMyParticipaciones()
  await selectTab('eventos')
  loading.value = false
  startAutoRefresh()
})

// Cleanup on unmount
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden" v-else>
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <!-- Contenido del perfil -->
        <div class="profile-container">
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
                    <span class="detail-value">{{ personaData.identificacion || 'No disponible' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">{{ personaData.telefono || 'No disponible' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Género:</span>
                    <span class="detail-value">
                      {{
                        personaData.genero === 'M'
                          ? 'Masculino'
                          : personaData.genero === 'F'
                            ? 'Femenino'
                            : 'No especificado'
                      }}
                    </span>
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

              <!-- Pestañas de participación -->
              <div class="mt-4">
                <ul class="nav nav-pills mb-3 custom-pills" id="profile-pills" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link"
                      :class="{ active: activeTab === 'eventos' }"
                      id="pills-events-tab"
                      data-bs-toggle="pill"
                      data-bs-target="#pills-events"
                      type="button"
                      role="tab"
                      aria-controls="pills-events"
                      :aria-selected="activeTab === 'eventos'"
                      @click="selectTab('eventos')"
                    >
                      Eventos
                    </button>
                  </li>
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link"
                      :class="{ active: activeTab === 'proyectos' }"
                      id="pills-projects-tab"
                      data-bs-toggle="pill"
                      data-bs-target="#pills-projects"
                      type="button"
                      role="tab"
                      aria-controls="pills-projects"
                      :aria-selected="activeTab === 'proyectos'"
                      @click="selectTab('proyectos')"
                    >
                      Proyectos
                    </button>
                  </li>
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link"
                      :class="{ active: activeTab === 'equipos' }"
                      id="pills-teams-tab"
                      data-bs-toggle="pill"
                      data-bs-target="#pills-teams"
                      type="button"
                      role="tab"
                      aria-controls="pills-teams"
                      :aria-selected="activeTab === 'equipos'"
                      @click="selectTab('equipos')"
                    >
                      Equipos
                    </button>
                  </li>
                </ul>

                <div class="tab-content" id="profile-pills-content">
                  <!-- Eventos -->
                  <div
                    class="tab-pane fade"
                    :class="{ 'show active': activeTab === 'eventos' }"
                    id="pills-events"
                    role="tabpanel"
                    aria-labelledby="pills-events-tab"
                  >
                    <div v-if="loadingMyEvents" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando eventos...</span>
                      </div>
                      <p class="text-muted mt-2">Cargando eventos...</p>
                    </div>
                    <div v-else-if="myEvents.length === 0" class="text-center text-muted py-2">
                      No participas en ningún evento.
                    </div>
                    <div v-else class="row g-3">
                      <div v-for="ev in myEvents" :key="ev.id" class="col-md-6 col-lg-4">
                        <div class="project-card">
                          <h6 class="project-title">{{ ev.nombre || ev.titulo }}</h6>
                          <p class="project-description">{{ ev.descripcion || 'Sin descripción.' }}</p>
                          <hr />
                          <p class="project-status">
                            <strong>Estado:</strong> {{ ev.estado || '—' }}
                          </p>
                          <p class="project-dates">
                            <strong>Inicio:</strong> {{ formatDate(ev.fecha_inicio) }}
                          </p>
                          <p class="project-dates">
                            <strong>Fin:</strong> {{ formatDate(ev.fecha_fin) }}
                          </p>
                          <div class="d-flex justify-content-end mt-2">
                            <button
                              class="btn btn-primary btn-sm"
                              @click="$router.push(`/admin/eventos/${ev.id}`)"
                            >
                              Ver evento
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Proyectos -->
                  <div
                    class="tab-pane fade"
                    :class="{ 'show active': activeTab === 'proyectos' }"
                    id="pills-projects"
                    role="tabpanel"
                    aria-labelledby="pills-projects-tab"
                  >
                    <div v-if="loadingMyProjects" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando proyectos...</span>
                      </div>
                      <p class="text-muted mt-2">Cargando proyectos...</p>
                    </div>
                    <div v-else-if="myProjects.length === 0" class="text-center text-muted py-2">
                      No participas en proyectos.
                    </div>
                    <div v-else class="row g-3">
                      <div v-for="p in myProjects" :key="p.id" class="col-md-6 col-lg-4">
                        <div class="project-card">
                          <h6 class="project-title">{{ p.titulo || p.nombre }}</h6>
                          <p class="project-description">{{ p.descripcion || 'Sin descripción.' }}</p>
                          <hr />
                          <p class="team-info" v-if="p.team || p.equipo">
                            <strong>Equipo:</strong>
                            <span :class="{ 'text-danger': (p.team?.estado_borrado || p.equipo?.estado_borrado) }">
                              {{ p.team?.nombre || p.equipo?.nombre || '—' }}
                              <i
                                v-if="p.team?.estado_borrado || p.equipo?.estado_borrado"
                                class="fas fa-exclamation-circle ms-1"
                                title="Equipo Deshabilitado"
                              ></i>
                            </span>
                          </p>
                          <p class="project-status">
                            <strong>Estado del Proyecto:</strong> {{ p.estado || '—' }}
                          </p>
                          <p class="project-dates">
                            <strong>Inicio:</strong> {{ formatDate(p.fecha_inicio) }}
                          </p>
                          <p class="project-dates">
                            <strong>Fin:</strong> {{ formatDate(p.fecha_fin) }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Equipos -->
                  <div
                    class="tab-pane fade"
                    :class="{ 'show active': activeTab === 'equipos' }"
                    id="pills-teams"
                    role="tabpanel"
                    aria-labelledby="pills-teams-tab"
                  >
                    <div v-if="loadingMyTeams" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando equipos...</span>
                      </div>
                      <p class="text-muted mt-2">Cargando equipos...</p>
                    </div>
                    <div v-else-if="myTeams.length === 0" class="text-center text-muted py-2">
                      No integras ningún equipo.
                    </div>
                    <div v-else class="row g-3">
                      <div v-for="t in myTeams" :key="t.id || t.equipo_id" class="col-md-6 col-lg-4">
                        <div class="project-card">
                          <h6 class="project-title">
                            {{ t.nombre || t.equipo_nombre || 'Equipo sin nombre' }}
                            <i
                              v-if="t.estado_borrado"
                              class="fas fa-exclamation-circle ms-1 text-danger"
                              title="Equipo Deshabilitado"
                            ></i>
                          </h6>
                          <p class="project-description">
                            Proyecto: {{ t.proyecto?.titulo || t.proyecto_titulo || '—' }}
                          </p>
                          <hr />
                          <p class="project-status">
                            <strong>Evento:</strong> {{ t.evento?.nombre || t.evento_nombre || '—' }}
                          </p>
                          <p class="project-status" v-if="t.miembros_count !== undefined">
                            <strong>Integrantes:</strong> {{ t.miembros_count }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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

.custom-pills .nav-link {
  border-radius: 0.5rem 0.5rem 0 0;
  margin-right: 0.25rem;
  padding: 0.75rem 1.5rem;
  background-color: #e0e7ff;
  color: #174384;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid #c3d9ff;
  border-bottom: none;
}
.custom-pills .nav-link:hover:not(.active) {
  background-color: #d0e0ff;
  color: #0d284a;
}
.custom-pills .nav-link.active {
  background-color: #174384;
  color: #ffffff;
  border-color: #174384;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.tab-content {
  background-color: #ffffff;
  border: 1px solid #e0e7ff;
  border-radius: 0 0.5rem 0.5rem 0.5rem;
  padding: 1.5rem;
  min-height: 200px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

/* Tarjetas (reuso de estilos existentes) */
.project-card {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.project-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #174384;
  margin-bottom: 5px;
}
.project-description {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 10px;
  flex-grow: 1;
}
.team-info,
.project-status,
.project-dates {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 5px;
}
.team-info strong,
.project-status strong,
.project-dates strong {
  color: #333;
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
