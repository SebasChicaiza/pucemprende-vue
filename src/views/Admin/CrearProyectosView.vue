<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted } from 'vue'
import axios from 'axios'
import CrearEquipoModal from '@/components/Admin/Proyectos/CrearEquipoModal.vue'

import { useRoute } from 'vue-router'

const showModal = ref(false)

const route = useRoute()

const eventoId = route.params.eventoId

// Form state
const logoImage = ref({ file: null, id: null, url: '' })
const titulo = ref('')
const descripcion = ref('')
const equipos = ref([])
const selectedEquipo = ref(null)
const loading = ref(false)
const error = ref('')

// Mensajes temporales
async function showTimedErrorMessage(msg) {
  error.value = msg
  setTimeout(() => (error.value = ''), 3000)
}

async function showTimedSuccessMessage(msg) {
  // Podrías usar un store o evento para notificar
  console.log(msg)
}

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
    equipos.value = data
  } catch {
    console.warn('No se pudieron cargar equipos')
  }
}

// Enviar formulario de inscripción
async function submitForm() {
  if (!titulo.value || !descripcion.value || !selectedEquipo.value) {
    await showTimedErrorMessage('Completa todos los campos obligatorios.')
    return
  }

  // Subimos logo si hay archivo nuevo
  if (logoImage.value.file) {
    const uploaded = await uploadFileToBackend(logoImage.value.file)
    if (uploaded) {
      logoImage.value.id = uploaded.id
      logoImage.value.url = uploaded.url
      await showTimedSuccessMessage('Logo cargado correctamente')
    } else {
      return
    }
  }

  // Crear proyecto
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto`,
      {
        titulo: titulo.value,
        descripcion: descripcion.value,
        equipo_id: selectedEquipo.value,
        logo_id: logoImage.value.id,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    await showTimedSuccessMessage('Inscripción exitosa')
    // redirigir o limpiar formulario
  } catch (err) {
    console.error('Error al crear proyecto:', err)
    await showTimedErrorMessage('Error al enviar inscripción. Intenta de nuevo.')
  } finally {
    loading.value = false
  }
}

onMounted(fetchEquipos)
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
</style>
