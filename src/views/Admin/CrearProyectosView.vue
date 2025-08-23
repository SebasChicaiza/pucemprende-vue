<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'

const router = useRouter()

const props = defineProps({
  eventoId: {
    type: [String, Number],
    required: true,
  },
})

// --- Estado principal ---
const loading = ref(false)
const error = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('') // 'success' | 'error'
const showConfirmDialog = ref(false)

// Proyecto
const logoImage = ref({ file: null, id: null, url: '' })
const titulo = ref('')
const descripcion = ref('')

// Equipo (creación por detrás)
const nombreEquipo = ref('')
const miembrosEquipo = ref([]) // [{ persona:{...}, persona_id, rol_id, _isOwner? }]
const cedulaBusqueda = ref('')
const resultadosBusqueda = ref([])
const buscando = ref(false)
const busquedaError = ref('')

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
function isSelfMember(m) {
  return m?.persona_id === currentPersonaId.value
}

function getCurrentPersonaId() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const obj = JSON.parse(raw)
    console.log(obj)
    return obj?.id ?? null
  } catch {
    return null
  }
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

// --- Cargar al creador como miembro fijo (API/persona/:id) ---
async function ensureSelfMemberPresent() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token no encontrado para cargar tus datos.', 'error')
    return
  }

  var userId = getCurrentPersonaId()
  const datosPersona = await axios.get(
    `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  console.log('Datos de persona del usuario actual:', datosPersona.data)
  const personaId = datosPersona?.data?.id

  console.log('Persona ID del usuario actual:', datosPersona?.data?.id)
  currentPersonaId.value = personaId

  console.log('Current persona ID:', currentPersonaId.value)

  if (!personaId) {
    showNotification('No se pudo identificar tu usuario (persona_id).', 'error')
    return
  }
  if (miembrosEquipo.value.some((m) => m.persona_id === personaId)) return

  try {
    const { data: persona } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    miembrosEquipo.value.unshift({
      persona: {
        id: persona?.id,
        nombre: persona?.nombre,
        apellido: persona?.apellido,
        identificacion: persona?.identificacion,
        email: persona?.email,
      },
      persona_id: persona?.id,
      rol_id: 1, // por defecto Líder (editable)
      _isOwner: true,
    })
    console.log(miembrosEquipo.value)
  } catch (e) {
    console.error('No se pudieron cargar tus datos con API/persona/id', e)
    showNotification('No se pudieron cargar tus datos de persona.', 'error')
  }
}

// --- Validaciones ---
function validarFormulario() {
  if (!titulo.value.trim() || !descripcion.value.trim()) {
    showNotification('Por favor completa título y descripción.', 'error')
    return false
  }
  if (descripcion.value.length > 45) {
    showNotification('La descripción no puede tener más de 45 caracteres.', 'error')
    return false
  }
  if (miembrosEquipo.value.length === 0) {
    showNotification('Añade al menos un integrante al equipo.', 'error')
    return false
  }
  if (!miembrosEquipo.value.some((m) => m.rol_id === 1)) {
    showNotification('Debes asignar al menos un integrante con rol de Líder.', 'error')
    return false
  }
  if (!miembrosEquipo.value.some((m) => m.persona_id === currentPersonaId.value)) {
    showNotification('El usuario creador debe pertenecer al equipo.', 'error')
    return false
  }
  return true
}

// ====== APIs de inscripción / activación ======
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

async function activarEventoRolPersonaById(eventoRolPersonaId, headers) {
  await axios.post(
    `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${eventoRolPersonaId}/activar`,
    {},
    { headers },
  )
}

/** CREADOR: prioriza self-inscribe cuando no existe registro */
async function ensureInscripcionActivaCreador(eventoId, personaId, headers) {
  let erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  if (erpId) {
    /*try {
      await activarEventoRolPersonaById(erpId, headers)
      return
    } catch (e) {
      logAxiosError(e, `ACTIVAR CREADOR erpId=${erpId}`)
    }*/
  }
  // No existe => self-inscribe (sin persona_id)
  try {
    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/inscribirse`,
      { evento_id: Number(eventoId) }, // self
      { headers },
    )
  } catch (e) {
    // si ya estaba inscrito pero borrado=true, backend podría devolver 409; seguimos
    if (e?.response?.status !== 409) {
      logAxiosError(e, 'SELF-INSCRIBIR CREADOR')
      throw e
    }
  }
  // Buscar y activar
  erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  /*if (erpId) await activarEventoRolPersonaById(erpId, headers)*/
}

