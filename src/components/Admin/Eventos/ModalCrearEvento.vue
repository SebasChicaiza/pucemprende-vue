<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Loader from '@/components/LoaderComponent.vue'
import imageHolder from '@/assets/iconos/imageHolder.png'
import ScrollBar from '@/components/ScrollBar.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import axios from 'axios';

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

const tabOrder = ['info', 'imagenes', 'cronograma', 'actividades'];

const handleModalClose = () => {
  showSuccessModal.value = false;
};


const isTabCompleted = (tabName) => {
  const activeIndex = tabOrder.indexOf(activeTab.value);
  const tabIndex = tabOrder.indexOf(tabName);
  return tabIndex < activeIndex;
};

const tabTitle = computed(() => {
  switch (activeTab.value) {
    case 'info':
      return 'Información del Evento'
    case 'imagenes':
      return 'Imágenes del Evento'
    case 'cronograma':
      return 'Añadir Cronogramas'
    case 'actividades':
      return 'Añadir Actividades'
    default:
      return 'Información del Evento'
  }
})

function testLoading() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    console.log('✅ Simulación completada.')
  }, 10000)
}

const descripcionCount = computed(() => form.descripcion.length)
const error = ref('')
const loading = ref(false)
const categorias = ref([])
const sede = ref([])
const eventIdStore = ref(null);
const showConfirmationModal = ref(false);







// Aqui se maneja la carga de categorías y sedes y crear eventos


const fetchCategorias = async () => {
  const token = localStorage.getItem('token');
  // const token = '75|gKZX3yOMWD1qjgg54tZTRJYHcZbxYfEaliXyBFIC18f79e58';

  if (!token) {
    console.error("Token de autenticación no encontrado.");
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/categoria`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    categorias.value = response.data;
  } catch (error) {
    console.error("Error al obtener las categorías:", error);
  }
};

const fetchSede = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error("Token de autenticación no encontrado.");
    return;
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/sede`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    sede.value = response.data;
  } catch (error) {
    console.error("Error al obtener las sedes:", error);
  }
};

//submit eventos
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

  const fechaInicio = new Date(form.fecha_inicio)
  const fechaFin = new Date(form.fecha_fin)

  if (isNaN(fechaInicio) || isNaN(fechaFin)) {
    error.value = '⚠️ Las fechas ingresadas no son válidas.'
    return
  }

  if (fechaInicio >= fechaFin) {
    error.value = '⚠️ La fecha de inicio debe ser anterior a la fecha de fin.'
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
    console.log('JSON enviado al backend:', JSON.stringify(data, null, 2));

    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      }
    );

    const result = response.data;
    console.log('Evento creado con éxito:', result);

    eventIdStore.value = result.id;
    console.log('Stored event ID globally:', eventIdStore.value);

    activeTab.value = 'imagenes';
  } catch (err) {
    if (err.response) {
      console.error('Error del servidor:', err.response.data);
      error.value = err.response.data?.mensaje || 'Error al crear el evento.';
    } else if (err.request) {
      // The request was made but no response was received
      console.error('Error de red: No se recibió respuesta del servidor.');
      error.value = 'Fallo en la conexión con el servidor.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error al configurar la solicitud:', err.message);
      error.value = 'Error interno al procesar la solicitud.';
    }
  } finally {
    loading.value = false;
  }
}








// Aqui se maneja la carga de imágenes del segundo modal

const coverInput = ref(null)
const additionalInput = ref(null)
const coverPreview = ref(imageHolder)
const additionalPreviews = ref([])



function handleCoverChange(event) {
  const file = event.target.files[0]

  if (!file) {
    return
  }

  if (file.size <= 10240 * 10240) {
    coverPreview.value = URL.createObjectURL(file)
  } else {
    event.target.value = ''
    coverPreview.value = '/assets/iconos/imageHolder.png'
    alert('La imagen debe pesar menos de 10 MB.')
  }
}

function handleAdditionalChange(event) {
  const files = Array.from(event.target.files)
  additionalPreviews.value = files.map((file) => URL.createObjectURL(file))
}

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files)
  additionalPreviews.value = files.map((file) => URL.createObjectURL(file))
}









