<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'
import { useEventosInscritosStore } from '@/stores/useEventosInscritosStore'

const router = useRouter()
const eventosInscritosStore = useEventosInscritosStore()

const props = defineProps({
  eventoId: {
    type: [String, Number],
    required: true,
  },
})

// --- Estado principal ---
const loading = ref(false)
const loadingProyectos = ref(false)
const loadingMiembros = ref(false)
const error = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('') // 'success' | 'error'
const showConfirmDialog = ref(false)

// Equipo
const nombreEquipo = ref('')
const proyectoSeleccionado = ref('')
const proyectosDisponibles = ref([])
const miembrosProyecto = ref([])
const miembrosSeleccionados = ref([])

// Usuario actual (persona_id)
const currentPersonaId = ref(null)

// --- Helpers UI ---
function showNotification(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => (showToast.value = false), 3000)
}
function openConfirm() {
  if (validarFormulario()) showConfirmDialog.value = true
}
function closeConfirm() {
  showConfirmDialog.value = false
}

function getCurrentPersonaId() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const obj = JSON.parse(raw)
    return obj?.id ?? null
  } catch {
    return null
  }
}

// --- Función para ir a crear proyecto ---
function irACrearProyecto() {
  router.push('/admin/crearProyecto/')
}

// --- Debug helpers ---
function safeParse(data) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return data
  }
}
function logAxiosError(err, label = 'Axios error') {
  const { config, response, message } = err || {}
  console.groupCollapsed(`❌ ${label}`)
  console.log('Message:', message)
  console.log('Request:', {
    method: config?.method,
    url: config?.url,
    headers: config?.headers,
    data: safeParse(config?.data),
  })
  if (response) {
    console.log('Status:', response.status, response.statusText)
    console.log('Response data:', response.data)
    console.log('Response headers:', response.headers)
  } else {
    console.log('No hubo respuesta (red/CORS).')
  }
  console.groupEnd()
}

// === APIs de inscripción / activación MEJORADAS ===
async function getEventoRolPersonaId(eventoId, personaId, headers) {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${eventoId}/${personaId}`,
      { headers },
    )
    const d = res.data
    console.log('GET evento-rol-persona result:', d)
    return d?.id ?? d?.evento_rol_persona_id ?? (Array.isArray(d) ? d[0]?.id : null)
  } catch (e) {
    if (e?.response?.status === 404) return null
    logAxiosError(e, `GET evento-rol-persona (${eventoId}/${personaId})`)
    throw e
  }
}

/** CREADOR: prioriza self-inscribe cuando no existe registro */
async function ensureInscripcionActivaCreador(eventoId, personaId, headers) {
  console.log(`🔍 Verificando inscripción creador - Evento: ${eventoId}, Persona: ${personaId}`)

  let erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  if (erpId) {
    console.log(`✅ Creador ya inscrito con ID: ${erpId}`)
    return // ya existe y está activo
  }

  console.log('📝 Creador no inscrito, procediendo a inscribir...')
  // No existe => self-inscribe (sin persona_id)
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/inscribirse`,
      { evento_id: Number(eventoId) }, // self
      { headers },
    )
    console.log('✅ Self-inscripción exitosa:', response.data)
  } catch (e) {
    console.log('⚠️ Error en self-inscripción:', e.response?.status, e.response?.data)
    // Si ya estaba inscrito pero borrado=true, backend podría devolver 409; seguimos
    if (e?.response?.status !== 409) {
      logAxiosError(e, 'SELF-INSCRIBIR CREADOR')
      throw e
    }
    console.log('⚠️ Error 409 - probablemente ya inscrito, continuando...')
  }
}