/** OTRO MIEMBRO: inscribe con persona_id si no existe; si 409, re-GET + activar */
async function ensureInscripcionActivaMiembro(eventoId, personaId, headers) {
  let erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  /*if (erpId) {
    await activarEventoRolPersonaById(erpId, headers)
    return
  }*/
  try {
    const payload = {
      persona_id: personaId,
      evento_id: eventoId,
      rol_id: 4,
      estado_borrado: false,
    }
    console.log('Inscribiendo miembro:', JSON.stringify(payload))
    await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona`, payload, {
      headers,
    })
    return
  } catch (e) {
    if (e?.response?.status !== 409) {
      logAxiosError(e, `INSCRIBIR miembro persona_id=${personaId}`)
      throw e
    }
  }
  // 409 => intentar activar
  erpId = await getEventoRolPersonaId(eventoId, personaId, headers)
  /*if (erpId) await activarEventoRolPersonaById(erpId, headers)*/
}

/** Valida/activa TODOS antes de crear proyecto */
async function ensureAllInscripcionesActivas(headers) {
  // 1) Creador
  await ensureInscripcionActivaCreador(props.eventoId, currentPersonaId.value, headers)

  // 2) Demás miembros
  for (const m of miembrosEquipo.value) {
    if (m.persona_id === currentPersonaId.value) continue
    try {
      await ensureInscripcionActivaMiembro(props.eventoId, m.persona_id, headers)
    } catch (e) {
      const fullName = `${m.persona?.nombre ?? ''} ${m.persona?.apellido ?? ''}`.trim()
      showNotification(`No se pudo activar/inscribir a ${fullName}.`, 'error')
      throw e // detener flujo completo
    }
  }
}

// --- Guardado final ---
async function confirmarCreacion() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token de autenticación no encontrado.', 'error')
    return
  }
  const headers = { Authorization: `Bearer ${token}` }

  loading.value = true
  try {
    // (0) **OBLIGATORIO**: asegurar inscripciones ACTIVAS de TODOS (incluido creador)
    await ensureAllInscripcionesActivas(headers)

    // (1) Crear equipo "por detrás"
    const nombreEquipoFinal = nombreEquipo.value.trim() || `${titulo.value.trim() || 'Proyecto'}`

    const equipoRes = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/equipos`,
      {
        nombre: nombreEquipoFinal,
        evento_id: Number(props.eventoId),
        ranking: null,
      },
      { headers },
    )
    const equipoId = equipoRes.data.id

    // (1.1) Registrar miembros del equipo
    const hoy = new Date()
    const fechaInicio = hoy.toISOString().split('T')[0]
    const fechaFin = new Date(hoy.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    for (const miembro of miembrosEquipo.value) {
      try {
        const miembrosEquipo = await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`,
          {
            equipo_id: equipoId,
            persona_id: miembro.persona_id,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          },
          { headers },
        )
        console.log('Miembro al equipo registrado:', JSON.stringify(miembrosEquipo.data))
      } catch (e) {
        console.warn(`Error registrando miembro-equipo (${miembro.persona_id}):`, e)
        showNotification(
          `No se pudo registrar en el equipo a ${miembro.persona?.nombre ?? ''} ${miembro.persona?.apellido ?? ''}.`,
          'error',
        )
      }
    }

    // (2) Crear proyecto
    const { data: proyectoCreado } = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto`,
      {
        titulo: titulo.value,
        descripcion: descripcion.value,
        equipo_id: equipoId,
      },
      { headers },
    )

    // (3) Subir logo (opcional)
    if (logoImage.value?.file) {
      const uploaded = await subirLogoProyecto(logoImage.value.file, proyectoCreado.id)
      if (!uploaded) {
        showNotification('Error al subir el logo del proyecto.', 'error')
        loading.value = false
        closeConfirm()
        return
      }
    }

    // (4) Registrar miembros del proyecto (con rol)
    const fechaInicioP = proyectoCreado.fecha_inicio.split('T')[0]
    const fechaFinP = proyectoCreado.fecha_fin.split('T')[0]
    for (const miembro of miembrosEquipo.value) {
      console.log("Registrando miembro-proyecto:", miembro)
      try {
        const miembrosProyecto = await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto`,
          {
            rol_id: miembro.rol_id,
            proyecto_id: proyectoCreado.id,
            persona_id: miembro.persona_id,
            fecha_inicio: fechaInicioP,
            fecha_fin: fechaFinP,
          },
          { headers },
        )
        console.log('Miembro al proyecto registrado:', JSON.stringify(miembrosProyecto.data))
      } catch (e) {
        console.warn(`Error al registrar miembro-proyecto (${miembro.persona_id}):`, e)
        showNotification(
          `No se pudo registrar en el proyecto a ${miembro.persona?.nombre ?? ''} ${miembro.persona?.apellido ?? ''}.`,
          'error',
        )
      }
    }

    showNotification('Proyecto creado correctamente.', 'success')
    router.push('/admin/proyectos')
  } catch (error) {
    logAxiosError(error, 'Error al crear el proyecto')
    showNotification(
      error?.response?.data?.message || 'Ocurrió un error al crear el proyecto.',
      'error',
    )
  } finally {
    loading.value = false
    closeConfirm()
  }
}

// --- Upload logo y relación ---
async function subirLogoProyecto(file, proyectoId) {
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.split('.')[0])
    formData.append('proyecto_id', proyectoId)

    const uploadResponse = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos/proyecto/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const archivoId = uploadResponse.data.file.id

    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`,
      { proyecto_id: proyectoId, archivo_id: archivoId },
      { headers: { Authorization: `Bearer ${token}` } },
    )

    return { archivo: uploadResponse.data.file }
  } catch (err) {
    logAxiosError(err, 'Subir/Vincular logo')
    return null
  }
}

// --- Manejo de logo (preview) ---
function onLogoChange(event) {
  const file = event.target.files[0]
  if (!file) return
  logoImage.value.file = file
  logoImage.value.url = URL.createObjectURL(file)
}

// --- Buscar y añadir personas por cédula ---
async function buscarPersonaPorCedula() {
  if (!cedulaBusqueda.value.trim()) return
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('No se encontró token de autenticación.', 'error')
    return
  }

  buscando.value = true
  busquedaError.value = ''
  resultadosBusqueda.value = []

  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${cedulaBusqueda.value}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const resultados = Array.isArray(data) ? data : [data]
    resultadosBusqueda.value = resultados.filter((p) => !p.estado_borrado)
  } catch (e) {
    busquedaError.value = 'No se encontraron resultados.'
  } finally {
    buscando.value = false
  }
}