// Aqui se maneja la carga de cronogramas del tercer modal

const cronogramaIdStore = ref([]);
const showSuccessModal = ref(false);
const successMessage = ref(''); // This will hold the dynamic message for the modal



const cronogramaForm = reactive({
  evento_id: '',
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
})

//submit cronograma
async function handleCronogramaSubmit() {

  if (
    !cronogramaForm.titulo ||
    !cronogramaForm.descripcion ||
    !cronogramaForm.fecha_inicio ||
    !cronogramaForm.fecha_fin
  ){
    error.value = '⚠️ Por favor, completa todos los campos obligatorios.'
    return
  }

  const fechaInicio = new Date(cronogramaForm.fecha_inicio)
  const fechaFin = new Date(cronogramaForm.fecha_fin)

  if (isNaN(fechaInicio) || isNaN(fechaFin)) {
    error.value = '⚠️ Las fechas ingresadas no son válidas.'
    return
  }

  if (fechaInicio >= fechaFin) {
    error.value = '⚠️ La fecha de inicio debe ser anterior a la fecha de fin.'
    return
  }

  const payload = {
    ...cronogramaForm,
    //evento_id: eventIdStore.value
    evento_id: 1 // Temporarily hardcoded for testing, replace with eventIdStore.value when ready
  };
  await enviarCronogramas(payload)
}

async function enviarCronogramas(data) {
  const token = localStorage.getItem('token')
  console.log('Id del evento:', eventIdStore.value);
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  loading.value = true
  try {
    console.log('JSON enviado al backend:', JSON.stringify(data, null, 2));

    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      }
    );

    const result = response.data;
    console.log('Cronograma creado con éxito:', result);

    cronogramaIdStore.value.push(result.id);
    console.log('Stored cronograma ID globally:', cronogramaIdStore.value);

    successMessage.value = `El cronograma "<strong>${data.titulo}</strong>" ha sido creado con éxito.`;
    showSuccessModal.value = true;

  } catch (err) {
    if (err.response) {
      console.error('Error del servidor:', err.response.data);
      error.value = err.response.data?.mensaje || 'Error al crear el cronograma.';
    } else if (err.request) {
      // The request was made but no response was received
      console.error('Error de red: No se recibió respuesta del servidor.');
      error.value = 'Fallo en la conexión con el servidor.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error al configurar la solicitud:', err.message);
      error.value = 'Error interno al procesar la solicitud.';
    }
  } finally {
    loading.value = false;
  }
}

function confirmProceedToActivities() {
  showConfirmationModal.value = true;
}

function handleConfirmationConfirm() {
  showConfirmationModal.value = false;
  activeTab.value = 'actividades';
}

function handleConfirmationCancel() {
  showConfirmationModal.value = false;
}









// Aqui se maneja la carga de actividades del cuarto modal


const cronogramasOptions = ref([]);


const actividadForm = reactive({
  cronograma_id: '',
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  dependencia_id: null,
});

