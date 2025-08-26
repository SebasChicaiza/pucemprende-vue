<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { user } from '@/stores/userPermisos'

const route = useRoute()
const proyectoId = parseInt(route.params.id)

const proyecto = ref(null)
const miembrosProyecto = ref([]) // [{ persona_id, rol_id, nombre, apellido, mp_id? }]
const logoUrl = ref('')
const loading = ref(true)
const error = ref('')
const dynamicTitle = ref('Cargando...')

// QR
const qrDataUrl = ref('')
const showQr = ref(false)
const generatingQr = ref(false)

/* ===================== TOAST ===================== */
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success') // success | error | info
function notify(msg, type = 'success', ms = 2800) {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  window.clearTimeout(notify._t)
  notify._t = window.setTimeout(() => (showToast.value = false), ms)
}

/* ===================== DIALOGO DE CONFIRMACION ===================== */
const confirmState = ref({
  visible: false,
  message: '',
  loading: false,
  onConfirm: /** @type {null | (()=>Promise<void>|void)} */ (null),
})
function openConfirm(message, onConfirm) {
  confirmState.value.message = message
  confirmState.value.onConfirm = onConfirm
  confirmState.value.visible = true
}
function closeConfirm() {
  if (confirmState.value.loading) return
  confirmState.value.visible = false
  confirmState.value.message = ''
  confirmState.value.onConfirm = null
}

/* ===================== OBTENER persona_id VÍA API ===================== */
const currentPersonaId = ref(0) // persona_id real del usuario actual
const loadingPersona = ref(true)

/** Extrae el id de USUARIO (no persona) desde localStorage de forma robusta. */
function getStoredUserId() {
  const direct = Number(localStorage.getItem('user_id'))
  if (direct) return direct

  const keys = ['user', 'USER', 'currentUser', 'auth', 'session', 'account']
  for (const k of keys) {
    const raw = localStorage.getItem(k)
    if (!raw) continue
    try {
      const obj = JSON.parse(raw)
      const cand =
        obj?.user_id ??
        obj?.userId ??
        obj?.id ??
        obj?.usuario_id ??
        obj?.usuarioId ??
        obj?.user?.id ??
        obj?.user?.user_id
      if (cand) return Number(cand)
    } catch {}
  }

  if (user.value?.id) return Number(user.value.id)
  return 0
}

/** Llama a tu API: /api/persona/user/{userId} y guarda currentPersonaId */
async function fetchCurrentPersonaId() {
  loadingPersona.value = true
  const token = localStorage.getItem('token')
  const userId = getStoredUserId()
  if (!token || !userId) {
    loadingPersona.value = false
    return
  }
  const headers = { Authorization: `Bearer ${token}` }
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
      { headers },
    )
    const pid = Number(data?.id ?? data?.persona_id ?? data?.persona?.id ?? 0)
    currentPersonaId.value = pid || 0
  } catch (e) {
    console.error('[persona/user/:id] Error:', e?.response?.data || e.message)
    currentPersonaId.value = 0
    notify('No se pudo obtener los datos de la persona.', 'error')
  } finally {
    loadingPersona.value = false
  }
}

/* ===================== PERMISOS ===================== */
const esSuperadmin = computed(() => Number(user.value?.rol_id) === 8)

const miembroYo = computed(() => {
  const pid = Number(currentPersonaId.value || 0)
  if (!pid) return undefined
  return miembrosProyecto.value.find((m) => Number(m.persona_id) === pid)
})

const isMiembroProyecto = computed(() => !!miembroYo.value)
const isLiderActual = computed(() => !!miembroYo.value && Number(miembroYo.value.rol_id) === 1)
const puedeEditar = computed(() => esSuperadmin.value || isLiderActual.value)
const canGenerateQr = computed(
  () => esSuperadmin.value || isMiembroProyecto.value || puedeEditar.value,
)
const canLeaveProject = computed(() => isMiembroProyecto.value && !isLiderActual.value)

