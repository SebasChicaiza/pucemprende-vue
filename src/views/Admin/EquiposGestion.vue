<template>
  <LoaderComponent v-if="loading" />
  <div v-else class="d-flex admin-panel-layout">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column main-content-wrapper">
      <PageHeaderRoute />
      <div class="content-scroll-wrapper">
        <div class="equipos-header d-flex justify-content-between align-items-center mb-4">
          <h2 class="dashboard-title">Gestión de Equipos</h2>
          <div
            class="equipos-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4"
          ></div>

          <!-- Button to open modal for creating a new team -->
          <button class="btn btn-primary" @click="openCreateEquipoModal">+ Nuevo equipo</button>
        </div>
        <div class="d-flex flex-column flex-md-row gap-2 w-100 w-md-auto mt-3 mt-md-0">
          <input
            v-model="filtroTexto"
            type="text"
            class="form-control mb-3"
            placeholder="Buscar por nombre o integrante..."
          />
        </div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>

        <div v-if="equipos.length === 0" class="text-center text-muted mt-5">
          No hay equipos registrados aún.
        </div>

        <div v-for="equipo in equiposFiltrados" :key="equipo.id" class="card mb-4 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="card-title">{{ equipo.nombre }}</h4>
              <div>
                <!-- Button to open modal for editing an existing team -->
                <button
                  class="btn btn-outline-secondary btn-sm me-2"
                  @click="openEditEquipoModal(equipo)"
                >
                  Editar
                </button>
                <!-- Button to delete a team -->
                <button
                  class="btn btn-outline-danger btn-sm"
                  @click="confirmDeleteEquipo(equipo.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <p class="fw-bold mb-2">Integrantes:</p>
            <ul class="list-group">
              <li
                class="list-group-item"
                v-for="integrante in equipo.integrantes"
                :key="integrante.id"
              >
                <span v-if="integrante.persona">
                  {{ integrante.persona.nombre }} {{ integrante.persona.apellido }} | Cédula:
                  {{ integrante.persona.identificacion }} | Correo: {{ integrante.persona.email }} |
                  Teléfono: {{ integrante.persona.telefono || 'N/A' }} | <strong>Rol:</strong>
                  {{ integrante.rol || 'Sin rol' }}
                </span>
                <span v-else class="text-muted">Persona no encontrada</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- FormularioEquipoModal component -->
  <FormularioEquipoModal
    :visible="showFormularioEquipoModal"
    :eventoId="1"
    :equipoData="currentEquipoForEdit"
    @close="closeFormularioEquipoModal"
    @guardar="handleEquipoSaved"
  />

  <!-- Custom Confirmation Dialog -->
  <ConfirmationDialog
    :visible="showConfirmDialog"
    :message="confirmDialogMessage"
    @confirm="executeDeleteEquipo"
    @cancel="cancelDeleteEquipo"
  />

  <!-- Toast de éxito -->
  <div v-if="showToast" class="toast-custom position-fixed bottom-0 end-0 m-4">
    {{ mensajeExito }}
  </div>
</template>

<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import FormularioEquipoModal from '@/components/Admin/Proyectos/FormularioEquipoModal.vue' // Import the modal component
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue' // Import the new confirmation dialog
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const loading = ref(true)
const error = ref('')
const equipos = ref([])
const filtroTexto = ref('')

const equiposFiltrados = computed(() => {
  const texto = filtroTexto.value.toLowerCase()
  return equipos.value.filter((equipo) => {
    const nombreEquipo = equipo.nombre?.toLowerCase() || ''
    const nombresIntegrantes = equipo.integrantes
      .map((i) => `${i.persona?.nombre || ''} ${i.persona?.apellido || ''}`.toLowerCase())
      .join(' ')
    return nombreEquipo.includes(texto) || nombresIntegrantes.includes(texto)
  })
})
// State for the modals
const showFormularioEquipoModal = ref(false)
const currentEquipoForEdit = ref(null) // Holds the team data when editing

const showConfirmDialog = ref(false)
const confirmDialogMessage = ref('')
const teamIdToDelete = ref(null) // To store the ID of the team to be deleted

const mensajeExito = ref('')
const showToast = ref(false)

function mostrarToast(mensaje) {
  mensajeExito.value = mensaje
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
    mensajeExito.value = ''
  }, 3000)
}