// Function to fetch details for each cronograma ID
async function fetchCronogramasDetails() {
  cronogramasOptions.value = [];
  const token = localStorage.getItem('token');

  if (cronogramaIdStore.value.length === 0) {
    console.log('No cronograma IDs to fetch yet.');
    return;
  }
  const fetchPromises = cronogramaIdStore.value.map(async (id) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas/${id}`, {
        headers: {
          Authorization: token,
        },
      });
      return { id: response.data.id, titulo: response.data.titulo };
    } catch (error) {
      console.error(`Error al obtener detalles del cronograma con ID ${id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  cronogramasOptions.value = results.filter(item => item !== null);
  console.log('Opciones de cronogramas cargadas:', cronogramasOptions.value);
}

watch(
  () => cronogramaIdStore.value,
  (newIds) => {
    console.log('cronogramaIdStore updated. Re-fetching cronograma details.');
    fetchCronogramasDetails();
  },
  { deep: true } // Watch for changes inside the array
);



const actividades = ref([])

const addingActividad = ref(false);
const reorderingActividades = ref(false);
const actividadError = ref(null);

async function handleActividadAdd() {
  actividadError.value = null; // Clear previous errors
  addingActividad.value = true;
  console.log('Actividad Form Data before validation:', JSON.parse(JSON.stringify(actividadForm)));

  // Basic client-side validation
  if (
    !actividadForm.titulo ||
    !actividadForm.descripcion ||
    !actividadForm.cronograma_id || // Use cronograma_id here
    !actividadForm.fecha_inicio ||
    !actividadForm.fecha_fin
  ) {
    actividadError.value = 'Por favor, completa todos los campos obligatorios de la actividad.';
    addingActividad.value = false;
    return;
  }

  // Determine the 'orden' for the new activity
  // If there are existing activities, the new one's order is the last activity's order + 1
  // If no existing activities, it's 1
  const newOrder = actividades.value.length > 0 ? Math.max(...actividades.value.map(a => a.orden)) + 1 : 1;

  const payload = {
    cronograma_id: actividadForm.cronograma_id,
    titulo: actividadForm.titulo,
    descripcion: actividadForm.descripcion,
    fecha_inicio: actividadForm.fecha_inicio + 'T00:00:00.000000Z',
    fecha_fin: actividadForm.fecha_fin + 'T00:00:00.000000Z',
    orden: newOrder,
    dependencia_id: actividadForm.dependencia_id || null, // Ensure null if empty
  };

  const token = localStorage.getItem('token');
  if (!token) {
    actividadError.value = 'Token de autenticación no encontrado. Por favor, inicie sesión.';
    addingActividad.value = false;
    return;
  }

  try {
    loading.value = true; // Show loading state
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma`, payload, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });

    // Add the newly created activity (including its ID and potentially updated 'orden' from backend)
    // to the local 'actividades' array.
    actividades.value.push(response.data); // Assuming backend returns the full created object

    // Reset the form
    actividadForm.titulo = '';
    actividadForm.descripcion = '';
    // Keep cronograma_id selected for next activity (optional)
    actividadForm.fecha_inicio = '';
    actividadForm.fecha_fin = '';
    actividadForm.dependencia_id = null; // Reset dependency

    console.log('Actividad añadida:', response.data);
    successMessage.value = `La actividad "<strong>${response.data.titulo}</strong>" ha sido creada con éxito.`;
    showSuccessModal.value = true;

  } catch (error) {
    console.error('Error al añadir actividad:', error);
    actividadError.value = error.response?.data?.message || 'Fallo al añadir la actividad.';
  } finally {
    addingActividad.value = false;
    loading.value = false;
  }
}

// Function to send a PUT request for a single activity's order
async function updateSingleActivityOrder(activity) {
  actividadError.value = null;

  const token = localStorage.getItem('token');
  if (!token) {
    actividadError.value = 'Token de autenticación no encontrado. Por favor, inicie sesión.';
    return false;
  }

  if (!activity.id) {
    console.error('Attempted to update an activity without an ID:', activity);
    actividadError.value = 'Error: No se pudo actualizar la actividad sin un ID.';
    return false;
  }

  const payload = {
    cronograma_id: activity.cronograma_id,
    orden: activity.orden,
  };

  try {
    // ⭐ Corrected endpoint: /api/actividades-cronograma/{id} ⭐
    const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma/${activity.id}`, payload, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });
    console.log(`Actividad ID ${activity.id} orden actualizada:`, response.data);
    return true; // Indicate success
  } catch (error) {
    console.error(`Error al actualizar el orden de la actividad ID ${activity.id}:`, error);
    actividadError.value = error.response?.data?.message || `Fallo al actualizar la actividad ID ${activity.id}.`;
    return false;
  }
}


// Helper function to swap two items in the local activities array
function swapActivities(idx1, idx2) {
  const temp = actividades.value[idx1];
  actividades.value[idx1] = actividades.value[idx2];
  actividades.value[idx2] = temp;

  // After local swap, update the 'orden' property for all activities
  // to reflect their new position based on array index + 1
  actividades.value.forEach((act, index) => {
    act.orden = index + 1;
  });
}

