<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import LoaderComponent from '@/components/LoaderComponent.vue'

// --- Router / Route ---
const route = useRoute()
const router = useRouter()
const proyectoId = Number(route.params.id ?? 0)

// --- API auth headers ---
function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// --- UI State ---
const loading = ref(true)
const guardando = ref(false)
const error = ref('')
const showToast = ref(false)
const toastMensaje = ref('')
const toastType = ref('success')

// --- Confirm modal (único) ---
const confirmState = ref({
  visible: false,
  message: '',
  loading: false,
  onConfirm: null,
})

// --- Proyecto (form + meta) ---
const proyecto = ref({})
const titulo = ref('')
const descripcion = ref('')
const estado = ref('ACTIVO') // 'ACTIVO' | 'INACTIVO'
const equipos = ref([])
const selectedEquipo = ref('') // id en string para <select>
const dynamicTitle = ref('Proyecto')
const logoUrl = ref('')

// Puedes usar este computed si quieres el listado como string
const equiposNombres = computed(() => equipos.value.map(e => e?.nombre).filter(Boolean).join(', ') || 'Sin equipos')

// --- Miembros ---
const miembrosProyecto = ref([])
const miembroIndexByPersonaId = ref({})
const currentPersonaId = ref(0)
const savingRole = reactive({})

// --- Búsqueda por cédula ---
const cedulaBusqueda = ref('')
const resultadosBusqueda = ref([])
const busquedaError = ref('')

// --- Logo (preview / upload) ---
const logoImage = ref({ file: null, id: null, url: '' })
let _objectUrl = null

// --- Utils ---
function notify(msg, type = 'success', ms = 2500) {
  toastMensaje.value = msg
  toastType.value = type
  showToast.value = true
  window.clearTimeout(notify._t)
  notify._t = window.setTimeout(() => (showToast.value = false), ms)
}
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

// --- Helpers miembros ---
function mapMiembro(m) {
  return {
    persona_id: Number(m.persona_id ?? m.persona?.id),
    nombre: m.nombre ?? m.persona?.nombre ?? '',
    apellido: m.apellido ?? m.persona?.apellido ?? '',
    email: m.email ?? m.persona?.email ?? '',
    rol_id: Number(m.rol_id ?? m.rol?.id ?? 2),
    mp_id: Number(m.id) || null,
  }
}
async function buildMiembrosProyectoIndex() {
  const idx = {}
  for (const [i, m] of miembrosProyecto.value.entries()) {
    if (m?.persona_id != null) idx[m.persona_id] = i
  }
  miembroIndexByPersonaId.value = idx
}

async function fetchCurrentPersonaId() {
  try {
    const userId = Number(localStorage.getItem('user_id'))
    if (!userId) return
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
      { headers: authHeaders() },
    )
    currentPersonaId.value = Number(data?.id ?? 0)
  } catch {
    currentPersonaId.value = 0
  }
}

// --- Carga de proyecto (USANDO TU ENDPOINT) ---
async function cargarProyectoCompleto() {
  const headers = authHeaders()
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
      // ya no usamos equipo_nombre; el back trae lista de equipos
      logoUrl: logo,
    }

    // Sincroniza form
    titulo.value = data.titulo ?? ''
    descripcion.value = data.descripcion ?? ''
    estado.value = String(data.estado ?? 'ACTIVO').toUpperCase()

    // NUEVO: lista de equipos asociados
    equipos.value = Array.isArray(data.equipos)
      ? data.equipos.map(e => ({ id: Number(e.id), nombre: e.nombre ?? '' }))
      : []

    // Miembros
    miembrosProyecto.value = Array.isArray(data.miembros) ? data.miembros.map(mapMiembro) : []
    await buildMiembrosProyectoIndex()
    await fetchCurrentPersonaId()

    // Logo (vista + valor)
    logoUrl.value = logo ?? ''
    logoImage.value.url = logo ?? ''

    // Título dinámico + <title>
    dynamicTitle.value = data.titulo ?? 'Proyecto'
    document.title = `PUCEmprende – ${dynamicTitle.value}`

    error.value = ''
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
    error.value = 'No se pudo cargar el proyecto.'
    notify('No se pudo cargar el proyecto.', 'error')
  }
}