/** OTRO MIEMBRO: inscribe con persona_id si no existe; si 409, continúa */
async function ensureInscripcionActivaMiembro(eventoId, personaId, headers) {
  console.log(`🔍 Verificando inscripción miembro - Evento: ${eventoId}, Persona: ${personaId}`)

  let erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  if (erpId) {
    console.log(`✅ Miembro ya inscrito con ID: ${erpId}`)
    return // ya existe
  }

  console.log('📝 Miembro no inscrito, procediendo a inscribir...')
  try {
    const payload = {
      persona_id: personaId,
      evento_id: Number(eventoId),
      rol_id: 4,
      estado_borrado: false,
    }
    console.log('📤 Payload inscripción miembro:', JSON.stringify(payload))

    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona`,
      payload,
      { headers }
    )
    console.log('✅ Inscripción miembro exitosa:', response.data)
  } catch (e) {
    console.log('⚠️ Error inscribiendo miembro:', e.response?.status, e.response?.data)

    if (e?.response?.status !== 409) {
      logAxiosError(e, `INSCRIBIR miembro persona_id=${personaId}`)
      throw e
    }
    console.log('⚠️ Error 409 - probablemente ya inscrito, continuando...')
  }
}

/** Valida/activa TODOS antes de crear equipo */
async function ensureAllInscripcionesActivas(headers) {
  console.log('🔍 Iniciando inscripciones para evento:', props.eventoId)
  console.log('🔍 Current persona ID:', currentPersonaId.value)
  console.log('🔍 Miembros seleccionados:', miembrosSeleccionados.value)

  // 1) Creador
  console.log('📝 Inscribiendo creador...')
  await ensureInscripcionActivaCreador(props.eventoId, currentPersonaId.value, headers)
  console.log('✅ Creador inscrito')

  // 2) Miembros seleccionados del proyecto
  for (const miembroId of miembrosSeleccionados.value) {
    if (miembroId === currentPersonaId.value) {
      console.log(`⏭️ Saltando creador (${miembroId}) - ya inscrito`)
      continue
    }

    console.log(`📝 Inscribiendo miembro ID: ${miembroId}`)
    try {
      await ensureInscripcionActivaMiembro(props.eventoId, miembroId, headers)
      console.log(`✅ Miembro ${miembroId} inscrito`)
    } catch (e) {
      const miembro = miembrosProyecto.value.find(m => m.id === miembroId || m.persona_id === miembroId)
      const fullName = `${miembro?.nombre ?? ''} ${miembro?.apellido ?? ''}`.trim()
      console.error(`❌ Error inscribiendo a ${fullName}:`, e)
      showNotification(`No se pudo inscribir a ${fullName} en el evento.`, 'error')
      throw e
    }
  }
  console.log('🎉 Todas las inscripciones completadas')
}

// --- Cargar proyectos disponibles ---
async function cargarProyectos() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token no encontrado.', 'error')
    return
  }

  // Usar USER_ID, no persona_id
  const userId = getCurrentPersonaId() // Este método devuelve user_id del localStorage
  if (!userId) {
    console.error('❌ No se puede cargar proyectos: userId no disponible')
    showNotification('Error: No se pudo identificar al usuario actual.', 'error')
    return
  }

  loadingProyectos.value = true
  try {
    console.log('🔍 Cargando proyectos para USER ID:', userId)

    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/usuarios/${userId}/proyectos`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    console.log('📋 Proyectos recibidos:', data)
    proyectosDisponibles.value = Array.isArray(data) ? data : []

    console.log('✅ Proyectos procesados:', proyectosDisponibles.value.length)

    if (proyectosDisponibles.value.length === 0) {
      showNotification('No tienes proyectos disponibles. Crea uno primero.', 'error')
    }
  } catch (e) {
    console.error('❌ Error cargando proyectos del usuario:', e)
    logAxiosError(e, 'Cargar proyectos del usuario')
    showNotification('Error al cargar tus proyectos.', 'error')
    proyectosDisponibles.value = []
  } finally {
    loadingProyectos.value = false
  }
}