onMounted(fetchEquipos)

async function fetchEquipos() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token no encontrado'
    loading.value = false
    return
  }

  try {
    // Fetch all necessary data concurrently
    const [resEquipos, resMiembros, resPersonas] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/persona`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    let allEquipos = resEquipos.data
    const allMiembros = resMiembros.data
    const allPersonas = resPersonas.data

    // Filter out teams where estado_borrado is true
    if (Array.isArray(allEquipos)) {
      allEquipos = allEquipos.filter((equipo) => equipo.estado_borrado !== true)
    } else {
      console.warn(
        'API /api/equipos did not return an array. Team data might be incomplete or malformed.',
      )
      allEquipos = [] // Ensure it's an array for subsequent processing
    }

    // Create maps for quick lookup
    const personasMap = new Map()
    if (Array.isArray(allPersonas)) {
      allPersonas.forEach((persona) => {
        personasMap.set(persona.id, persona)
      })
    } else {
      console.warn('API /api/persona did not return an array. Person data might be incomplete.')
    }

    // Process teams and assign members
    const processedEquipos = allEquipos.map((equipo) => {
      // Filter members belonging to the current team
      const teamMembers = Array.isArray(allMiembros)
        ? allMiembros.filter((miembro) => miembro.equipo_id === equipo.id)
        : []

      // Enrichen each member with their corresponding person data
      const integrantesConPersona = teamMembers.map((miembro) => {
        const persona = personasMap.get(miembro.persona_id) || null // Get person from map
        return {
          ...miembro, // Keep all original miembro properties (like 'id' for deletion)
          persona: persona, // Assign the found persona object
          rol: miembro.rol || 'Sin rol', // Keep the role from the miembro object
        }
      })

      return {
        ...equipo,
        integrantes: integrantesConPersona,
      }
    })

    equipos.value = processedEquipos
  } catch (err) {
    console.error('Error al cargar datos:', err)
    error.value = err.response?.data?.message || 'Error al cargar equipos o miembros'
  } finally {
    loading.value = false
  }
}

// Functions to control the FormularioEquipoModal
function openCreateEquipoModal() {
  currentEquipoForEdit.value = null // No team data means creating a new one
  showFormularioEquipoModal.value = true
}

function openEditEquipoModal(equipo) {
  currentEquipoForEdit.value = equipo // Pass the selected team's data
  showFormularioEquipoModal.value = true
}

function closeFormularioEquipoModal() {
  showFormularioEquipoModal.value = false
  currentEquipoForEdit.value = null // Clear the data when modal closes
}

function handleEquipoSaved() {
  closeFormularioEquipoModal() // Close the modal
  fetchEquipos() // Re-fetch all teams to update the list with new/edited data
}

// Functions to control the ConfirmationDialog
function confirmDeleteEquipo(equipoId) {
  teamIdToDelete.value = equipoId
  confirmDialogMessage.value =
    '¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer.'
  showConfirmDialog.value = true
}

async function executeDeleteEquipo() {
  const token = localStorage.getItem('token')
  if (!token) {
    mostrarToast('No se encontró token de autenticación. Por favor, inicia sesión.')
    return
  }

  try {
    await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/equipos/${teamIdToDelete.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    mostrarToast('Equipo eliminado correctamente.')
    showConfirmDialog.value = false
    fetchEquipos()
  } catch (err) {
    console.error('Error al eliminar el equipo:', err)
    mostrarToast(err.response?.data?.message || 'Ocurrió un error al eliminar el equipo.')
  } finally {
    teamIdToDelete.value = null
  }
}

function cancelDeleteEquipo() {
  showConfirmDialog.value = false // Close the confirmation dialog
  teamIdToDelete.value = null // Clear the stored ID
}
</script>

<style scoped>
.dashboard-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.content-scroll-wrapper {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 80px); /* Ajusta según la altura de tu header */
}

.equipo-card {
  border-radius: 12px;
  border-color: #174384;
  transition: box-shadow 0.3s ease;
  padding: 2rem;
  margin: 2rem;
}

.equipo-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.list-group-item {
  border: none;
  padding-left: 0;
  padding-right: 0;
}
.toast-custom {
  background-color: #198754;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2100;
}
</style>