async function cargarEquipos() {
  try {
    const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers: authHeaders(),
    })
    equipos.value = Array.isArray(data) ? data : []
  } catch {
    equipos.value = []
  }
}

// --- Lifecycle ---
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([cargarProyectoCompleto(), cargarEquipos()])
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (_objectUrl) URL.revokeObjectURL(_objectUrl)
})

// --- Roles y permisos ---
function puedeEliminar(miembro) {
  return (
    Number(miembro.rol_id) !== 1 && // no líder
    miembrosProyecto.value.length > 1 &&
    Number(miembro.persona_id) !== Number(currentPersonaId.value)
  )
}

async function onChangeRol(miembro, event) {
  const nuevoRol = Number(event.target.value)
  if (nuevoRol === Number(miembro.rol_id)) return
  savingRole[miembro.persona_id] = true
  try {
    await axios.patch(
      `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/rol`,
      {
        persona_id: miembro.persona_id,
        proyecto_id: proyectoId,
        rol_id: nuevoRol,
      },
      { headers: authHeaders() },
    )
    miembro.rol_id = nuevoRol
    notify('Rol actualizado correctamente.')
  } catch {
    notify('No se pudo actualizar el rol.', 'error')
  } finally {
    savingRole[miembro.persona_id] = false
  }
}

// --- Búsqueda y alta de miembros ---
async function buscarPersona() {
  busquedaError.value = ''
  resultadosBusqueda.value = []
  const q = cedulaBusqueda.value?.trim()
  if (!q) return
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${q}`,
      { headers: authHeaders() },
    )

    const lista = Array.isArray(data) ? data : (data ? [data] : [])
    if (!lista.length) {
      busquedaError.value = 'No se encontró persona con esa cédula.'
      return
    }

    // Evitar duplicados ya presentes en el proyecto
    const existentes = new Set(miembrosProyecto.value.map((m) => Number(m.persona_id)))
    const sinDuplicados = lista.filter((p) => !existentes.has(Number(p.id)))

    if (!sinDuplicados.length) {
      busquedaError.value = 'Esta persona ya es miembro del proyecto.'
      return
    }

    // Normalizar campos esperados por la vista
    resultadosBusqueda.value = sinDuplicados.map((p) => ({
      id: Number(p.id),
      nombre: p.nombre ?? '',
      apellido: p.apellido ?? '',
      email: p.email ?? '',
      identificacion: p.identificacion ?? p.cedula ?? '',
    }))
  } catch {
    busquedaError.value = 'No se encontró persona con esa cédula.'
  }
}

async function agregarMiembro(persona) {
  try {
    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto`,
      {
        persona_id: persona.id,
        proyecto_id: proyectoId,
        rol_id: 2,
      },
      { headers: authHeaders() },
    )
    const nuevo = mapMiembro({ ...persona, rol_id: 2 })
    miembrosProyecto.value.push(nuevo)
    await buildMiembrosProyectoIndex()
    resultadosBusqueda.value = []
    cedulaBusqueda.value = ''
    notify('Miembro añadido al proyecto.')
  } catch {
    notify('No se pudo añadir al miembro.', 'error')
  }
}

