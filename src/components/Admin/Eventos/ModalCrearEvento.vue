<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  nombre: '',
  categoria_id: null,
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  capacidad: 0,
  sede_id: null,
  espacio: '',
  modalidad: '',
  hayEquipos: 0,
  hayFormulario: false,
})

const activeTab = ref('info')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''

  if (
    !form.nombre ||
    !form.descripcion ||
    !form.fecha_inicio ||
    !form.fecha_fin ||
    !form.modalidad ||
    !form.categoria_id ||
    !form.sede_id
  ) {
    error.value = '⚠️ Por favor, completa todos los campos obligatorios.'
    return
  }

  const payload = { ...form }
  await enviarEvento(payload)
}

async function enviarEvento(data) {
  const token = localStorage.getItem('token')

  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  loading.value = true
  try {
    console.log('JSON enviado al backend:', JSON.stringify(data, null, 2))

    const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(data),
    })

    const raw = await response.text()
    console.log('⚠️ Respuesta cruda del servidor:', raw)

    let result = {}
    try {
      // Separar los dos objetos JSON pegados
      const parts = raw.split(/}(?={)/) // divide entre }{
      const part1 = JSON.parse(parts[0] + '}')
      const part2 = JSON.parse('{' + parts[1])
      result = { usuario: part1, evento: part2 }
    } catch (e) {
      console.error('Error al parsear JSON doble:', e)
      error.value = 'La respuesta del servidor no es válida.'
      return
    }

    if (!response.ok) {
      console.error('Error del servidor:', result)
      error.value = result?.mensaje || 'Error al crear el evento.'
      return
    }

    console.log('Evento creado con éxito:', result)
    activeTab.value = 'imagenes'
    emit('submit', result)
  } catch (err) {
    console.error('Error de red:', err.name, err.message)
    error.value = 'Fallo en la conexión con el servidor.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content fade-in">
      <h2 class="modal-title">Evento</h2>

      <div class="modal-tabs">
        <button :class="['tab', activeTab === 'info' ? 'active' : '']" @click="activeTab = 'info'">
          Información del Evento
        </button>
        <button
          :class="['tab', activeTab === 'imagenes' ? 'active' : '']"
          @click="activeTab = 'imagenes'"
        >
          Imágenes del Evento
        </button>
        <button
          :class="['tab', activeTab === 'cronograma' ? 'active' : '']"
          @click="activeTab = 'cronograma'"
        >
          Añadir Cronogramas
        </button>
        <button
          :class="['tab', activeTab === 'actividades' ? 'active' : '']"
          @click="activeTab = 'actividades'"
        >
          Añadir Actividades
        </button>
      </div>

      <!-- Modal parte 1 -->

      <div v-if="activeTab === 'info'">
        <form @submit.prevent="handleSubmit">
          <div class="form-grid">
            <input v-model="form.nombre" type="text" placeholder="Nombre del evento*" required />

            <input
              v-model="form.descripcion"
              type="text"
              placeholder="Descripción*"
              maxlength="225"
              required
            />

            <select v-model.number="form.categoria_id" required>
              <option disabled value="">Seleccione una Categoría</option>
              <option :value="1">Emprendimiento</option>
              <option :value="2">Tecnología</option>
            </select>

            <select v-model="form.modalidad" required>
              <option disabled value="">Seleccione una Modalidad</option>
              <option>Presencial</option>
              <option>Virtual</option>
              <option>Híbrida</option>
            </select>

            <input v-model="form.fecha_inicio" type="date" required />
            <input v-model="form.fecha_fin" type="date" required />

            <input v-model="form.espacio" type="text" placeholder="Lugar del evento" />

            <select v-model.number="form.sede_id" required>
              <option disabled value="">Seleccione una sede</option>
              <option :value="1">Sede Quito</option>
              <option :value="2">Sede Ambato</option>
            </select>

            <input v-model.number="form.capacidad" type="number" placeholder="Capacidad" min="0" />
          </div>

          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="form.hayEquipos" :true-value="1" :false-value="0" />
              Ingreso de Proyectos
            </label>

            <label>
              <input type="checkbox" v-model="form.hayFormulario" />
              Se necesita Rúbricas
            </label>
          </div>

          <div class="button-row">
            <button type="button" class="btn btn-cancel" @click="$emit('close')">Volver</button>
            <button type="submit" class="btn btn-primary">Siguiente</button>
          </div>

          <p v-if="error" class="error-text">{{ error }}</p>
        </form>
      </div>
      <!-- Modal parte 2 -->
      <div v-if="activeTab === 'imagenes'">
        <p>Aquí puedes subir imágenes del evento</p>
        <!-- Ejemplo de input -->
        <input type="file" multiple />
      </div>

      <!-- Modal parte 3 -->
      <div v-if="activeTab === 'cronograma'">
        <p>Formulario para añadir cronogramas</p>
        <!-- Puedes poner una tabla o inputs según el diseño -->
      </div>

      <!-- Modal parte 4 -->
      <div v-if="activeTab === 'actividades'">
        <p>Sección para añadir actividades</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Overlay del fondo */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal centrado */
.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 800px;
  width: 95%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: fadeSlideIn 0.4s ease;
}

/* Animación */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeSlideIn 0.3s ease-out;
}

/* Título */
.modal-title {
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

/* Tabs visuales */
.modal-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1.5rem;
}

.tab {
  padding-bottom: 0.5rem;
  color: #999;
  cursor: default;
}

.tab.active {
  color: #0056b3;
  border-bottom: 2px solid #0056b3;
}

/* Grid del formulario */
.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  margin-bottom: 1rem;
}

input,
select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
}

/* Grupo de checkboxes */
.checkbox-group {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.checkbox-group label {
  font-size: 0.95rem;
}

/* Botones */
.button-row {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 1rem;
}

.btn {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background-color: #eee;
  color: #333;
}

.btn-primary {
  background-color: #0056b3;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

/* Responsivo en móvil */
@media (max-width: 480px) {
  .modal-content {
    padding: 1.25rem;
  }

  .modal-title {
    font-size: 1.4rem;
  }

  .button-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-group {
    flex-direction: column;
  }
}
</style>
