<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import CrearEquipoModal from '@/components/Admin/Proyectos/CrearEquipoModal.vue'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'

import { useRoute } from 'vue-router'

const showModal = ref(false)

const router = useRouter()
const route = useRoute()

const eventoId = route.params.eventoId

const miembrosEquipo = ref([])

// Form state
const logoImage = ref({ file: null, id: null, url: '' })
const titulo = ref('')
const descripcion = ref('')
const equipos = ref([])
const selectedEquipo = ref(null)
const loading = ref(false)
const error = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('') // 'success' o 'error'
const showConfirmDialog = ref(false)

function showNotification(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => (showToast.value = false), 3000)
}

function validarFormulario() {
  if (!titulo.value.trim() || !descripcion.value.trim() || !selectedEquipo.value) {
    showNotification('Por favor completa todos los campos.', 'error')
    return false
  }
  if (descripcion.value.length > 45) {
    showNotification('La descripción no puede tener más de 45 caracteres.', 'error')
    return false
  }
  if (!miembrosEquipo.value.some((m) => m.rol_id === 1)) {
    showNotification('Debes asignar al menos un integrante con rol de Líder.', 'error')
    return false
  }
  return true
}

async function confirmarCreacion() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token de autenticación no encontrado.', 'error')
    return
  }

  try {
    const { data: proyectoCreado } = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto`,
      {
        titulo: titulo.value,
        descripcion: descripcion.value,
        equipo_id: selectedEquipo.value,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (logoImage.value && logoImage.value.url) {
      const { data: archivoId } = await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/archivos`,
        {
          url: logoImage.value.url,
          tipo: 'png',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`,
        {
          archivo_id: archivoId,
          proyecto_id: proyectoCreado.id,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }

    showNotification('Proyecto creado correctamente.', 'success')
    router.push('/proyectos')
  } catch (error) {
    console.error('Error al crear el proyecto:', error)
    showNotification('Ocurrió un error al crear el proyecto.', 'error')
  } finally {
    showConfirmDialog.value = false
  }
}

// Mensajes temporales
async function showTimedErrorMessage(msg) {
  error.value = msg
  setTimeout(() => (error.value = ''), 3000)
}

async function showTimedSuccessMessage(msg) {
  // Podrías usar un store o evento para notificar
  console.log(msg)
}

async function fetchMiembrosEquipo(equipoId) {
  const token = localStorage.getItem('token')
  if (!token || !equipoId) return

  try {
    const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const miembrosFiltrados = data.filter((m) => m.equipo_id === equipoId)

    // Llenar cada miembro con su persona si no viene embebida
    const miembrosConPersona = await Promise.all(
      miembrosFiltrados.map(async (m) => {
        if (!m.persona) {
          try {
            const resPersona = await axios.get(
              `${import.meta.env.VITE_URL_BACKEND}/api/persona/${m.persona_id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            )
            m.persona = resPersona.data
          } catch (e) {
            console.warn(`No se pudo obtener persona con ID ${m.persona_id}`)
            m.persona = { nombre: 'N/A', apellido: '', email: '', identificacion: '' }
          }
        }
        return m
      }),
    )

    miembrosEquipo.value = miembrosConPersona
  } catch (error) {
    console.error('Error al obtener miembros del equipo:', error)
    miembrosEquipo.value = []
  }
}

watch(selectedEquipo, (nuevoEquipoId) => {
  if (nuevoEquipoId) {
    fetchMiembrosEquipo(nuevoEquipoId)
  } else {
    miembrosEquipo.value = []
  }
})

// Subir archivo al backend como logo
async function uploadFileToBackend(file) {
  const token = localStorage.getItem('token')
  if (!token) {
    await showTimedErrorMessage('Token de autenticación no encontrado. Por favor, inicie sesión.')
    return null
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', file.name.split('.')[0])
  formData.append('tipo', 'logo')

  loading.value = true
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return { id: response.data.file.id, url: response.data.file.url }
  } catch (err) {
    console.error('Error subiendo logo:', err.response?.data || err.message)
    await showTimedErrorMessage('Error al subir la imagen del logo.')
    return null
  } finally {
    loading.value = false
  }
}

// Manejar selección de archivo
function onLogoChange(event) {
  const file = event.target.files[0]
  if (!file) return
  logoImage.value.file = file
  // vista previa local mientras subes
  logoImage.value.url = URL.createObjectURL(file)
}

// Traer lista de equipos para el select
async function fetchEquipos() {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    equipos.value = data.filter((e) => e.borrado_en === null || e.estado_borrado === false)
  } catch {
    console.warn('No se pudieron cargar equipos')
  }
}

function submitForm() {
  if (!validarFormulario()) return
  showConfirmDialog.value = true
}

onMounted(fetchEquipos)

function handleGuardarEquipo() {
  showModal.value = false
  fetchEquipos()
}
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
        <h4 class="text-dark mb-3">Proyecto</h4>
        <p class="text-muted mb-4" style="max-width: 600px">
          Detalla el proyecto con el que te quieres inscribir a este evento y participa en el mismo
        </p>
        <div class="card p-4">
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

          <div class="mb-3">
            <label class="form-label">Título de tu proyecto</label>
            <input
              v-model="titulo"
              type="text"
              class="form-control"
              placeholder="Ingresa el Nombre de tu proyecto"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Descripción de tu proyecto</label>
            <textarea
              v-model="descripcion"
              class="form-control"
              rows="3"
              placeholder="Ingresa la descripción de tu proyecto"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Equipo participante</label>
            <select v-model="selectedEquipo" class="form-select">
              <option value="" disabled>Selecciona un equipo con el que deseas participar</option>
              <option v-for="e in equipos" :key="e.id" :value="e.id">{{ e.nombre }}</option>
            </select>
            <div v-if="miembrosEquipo.length" class="mt-4">
              <h5>Miembros del equipo seleccionado</h5>
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Correo</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="miembro in miembrosEquipo" :key="miembro.id">
                    <td>{{ miembro.persona?.nombre }} {{ miembro.persona?.apellido }}</td>
                    <td>{{ miembro.persona?.identificacion }}</td>
                    <td>{{ miembro.persona?.email }}</td>

                    <td>
                      <select v-model="miembro.rol_id" class="form-select form-select-sm">
                        <option :value="1">Líder</option>
                        <option :value="2">Integrante</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-2 d-flex align-items-center">
              <span class="me-2 text-muted small">Si no tienes equipo, crea uno</span>
              <button
                class="btn btn-sm btn-outline-primary btn-crearequipo"
                @click="showModal = true"
              >
                Crear equipo +
              </button>
              <!-- Modal -->
              <CrearEquipoModal
                :visible="showModal"
                :evento-id="eventoId"
                @close="showModal = false"
                @guardar="handleGuardarEquipo"
              />
            </div>
          </div>

          <div v-if="error" class="text-danger fw-bold mb-3">{{ error }}</div>

          <button
            class="btn btn-primary d-flex align-items-center px-4 py-2 ms-auto"
            style="background-color: #174384"
            @click="submitForm"
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
      @cancel="() => (showConfirmDialog.value = false)"
    />

    <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
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

.card {
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: none;
}

.btn-outline-secondary {
  font-weight: 500;
}

.bg-light {
  background-color: #e9f1f9 !important;
}
.btn-crearequipo {
  font-weight: 500;
  color: #174384;
  border-color: #174384;
  transition: 0.1s ease-in-out;
}
.btn-crearequipo:hover {
  background-color: #174384;
  color: white;
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
  transition: opacity 0.3s ease-in-out;
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
