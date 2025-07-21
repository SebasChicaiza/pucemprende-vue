<!-- src/components/CrearEquipoModal.vue -->
<template>
  <div v-if="visible" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Crea tu Equipo</h5>
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

        <!-- Buscador -->
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
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(integrante, index) in integrantes" :key="index">
                <td>{{ integrante.nombre }}</td>
                <td>{{ integrante.apellido }}</td>
                <td>{{ integrante.identificacion }}</td>
                <td>{{ integrante.telefono }}</td>
                <td>{{ integrante.correo }}</td>
                <td>{{ integrante.rol || '-' }}</td>
              </tr>
              <tr v-if="integrantes.length === 0">
                <td colspan="6" class="text-center text-muted">Sin integrantes aún</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-primary" @click="guardarEquipo">Guardar equipo</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const cedulaBusqueda = ref('')
const resultadosBusqueda = ref([])
const buscando = ref(false)
const busquedaError = ref('')

const props = defineProps({
  visible: Boolean,
  eventoId: Number,
})

console.log('Evento ID en CrearEquipoModal:', props.eventoId)
const emit = defineEmits(['close', 'guardar'])

const nombreEquipo = ref('')
const integrantes = ref([])

async function buscarPersonaPorCedula() {
  if (!cedulaBusqueda.value.trim()) return

  const token = localStorage.getItem('token')
  if (!token) return

  buscando.value = true
  busquedaError.value = ''
  resultadosBusqueda.value = []

  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${cedulaBusqueda.value}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    // Si el backend devuelve un array
    resultadosBusqueda.value = Array.isArray(data) ? data : [data]
  } catch (e) {
    busquedaError.value = 'No se encontraron resultados.'
  } finally {
    buscando.value = false
  }
}

function seleccionarPersona(persona) {
  integrantes.value.push({
    nombre: persona.nombre,
    apellido: persona.apellido,
    identificacion: persona.identificacion,
    telefono: persona.telefono,
    correo: persona.email,
    rol: '',
  })
  cedulaBusqueda.value = ''
  resultadosBusqueda.value = []
}

function addIntegrante() {
  integrantes.value.push({
    nombre: '',
    apellido: '',
    identificacion: '',
    telefono: '',
    correo: '',
    rol: '',
  })
}

function guardarEquipo() {
  const equipo = {
    nombre: nombreEquipo.value,
    integrantes: integrantes.value,
  }
  // Emitir datos al padre
  emit('guardar', equipo)
  emit('close')
}
async function crearCabeceraEquipo() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  loading.value = true

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/equipos`,
      {
        nombre: nombreEquipo.value,
        evento_id: props.eventoId, // 👈 asegúrate de pasarlo como prop
        ranking: null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const equipoId = response.data.id
    console.log('ID del equipo creado:', equipoId)

    return equipoId // 👈 retornamos el ID por si se necesita después
  } catch (e) {
    console.error(e)
    error.value = 'Error al crear el equipo. Intente más tarde.'
    return null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
  width: 90%;
  max-width: 800px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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
  max-height: 200px; /* Ajusta la altura según lo que necesites */
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}
</style>