async function moverArriba(idx) {
  if (idx === 0) return;

  reorderingActividades.value = true;
  actividadError.value = null;

  const prevIdx = idx - 1;

  // Store original activities before swapping for potential revert
  const originalActivities = JSON.parse(JSON.stringify(actividades.value));

  // Perform local swap
  swapActivities(idx, prevIdx);

  // Identify the two activities that were just swapped (now at prevIdx and idx)
  const activityToUpdate1 = actividades.value[prevIdx];
  const activityToUpdate2 = actividades.value[idx];

  // Send individual PUT requests for each affected activity
  const success1 = await updateSingleActivityOrder(activityToUpdate1);
  const success2 = await updateSingleActivityOrder(activityToUpdate2);

  if (!success1 || !success2) {
    // If either update failed, revert local changes
    actividades.value = originalActivities;
    alert('Fallo al actualizar el orden de las actividades en el servidor. Revirtiendo cambios locales.');
  }

  reorderingActividades.value = false;
}

async function moverAbajo(idx) {
  if (idx === actividades.value.length - 1) return;

  reorderingActividades.value = true;
  actividadError.value = null;

  const nextIdx = idx + 1;

  // Store original activities before swapping for potential revert
  const originalActivities = JSON.parse(JSON.stringify(actividades.value));

  // Perform local swap
  swapActivities(idx, nextIdx);

  // Identify the two activities that were just swapped (now at idx and nextIdx)
  const activityToUpdate1 = actividades.value[idx];
  const activityToUpdate2 = actividades.value[nextIdx];

  // Send individual PUT requests for each affected activity
  const success1 = await updateSingleActivityOrder(activityToUpdate1);
  const success2 = await updateSingleActivityOrder(activityToUpdate2);

  if (!success1 || !success2) {
    // If either update failed, revert local changes
    actividades.value = originalActivities;
    alert('Fallo al actualizar el orden de las actividades en el servidor. Revirtiendo cambios locales.');
  }

  reorderingActividades.value = false;
}

watch(
  () => actividadForm.cronograma_id,
  async (newCronogramaId) => {
    if (newCronogramaId) {
      console.log(`Selected cronograma changed to ${newCronogramaId}. Fetching existing activities.`);
      await fetchActividadesForCronograma(newCronogramaId);
    } else {
      actividades.value = []; // Clear activities if no cronograma is selected
    }
  },
  { immediate: true } // Run on initial load if cronograma_id is already set
);