// --- Eliminar miembro ---
function pedirEliminarMiembro(miembro) {
  openConfirm(
    `¿Seguro que deseas eliminar a ${miembro.nombre} ${miembro.apellido} del proyecto?`,
    async () => {
      const headers = authHeaders()
      confirmState.value.loading = true
      try {
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto/salir/${miembro.persona_id}/${proyectoId}`,
          { headers },
        )
        miembrosProyecto.value = miembrosProyecto.value.filter(
          (m) => Number(m.persona_id) !== Number(miembro.persona_id),
        )
        await buildMiembrosProyectoIndex()
        notify('Miembro eliminado del proyecto.', 'success')
        closeConfirm()
      } catch {
        notify('No se pudo eliminar el miembro.', 'error')
      } finally {
        confirmState.value.loading = false
        closeConfirm()
      }
    },
  )
}

// --- Logo ---
function onLogoChange(e) {
  const f = e.target?.files?.[0]
  if (!f) return
  logoImage.value.file = f
  if (_objectUrl) URL.revokeObjectURL(_objectUrl)
  _objectUrl = URL.createObjectURL(f)
  logoImage.value.url = _objectUrl
}

// --- Guardar / Eliminar proyecto ---
async function submitEdicion() {
  guardando.value = true
  try {
    if (logoImage.value.file) {
      const fd = new FormData()
      fd.append('titulo', titulo.value)
      fd.append('descripcion', descripcion.value)
      fd.append('estado', estado.value)
      if (selectedEquipo.value) fd.append('equipo_id', selectedEquipo.value)
      fd.append('logo', logoImage.value.file)
      await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}?_method=PUT`,
        fd,
        { headers: { ...authHeaders() } },
      )
    } else {
      await axios.put(
        `${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}`,
        {
          titulo: titulo.value,
          descripcion: descripcion.value,
          estado: estado.value,
          equipo_id: selectedEquipo.value || null,
        },
        { headers: authHeaders() },
      )
    }
    notify('Proyecto actualizado.')
  } catch {
    notify('No se pudo guardar el proyecto.', 'error')
  } finally {
    guardando.value = false
  }
}