/* ===================== UTIL ===================== */
function formatDate(iso) {
  if (!iso || typeof iso !== 'string') return '-'
  const i = iso.indexOf('T')
  return i > 0 ? iso.slice(0, i) : iso
}
function mapMiembro(m) {
  const nombre = m.nombre ?? m.nombres ?? ''
  const apellido = m.apellido ?? m.apellidos ?? ''
  return {
    persona_id: Number(m.persona_id ?? m.persona?.id),
    rol_id: Number(m.rol_id),
    nombre,
    apellido,
    mp_id: undefined,
  }
}

/* ===================== INDEX de miembros-proyecto ===================== */
const mpIndex = ref({}) // { 'proyectoId|personaId': mpId }
const buildingIndex = ref(false)
const keyPP = (pId, perId) => `${Number(pId)}|${Number(perId)}`

async function buildMiembrosProyectoIndex() {
  if (buildingIndex.value) return
  buildingIndex.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    buildingIndex.value = false
    return
  }
  const headers = { Authorization: `Bearer ${token}` }

  try {
    const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto`, {
      headers,
    })
    const map = {}
    ;(Array.isArray(data) ? data : [data]).forEach((r) => {
      const pId = Number(r.proyecto_id)
      const perId = Number(r.persona_id ?? r.persona?.id)
      const rowId = Number(r.id)
      if (!pId || !perId || !rowId) return
      map[keyPP(pId, perId)] = rowId
    })
    mpIndex.value = map

    miembrosProyecto.value = miembrosProyecto.value.map((m) => ({
      ...m,
      mp_id: map[keyPP(proyectoId, m.persona_id)] ?? m.mp_id ?? null,
    }))
    console.log('Miembros del proyecto:', miembrosProyecto.value)
  } catch (e) {
    console.error('[Index miembros-proyecto] Error:', e?.response?.data || e.message)
    notify('No se pudieron cargar los miembros del proyecto.', 'error')
  } finally {
    buildingIndex.value = false
  }
}

/* ===================== CARGA INICIAL ===================== */
onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    loading.value = false
    return
  }
  const headers = { Authorization: `Bearer ${token}` }

  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos/${proyectoId}`,
      { headers },
    )

    const logo = data.logoUrl ?? data.logotipo ?? null
    proyecto.value = {
      ...data,
      evento_id: data.evento_id,
      nombre_evento: data.evento_nombre ?? 'Evento desconocido',
      equipo_nombre: data.equipo_nombre ?? 'Sin equipo',
      logoUrl: logo,
    }

    miembrosProyecto.value = Array.isArray(data.miembros) ? data.miembros.map(mapMiembro) : []
    logoUrl.value = logo ?? ''
    dynamicTitle.value = data.titulo ?? 'Proyecto'
    document.title = `PUCEmprende – ${dynamicTitle.value}`
    error.value = ''

    await buildMiembrosProyectoIndex()
    await fetchCurrentPersonaId()
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
    error.value = 'No se pudo cargar el proyecto.'
    notify('No se pudo cargar el proyecto.', 'error')
  } finally {
    loading.value = false
  }
})

