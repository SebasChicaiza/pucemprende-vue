<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
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
const dynamicTitle = ref('Proyecto')
const logoUrl = ref('')

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

// --- Carga de proyecto (USANDO /proyectos-completos/:id) ---
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
      titulo: data.titulo ?? '',
      descripcion: data.descripcion ?? '',
      logoUrl: logo,
    }

    // Sincroniza form
    titulo.value = data.titulo ?? ''
    descripcion.value = data.descripcion ?? ''
    estado.value = String(data.estado ?? 'ACTIVO').toUpperCase()

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

// --- Lifecycle ---
onMounted(async () => {
  loading.value = true
  try {
    await cargarProyectoCompleto()
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

    // evitar duplicados ya presentes en el proyecto
    const existentes = new Set(miembrosProyecto.value.map((m) => Number(m.persona_id)))
    const sinDuplicados = lista.filter((p) => !existentes.has(Number(p.id)))

    if (!sinDuplicados.length) {
      busquedaError.value = 'Esta persona ya es miembro del proyecto.'
      return
    }

    // normalizar para la vista
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
      fd.append('logo', logoImage.value.file)
      await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/proyecto/${proyectoId}?_method=PUT`,
        fd,
        { headers: { ...authHeaders() } },
      )
    } else {
      await axios.put(
        `${import.meta.env.VITE_URL_BACKEND}/api/proyecto/${proyectoId}`,
        {
          titulo: titulo.value,
          descripcion: descripcion.value,
          estado: estado.value,
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
      <PageHeaderRoute :dynamicTitle="dynamicTitle" :currentRouteName="'ProyectoEditar'" />

      <LoaderComponent v-if="loading" />

      <div v-else class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <h3 class="mb-4">Editar Proyecto</h3>
        <button class="btn btn-danger" @click="eliminarProyecto">Eliminar Proyecto</button>

        <div class="card p-4">
          <div class="mb-3 text-center">
            <img
              v-if="logoImage && logoImage.url"
              :src="logoImage.url"
              class="rounded-circle"
              width="80"
              alt="Logo del proyecto"
            />
            <input type="file" class="form-control mt-2" @change="onLogoChange" accept="image/*" />
          </div>

          <div class="mb-3">
            <label class="form-label">Título</label>
            <input v-model="titulo" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Descripción</label>
            <textarea v-model="descripcion" class="form-control" rows="3"></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Estado</label>
            <select v-model="estado" class="form-select">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          <!-- Miembros del proyecto -->
          <div class="mb-3">
            <label class="form-label">Miembros del proyecto</label>
            <div class="row">
              <div
                class="col-12 col-md-6 col-lg-4 mb-3"
                v-for="miembro in miembrosProyecto"
                :key="miembro.persona_id"
              >
                <div class="card p-2 d-flex flex-row align-items-center gap-2">
                  <i class="bi bi-person-circle fs-2 text-primary" aria-hidden="true"></i>
                  <div class="flex-grow-1">
                    <div class="fw-bold">{{ miembro.nombre }} {{ miembro.apellido }}</div>
                    <div class="text-muted small">{{ miembro.email }}</div>
                  </div>

                  <select
                    class="form-select form-select-sm"
                    :value="miembro.rol_id"
                    :disabled="savingRole[miembro.persona_id]"
                    @change="(e) => onChangeRol(miembro, e)"
                    style="max-width: 110px"
                    aria-label="Cambiar rol"
                  >
                    <option :value="1">Líder</option>
                    <option :value="2">Integrante</option>
                  </select>

                  <button
                    class="btn btn-outline-danger btn-sm"
                    @click="pedirEliminarMiembro(miembro)"
                    v-if="puedeEliminar(miembro)"
                    title="Eliminar miembro"
                    aria-label="Eliminar miembro"
                  >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Añadir miembro -->
            <div class="input-group mt-2">
              <input
                v-model="cedulaBusqueda"
                type="text"
                class="form-control"
                placeholder="Buscar por cédula"
                @keyup.enter="buscarPersona"
              />
              <button class="btn btn-outline-primary" @click="buscarPersona">Buscar</button>
            </div>
            <div v-if="busquedaError" class="text-danger small mt-1">{{ busquedaError }}</div>

            <div v-if="resultadosBusqueda.length" class="mt-2">
              <div
                v-for="persona in resultadosBusqueda"
                :key="persona.id"
                class="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2"
              >
                <div>
                  <div class="fw-semibold">{{ persona.nombre }} {{ persona.apellido }}</div>
                  <div class="text-muted small">Cédula: {{ persona.identificacion }}</div>
                </div>
                <button class="btn btn-success btn-sm" @click="agregarMiembro(persona)">
                  Añadir
                </button>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" @click="submitEdicion" :disabled="guardando">
            <span v-if="guardando">
              <i class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></i>
              Guardando...
            </span>
            <span v-else>Guardar proyecto</span>
          </button>
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
.btn-danger {
  margin-bottom: 1rem;
  width: 20rem;
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