// --- Cargar miembros del proyecto seleccionado ---
async function cargarMiembrosProyecto() {
  if (!proyectoSeleccionado.value) {
    miembrosProyecto.value = []
    miembrosSeleccionados.value = []
    return
  }

  const token = localStorage.getItem('token')
  if (!token) return

  loadingMiembros.value = true
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos/${proyectoSeleccionado.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    // Procesar los miembros para extraer la información correcta
    const miembrosCompletos = Array.isArray(data?.miembros) ? data.miembros : []

    miembrosProyecto.value = miembrosCompletos.map(miembro => {
      // Si el miembro tiene una propiedad 'persona', extraer los datos de ahí
      if (miembro.persona) {
        return {
          id: miembro.persona.id, // ID de la persona, no del registro miembro_proyecto
          persona_id: miembro.persona.id,
          nombre: miembro.persona.nombre,
          apellido: miembro.persona.apellido,
          email: miembro.persona.email,
          identificacion: miembro.persona.identificacion,
          rol_id: miembro.rol_id || null
        }
      }
      // Si no tiene 'persona' pero tiene persona_id, usar los datos directos
      else if (miembro.persona_id) {
        return {
          id: miembro.persona_id, // Usar persona_id como id principal
          persona_id: miembro.persona_id,
          nombre: miembro.nombre,
          apellido: miembro.apellido,
          email: miembro.email,
          identificacion: miembro.identificacion,
          rol_id: miembro.rol_id || null
        }
      }
      // Fallback: asumir que los datos están en el nivel raíz
      else {
        return {
          id: miembro.id, // Asumir que este es el persona_id
          persona_id: miembro.id,
          nombre: miembro.nombre,
          apellido: miembro.apellido,
          email: miembro.email,
          identificacion: miembro.identificacion,
          rol_id: miembro.rol_id || null
        }
      }
    })

    console.log('Miembros procesados:', miembrosProyecto.value)
    miembrosSeleccionados.value = []
  } catch (e) {
    console.error('Error cargando miembros del proyecto:', e)
    showNotification('Error al cargar miembros del proyecto.', 'error')
    miembrosProyecto.value = []
    miembrosSeleccionados.value = []
  } finally {
    loadingMiembros.value = false
  }
}

// --- Validaciones ---
function validarFormulario() {
  if (!nombreEquipo.value.trim()) {
    showNotification('Por favor ingresa el nombre del equipo.', 'error')
    return false
  }
  if (!proyectoSeleccionado.value) {
    showNotification('Por favor selecciona un proyecto.', 'error')
    return false
  }
  if (miembrosSeleccionados.value.length === 0) {
    showNotification('Debes seleccionar al menos un miembro para el equipo.', 'error')
    return false
  }
  return true
}

// --- Guardado final MEJORADO ---
async function confirmarCreacion() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token de autenticación no encontrado.', 'error')
    return
  }
  const headers = { Authorization: `Bearer ${token}` }

  loading.value = true
  try {
    console.log('🚀 Iniciando creación de equipo...')
    console.log('📋 Datos actuales:', {
      eventoId: props.eventoId,
      currentPersonaId: currentPersonaId.value,
      nombreEquipo: nombreEquipo.value,
      proyectoSeleccionado: proyectoSeleccionado.value,
      miembrosSeleccionados: miembrosSeleccionados.value
    })

    // (0) **OBLIGATORIO**: asegurar inscripciones ACTIVAS de TODOS los miembros seleccionados
    console.log('🔐 Paso 1: Asegurando inscripciones...')
    await ensureAllInscripcionesActivas(headers)
    console.log('✅ Paso 1 completado: Inscripciones aseguradas')

    // (1) Crear equipo
    console.log('🏗️ Paso 2: Creando equipo...')
    const equipoRes = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/equipos`,
      {
        proyecto_id: Number(proyectoSeleccionado.value),
        nombre: nombreEquipo.value.trim(),
        evento_id: Number(props.eventoId),
        ranking: null,
      },
      { headers },
    )
    const equipoId = equipoRes.data.id
    console.log('✅ Paso 2 completado: Equipo creado con ID:', equipoId)

    // (2) Registrar miembros del equipo
    const hoy = new Date()
    const fechaInicio = hoy.toISOString().split('T')[0]
    const fechaFin = new Date(hoy.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Asegurar que usamos persona_id correcto
    const miembrosUnicos = miembrosSeleccionados.value.filter(
      (personaId, i, arr) => arr.indexOf(personaId) === i,
    )

    console.log('Miembros únicos a registrar en equipo (persona_id):', miembrosUnicos)

    for (const personaId of miembrosUnicos) {
      try {
        const miembroEquipoRes = await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`,
          {
            equipo_id: equipoId,
            persona_id: personaId, // Ahora es el persona_id correcto
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          },
          { headers },
        )
        console.log('Miembro del equipo registrado:', JSON.stringify(miembroEquipoRes.data))
      } catch (e) {
        console.warn(`Error registrando miembro-equipo (persona_id: ${personaId}):`, e)
        const miembro = miembrosProyecto.value.find(m => m.persona_id === personaId)
        showNotification(
          `No se pudo registrar en el equipo a ${miembro?.nombre ?? ''} ${miembro?.apellido ?? ''}.`,
          'error',
        )
      }
    }

    // (3) **NUEVO**: Actualizar store de eventos inscritos
    await eventosInscritosStore.fetchEventosInscritos()

    showNotification('Equipo creado correctamente.', 'success')

    // Redirigir después de un momento para que se vea el mensaje
    setTimeout(() => {
      router.push('/admin/equipos')
    }, 1500)

  } catch (error) {
    console.error('💥 Error en creación de equipo:', error)
    logAxiosError(error, 'Error al crear el equipo')
    showNotification(
      error?.response?.data?.message || 'Ocurrió un error al crear el equipo.',
      'error',
    )
  } finally {
    loading.value = false
    closeConfirm()
  }
}