async function seleccionarPersona(persona) {
  if (
    miembrosEquipo.value.some((i) => i.persona?.identificacion === persona.identificacion) ||
    persona?.id === currentPersonaId.value
  ) {
    showNotification('Esta persona ya forma parte del equipo.', 'error')
    return
  }

  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('No se encontró token de autenticación.', 'error')
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${persona.identificacion}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const personaCompleta = Array.isArray(response.data) ? response.data[0] : response.data

    miembrosEquipo.value.push({
      persona: {
        nombre: personaCompleta.nombre,
        apellido: personaCompleta.apellido,
        identificacion: personaCompleta.identificacion,
        email: personaCompleta.email,
      },
      persona_id: personaCompleta.id,
      rol_id: 2, // por defecto Integrante
    })
    console.log(miembrosEquipo.value)

    showNotification('Integrante añadido correctamente.', 'success')
  } catch (error) {
    showNotification('Ocurrió un error al añadir al integrante.', 'error')
    console.error('Error obteniendo persona completa:', error)
  }
}

function eliminarIntegrante(index) {
  const m = miembrosEquipo.value[index]
  if (!m) return
  if (isSelfMember(m)) {
    showNotification('No puedes eliminarte del equipo.', 'error')
    return
  }
  miembrosEquipo.value.splice(index, 1)
}

