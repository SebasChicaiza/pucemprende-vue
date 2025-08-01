<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import CrearEquipoModal from '@/components/Admin/Proyectos/CrearEquipoModal.vue'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'

import { useRoute } from 'vue-router'

import { useEventosInscritosStore } from '@/stores/useEventosInscritosStore'
import { storeToRefs } from 'pinia'

const eventosInscritosStore = useEventosInscritosStore()
const { eventos } = storeToRefs(eventosInscritosStore)

const showModal = ref(false)

const router = useRouter()
const route = useRoute()

const miembrosEquipo = ref([])

const props = defineProps({
  eventoId: {
    type: [String, Number], // o el tipo de dato que corresponda
    required: true, // o false si es opcional
  },
})
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

async function inscribirEnEvento() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('Token no encontrado', 'error')
    return false
  }

  try {
    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/inscribirse`,
      { evento_id: props.eventoId },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    console.log('✅ Usuario inscrito al evento antes de crear proyecto')
    eventosInscritosStore.eventos.push({ evento_id: Number(props.eventoId) })
    return true
  } catch (err) {
    console.error('❌ Error al inscribirse al evento', err)
    showNotification('Error al inscribirse al evento.', 'error')
    return false
  }
}

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
  const headers = { Authorization: `Bearer ${token}` }

  const yaInscrito = eventosInscritosStore.estaInscrito(Number(props.eventoId))
  if (!yaInscrito) {
    const inscrito = await inscribirEnEvento()
    if (!inscrito) return
  }

  try {
    // 1. Creamos el proyecto
    const { data: proyectoCreado } = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto`,
      {
        titulo: titulo.value,
        descripcion: descripcion.value,
        equipo_id: selectedEquipo.value,
      },
      { headers: { Authorization: `Bearer ${token}` } },
      { headers },
    )

    // 2. Subimos logo (si aplica)
    if (logoImage.value?.file) {
      const uploaded = await subirLogoProyecto(logoImage.value.file, proyectoCreado.id)
      if (!uploaded) {
        showNotification('Error al subir el logo del proyecto.', 'error')
        return
      }
    }

    // 3. Inscribir cada miembro del equipo al evento
    for (const miembro of miembrosEquipo.value) {
      try {
        await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/inscribirse`,
          { evento_id: Number(props.eventoId), persona_id: miembro.persona_id },
          { headers },
        )
      } catch (e) {
        console.warn(`No se pudo inscribir persona ${miembro.persona_id}:`, e)
      }
    }

    // 4. Registrar cada miembro en miembros-proyecto
    //    Usamos las fechas que devuelve el backend al crear el proyecto
    const fechaInicio = proyectoCreado.fecha_inicio.split('T')[0]
    const fechaFin = proyectoCreado.fecha_fin.split('T')[0]
    for (const miembro of miembrosEquipo.value) {
      try {
        await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto`,
          {
            rol_id: miembro.rol_id,
            proyecto_id: proyectoCreado.id,
            persona_id: miembro.persona_id,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          },
          { headers },
        )
      } catch (e) {
        console.warn(`Error al registrar miembro-proyecto (${miembro.persona_id}):`, e)
      }
    }

    showNotification('Proyecto creado correctamente.', 'success')
    router.push('/admin/proyectos')
  } catch (error) {
    console.error('Error al crear el proyecto:', error)
    showNotification('Ocurrió un error al crear el proyecto.', 'error')
  } finally {
    showConfirmDialog.value = false
  }
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
function handleCancel() {
  showConfirmDialog.value = false
}

watch(selectedEquipo, (nuevoEquipoId) => {
  if (nuevoEquipoId) {
    fetchMiembrosEquipo(nuevoEquipoId)
  } else {
    miembrosEquipo.value = []
  }
})

async function subirLogoProyecto(file, proyectoId) {
  const token = localStorage.getItem('token')
  if (!token) {
    setTimeout(() => {}, 2000) // Tiempo suficiente para que el usuario lo vea
    return null
  }

  try {
    //  Subir el archivo (ya crea el registro en la tabla archivos)
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

    console.log('Archivo subido:', uploadResponse.data)

    // Crear la relación en archivos-proyecto usando el ID devuelto
    const archivoId = uploadResponse.data.file.id // ID del archivo creado

    const relacionData = {
      proyecto_id: proyectoId,
      archivo_id: archivoId,
    }

    const relacionResponse = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`,
      relacionData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    console.log('Relación proyecto-archivo creada:', relacionResponse.data)

    return {
      archivo: uploadResponse.data.file,
      relacion: relacionResponse.data,
    }
  } catch (err) {
    console.error('Error al subir y vincular el logo:', err.response?.data || err.message)
    setTimeout(() => {}, 2000) // Tiempo suficiente para que el usuario lo vea

    return null
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

onMounted(async () => {
  await eventosInscritosStore.fetchEventosInscritos()
  fetchEquipos()
})

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
      @cancel="handleCancel"
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
