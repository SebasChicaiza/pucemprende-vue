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
            :class="['form-control', { 'is-invalid': mostrarErrores && !nombreEquipo.trim() }]"
            placeholder="Ingresa el Nombre de tu Equipo"
          />
          <div v-if="mostrarErrores && !nombreEquipo.trim()" class="invalid-feedback">
            El nombre es obligatorio.
          </div>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(integrante, index) in integrantes" :key="index">
                <td>{{ integrante.nombre }}</td>
                <td>{{ integrante.apellido }}</td>
                <td>{{ integrante.identificacion }}</td>
                <td>{{ integrante.telefono }}</td>
                <td>{{ integrante.correo }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" @click="eliminarIntegrante(index)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr v-if="integrantes.length === 0 && mostrarErrores">
                <td colspan="7" class="text-center text-danger">
                  Debes añadir al menos un integrante.
                </td>
              </tr>
              <tr v-if="integrantes.length === 0 && !mostrarErrores">
                <td colspan="7" class="text-center text-muted">Sin integrantes aún</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <p v-if="dialogoError" class="text-danger fw-semibold mb-2">{{ dialogoError }}</p>
        <button class="btn btn-primary" @click="guardarEquipo">Guardar equipo</button>
      </div>
    </div>

    <!-- Confirmación -->
    <ConfirmationDialog
      :visible="showConfirmDialog"
      message="¿Estás seguro de que quieres crear este equipo?"
      @confirm="confirmSave"
      @cancel="cancelSave"
    />

    <!-- Toast -->
    <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'

const props = defineProps({
  visible: Boolean,
  eventoId: Number,
})

const emit = defineEmits(['close', 'guardar'])

const nombreEquipo = ref('')
const cedulaBusqueda = ref('')
const resultadosBusqueda = ref([])
const buscando = ref(false)
const busquedaError = ref('')
const integrantes = ref([])
const dialogoError = ref('')
const mostrarErrores = ref(false)

const showConfirmDialog = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('') // 'success' o 'error'

function showNotification(message, type) {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

function validarFormulario() {
  mostrarErrores.value = true
  if (!nombreEquipo.value.trim()) return false
  if (integrantes.value.length === 0) return false
  return true
}

function guardarEquipo() {
  if (!validarFormulario()) {
    showNotification('Completa los campos obligatorios.', 'error')
    return
  }
  showConfirmDialog.value = true
}

function cancelSave() {
  showConfirmDialog.value = false
}

async function confirmSave() {
  const token = localStorage.getItem('token')
  if (!token) {
    showNotification('No se encontró token de autenticación.', 'error')
    return
  }

  try {
    const equipoResponse = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/equipos`,
      {
        nombre: nombreEquipo.value,
        evento_id: props.eventoId,
        ranking: null,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const equipoId = equipoResponse.data.id

    const fechaInicio = new Date().toISOString().split('T')[0]
    const fechaFin = new Date()
    fechaFin.setDate(fechaFin.getDate() + 42)
    const fechaFinFormatted = fechaFin.toISOString().split('T')[0]

    for (const integrante of integrantes.value) {
      await axios.post(
        `${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`,
        {
          equipo_id: equipoId,
          persona_id: integrante.persona_id,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFinFormatted,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }

    showNotification('Equipo creado correctamente.', 'success')
    emit('guardar')
    emit('close')
  } catch (error) {
    console.error('Error al guardar el equipo:', error)
    showNotification('Ocurrió un error al guardar el equipo.', 'error')
  } finally {
    showConfirmDialog.value = false
  }
}

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
  const yaExiste = integrantes.value.some((i) => i.identificacion === persona.identificacion)
  if (yaExiste) {
    showNotification('Esta persona ya ha sido añadida al equipo.', 'error')
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

    integrantes.value.push({
      nombre: persona.nombre,
      apellido: persona.apellido,
      identificacion: persona.identificacion,
      telefono: persona.telefono,
      correo: persona.email,
      persona_id: personaCompleta.id,
      rol_id: 2,
    })

    showNotification('Integrante añadido correctamente.', 'success')
  } catch (error) {
    showNotification('Ocurrió un error al añadir al integrante.', 'error')
    console.error('Error obteniendo persona completa:', error)
  }
}

function eliminarIntegrante(index) {
  integrantes.value.splice(index, 1)
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
/* Campo inválido */
.is-invalid {
  border-color: #dc3545;
}
.invalid-feedback {
  font-size: 0.875rem;
}
</style>
