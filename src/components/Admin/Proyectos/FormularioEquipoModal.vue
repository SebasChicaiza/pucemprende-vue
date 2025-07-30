<template>
  <div v-if="visible" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{{ equipoId ? 'Editar Equipo' : 'Crear Equipo' }}</h5>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Nombre del equipo -->
        <div class="mb-4">
          <label class="form-label fw-semibold">Nombre de tu Equipo</label>
          <input
            v-model="nombreEquipo"
            class="form-control"
            placeholder="Ingresa el Nombre de tu Equipo"
          />
        </div>

        <!-- Buscador de persona por cédula -->
        <div class="mb-4">
          <label class="form-label fw-semibold">Buscar persona por cédula</label>
          <div class="input-group w-100">
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
              <button
                class="btn btn-sm btn-outline-primary btn-add"
                @click="seleccionarPersona(persona)"
              >
                Añadir
              </button>
            </li>
          </ul>
        </div>

        <!-- Tabla de integrantes -->
        <div>
          <label class="form-label fw-semibold mb-2">Integrantes añadidos</label>
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-light">
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(integrante, index) in integrantes" :key="integrante.persona_id || index">
                <td>{{ integrante.nombre }}</td>
                <td>{{ integrante.apellido }}</td>
                <td>{{ integrante.identificacion }}</td>
                <td>{{ integrante.telefono || 'N/A' }}</td>
                <td>{{ integrante.email || 'N/A' }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" @click="eliminarIntegrante(index)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr v-if="integrantes.length === 0">
                <td colspan="7" class="text-center text-muted">Sin integrantes aún</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <p v-if="dialogoError" class="text-danger fw-semibold mb-2">{{ dialogoError }}</p>

        <button class="btn btn-primary" @click="guardarEquipo" :disabled="guardando">
          <span v-if="guardando">
            <i class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></i>
            Guardando...
          </span>
          <span v-else>Guardar equipo</span>
        </button>
      </div>
      <!-- Toast flotante -->
      <div v-if="toastVisible" class="toast-modal-custom position-fixed bottom-0 end-0 m-4">
        {{ toastMensaje }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue' // Added watch
import axios from 'axios'

const cedulaBusqueda = ref('')
const resultadosBusqueda = ref([])
const buscando = ref(false)
const busquedaError = ref('')
const dialogoError = ref('')

const toastVisible = ref(false)
const toastMensaje = ref('')

function mostrarToast(mensaje) {
  toastMensaje.value = mensaje
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
    toastMensaje.value = ''
  }, 3000)
}

const props = defineProps({
  visible: Boolean,
  eventoId: Number,
  equipoData: {
    type: Object,
    default: null, // New prop to pass existing team data for editing
  },
})

const emit = defineEmits(['close', 'guardar'])

const equipoId = ref(null) // Stores the ID of the team being edited
const nombreEquipo = ref('')
const integrantes = ref([]) // Stores members currently in the form
const originalIntegrantes = ref([]) // Stores members loaded when the modal opened (for comparison)
const guardando = ref(false)

// Watch for changes in `visible` or `equipoData` to initialize the form
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // Reset form fields when modal opens
      dialogoError.value = ''
      busquedaError.value = ''
      cedulaBusqueda.value = ''
      resultadosBusqueda.value = []

      if (props.equipoData) {
        // EDIT MODE: Populate form with existing team data
        equipoId.value = props.equipoData.id
        nombreEquipo.value = props.equipoData.nombre
        // Map existing members to the format expected by the form
        integrantes.value = props.equipoData.integrantes.map((i) => ({
          // Copy persona details and add member-specific IDs
          id: i.id, // This is the miembro_equipo ID
          persona_id: i.persona_id,
          nombre: i.persona?.nombre,
          apellido: i.persona?.apellido,
          identificacion: i.persona?.identificacion,
          telefono: i.persona?.telefono,
          email: i.persona?.email,
          rol: i.rol,
        }))
        // Store a deep copy of initial members for comparison during save
        originalIntegrantes.value = JSON.parse(JSON.stringify(integrantes.value))
      } else {
        // CREATE MODE: Clear form for a new team
        equipoId.value = null
        nombreEquipo.value = ''
        integrantes.value = []
        originalIntegrantes.value = []
      }
    }
  },
  { immediate: true },
) // Run immediately when component is mounted if visible is true

async function buscarPersonaPorCedula() {
  if (!cedulaBusqueda.value.trim()) {
    busquedaError.value = 'Por favor, ingresa una cédula.'
    return
  }

  const token = localStorage.getItem('token')
  if (!token) {
    dialogoError.value = 'Token de autenticación no encontrado.'
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
    // Ensure data is an array, even if API returns a single object
    resultadosBusqueda.value = Array.isArray(data) ? data : data ? [data] : []
    if (resultadosBusqueda.value.length === 0) {
      busquedaError.value = 'No se encontraron resultados para esa cédula.'
    }
  } catch (e) {
    console.error('Error buscando persona:', e)
    busquedaError.value = 'No se encontraron resultados o hubo un error en la búsqueda.'
  } finally {
    buscando.value = false
  }
}