// --- init ---
onMounted(async () => {
  await ensureSelfMemberPresent()
})
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute title="Home - Eventos - PUCE Emprende - Inscripciones" />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <h2 class="mb-3" style="color: #174384; font-weight: 600">
          Inscríbete con tu proyecto a PUCE Emprende
        </h2>

        <div class="card p-4">
          <!-- Logo -->
          <div
            class="bg-light border rounded d-flex align-items-center p-3 mb-4"
            style="background-color: #e9f1f9"
          >
            <img
              v-if="logoImage.url"
              :src="logoImage.url"
              alt="Vista previa logo"
              class="rounded-circle me-3"
              width="48"
              height="48"
            />
            <div
              v-else
              class="rounded-circle bg-secondary me-3 d-flex align-items-center justify-content-center"
              style="width: 48px; height: 48px"
            >
              <i class="bi bi-image text-white"></i>
            </div>
            <div class="flex-grow-1">
              <div class="text-muted small">Selecciona una imagen</div>
              <strong>Logo del proyecto</strong>
            </div>
            <button class="btn btn-outline-secondary ms-auto" @click="$refs.logoInput.click()">
              Cambiar logo
            </button>
            <input
              type="file"
              ref="logoInput"
              class="d-none"
              accept="image/*"
              @change="onLogoChange"
            />
          </div>

          <!-- Proyecto -->
          <h4 class="text-dark mb-3">Proyecto</h4>
          <p class="text-muted mb-4" style="max-width: 600px">
            Detalla el proyecto con el que te quieres inscribir a este evento y participa en el
            mismo
          </p>

          <div class="mb-3">
            <label class="form-label">Título de tu proyecto</label>
            <input
              v-model="titulo"
              type="text"
              class="form-control"
              placeholder="Ingresa el Nombre de tu proyecto"
            />
          </div>

          <div class="mb-4">
            <label class="form-label">Descripción de tu proyecto</label>
            <textarea
              v-model="descripcion"
              class="form-control"
              rows="3"
              placeholder="Ingresa la descripción de tu proyecto (máx. 45 caracteres)"
            ></textarea>
          </div>

          <!-- Equipo
          <h4 class="text-dark mb-3">Equipo</h4>
          <div class="mb-3">
            <label class="form-label">Nombre del equipo (opcional)</label>
            <input
              v-model="nombreEquipo"
              type="text"
              class="form-control"
              placeholder="Si lo dejas vacío, usaremos el título del proyecto"
            />
          </div>
          -->

          <!-- Buscador por cédula -->
          <div class="mb-3">
            <label class="form-label">Buscar persona por cédula</label>
            <div class="input-group">
              <input
                v-model="cedulaBusqueda"
                class="form-control"
                placeholder="Ej. 1723456789"
                @keyup.enter="buscarPersonaPorCedula"
              />
              <button class="btn btn-secondary" @click="buscarPersonaPorCedula">Buscar</button>
            </div>
            <div v-if="buscando" class="text-muted small mt-1">Buscando...</div>
            <div v-if="busquedaError" class="text-danger small mt-1">{{ busquedaError }}</div>

            <ul v-if="resultadosBusqueda.length" class="list-group mt-3 resultados-scroll">
              <li
                v-for="(persona, index) in resultadosBusqueda"
                :key="index"
                class="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{{ persona.nombre }} {{ persona.apellido }}</strong
                  ><br />
                  <small class="text-muted">Cédula: {{ persona.identificacion }}</small>
                </div>
                <button class="btn btn-sm btn-outline-primary" @click="seleccionarPersona(persona)">
                  Añadir
                </button>
              </li>
            </ul>
          </div>

          <!-- Tabla de integrantes -->
          <div class="mb-4">
            <label class="form-label fw-semibold mb-2">Integrantes añadidos</label>
            <table class="table table-bordered align-middle">
              <thead class="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Correo</th>
                  <th style="width: 160px">Rol en el proyecto</th>
                  <th style="width: 110px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(miembro, index) in miembrosEquipo" :key="index">
                  <td>
                    {{ miembro.persona?.nombre }} {{ miembro.persona?.apellido }}
                    <span v-if="isSelfMember(miembro)" class="badge bg-info ms-1">Tú</span>
                  </td>
                  <td>{{ miembro.persona?.identificacion }}</td>
                  <td>{{ miembro.persona?.email }}</td>
                  <td>
                    <select v-model="miembro.rol_id" class="form-select form-select-sm">
                      <option :value="1">Líder</option>
                      <option :value="2">Integrante</option>
                    </select>
                  </td>
                  <td>
                    <button
                      class="btn btn-sm btn-danger"
                      :disabled="isSelfMember(miembro)"
                      :title="
                        isSelfMember(miembro) ? 'No puedes eliminarte del equipo' : 'Eliminar'
                      "
                      @click="eliminarIntegrante(index)"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
                <tr v-if="miembrosEquipo.length === 0">
                  <td colspan="5" class="text-center text-muted">Sin integrantes aún</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="error" class="text-danger fw-bold mb-3">{{ error }}</div>

          <button
            class="btn btn-primary d-flex align-items-center px-4 py-2 ms-auto"
            style="background-color: #174384"
            :disabled="loading"
            @click="openConfirm"
          >
            <i class="bi bi-check-lg me-2"></i> Inscribirse
          </button>
        </div>
      </div>
    </div>

    <ConfirmationDialog
      :visible="showConfirmDialog"
      message="¿Estás seguro de que deseas crear este proyecto?"
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
textarea::placeholder {
  color: #adb5bd;
}
.form-control,
.form-select {
  border-radius: 6px;
  font-size: 14px;
  padding: 0.6rem 0.75rem;
}
.bg-light {
  background-color: #e9f1f9 !important;
}
.resultados-scroll {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
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
</style>
