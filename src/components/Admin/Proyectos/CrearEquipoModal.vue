<!-- src/components/CrearEquipoModal.vue -->
<template>
  <div v-if="visible" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Crea tu Equipo</h5>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Nombre de tu Equipo</label>
          <input
            v-model="nombreEquipo"
            class="form-control"
            placeholder="Ingresa el Nombre de tu Equipo"
          />
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold">Ingrese los integrantes de su grupo</span>
          <button class="btn btn-sm btn-primary" @click="addIntegrante">Añadir integrante +</button>
        </div>

        <table class="table table-bordered table-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Identificación</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Rol del Proyecto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(integrante, index) in integrantes" :key="index">
              <td><input v-model="integrante.nombre" class="form-control" /></td>
              <td><input v-model="integrante.apellido" class="form-control" /></td>
              <td><input v-model="integrante.identificacion" class="form-control" /></td>
              <td><input v-model="integrante.telefono" class="form-control" /></td>
              <td><input v-model="integrante.correo" class="form-control" /></td>
              <td><input v-model="integrante.rol" class="form-control" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" @click="guardarEquipo">Guardar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const props = defineProps({
  visible: Boolean,
  eventoId: Number,
})

console.log('Evento ID en CrearEquipoModal:', props.eventoId)
const emit = defineEmits(['close', 'guardar'])

const nombreEquipo = ref('')
const integrantes = ref([
  { nombre: '', apellido: '', identificacion: '', telefono: '', correo: '', rol: '' },
])

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
.btn:hover {
  background-color: #0f2a5c;
  border-color: #0f2a5c;
}
</style>