// --- Watchers ---
watch(() => proyectoSeleccionado.value, cargarMiembrosProyecto)

// --- init ---
onMounted(async () => {
  console.log('🔄 Iniciando componente CrearEquipos...')

  const token = localStorage.getItem('token')
  if (!token) {
    console.error('❌ No se encontró token')
    showNotification('Token no encontrado', 'error')
    return
  }

  try {
    // 1) Obtener USER_ID del localStorage (para cargar proyectos)
    const userId = getCurrentPersonaId() // Nombre confuso, pero devuelve user.id
    console.log('👤 User ID del localStorage:', userId)

    // 2) Cargar proyectos usando USER_ID
    await cargarProyectos()

    // 3) Obtener PERSONA_ID del usuario actual (para inscripciones)
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    currentPersonaId.value = data?.id
    console.log('✅ Current persona ID obtenido:', currentPersonaId.value)
    console.log('📋 Datos completos de persona:', data)

  } catch (e) {
    console.error('❌ Error en inicialización:', e)
    showNotification('Error obteniendo datos del usuario', 'error')
  }

  console.log('🔄 Componente inicializado completamente')
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute title="Home - Eventos - PUCE Emprende - Crear Equipo" />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <h2 class="mb-3" style="color: #174384; font-weight: 600">
          Crear nuevo equipo para PUCE Emprende
        </h2>

        <div class="card p-4">
          <!-- Información del Equipo -->
          <h4 class="text-dark mb-3">Información del Equipo</h4>
          <p class="text-muted mb-4" style="max-width: 600px">
            Crea un nuevo equipo seleccionando un proyecto existente y sus miembros
          </p>

          <div class="mb-3">
            <label class="form-label">Nombre del equipo</label>
            <input
              v-model="nombreEquipo"
              type="text"
              class="form-control"
              placeholder="Ingresa el nombre del equipo"
            />
          </div>

          <div class="mb-4">
            <label class="form-label">Seleccionar proyecto</label>
            <div class="position-relative">
              <select
                v-model="proyectoSeleccionado"
                class="form-select"
                :disabled="loadingProyectos"
              >
                <option value="">
                  {{ loadingProyectos ? 'Cargando proyectos...' : 'Selecciona un proyecto...' }}
                </option>
                <option
                  v-for="proyecto in proyectosDisponibles"
                  :key="proyecto.id"
                  :value="proyecto.id"
                >
                  {{ proyecto.titulo || proyecto.nombre || `Proyecto ${proyecto.id}` }}
                </option>
              </select>
              <div v-if="loadingProyectos" class="spinner-border spinner-border-sm position-absolute end-0 top-50 translate-middle-y me-3" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>

            <!-- Enlace para crear proyecto si no encuentra el que busca -->
            <div class="mt-2 d-flex align-items-center justify-content-between">
              <small class="text-muted">
                {{ proyectosDisponibles.length }} proyecto(s) disponible(s)
              </small>
              <div class="crear-proyecto-link">
                <small class="text-muted me-2">¿No encuentras tu proyecto?</small>
                <button
                  type="button"
                  @click="irACrearProyecto"
                  class="btn-link-crear-proyecto"
                >
                  <i class="bi bi-plus-circle me-1"></i>
                  Crear uno nuevo
                </button>
              </div>
            </div>
          </div>

          <!-- Selección de miembros -->
          <div v-if="proyectoSeleccionado && !loadingMiembros" class="mb-4">
            <div v-if="miembrosProyecto.length > 0">
              <label class="form-label fw-semibold mb-3">Seleccionar miembros del equipo</label>
              <div class="row">
                <div
                  v-for="miembro in miembrosProyecto"
                  :key="miembro.persona_id"
                  class="col-md-6 col-lg-4 mb-3"
                >
                  <div class="card border">
                    <div class="card-body p-3">
                      <div class="form-check">
                        <input
                          :id="`miembro-${miembro.persona_id}`"
                          v-model="miembrosSeleccionados"
                          :value="miembro.persona_id"
                          type="checkbox"
                          class="form-check-input"
                        />
                        <label :for="`miembro-${miembro.persona_id}`" class="form-check-label">
                          <strong>{{ miembro.nombre }} {{ miembro.apellido }}</strong><br />
                          <small class="text-muted">{{ miembro.email }}</small><br />
                          <small class="text-muted">Cédula: {{ miembro.identificacion }}</small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              El proyecto seleccionado no tiene miembros asignados
            </div>
          </div>

          <!-- Loading de miembros -->
          <div v-if="proyectoSeleccionado && loadingMiembros" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando miembros...</span>
            </div>
            <div class="mt-2 text-muted">Cargando miembros del proyecto...</div>
          </div>

          <!-- Mensaje cuando no hay proyecto seleccionado -->
          <div v-else-if="!proyectoSeleccionado" class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Selecciona un proyecto para ver sus miembros disponibles
          </div>

          <!-- Resumen de selección -->
          <div v-if="miembrosSeleccionados.length > 0" class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            Has seleccionado {{ miembrosSeleccionados.length }} miembro(s) para el equipo
          </div>

          <div v-if="error" class="text-danger fw-bold mb-3">{{ error }}</div>

          <button
            class="btn btn-primary d-flex align-items-center px-4 py-2 ms-auto"
            style="background-color: #174384"
            :disabled="loading || loadingProyectos"
            @click="openConfirm"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            <i v-else class="bi bi-check-lg me-2"></i>
            {{ loading ? 'Creando...' : 'Crear Equipo' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmationDialog
      :visible="showConfirmDialog"
      message="¿Estás seguro de que deseas crear este equipo?"
      @confirm="confirmarCreacion"
      @cancel="closeConfirm"
    />

    <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: none;
}

input::placeholder,
textarea::placeholder,
select {
  color: #adb5bd;
}

.form-control,
.form-select {
  border-radius: 6px;
  font-size: 14px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #dee2e6;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus,
.form-select:focus {
  border-color: #174384;
  box-shadow: 0 0 0 0.2rem rgba(23, 67, 132, 0.25);
}

.form-select:disabled {
  background-color: #e9ecef;
  opacity: 1;
}

.form-check-input:checked {
  background-color: #174384;
  border-color: #174384;
}

.form-check-label {
  cursor: pointer;
  width: 100%;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

/* Estilos para el enlace de crear proyecto */
.crear-proyecto-link {
  display: flex;
  align-items: center;
}

.btn-link-crear-proyecto {
  background: none;
  border: none;
  color: #174384;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  text-decoration: none;
  display: flex;
  align-items: center;
}

.btn-link-crear-proyecto:hover {
  background-color: rgba(23, 67, 132, 0.1);
  color: #0f2e5c;
  text-decoration: none;
}

.btn-link-crear-proyecto:focus {
  outline: 2px solid rgba(23, 67, 132, 0.3);
  outline-offset: 2px;
}

.btn-link-crear-proyecto:active {
  transform: translateY(1px);
}

.toast-notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 2000;
  transition: opacity 0.3s;
  opacity: 0;
  pointer-events: none;
}

.toast-notification.show {
  opacity: 1;
}

.toast-notification.success {
  background-color: #28a745;
}

.toast-notification.error {
  background-color: #dc3545;
}

.alert {
  border-radius: 8px;
}

/* Responsive para móviles */
@media (max-width: 768px) {
  .crear-proyecto-link {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .btn-link-crear-proyecto {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
}
</style>