function eliminarIntegrante(index) {
  integrantes.value.splice(index, 1)
}

async function seleccionarPersona(persona) {
  // Prevent adding the same person multiple times
  const yaExiste = integrantes.value.some((i) => i.persona_id === persona.id)
  if (yaExiste) {
    busquedaError.value = 'Esta persona ya ha sido añadida al equipo.'
    return
  }

  // Add the person to the list of current members in the form
  integrantes.value.push({
    persona_id: persona.id, // Store the actual persona ID
    nombre: persona.nombre,
    apellido: persona.apellido,
    identificacion: persona.identificacion,
    telefono: persona.telefono,
    email: persona.email,
    rol: 'Sin rol', // Default role, can be made editable if needed
  })

  // Clear search results and input after selection
  cedulaBusqueda.value = ''
  resultadosBusqueda.value = []
  busquedaError.value = '' // Clear any previous search errors
}

async function guardarEquipo() {
  if (guardando.value) return // Previene doble clic
  guardando.value = true

  const token = localStorage.getItem('token')
  if (!token) {
    dialogoError.value = 'No se encontró token de autenticación. Por favor, inicia sesión.'
    guardando.value = false
    return
  }

  if (!nombreEquipo.value.trim()) {
    dialogoError.value = 'El nombre del equipo no puede estar vacío.'
    guardando.value = false
    return
  }

  dialogoError.value = '' // Clear previous errors

  try {
    let currentEquipoId = equipoId.value

    // 1. Create or Update the Team
    if (currentEquipoId) {
      // UPDATE existing team
      await axios.put(
        `${import.meta.env.VITE_URL_BACKEND}/api/equipos/${currentEquipoId}`,
        { nombre: nombreEquipo.value }, // Only updating name for now
        { headers: { Authorization: `Bearer ${token}` } },
      )
      console.log('Equipo actualizado con ID:', currentEquipoId)
    } else {
      // CREATE new team
      const equipoResponse = await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/equipos`,
        {
          nombre: nombreEquipo.value,
          evento_id: props.eventoId,
          ranking: null, // Assuming ranking is not set via this form
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      currentEquipoId = equipoResponse.data.id
      console.log('Equipo creado con ID:', currentEquipoId)
    }

    // 2. Manage Team Members (Add/Remove)
    const fechaInicio = new Date().toISOString().split('T')[0]
    const fechaFin = new Date()
    fechaFin.setDate(fechaFin.getDate() + 42) // Example: 42 days from now
    const fechaFinFormatted = fechaFin.toISOString().split('T')[0]

    // Members to Add: Those in `integrantes.value` but not in `originalIntegrantes.value`
    const membersToAdd = integrantes.value.filter(
      (currentMem) =>
        !originalIntegrantes.value.some((origMem) => origMem.persona_id === currentMem.persona_id),
    )

    // Members to Remove: Those in `originalIntegrantes.value` but not in `integrantes.value`
    const membersToRemove = originalIntegrantes.value.filter(
      (origMem) =>
        !integrantes.value.some((currentMem) => currentMem.persona_id === origMem.persona_id),
    )

    // Execute additions
    for (const miembro of membersToAdd) {
      await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`,
        {
          equipo_id: currentEquipoId,
          persona_id: miembro.persona_id,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFinFormatted,
          rol: miembro.rol || 'Sin rol', // Ensure role is sent
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }

    // Execute removals
    for (const miembro of membersToRemove) {
      if (miembro.id) {
        // Check if miembro.id (miembro_equipo ID) exists for deletion
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo/${miembro.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
      } else {
        console.warn(
          `Could not remove member ${miembro.nombre} as miembro_id was not found. This might be a new member that wasn't successfully added.`,
        )
      }
    }

    // Success message and emit event
    mostrarToast('Equipo guardado correctamente.')
    setTimeout(() => {
      emit('guardar') // Esto cerrará el modal desde el componente padre
      guardando.value = false
    }, 2000) // Tiempo suficiente para que el usuario lo vea
  } catch (error) {
    console.error('Error al guardar el equipo o los miembros:', error)
    dialogoError.value =
      error.response?.data?.message || 'Ocurrió un error al guardar el equipo. Intenta de nuevo.'
    mostrarToast('Ocurrió un error al guardar el equipo. Intenta de nuevo.') // Using alert as per previous code
    guardando.value = false
  }
}
</script>

<style scoped>
.toast-modal-custom {
  background-color: #198754;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1100;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}
.modal-content {
  background: white;
  border-radius: 12px;
  width: 70rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header,
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
}
.table input {
  font-size: 0.875rem;
  padding: 4px;
}
.btn {
  background-color: #174384;
  border-color: #174384;
}
.btn-add {
  color: white;
}
.btn:hover {
  background-color: #0f2a5c;
  border-color: #0f2a5c;
}
.resultados-scroll {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}
</style>