async function fetchActividadesForCronograma(cronogramaId) {
  const token = localStorage.getItem('token');
  if (!token) {
    actividadError.value = 'Token de autenticación no encontrado.';
    return;
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas/${cronogramaId}/actividades`, {
      headers: { Authorization: token },
    });
    // Assuming response.data is an array of activities with id and orden
    // Sort them by 'orden' to ensure correct display
    actividades.value = response.data.sort((a, b) => a.orden - b.orden);
    console.log('Existing activities loaded:', actividades.value);
  } catch (error) {
    console.error(`Error al cargar actividades para cronograma ${cronogramaId}:`, error);
    actividadError.value = error.response?.data?.message || 'Fallo al cargar actividades existentes.';
  }
}


onMounted(async () => {
  fetchCategorias()
  fetchSede()
  fetchCronogramasDetails()
})

</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content fade-in">
      <h2 class="modal-title">Evento
        <i class="fa-solid fa-xmark close-modal-button" @click="$emit('close')"></i>
      </h2>

      <div class="modal-tabs">
        <button
          :class="[
            'tab',
            activeTab === 'info' ? 'active' : '',
            isTabCompleted('info') ? 'completed' : ''
          ]"
          @click="activeTab = 'info'"
        >
          Información del Evento
        </button>
        <button
          :class="[
            'tab',
            activeTab === 'imagenes' ? 'active' : '',
            isTabCompleted('imagenes') ? 'completed' : ''
          ]"
          @click="activeTab = 'imagenes'"
        >
          Imágenes del Evento
        </button>
        <button
          :class="[
            'tab',
            activeTab === 'cronograma' ? 'active' : '',
            isTabCompleted('cronograma') ? 'completed' : ''
          ]"
          @click="activeTab = 'cronograma'"
        >
          Añadir Cronogramas
        </button>
        <button
          :class="[
            'tab',
            activeTab === 'actividades' ? 'active' : '',
            isTabCompleted('actividades') ? 'completed' : ''
          ]"
          @click="activeTab = 'actividades'"
        >
          Añadir Actividades
        </button>
      </div>

      <h3 class="modal-title2">{{ tabTitle }}</h3>

      <!-- Modal Información del Evento -->
      <ScrollBar>
      <div v-if="activeTab === 'info'">
        <form @submit.prevent="handleSubmit" class="custom-form">
          <div class="form-grid">
            <div class="form-group span-3">
              <input v-model="form.nombre" type="text" required />
              <label>Nombre del evento*</label>
            </div>

            <div class="form-group textarea-group span-3">
              <textarea v-model="form.descripcion" maxlength="225" required></textarea>
              <label>Descripción *</label>
              <div class="char-count">{{ descripcionCount }}/225</div>
            </div>

            <div class="form-group-row span-3">
              <div class="form-group half">
                <select v-model.number="form.categoria_id" required>
                  <option disabled value="">Seleccione una categoría</option>
                  <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
                    {{ cat.nombre }}
                  </option>
                </select>
                <label>Categoría *</label>
              </div>

              <div class="form-group half">
                <select v-model="form.modalidad" required>
                  <option disabled>Seleccione una modalidad</option>
                  <option>Presencial</option>
                  <option>Virtual</option>
                  <option>Híbrida</option>
                </select>
                <label>Modalidad *</label>
              </div>
            </div>
            <div class="form-group-row span-3">
              <div class="form-group half">
              <input v-model="form.fecha_inicio" type="date" required />
              <label>Fecha de Inicio *</label>
            </div>

            <div class="form-group half">
              <input v-model="form.fecha_fin" type="date" required />
              <label>Fecha de Fin *</label>
            </div>
            </div>

            <div class="form-group span-1">
              <input v-model="form.espacio" type="text" required />
              <label>Espacio *</label>
            </div>

            <div class="form-group span-1">
              <select v-model.number="form.sede_id" required>
                <option disabled value="">Seleccione una sede</option>
                <option v-for="sede in sede" :key="sede.id" :value="sede.id">
                  {{ sede.nombre }}
                </option>
              </select>
              <label>Sede *</label>
            </div>

            <div class="form-group span-1">
              <input
                v-model.number="form.capacidad"
                type="number"
                placeholder="#"
                min="0"
                required
              />
              <label>Capacidad *</label>
            </div>
          </div>

          <div class="switch-group">
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                v-model="form.hayEquipos"
                :true-value="1"
                :false-value="0"
              />
              <label class="form-check-label">Ingresos de Proyectos</label>
            </div>

            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="form.hayFormulario" />
              <label class="form-check-label">Se necesita Rubricas</label>
            </div>
          </div>

          <p v-if="error" class="error-text">{{ error }}</p>

          <div class="button-row">
            <button type="button" class="btn btn-cancel" disabled>
              <i class="fas fa-angle-left"></i>Volver
            </button>
            <button type="submit" class="btn btn-primary">
              Siguiente<i class="fas fa-angle-right"></i>
            </button>
          </div>

          <!-- <div class="button-row">
            <button class="btn btn-primary" @click="testLoading">
              Loader button
            </button>
          </div> -->
        </form>
      </div>

      <!-- Modal Imágenes del Evento -->
      <div v-if="activeTab === 'imagenes'">
        <div class="imagenes-section">
          <!-- Cover del Evento -->
          <div>
            <label class="imagenes-label">Cover del Evento *</label>
            <div class="imagenes-cover-row">
              <!-- Imagen del cover -->
              <div class="cover-preview-box">
                <img
                  v-if="coverPreview"
                  :src="coverPreview"
                  class="cover-preview-img"
                  alt="Cover Preview"
                />
                <div v-else class="cover-preview-empty">Sin imagen</div>
              </div>
              <!-- Botón de carga -->
              <div class="imagenes-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleCoverChange"
                  class="imagenes-file-input"
                  ref="coverInput"
                />
                <button type="button" @click="coverInput.click()" class="imagenes-btn">
                  Elegir archivo...
                </button>
                <p class="imagenes-help-text">Suba una imagen que no pese más de 10 mb</p>
              </div>
            </div>
          </div>

          <!-- Imágenes adicionales -->
          <div>
            <label class="imagenes-label">Imágenes adicionales *</label>
            <div class="imagenes-dropzone" @dragover.prevent @drop.prevent="handleDrop">
              <input
                type="file"
                multiple
                accept=".jpg, .png, .webp"
                @change="handleAdditionalChange"
                class="imagenes-file-input"
                ref="additionalInput"
              />
              <div class="imagenes-dropzone-content">
                <i class="fa-solid fa-folder imagenes-svg"></i>
                <p>Puedes arrastrar y soltar archivos aquí para añadirlos</p>
                <span class="imagenes-or">OR</span>
                <button type="button" @click="additionalInput.click()" class="imagenes-btn">
                  Buscar en archivos
                </button>
                <p class="imagenes-help-text">Solo se aceptan archivos .jpg, .png o .webp</p>
              </div>
              <div v-if="additionalPreviews.length" class="imagenes-grid">
                <img
                  v-for="(img, idx) in additionalPreviews"
                  :key="idx"
                  :src="img"
                  class="imagenes-thumb"
                  alt="Imagen adicional"
                />
              </div>
            </div>
            <div class="button-row">
            <button type="button" class="btn btn-cancel" @click="$emit('close')">
              <i class="fas fa-angle-left"></i>Volver
            </button>
            <button type="submit" class="btn btn-primary">
              Siguiente<i class="fas fa-angle-right"></i>
            </button>
          </div>
          </div>
        </div>
      </div>

      <!-- Modal Añadir Cronogramas -->
      <div v-if="activeTab === 'cronograma'">
        <form class="cronograma-form" @submit.prevent="handleCronogramaSubmit">
          <div class="form-group span-3">
            <input id="cronograma-titulo" v-model="cronogramaForm.titulo" type="text" required />
            <label for="cronograma-titulo">Titulo del cronograma*</label>
          </div>

          <div class="form-group textarea-group span-3">
            <textarea id="cronograma-desc" v-model="cronogramaForm.descripcion" maxlength="225" required></textarea>
            <label for="cronograma-desc">Descripción *</label>
            <div class="char-count">{{ descripcionCount }}/225</div>
          </div>
          <div class="cronograma-row">
            <div class="form-group">
              <input v-model="cronogramaForm.fecha_inicio" type="date" placeholder=" " required />
              <label>Fecha de Inicio *</label>
            </div>
            <div class="form-group">
              <input v-model="cronogramaForm.fecha_fin" type="date" placeholder=" " required />
              <label>Fecha de Fin *</label>
            </div>
          </div>
          <div class="form-group span-3">
            <button type="submit" class="btn btn-primary" style="display: block; margin: 0 auto; max-width: 200px;">
              Crear cronograma <i class="fas fa-plus"></i>
            </button>
          </div>


          <div class="button-row">
            <button type="button" class="btn btn-cancel" @click="activeTab = 'imagenes'">
              <i class="fas fa-angle-left"></i> Volver
            </button>
            <button type="button" class="btn btn-primary" @click="confirmProceedToActivities">
              Siguiente <i class="fas fa-angle-right"></i>
            </button>


          </div>
        </form>
      </div>

      <!-- Modal Añadir Actividades -->
      <div v-if="activeTab === 'actividades'">
        <form class="actividad-form" @submit.prevent="handleActividadAdd">
          <div class="form-group span-3">
            <input v-model="actividadForm.titulo" type="text" required />
            <label for="cronograma-titulo">Título*</label>
          </div>

          <div class="form-group textarea-group span-3">
            <textarea id="cronograma-desc" v-model="actividadForm.descripcion" maxlength="225" required></textarea>
            <label for="cronograma-desc">Descripción *</label>
            <div class="char-count">{{ descripcionCount }}/225</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <select v-model="actividadForm.cronograma_id" required>
                <option disabled value="">Cronograma *</option>
                <option v-for="c in cronogramasOptions" :key="c.id" :value="c.id">{{ c.titulo }}</option>
              </select>
              <label>Cronograma *</label>
            </div>
            <div class="form-group">
              <input v-model="actividadForm.fecha_inicio" type="date" placeholder=" " required />
              <label>Fecha de Inicio *</label>
            </div>
            <div class="form-group">
              <input v-model="actividadForm.fecha_fin" type="date" placeholder=" " required />
              <label>Fecha de Fin *</label>
            </div>
          </div>
          <div class="button-row" style="justify-content: center; margin-top: 0rem;">
            <button type="submit" class="btn btn-primary" :disabled="addingActividad">
              {{ addingActividad ? 'Añadiendo...' : 'Añadir Actividad' }}
            </button>
          </div>

        </form>
        <div v-if="actividadError" class="alert alert-danger mt-3">{{ actividadError }}</div>

        <div class="tabla-actividades">
          <div v-if="reorderingActividades" class="overlay-loader">
            <div class="spinner"></div> Actualizando orden...
          </div>
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Inicia</th>
                <th>Finaliza</th>
                <th>Depende de</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(act, idx) in actividades" :key="act.id || idx">
                <td>
                  <button @click="moverArriba(idx)" :disabled="idx === 0 || reorderingActividades">▲</button>
                  {{ act.orden }} <button @click="moverAbajo(idx)" :disabled="idx === actividades.length - 1 || reorderingActividades">
                    ▼
                  </button>
                </td>
                <td>{{ act.titulo }}</td>
                <td>{{ act.descripcion }}</td>
                <td>{{ act.fecha_inicio.split('T')[0] }}</td>
                <td>{{ act.fecha_fin.split('T')[0] }}</td>
                <td>{{ act.dependencia_id || '------' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="button-row">
          <button type="button" class="btn btn-cancel" @click="activeTab = 'cronograma'" disabled>
            <i class="fas fa-angle-left"></i> Volver
          </button>
          <button type="button" class="btn btn-primary">
            Guardar <i class="fas fa-angle-right"></i>
          </button>
        </div>
      </div>
      </ScrollBar>

    </div>
      <!-- Loader  -->
      <Loader v-if="loading" />

  </div>

  <ConfirmationModal
    :show="showConfirmationModal"
    title="Confirmar Continuación"
    message="¿Estás seguro de que deseas continuar a añadir actividades? Una vez que pases a la siguiente sección,
    **no podrás volver a crear cronogramas** para este evento. Sin embargo, podrás editar los cronogramas existentes más tarde."
    confirm-text="Sí, continuar"
    cancel-text="No, quedarme"
    @confirm="handleConfirmationConfirm"
    @cancel="handleConfirmationCancel"
  />

  <OkModal
    :show="showSuccessModal"
    :message="successMessage"
    @close="handleModalClose"
    :duration="2500"
  />
</template>

<style scoped>
/* Add styles for your loader overlay */
.overlay-loader {
  position: absolute; /* or relative to its parent container */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10; /* Ensure it's above the table */
  border-radius: 8px; /* Match your table/card styling */
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Ensure your table container has position: relative if overlay-loader is absolute */
.tabla-actividades {
    position: relative; /* Essential for overlay-loader's absolute positioning */
    /* ... rest of your table styles */
}

/* Add any other specific styles for buttons, alerts, etc., if not already present */
.alert {
  padding: 10px 15px;
  border-radius: 5px;
  margin-top: 15px;
  font-size: 0.85em;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
/* Overlay del fondo */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.modal-imagenes {
  max-width: 900px;
  width: 95vw;
  margin: 0 auto;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-height: 95vh;
  padding: 2rem;
  max-width: 600px;
  width: 95%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: fadeSlideIn 0.4s ease;
  display: flex;
  flex-direction: column;
}


.button-row {
  padding-top: 1rem;
  background: white;
  z-index: 10;
  position: sticky;
  bottom: 0;
  display: flex;
  margin-top: 1rem;
  gap: 1rem;
  justify-content: flex-start;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.7rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.close-modal-button {
  background: none;
  border: none;
  font-size: 0.8em;
  cursor: pointer;
  color: #333;
  padding: 0;
}

.close-modal-button:hover {
  color: #174384;
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

.tab.completed {
  border-bottom: 4px solid #174384;
  border-radius: 10px 10px 0 0;
  font-weight: bold;
  color: #174384;
}

.custom-form {
  max-width: 900px;
  margin: 2px;
}

.form-grid {
  padding-top: 0.3em;
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
  transition:
    background-color 1s ease,
    border-color 1s ease;
}

.error-text {
  color: red;
  text-align: center;
  font-weight: bold;
}

/* Botones */

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
.imagenes-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.imagenes-label {
  display: block;
  font-weight: 500;
  font-size: 0.8rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.imagenes-cover-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.cover-preview-box {
  width: 250px; /* 125px * 2 */
  height: 144px; /* 72px * 2 */
  background: #f3f3f3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.cover-preview-img {
  width: 250px; /* 125px * 2 */
  height: 144px; /* 72px * 2 */
  object-fit: contain;
  display: block;
}

.cover-preview-empty {
  color: #bbb;
  font-size: 0.85rem;
  text-align: center;
}

.imagenes-upload-box {
  flex: 1;
}

.imagenes-file-input {
  display: none;
}

.imagenes-btn {
  background: #174384;
  color: #fff;
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
  transition: background 0.2s;
}

.imagenes-btn:hover {
  background: #2461b1;
}

.imagenes-help-text {
  font-size: 0.65rem;
  color: #888;
  margin-top: 0.3rem;
}

.imagenes-dropzone {
  border: 2px dashed #4c81cf;
  border-radius: 10px;
  padding: 1rem 1rem;
  text-align: center;
  cursor: pointer;
  background: #f8fafc;
  margin-top: 0.5rem;
}

.imagenes-dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  justify-items: center;
}

.imagenes-svg {
  width: 22px;
  height: 22px;
  color: #2563eb;
  margin-bottom: 0.2rem;
}

.imagenes-or {
  font-size: 0.9rem;
  color: #888;
  margin: 0.2rem 0;
}

.imagenes-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
}

.imagenes-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: #fff;
}

@media (max-width: 600px) {
  .imagenes-cover-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .imagenes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.cronograma-form {
  padding-top: 0.3em;
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.cronograma-row {
  display: flex;
  gap: 1rem;
}

.cronograma-form .form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cronograma-form input,
.cronograma-form textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  background: #fff;
  box-sizing: border-box;
}

.cronograma-form textarea {
  min-height: 60px;
  resize: vertical;
}

.input-icon {
  position: relative;
}

@media (max-width: 600px) {
  .cronograma-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
.actividad-form {
  padding-top: 0.3em;
  padding-left: 0.1em;
  max-width: 900px;
  margin: 0 auto 2rem auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
  position: relative;
}

.tabla-actividades {
  margin: 2rem 0 1rem 0;
  overflow-x: auto;
}

.tabla-actividades table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.70rem;
  background: #fff;
}

.tabla-actividades th,
.tabla-actividades td {
  border: 1px solid #ddd;
  padding: 0.5rem 0.7rem;
  text-align: left;
}

.tabla-actividades th {
  background: #f5f5f5;
  font-weight: 600;
}

.tabla-actividades button {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #174384;
  padding: 0 0.2rem;
}

.tabla-actividades button:disabled {
  color: #bbb;
  cursor: not-allowed;
}

.tabla-paginacion {
  font-size: 0.9rem;
  color: #555;
  margin-top: 0.5rem;
}

@media (max-width: 700px) {
  .form-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