function eliminarProyecto() {
  openConfirm(
    '¿Seguro que deseas eliminar este proyecto? Esta acción no se puede deshacer.',
    async () => {
      confirmState.value.loading = true
      try {
        await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}`, {
          headers: authHeaders(),
        })
        notify('Proyecto eliminado.', 'success')
        closeConfirm()
        router.push({ name: 'ProyectosListado' }).catch(() => router.push('/admin/proyectos'))
      } catch {
        notify('No se pudo eliminar el proyecto.', 'error')
      } finally {
        confirmState.value.loading = false
        closeConfirm()
      }
    },
  )
}
</script>

<template>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column">
      <PageHeaderRoute :dynamicTitle="dynamicTitle" :currentRouteName="'ProyectoDetalle'" />

      <LoaderComponent v-if="loading" />

      <div
        v-else
        class="p-4 overflow-y-scroll flex-grow-1 detalle-proyecto"
        style="height: calc(100vh - 60px)"
      >
        <!-- Hero -->
        <div class="project-hero bg-light border rounded d-flex align-items-center p-4 mb-4 gap-3">
          <img
            v-if="logoImage && logoImage.url"
            :src="logoImage.url"
            class="avatar-xl rounded-circle border border-3 border-light-subtle shadow-sm"
            alt="Logo del proyecto"
          />
          <div
            v-else
            class="logo-placeholder rounded-circle bg-secondary d-flex align-items-center justify-content-center"
          >
            <i class="bi bi-image text-white"></i>
          </div>
          <div class="flex-grow-1">
            <h2 class="mb-1 fw-bold hero-title">{{ titulo }}</h2>
            <ul class="list-inline mb-0 mt-2">
              <li class="list-inline-item chip">
                <i class="bi" :class="estado === 'ACTIVO' ? 'bi-check-circle-fill text-success' : 'bi-pause-circle-fill text-secondary'"></i>
                <span class="fw-semibold">Estado:</span> <span class="fw-bold">{{ estado }}</span>
              </li>
              <li class="list-inline-item chip">
                <i class="bi bi-people-fill" style="color:#174384;"></i>
                <span class="fw-semibold">Miembros:</span> <span class="fw-bold">{{ miembrosProyecto.length }}</span>
              </li>
              <li class="list-inline-item chip">
                <i class="bi bi-diagram-3-fill" style="color:#174384;"></i>
                <span class="fw-semibold">Equipos:</span> <span class="fw-bold">{{ equipos.length }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Acerca del proyecto -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <h5 class="section-title fw-bold mb-3"><i class="bi bi-info-circle me-2 text-primary"></i>Acerca del proyecto</h5>
            <p class="mb-0 text-wrap">{{ descripcion || 'Sin descripción.' }}</p>
          </div>
        </div>

        <!-- Detalles -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <h5 class="section-title fw-bold mb-3"><i class="bi bi-card-list me-2 text-primary"></i>Detalles</h5>
            <div class="row g-3">

              <!-- NUEVO: lista de equipos -->
              <div class="col-12">
                <div class="detail-item p-3 rounded">
                  <div class="detail-label text-uppercase text-muted fw-semibold mb-2">Equipos asociados</div>
                  <div v-if="equipos.length" class="d-flex flex-wrap gap-2">
                    <span
                      v-for="eq in equipos"
                      :key="eq.id"
                      class="chip sm fw-semibold"
                      title="Equipo"
                    >
                      <i class="bi bi-people-fill me-1 text-primary"></i>{{ eq.nombre }}
                    </span>
                  </div>
                  <div v-else class="text-muted">Sin equipos.</div>
                </div>
              </div>


              <div class="col-12 col-sm-6 col-lg-4" v-if="proyecto?.fecha_fin">
                <div class="detail-item p-3 rounded">
                  <div class="detail-label text-uppercase text-muted fw-semibold">Fecha fin</div>
                  <div class="detail-value fw-bold">{{ new Date(proyecto.fecha_fin).toLocaleDateString() }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Miembros -->
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <h5 class="section-title fw-bold mb-3"><i class="bi bi-people me-2 text-primary"></i>Miembros del proyecto</h5>
            <div class="row">
              <div
                class="col-12 col-md-6 col-lg-4 mb-3"
                v-for="miembro in miembrosProyecto"
                :key="miembro.persona_id"
              >
                <div class="member-card card border-0 shadow-sm h-100 p-3 d-flex align-items-start gap-3">
                  <div class="member-avatar d-flex align-items-center justify-content-center rounded-circle">
                    <i class="bi bi-person fs-4 text-primary"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div class="fw-bold">{{ miembro.nombre }} {{ miembro.apellido }}</div>
                    <div class="text-muted small">{{ miembro.email }}</div>
                  </div>
                  <span class="badge role-badge"
                        :class="Number(miembro.rol_id) === 1 ? 'bg-primary-subtle text-primary-emphasis border border-primary-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle'">
                    {{ Number(miembro.rol_id) === 1 ? 'Líder' : 'Integrante' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Toast -->
  <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
    {{ toastMensaje }}
  </div>

  <!-- Confirm Dialog -->
  <div v-if="confirmState.visible" class="modal-backdrop" role="dialog" aria-modal="true">
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
</template>

<style scoped>
/* Cards como en CrearProyectos */
.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: none;
}

/* Paleta */
.bg-light { background-color: #e9f1f9 !important; }
.hero-title, .section-title { color: #174384; }

/* Hero */
.project-hero { border: 1px solid #dbe7f5; }
.avatar-xl { width: 86px; height: 86px; object-fit: cover; }
.logo-placeholder { width: 86px; height: 86px; }

/* Chips (soft azules) */
.chip {
  background: #e9f1f9;
  border: 1px solid #dbe7f5;
  color: #174384;
  padding: 6px 10px;
  border-radius: 999px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
}
.chip.sm { padding: 4px 8px; font-size: 0.8rem; }

/* Items detalle y miembros */
.detail-item {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
}
.detail-label { font-size: 0.75rem; letter-spacing: 0.04em; color: #64748b; }
.detail-value { font-size: 1.05rem; color: #1f2937; }

.member-card {
  border-radius: 10px;
  border: 1px solid #eee;
  background: #fff;
}
.member-avatar { width: 42px; height: 42px; background: #e9f1f9; }

.btn-danger { margin-bottom: 1rem; width: 20rem; }
.toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #333; color: #fff; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.2); z-index: 3000; opacity: 0; transition: opacity .2s; pointer-events: none; }
.toast-notification.show { opacity: 1; }
.toast-notification.success { background-color: #28a745; }
.toast-notification.error { background-color: #dc3545; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 3100; }
.modal-card { background: #fff; border-radius: 10px; padding: 18px; width: min(92vw, 440px); box-shadow: 0 10px 25px rgba(0,0,0,.18); }
</style>