/* ===================== QR ===================== */
async function generarQR() {
  const token = localStorage.getItem('token')
  if (!token) {
    notify('Token no encontrado', 'error')
    return
  }
  const headers = { Authorization: `Bearer ${token}` }
  generatingQr.value = true
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}/qr`,
      { headers },
    )

    const raw = data?.qr ?? ''
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error('Respuesta de QR vacía')
    }

    // Si viene SVG crudo: "<svg ...></svg>"
    if (raw.trim().startsWith('<svg')) {
      qrDataUrl.value = 'data:image/svg+xml;utf8,' + encodeURIComponent(raw)
    }
    // Si viene base64 (sólo caracteres base64)
    else if (/^[A-Za-z0-9+/=]+$/.test(raw.trim())) {
      qrDataUrl.value = 'data:image/svg+xml;base64,' + raw.trim()
    }
    // (Opcional) Si tu backend algún día devuelve PNG en base64
    else if (data.png) {
      qrDataUrl.value = 'data:image/png;base64,' + String(data.png)
    } else {
      throw new Error('Formato de QR inesperado')
    }

    showQr.value = true
    notify('QR generado correctamente.', 'success')
  } catch (err) {
    console.error('Error generando QR:', err?.response?.data || err.message)
    notify('No se pudo generar/mostrar el QR del proyecto.', 'error')
  } finally {
    generatingQr.value = false
  }
}

function getRolNombre(rolId) {
  return Number(rolId) === 1 ? 'Líder' : Number(rolId) === 2 ? 'Integrante' : 'Otro'
}

/* ===================== PATCH de ROL ===================== */
const savingRole = ref({}) // { [personaId]: true|false }

async function patchRolMiembroPorPersona(personaId, nuevoRol) {
  const token = localStorage.getItem('token')
  if (!token) {
    notify('Token de autenticación no encontrado.', 'error')
    return false
  }
  const headers = { Authorization: `Bearer ${token}` }

  let miembroId = miembrosProyecto.value.find(
    (m) => Number(m.persona_id) === Number(personaId),
  )?.mp_id
  if (!miembroId) {
    await buildMiembrosProyectoIndex()
    miembroId = mpIndex.value[keyPP(proyectoId, personaId)]
  }
  if (!miembroId) {
    console.warn(
      `[PATCH rol] No se encontró registro miembros-proyecto para persona ${personaId} en proyecto ${proyectoId}`,
    )
    notify('No se encontró el registro del miembro en el proyecto.', 'error')
    return false
  }

  try {
    await axios.patch(
      `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/${miembroId}`,
      {
        proyecto_id: Number(proyectoId),
        persona_id: Number(personaId),
        rol_id: Number(nuevoRol),
      },
      { headers },
    )
    notify('Rol actualizado correctamente.', 'success')
    return true
  } catch (e) {
    console.error('Error actualizando rol:', e?.response?.data || e.message)
    notify('No se pudo actualizar el rol.', 'error')
    return false
  }
}

async function onChangeRol(miembro, event) {
  const nuevoRol = Number(event.target.value)
  if (nuevoRol === miembro.rol_id) return
  if (!puedeEditar.value && !esSuperadmin.value) return

  const oldRol = miembro.rol_id
  miembro.rol_id = nuevoRol
  savingRole.value[miembro.persona_id] = true

  const ok = await patchRolMiembroPorPersona(miembro.persona_id, nuevoRol)
  if (!ok) {
    miembro.rol_id = oldRol
  }
  savingRole.value[miembro.persona_id] = false
}

/* ===================== SALIR DEL PROYECTO (DELETE) ===================== */
const leaving = ref(false)

function pedirSalir() {
  if (loadingPersona.value || !canLeaveProject.value || !miembroYo.value) return
  openConfirm('¿Seguro que deseas salir del proyecto?', async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      notify('Token de autenticación no encontrado.', 'error')
      return
    }
    const headers = { Authorization: `Bearer ${token}` }

    const personaId = Number(miembroYo.value.persona_id)
    const user_id = getStoredUserId()
    confirmState.value.loading = true
    try {
      await axios.delete(
        `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/salir/${personaId}/${proyectoId}`,
        { headers },
      )
      console.log('Miembro salio de proyecto')
      await axios.delete(
        `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${user_id}/borrar`,
        { headers },
      )
      console.log('Miembro salio del evento')
      miembrosProyecto.value = miembrosProyecto.value.filter(
        (m) => Number(m.persona_id) !== personaId,
      )
      delete mpIndex.value[keyPP(proyectoId, personaId)]
      closeConfirm()
      notify('Has salido del proyecto.', 'success')
    } catch (e) {
      console.error('Error al salir del proyecto:', e?.response?.data || e.message)
      notify('No se pudo salir del proyecto.', 'error')
    } finally {
      confirmState.value.loading = false
      closeConfirm()
    }
  })
}

/* ===================== ELIMINAR MIEMBRO (DELETE) ===================== */
function pedirEliminarMiembro(miembro) {
  openConfirm(
    `¿Seguro que deseas eliminar a ${miembro.nombre} ${miembro.apellido} del proyecto?`,
    async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        notify('Token de autenticación no encontrado.', 'error')
        return
      }
      const headers = { Authorization: `Bearer ${token}` }
      confirmState.value.loading = true
      try {
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/salir/${miembro.persona_id}/${proyectoId}`,
          { headers },
        )
        miembrosProyecto.value = miembrosProyecto.value.filter(
          (m) => Number(m.persona_id) !== Number(miembro.persona_id),
        )
        delete mpIndex.value[keyPP(proyectoId, miembro.persona_id)]
        closeConfirm()
        notify('Miembro eliminado del proyecto.', 'success')
      } catch (e) {
        console.error('Error al eliminar miembro:', e?.response?.data || e.message)
        notify('No se pudo eliminar el miembro.', 'error')
      } finally {
        confirmState.value.loading = false
        closeConfirm()
      }
    },
  )
}

