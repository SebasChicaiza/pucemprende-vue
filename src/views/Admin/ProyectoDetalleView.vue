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

/* ===================== PERMISOS ===================== */
const personaActualId = computed(() => {
  const idStore = Number(user.value?.id ?? user.value?.persona_id ?? 0)
  if (idStore) return idStore
  try {
    const raw =
      localStorage.getItem('user') ||
      localStorage.getItem('USER') ||
      localStorage.getItem('currentUser')
    if (!raw) return 0
    const obj = JSON.parse(raw)
    return Number(obj?.id ?? obj?.persona_id ?? 0)
  } catch {
    return 0
  }
})
const esSuperadmin = computed(() => Number(user.value?.rol_id) === 8)
const isMiembroProyecto = computed(() => {
  const pid = personaActualId.value
  return pid ? miembrosProyecto.value.some((m) => Number(m.persona_id) === pid) : false
})
const puedeEditar = computed(() => {
  if (esSuperadmin.value) return true
  const pid = personaActualId.value
  return pid
    ? miembrosProyecto.value.some((m) => Number(m.persona_id) === pid && Number(m.rol_id) === 1)
    : false
})
const canGenerateQr = computed(
  () => esSuperadmin.value || isMiembroProyecto.value || puedeEditar.value,
)

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
    mp_id: undefined, // lo adjuntamos luego con el índice real
  }
}

/* ===================== INDEX de miembros-proyecto ===================== */
/** Mapa (proyectoId|personaId) -> id real de miembros-proyecto */
const mpIndex = ref({}) // { '31|14': 41, ... }
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

    // Adjuntamos mp_id a los miembros que mostramos
    miembrosProyecto.value = miembrosProyecto.value.map((m) => ({
      ...m,
      mp_id: map[keyPP(proyectoId, m.persona_id)] ?? m.mp_id ?? null,
    }))

    console.log(
      '[mpIndex] (solo este proyecto)',
      Object.fromEntries(Object.entries(map).filter(([k]) => k.startsWith(`${proyectoId}|`))),
    )
  } catch (e) {
    console.error('[Index miembros-proyecto] Error:', e?.response?.data || e.message)
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

    // Índice para obtener el id real (mp_id) por persona
    await buildMiembrosProyectoIndex()
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
    error.value = 'No se pudo cargar el proyecto.'
  } finally {
    loading.value = false
  }
})

/* ===================== QR ===================== */
async function generarQR() {
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('Token no encontrado')
    return
  }
  const headers = { Authorization: `Bearer ${token}` }
  generatingQr.value = true
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}/qr`,
      { headers },
    )
    qrDataUrl.value = `data:image/svg+xml;base64,${data.qr}`
    showQr.value = true
  } catch (err) {
    console.error('Error generando QR:', err?.response?.data || err.message)
    alert('No se pudo generar el QR del proyecto.')
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
  if (!token) return alert('Token de autenticación no encontrado.')
  const headers = { Authorization: `Bearer ${token}` }

  // 1) id real del registro miembros-proyecto
  let miembroId = miembrosProyecto.value.find(
    (m) => Number(m.persona_id) === Number(personaId),
  )?.mp_id
  if (!miembroId) {
    // Reintentar reconstruyendo el índice
    await buildMiembrosProyectoIndex()
    miembroId = mpIndex.value[keyPP(proyectoId, personaId)]
  }
  if (!miembroId) {
    console.warn(
      `[PATCH rol] No se encontró registro miembros-proyecto para persona ${personaId} en proyecto ${proyectoId}`,
    )
    alert('No se encontró el registro del miembro en el proyecto.')
    return false
  }

  try {
    // 2) IMPORTANTE: enviar también proyecto_id y persona_id (tu backend lo valida)
    await axios.patch(
      `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/${miembroId}`,
      {
        proyecto_id: Number(proyectoId),
        persona_id: Number(personaId),
        rol_id: Number(nuevoRol),
      },
      { headers },
    )
    return true
  } catch (e) {
    console.error('Error actualizando rol:', e?.response?.data || e.message)
    return false
  }
}

async function onChangeRol(miembro, event) {
  const nuevoRol = Number(event.target.value)
  if (nuevoRol === miembro.rol_id) return
  if (!puedeEditar.value && !esSuperadmin.value) return

  // Optimista + rollback
  const oldRol = miembro.rol_id
  miembro.rol_id = nuevoRol
  savingRole.value[miembro.persona_id] = true

  const ok = await patchRolMiembroPorPersona(miembro.persona_id, nuevoRol)
  if (!ok) {
    miembro.rol_id = oldRol
    alert('No se pudo actualizar el rol. Intenta nuevamente.')
  }
  savingRole.value[miembro.persona_id] = false
}

/* (opcional) debug para verificar IDs que mapea el índice */
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

            <!-- Generar QR -->
            <div class="mb-4 text-end" v-if="canGenerateQr">
              <button
                @click="generarQR"
                class="btn btn-outline-primary"
                :disabled="generatingQr"
                title="Generar código QR para este proyecto"
              >
                <i class="bi bi-qr-code me-1"></i>
                {{ generatingQr ? 'Generando...' : 'Generar QR' }}
              </button>
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

                      <!-- Selector si puede editar; badge si no -->
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
</style>
