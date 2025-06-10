<script setup>
import { ref, reactive, computed } from 'vue'

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

const tabTitle = computed(() => {
  switch (activeTab.value) {
    case 'info':
      return 'Información del Evento';
    case 'imagenes':
      return 'Imágenes del Evento';
    case 'cronograma':
      return 'Añadir Cronogramas';
    case 'actividades':
      return 'Añadir Actividades';
    default:
      return 'Información del Evento';
  }
});

const descripcionCount = computed(() => form.descripcion.length);
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
      // Buscar el inicio del segundo JSON (evento)
      const indexSecondJson = raw.indexOf('}{') + 1
      const jsonStr = raw.substring(indexSecondJson)
      result = JSON.parse(jsonStr)
    } catch (e) {
      console.error('❌ Error al parsear JSON del evento:', e)
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
    // emit('submit', result)
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
        <button :class="['tab', activeTab === 'info' ? 'active' : '']" @click="activeTab = 'info'">Información del Evento</button>
        <button :class="['tab', activeTab === 'imagenes' ? 'active' : '']" @click="activeTab = 'imagenes'">Imágenes del Evento</button>
        <button :class="['tab', activeTab === 'cronograma' ? 'active' : '']" @click="activeTab = 'cronograma'">Añadir Cronogramas</button>
        <button :class="['tab', activeTab === 'actividades' ? 'active' : '']" @click="activeTab = 'actividades'">Añadir Actividades</button>
      </div>

      <h3 class="modal-title2">{{ tabTitle }}</h3>


      <!-- Modal parte 1 -->

      <div v-if="activeTab === 'info'">
        <form @submit.prevent="handleSubmit" class="custom-form">
          <div class="form-grid">
            <div class="form-group span-3">
              <input v-model="form.nombre" type="text" required />
              <label>Nombre del evento*</label>
            </div>

            <div class="form-group textarea-group span-3">
              <textarea
                v-model="form.descripcion"
                maxlength="225"
                required
              ></textarea>
              <label>Descripción *</label>
              <div class="char-count">{{ descripcionCount }}/225</div>
            </div>

            <div class="form-group-row span-3">
              <div class="form-group half">
                <select v-model.number="form.categoria_id" required>
                  <option :value="1">Emprendimiento</option>
                  <option :value="2">Tecnología</option>
                </select>

                <label>Categoría *</label>
              </div>

              <div class="form-group half">
                <select v-model="form.modalidad" required>
                  <option>Presencial</option>
                  <option>Virtual</option>
                  <option>Híbrida</option>
                </select>
                <label>Modalidad *</label>
              </div>
            </div>

            <div class="form-group span-1">
              <input v-model="form.fecha_inicio" type="date" required />
              <label>Fecha de Inicio *</label>
            </div>

            <div class="form-group span-1">
              <input v-model="form.fecha_fin" type="date" required />
              <label>Fecha de Fin *</label>
            </div>

            <div class="form-group span-1">
              <select v-model="form.estado">
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
              <label>Estado *</label>
            </div>

            <div class="form-group span-1">
              <input v-model="form.espacio" type="text" required />
              <label>Espacio *</label>
            </div>

            <div class="form-group span-1">
              <select v-model.number="form.sede_id" required>
                <option disabled value="">Sedes PUCE</option>
                <option :value="1">Sede Quito</option>
                <option :value="2">Sede Ambato</option>
              </select>
              <label>Sede *</label>
            </div>

            <div class="form-group span-1">
              <input v-model.number="form.capacidad" type="number" placeholder="#" min="0" required />
              <label>Capacidad *</label>
            </div>
          </div>

          <div class="switch-group">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="form.hayEquipos" :true-value="1" :false-value="0">
              <label class="form-check-label">Ingresos de Proyectos</label>
            </div>

            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="form.hayFormulario">
              <label class="form-check-label">Se necesita Rubricas</label>
            </div>
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


      <div class="button-row">
            <button type="button" class="btn btn-cancel" @click="$emit('close')"><i class="fas fa-angle-left"></i>Volver</button>
            <button type="submit" class="btn btn-primary">Siguiente<i class="fas fa-angle-right"></i></button>
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
  max-width: 600px;
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
  font-size: 1.7rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.modal-title2 {
  font-size: 1.2rem;
  font-weight: bold;
  padding: 1em 0 1em 0;
}

.modal-tabs {
  display: flex;
  justify-content: space-between;
  gap: 0.5em;

}

.tab {
  background: transparent;
  border: none;
  text-align: left;
  padding: 10px 20px 10px 10px;
  font-size: 0.7em;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 4px solid #ddd;
  border-radius: 10px 10px 0 0;
}

.tab:hover {
  color: #4c81cf;
}

.tab.active {
  border-bottom: 4px solid #174384;
  border-radius: 10px 10px 0 0;
  font-weight: bold;
  color: #174384;
}


.custom-form {
  max-width: 900px;
  margin: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 1em;
  row-gap: 5px;
}

.span-3 {
  grid-column: span 3;
}

.span-2 {
  grid-column: span 2;
}

.span-1 {
  grid-column: span 1;
}

.form-group {
  position: relative;
  margin-bottom: 1rem;
}

.form-group-row {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.form-group.half {
  flex: 1;
  position: relative;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 1rem 0.5rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: white;
  font-size: 0.85rem;
}

.form-group select {
  width: 100%;
  padding: 1rem 0.5rem 0.5rem;
  padding-right: 2rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: white;
  font-size: 0.85rem;
  cursor: pointer;
}

.form-group label {
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  font-size: 0.75rem;
  color: #000000;
  font-weight: 600;
  transition: all 0.2s ease;
  pointer-events: none;
}

.form-group input:focus + label,
.form-group textarea:focus + label,
.form-group select:focus + label,
.form-group input:not(:placeholder-shown) + label,
.form-group textarea:not(:placeholder-shown) + label,
.form-group select:not(:placeholder-shown) + label {
  top: -0.5rem;
  left: 0.5rem;
  background: white;
  padding: 0 0.25rem;
  font-size: 0.7rem;
  color: #333;
}

.textarea-group textarea {
  height: 55px;
}

.char-count {
  text-align: right;
  font-size: 0.7rem;
  color: #888;
  margin-top: -0.2rem;
  margin-bottom: -0.4rem;
}

.switch-group {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}

.form-check-input:checked {
  background-color: #174384;
  border-color: #174384;
}

.form-check-input:checked::before {
  background-color: white;
}

.form-check-input {
  background-color: #ccc;
  border-color: #ccc;
  cursor: pointer;
}

.form-check-input {
  transition: background-color 1s ease, border-color 1s ease;
}

.error-text {
  color: red;
  text-align: center;
  font-weight: bold;
}



/* Botones */
.button-row {
  display: flex;
  margin-top: 2rem;
  gap: 1rem;
  justify-content: flex-start;
}

.btn {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-weight: normal;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-cancel {
  background-color: #eee;
  color: #333;
}

.btn-primary {
  background-color: #174384;
  color: white;
}

.btn i {
  font-size: 1em;
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