/* Debug opcional del índice */
watch([miembrosProyecto, mpIndex], () => {
  const keys = {}
  miembrosProyecto.value.forEach((m) => {
    keys[m.persona_id] = mpIndex.value[keyPP(proyectoId, m.persona_id)]
  })
  console.log('[MP Index]', keys)
})
</script>

<template>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column">
      <PageHeaderRoute :dynamicTitle="dynamicTitle" currentRouteName="Proyecto Detalle" />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div v-if="loading" class="text-center text-muted">Cargando...</div>
        <p v-else-if="error" class="text-danger text-center">{{ error }}</p>

        <div v-else-if="proyecto" class="card shadow-lg p-4">
          <div class="card-body p-5">
            <!-- Logo -->
            <div v-if="logoUrl" class="project-logo-wrapper mb-4 text-center">
              <img :src="logoUrl" alt="Logo del proyecto" class="project-logo-img" />
            </div>

            <!-- Datos generales -->
            <h1 class="project-display-title">{{ proyecto.titulo }}</h1>
            <p class="text-muted mb-4">{{ proyecto.descripcion }}</p>

            <div class="mb-2"><strong>Estado:</strong> {{ proyecto.estado }}</div>
            <div class="mb-2"><strong>Equipo:</strong> {{ proyecto.equipo_nombre }}</div>
            <div class="mb-2">
              <strong>Evento:</strong>
              <RouterLink
                v-if="proyecto.evento_id"
                :to="`/admin/eventos/${proyecto.evento_id}`"
                class="link-primary text-decoration-underline ms-1"
              >
                {{ proyecto.nombre_evento }}
              </RouterLink>
              <span v-else class="ms-1">{{ proyecto.nombre_evento }}</span>
            </div>

            <div class="mb-3">
              <strong>Inicio:</strong> {{ formatDate(proyecto.fecha_inicio) }}
              &nbsp;
              <strong>Fin:</strong> {{ formatDate(proyecto.fecha_fin) }}
            </div>

            <!-- Acciones superiores -->
            <div class="mb-4 d-flex justify-content-end gap-2">
              <button
                v-if="canGenerateQr"
                @click="generarQR"
                class="btn btn-outline-primary"
                :disabled="generatingQr"
                title="Generar código QR para este proyecto"
              >
                <i class="bi bi-qr-code me-1"></i>
                {{ generatingQr ? 'Generando...' : 'Generar QR' }}
              </button>

              <button
                v-if="canLeaveProject"
                @click="pedirSalir"
                class="btn btn-outline-danger"
                :disabled="loadingPersona"
                title="Salir del proyecto"
              >
                <i class="bi bi-box-arrow-right me-1"></i>
                Salir del proyecto
              </button>
            </div>
            <!-- Vista previa / descarga del QR -->
            <div v-if="showQr && qrDataUrl" class="text-center mb-4">
              <img :src="qrDataUrl" alt="QR del proyecto" style="max-width: 220px" />
              <div class="mt-2 d-flex justify-content-center gap-2">
                <a
                  :href="qrDataUrl"
                  :download="`qr-proyecto-${proyectoId}.svg`"
                  class="btn btn-sm btn-secondary"
                >
                  <i class="bi bi-download me-1"></i> Descargar QR
                </a>
                <button class="btn btn-sm btn-outline-secondary" @click="showQr = false">
                  Ocultar
                </button>
              </div>
            </div>

            <!-- Miembros (con edición de rol) -->
            <div v-if="miembrosProyecto.length">
              <hr class="my-4" />
              <h5 class="mb-3">Miembros del proyecto</h5>
              <div class="row">
                <div
                  v-for="miembro in miembrosProyecto"
                  :key="miembro.persona_id"
                  class="col-sm-6 col-md-4 col-lg-3 mb-4"
                >
                  <div class="card miembro-card">
                    <div class="card-body text-center">
                      <i class="bi bi-person-circle fs-1 text-primary mb-2"></i>
                      <p class="fw-bold mb-1">{{ miembro.nombre }} {{ miembro.apellido }}</p>

                      <template v-if="puedeEditar || esSuperadmin">
                        <div class="d-flex align-items-center justify-content-center gap-2">
                          <select
                            class="form-select form-select-sm"
                            :value="miembro.rol_id"
                            :disabled="savingRole[miembro.persona_id]"
                            @change="(e) => onChangeRol(miembro, e)"
                            style="max-width: 140px"
                          >
                            <option :value="1">Líder</option>
                            <option :value="2">Integrante</option>
                          </select>
                          <div
                            v-if="savingRole[miembro.persona_id]"
                            class="spinner-border spinner-border-sm"
                            role="status"
                          />
                          <!-- Botón eliminar solo si el miembro no es líder y no eres tú -->
                          <button
                            v-if="
                              isLiderActual &&
                              miembro.rol_id !== 1 &&
                              Number(miembro.persona_id) !== Number(currentPersonaId)
                            "
                            class="btn btn-sm btn-outline-danger ms-2"
                            title="Eliminar miembro"
                            @click="pedirEliminarMiembro(miembro)"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <span class="badge bg-secondary">{{ getRolNombre(miembro.rol_id) }}</span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center text-muted">
              No hay miembros inscritos en este proyecto.
            </div>
          </div>
        </div>

        <div v-else class="text-danger">Proyecto no encontrado.</div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
      {{ toastMessage }}
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmState.visible" class="modal-backdrop">
      <div class="modal-card">
        <h5 class="mb-2">Confirmación</h5>
        <p class="mb-3">{{ confirmState.message }}</p>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-light" :disabled="confirmState.loading" @click="closeConfirm">
            Cancelar
          </button>
          <button
            class="btn btn-danger"
            :disabled="confirmState.loading"
            @click="confirmState.onConfirm && confirmState.onConfirm()"
          >
            <span v-if="confirmState.loading" class="spinner-border spinner-border-sm me-2" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-display-title {
  font-size: 2rem;
  font-weight: bold;
  color: #174384;
}
.project-logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.project-logo-img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #e0e6ec;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.miembro-card {
  background: #f8f9fc;
  border: 1px solid #dce2ea;
  border-radius: 12px;
  transition: transform 0.2s;
}
.miembro-card:hover {
  transform: scale(1.03);
}

/* Toast */
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
  z-index: 3000;
  opacity: 0;
  transition: opacity 0.2s ease;
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
.toast-notification.info {
  background-color: #0d6efd;
}

/* Modal confirm */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3100;
}
.modal-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px;
  width: min(92vw, 440px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}
</style>
