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
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  capacidad: null,
  espacio: '',
  modalidad: '',
  sede_id: null,
  categoria_id: null,
  hayEquipos: 0,
  hayFormulario: false,
  estado: 'activo',
  inscripcionesAbiertas: true
});

const cronogramaForm = reactive({
  evento_id: '',
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
});

const actividadForm = reactive({
  cronograma_id: '',
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  dependencia_id: null,
});

const cronogramas = ref([]);

const activeTab = ref('info');
const descripcionCount = computed(() => form.descripcion.length);
const error = ref('');
const loading = ref(false);
const categorias = ref([]);
const sede = ref([]);
const eventIdStore = ref(null);
const cronogramaIdStore = ref([]);
const showConfirmationModal = ref(false);
const ConfModalMessage = ref('');
const showSuccessModal = ref(false);
const successMessage = ref('');
const coverInput = ref(null);
const additionalInput = ref(null);
const coverPreview = ref(imageHolder);
const additionalPreviews = ref([]);
const addingActividad = ref(false);
const reorderingActividades = ref(false);
const actividadError = ref(null);

const isClosingModal = ref(false);

const tabOrder = ['info', 'imagenes', 'cronograma', 'actividades'];

const handleModalClose = () => {
  showSuccessModal.value = false;
};

const promptCloseConfirmation = () => {
  isClosingModal.value = true;
  ConfModalMessage.value = "Al cerrar el modal se borrará toda la información del evento que ingresaste. ¿Estás seguro de que quieres continuar?";
  showConfirmationModal.value = true;
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
});

function testLoading() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    console.log('✅ Simulación completada.')
  }, 10000)
}

const saveToLocalStorage = () => {
  const dataToStore = {
    form: form,
    cronogramaForm: cronogramaForm,
    actividadForm: actividadForm,
    cronogramas: cronogramas.value,
    activeTab: activeTab.value,
    eventIdStore: eventIdStore.value,
    cronogramaIdStore: cronogramaIdStore.value,
    coverPreview: coverPreview.value,
    additionalPreviews: additionalPreviews.value,
  };
  localStorage.setItem('eventDraft', JSON.stringify(dataToStore));
  console.log('Draft saved to local storage.');
};

const loadFromLocalStorage = () => {
  const savedData = localStorage.getItem('eventDraft');
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    Object.assign(form, parsedData.form);
    Object.assign(cronogramaForm, parsedData.cronogramaForm);
    Object.assign(actividadForm, parsedData.actividadForm);

    cronogramas.value = parsedData.cronogramas || [];
    activeTab.value = parsedData.activeTab || 'info';
    eventIdStore.value = parsedData.eventIdStore || null;
    cronogramaIdStore.value = parsedData.cronogramaIdStore || [];
    coverPreview.value = parsedData.coverPreview || imageHolder;
    additionalPreviews.value = parsedData.additionalPreviews || [];

    console.log('Draft loaded from local storage.');
  }
};

const clearLocalStorage = () => {
  localStorage.removeItem('eventDraft');
  console.log('Draft cleared from local storage.');
};

watch([form, cronogramaForm, actividadForm, cronogramas, activeTab, eventIdStore, cronogramaIdStore, coverPreview, additionalPreviews], () => {
  saveToLocalStorage();
}, { deep: true });

const fetchCategorias = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error("Token de autenticación no encontrado.");
    return;
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/categoria`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
      headers: { 'Authorization': `Bearer ${token}` }
    });
    sede.value = response.data;
  } catch (error) {
    console.error("Error al obtener las sedes:", error);
  }
};

async function enviarEvento(data) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  try {
    console.log('JSON enviado al backend (Evento):', JSON.stringify(data, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    });
    console.log('Evento creado con éxito:', response.data);
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error('Error del servidor al crear evento:', err.response.data);
      throw new Error(err.response.data?.mensaje || 'Error al crear el evento.');
    } else if (err.request) {
      console.error('Error de red: No se recibió respuesta del servidor al crear evento.');
      throw new Error('Fallo en la conexión con el servidor.');
    } else {
      console.error('Error al configurar la solicitud para crear evento:', err.message);
      throw new Error('Error interno al procesar la solicitud de evento.');
    }
  } finally {
    loading.value = false;
  }
}

async function enviarCronogramas(cronogramaData, eventId) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  try {
    const payload = { ...cronogramaData, evento_id: eventId };
    console.log('JSON enviado al backend (Cronograma):', JSON.stringify(payload, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    });
    console.log('Cronograma creado con éxito:', response.data);
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error('Error del servidor al crear cronograma:', err.response.data);
      throw new Error(err.response.data?.mensaje || 'Error al crear el cronograma.');
    } else if (err.request) {
      console.error('Error de red: No se recibió respuesta del servidor al crear cronograma.');
      throw new Error('Fallo en la conexión con el servidor.');
    } else {
      console.error('Error al configurar la solicitud para crear cronograma:', err.message);
      throw new Error('Error interno al procesar la solicitud de cronograma.');
    }
  } finally {
    loading.value = false;
  }
}

async function enviarActividad(activityData, cronogramaBackendId) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  try {
    const payload = {
      ...activityData,
      cronograma_id: cronogramaBackendId,
      fecha_inicio: activityData.fecha_inicio + 'T00:00:00.000000Z',
      fecha_fin: activityData.fecha_fin + 'T00:00:00.000000Z',
    };
    console.log('JSON enviado al backend (Actividad):', JSON.stringify(payload, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma`, payload, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });
    console.log('Actividad creada con éxito:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar actividad:', error);
    throw new Error(error.response?.data?.message || 'Fallo al añadir la actividad.');
  }
}

async function updateActivityOrderAndDependency(activityId, cronogramaBackendId, orden, dependenciaId) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  const payload = {
    cronograma_id: cronogramaBackendId,
    orden: orden,
    dependencia_id: dependenciaId,
  };
  try {
    const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma/${activityId}`, payload, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });
    console.log(`Actividad ID ${activityId} orden y dependencia actualizadas:`, response.data);
    return true;
  } catch (error) {
    console.error(`Error al actualizar el orden/dependencia de la actividad ID ${activityId}:`, error);
    throw new Error(error.response?.data?.message || `Fallo al actualizar la actividad ID ${activityId}.`);
  }
}

function handleSubmit() {
  error.value = '';

  if (
    !form.nombre ||
    !form.descripcion ||
    !form.fecha_inicio ||
    !form.fecha_fin ||
    !form.modalidad ||
    !form.categoria_id ||
    !form.sede_id ||
    !form.espacio ||
    form.capacidad === null ||
    form.capacidad === '' ||
    !form.estado ||
    form.inscripcionesAbiertas === null
  ) {
    error.value = '⚠️ Por favor, completa todos los campos obligatorios.';
    return;
  }

  const fechaInicio = new Date(form.fecha_inicio);
  const fechaFin = new Date(form.fecha_fin);

  if (isNaN(fechaInicio) || isNaN(fechaFin)) {
    error.value = '⚠️ Las fechas y horas ingresadas no son válidas.';
    return;
  }

  if (fechaInicio >= fechaFin) {
    error.value = '⚠️ La fecha y hora de inicio debe ser anterior a la fecha y hora de fin.';
    return;
  }

  activeTab.value = 'imagenes';
  saveToLocalStorage();
}

function handleCoverChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size <= 10240 * 10240) {
    coverPreview.value = URL.createObjectURL(file);
  } else {
    event.target.value = '';
    coverPreview.value = imageHolder;
    alert('La imagen debe pesar menos de 10 MB.');
  }
  saveToLocalStorage();
}

function handleAdditionalChange(event) {
  const files = Array.from(event.target.files);
  additionalPreviews.value = files.map((file) => URL.createObjectURL(file));
  saveToLocalStorage();
}

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files);
  additionalPreviews.value = files.map((file) => URL.createObjectURL(file));
  saveToLocalStorage();
}

function handleCronogramaSubmit() {
  error.value = '';

  if (
    !cronogramaForm.titulo ||
    !cronogramaForm.descripcion ||
    !cronogramaForm.fecha_inicio ||
    !cronogramaForm.fecha_fin
  ) {
    error.value = '⚠️ Por favor, completa todos los campos obligatorios del cronograma.';
    return;
  }

  const fechaInicio = new Date(cronogramaForm.fecha_inicio);
  const fechaFin = new Date(cronogramaForm.fecha_fin);

  if (isNaN(fechaInicio) || isNaN(fechaFin)) {
    error.value = '⚠️ Las fechas ingresadas para el cronograma no son válidas.';
    return;
  }

  if (fechaInicio >= fechaFin) {
    error.value = '⚠️ La fecha de inicio del cronograma debe ser anterior a la fecha de fin.';
    return;
  }

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  cronogramas.value.push({
    ...JSON.parse(JSON.stringify(cronogramaForm)),
    tempId: tempId,
    actividades: [],
    orden: cronogramas.value.length + 1
  });

  cronogramaForm.titulo = '';
  cronogramaForm.descripcion = '';
  cronogramaForm.fecha_inicio = '';
  cronogramaForm.fecha_fin = '';
  error.value = '';

  successMessage.value = `El cronograma "<strong>${cronogramas.value[cronogramas.value.length - 1].titulo}</strong>" ha sido añadido a la lista.`;
  showSuccessModal.value = true;

  saveToLocalStorage();
}

function proceedToActivities() {
  if (cronogramas.value.length === 0) {
    error.value = '⚠️ Debes añadir al menos un cronograma antes de pasar a las actividades.';
    return;
  }
  activeTab.value = 'actividades';
  saveToLocalStorage();
}

const cronogramasOptions = computed(() => {
  return cronogramas.value.map(c => ({ id: c.tempId, titulo: c.titulo }));
});

const activitiesForSelectedCronograma = computed(() => {
  if (!actividadForm.cronograma_id) {
    return [];
  }
  const selectedCronograma = cronogramas.value.find(c => c.tempId === actividadForm.cronograma_id);
  return selectedCronograma ? selectedCronograma.actividades.sort((a, b) => a.orden - b.orden) : [];
});

async function handleActividadAdd() {
  actividadError.value = null;
  addingActividad.value = true;

  if (
    !actividadForm.titulo ||
    !actividadForm.descripcion ||
    !actividadForm.cronograma_id ||
    !actividadForm.fecha_inicio ||
    !actividadForm.fecha_fin
  ) {
    actividadError.value = 'Por favor, completa todos los campos obligatorios de la actividad.';
    addingActividad.value = false;
    return;
  }

  const parentCronograma = cronogramas.value.find(c => c.tempId === actividadForm.cronograma_id);

  if (!parentCronograma) {
    actividadError.value = 'Cronograma padre seleccionado no encontrado en el borrador.';
    addingActividad.value = false;
    return;
  }

  if (!parentCronograma.actividades) {
    parentCronograma.actividades = [];
  }

  const newOrder = parentCronograma.actividades.length > 0 ?
    Math.max(...parentCronograma.actividades.map(a => a.orden)) + 1 : 1;

  const tempActivityId = `temp_act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const newActivity = {
    tempId: tempActivityId,
    cronograma_id: actividadForm.cronograma_id,
    titulo: actividadForm.titulo,
    descripcion: actividadForm.descripcion,
    fecha_inicio: actividadForm.fecha_inicio,
    fecha_fin: actividadForm.fecha_fin,
    orden: newOrder,
    dependencia_id: null,
  };

  parentCronograma.actividades.push(newActivity);

  actividadForm.titulo = '';
  actividadForm.descripcion = '';
  actividadForm.fecha_inicio = '';
  actividadForm.fecha_fin = '';
  actividadForm.dependencia_id = null;

  successMessage.value = `La actividad "<strong>${newActivity.titulo}</strong>" ha sido añadida localmente.`;
  showSuccessModal.value = true;
  addingActividad.value = false;
  saveToLocalStorage();
}

function swapActivities(cronogramaTempId, idx1, idx2) {
  const parentCronograma = cronogramas.value.find(c => c.tempId === cronogramaTempId);
  if (!parentCronograma || !parentCronograma.actividades) return;

  const activitiesArray = parentCronograma.actividades;
  const temp = activitiesArray[idx1];
  activitiesArray[idx1] = activitiesArray[idx2];
  activitiesArray[idx2] = temp;

  activitiesArray.forEach((act, index) => {
    act.orden = index + 1;
  });
  saveToLocalStorage();
}

function moverArriba(cronogramaTempId, idx) {
  const parentCronograma = cronogramas.value.find(c => c.tempId === cronogramaTempId);
  if (!parentCronograma || !parentCronograma.actividades || idx === 0) return;
  swapActivities(cronogramaTempId, idx, idx - 1);
}

function moverAbajo(cronogramaTempId, idx) {
  const parentCronograma = cronogramas.value.find(c => c.tempId === cronogramaTempId);
  if (!parentCronograma || !parentCronograma.actividades || idx === parentCronograma.actividades.length - 1) return;
  swapActivities(cronogramaTempId, idx, idx + 1);
}

function getDependenciaDisplayText(act, cronogramaTempId) {
  const parentCronograma = cronogramas.value.find(c => c.tempId === cronogramaTempId);
  if (!parentCronograma || !parentCronograma.actividades) return 'N/A';

  const idx = parentCronograma.actividades.findIndex(a => a.tempId === act.tempId);

  if (idx === 0) {
    return '------';
  } else {
    const previousActivity = parentCronograma.actividades[idx - 1];
    return previousActivity ? previousActivity.titulo : 'N/A';
  }
}

function handleSaveButtonClick() {
  isClosingModal.value = false;
  ConfModalMessage.value = '¿Deseas guardar la configuración actual de todas las actividades asociadas a tus cronogramas? Esta acción consolidará los cambios.';
  showConfirmationModal.value = true;
}

async function handleConfirmationConfirm() {
  showConfirmationModal.value = false;

  if (isClosingModal.value) {
    clearLocalStorage();
    emit('close');
  } else if (activeTab.value === 'cronograma') {
    activeTab.value = 'actividades';
    console.log('Switched to Activities tab after confirmation.');
  } else if (activeTab.value === 'actividades') {
    console.log('Final save initiated. Sending all data to backend...');
    await processFinalSave();
    emit('close');
  }
  isClosingModal.value = false;
}

function handleConfirmationCancel() {
  showConfirmationModal.value = false;
  isClosingModal.value = false;
}

async function processFinalSave() {
  loading.value = true;
  error.value = null;

  try {
    const formatDateTime = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const eventPayload = {
      ...JSON.parse(JSON.stringify(form)),
      fecha_inicio: formatDateTime(form.fecha_inicio),
      fecha_fin: formatDateTime(form.fecha_fin),
      hayEquipos: Number(form.hayEquipos),
      hayFormulario: Boolean(form.hayFormulario),
      inscripcionesAbiertas: Boolean(form.inscripcionesAbiertas)
    };

    const createdEvent = await enviarEvento(eventPayload);
    eventIdStore.value = createdEvent.id;
    successMessage.value = 'Evento creado con éxito.';
    showSuccessModal.value = true;

    const cronogramaIdMap = new Map();

    for (const cronograma of cronogramas.value) {
      const createdCronograma = await enviarCronogramas(JSON.parse(JSON.stringify(cronograma)), eventIdStore.value);
      cronogramaIdMap.set(cronograma.tempId, createdCronograma.id);

      if (cronograma.actividades && cronograma.actividades.length > 0) {
        let previousActivityBackendId = null;

        const sortedActivities = cronograma.actividades.sort((a, b) => a.orden - b.orden);

        for (let i = 0; i < sortedActivities.length; i++) {
          const activity = sortedActivities[i];

          const createdActivity = await enviarActividad(JSON.parse(JSON.stringify(activity)), createdCronograma.id);
          const activityBackendId = createdActivity.id;

          let dependencyId = null;
          if (i === 0) {
            dependencyId = activityBackendId;
          } else {
            dependencyId = previousActivityBackendId;
          }

          await updateActivityOrderAndDependency(activityBackendId, createdCronograma.id, activity.orden, dependencyId);

          previousActivityBackendId = activityBackendId;
        }
      }
    }

    successMessage.value = '¡Evento, cronogramas y actividades creados y configurados con éxito!';
    showSuccessModal.value = true;
    clearLocalStorage();
  } catch (err) {
    console.error('Error during final save process:', err);
    error.value = err.message || 'Error desconocido durante el proceso de guardado final.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchCategorias();
  await fetchSede();
  loadFromLocalStorage();

  if (cronogramas.value.length > 0 && !actividadForm.cronograma_id) {
    actividadForm.cronograma_id = cronogramas.value[0].tempId;
  }
});
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="promptCloseConfirmation">
    <div class="modal-content fade-in">
      <h2 class="modal-title">Evento
        <i class="fa-solid fa-xmark close-modal-button" @click="promptCloseConfirmation"></i>
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
                  <option disabled value="">Seleccione una modalidad</option>
                  <option>Presencial</option>
                  <option>Virtual</option>
                  <option>Híbrida</option>
                </select>
                <label>Modalidad *</label>
              </div>
              <div class="form-group half">
                <select v-model="form.estado" required>
                  <option disabled value="">Seleccione un estado</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
                <label>Estado del Evento *</label>
              </div>
            </div>

            <div class="form-group-row span-3">
              <div class="form-group half">
                <input v-model="form.fecha_inicio" type="datetime-local" required />
                <label>Fecha y Hora de Inicio *</label>
              </div>

              <div class="form-group half">
                <input v-model="form.fecha_fin" type="datetime-local" required />
                <label>Fecha y Hora de Fin *</label>
              </div>
            </div>

            <div class="form-group span-1">
              <input v-model="form.espacio" type="text" required />
              <label>Espacio *</label>
            </div>

            <div class="form-group span-1">
              <select v-model.number="form.sede_id" required>
                <option disabled value="">Seleccione una sede</option>
                <option v-for="s in sede" :key="s.id" :value="s.id">
                  {{ s.nombre }}
                </option>
              </select>
              <label>Sede *</label>
            </div>


            <div class="form-group span-1">
              <input
                v-model.number="form.capacidad"
                type="number"
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


            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="form.inscripcionesAbiertas" />
              <label class="form-check-label">Inscripciones Abiertas</label>
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
        </form>
      </div>

      <div v-if="activeTab === 'imagenes'">
        <div class="imagenes-section">
          <div>
            <label class="imagenes-label">Cover del Evento *</label>
            <div class="imagenes-cover-row">
              <div class="cover-preview-box">
                <img
                  v-if="coverPreview"
                  :src="coverPreview"
                  class="cover-preview-img"
                  alt="Cover Preview"
                />
                <div v-else class="cover-preview-empty">Sin imagen</div>
              </div>
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
            <button type="button" class="btn btn-cancel" @click="activeTab = 'info'">
              <i class="fas fa-angle-left"></i>Volver
            </button>
            <button type="submit" class="btn btn-primary" @click="activeTab = 'cronograma'">
              Siguiente<i class="fas fa-angle-right"></i>
            </button>
            <button type="button" class="btn btn-cancel" @click="activeTab = 'cronograma'">
              Omitir <i class="fas fa-forward"></i>
            </button>
            </div>
          </div>
        </div>
      </div>

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
        </form>

        <div class="tabla-cronogramas" v-if="cronogramas.length">
          <h4>Cronogramas Creados:</h4>
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Inicia</th>
                <th>Finaliza</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cronograma, idx) in cronogramas" :key="cronograma.tempId">
                <td>{{ cronograma.orden }}</td>
                <td>{{ cronograma.titulo }}</td>
                <td>{{ cronograma.descripcion }}</td>
                <td>{{ cronograma.fecha_inicio }}</td>
                <td>{{ cronograma.fecha_fin }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="no-cronogramas-message">Aún no has añadido ningún cronograma.</p>

        <div class="button-row">
          <button type="button" class="btn btn-cancel" @click="activeTab = 'imagenes'">
            <i class="fas fa-angle-left"></i> Volver
          </button>
          <button type="button" class="btn btn-primary" @click="proceedToActivities">
            Siguiente <i class="fas fa-angle-right"></i>
          </button>
        </div>
      </div>

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
              <tr v-for="(act, idx) in activitiesForSelectedCronograma" :key="act.tempId">
                <td>
                  <button @click="moverArriba(actividadForm.cronograma_id, idx)" :disabled="idx === 0 || reorderingActividades">▲</button>
                  {{ act.orden }} <button @click="moverAbajo(actividadForm.cronograma_id, idx)" :disabled="idx === activitiesForSelectedCronograma.length - 1 || reorderingActividades">
                    ▼
                  </button>
                </td>
                <td>{{ act.titulo }}</td>
                <td>{{ act.descripcion }}</td>
                <td>{{ act.fecha_inicio }}</td>
                <td>{{ act.fecha_fin }}</td>
                <td>{{ getDependenciaDisplayText(act, actividadForm.cronograma_id) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="button-row">
          <button type="button" class="btn btn-cancel" @click="activeTab = 'cronograma'" >
            <i class="fas fa-angle-left"></i> Volver
          </button>
          <button type="button" class="btn btn-primary" @click="handleSaveButtonClick">
            Guardar <i class="fas fa-angle-right"></i>
          </button>
        </div>
      </div>
      </ScrollBar>

    </div>
      <Loader v-if="loading" />

  </div>

  <ConfirmationModal
    :show="showConfirmationModal"
    title="Confirmar Continuación"
    :message="ConfModalMessage"
    confirm-text="Sí, continuar"
    cancel-text="No, quedarme"
    @confirm="handleConfirmationConfirm"
    @cancel="handleConfirmationCancel"
  />

  <OkModal
    :show="showSuccessModal"
    :message="successMessage"
    @close="handleModalClose"
    :duration="2000"
  />
</template>
<style scoped>

/* Styles for the Cronogramas Table */
.tabla-cronogramas {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto; /* Ensures table is scrollable on small screens */
  border-radius: 8px; /* Apply border-radius to the container for consistency */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* Consistent with modal-content shadow */
}

.tabla-cronogramas h4 {
  font-size: 1.1rem;
  color: #333; /* Consistent dark text */
  margin-bottom: 1rem;
  text-align: center;
}

.tabla-cronogramas table {
  width: 100%;
  border-collapse: collapse;
  /* box-shadow and border-radius moved to parent for better overflow handling */
}

.tabla-cronogramas thead {
  background-color: #174384; /* Using the deep blue from .btn-primary and .tab.active */
  color: white;
}

.tabla-cronogramas th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap; /* Prevent header text from wrapping too early */
}

.tabla-cronogramas tbody tr:nth-child(even) {
  background-color: #f8f9fa; /* Keeping a light background for even rows */
}

.tabla-cronogramas tbody tr:hover {
  background-color: #e2f0ff; /* Lighter blue on hover, consistent with previous suggestion */
}

.tabla-cronogramas td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #dee2e6; /* Light border between rows */
  font-size: 0.875rem;
  color: #495057; /* Consistent with other neutral text */
}

.tabla-cronogramas tbody tr:last-child td {
  border-bottom: none; /* No border for the last row */
}

/* Message when no cronogramas are added */
.no-cronogramas-message {
  text-align: center;
  color: #6c757d; /* Consistent gray text */
  font-style: italic;
  padding: 1.5rem 0;
  border: 1px dashed #ced4da; /* Light gray dashed border */
  border-radius: 5px;
  background-color: #fefefe; /* Very light background */
  margin-top: 1.5rem;
}

.overlay-loader {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 8px;
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


.tabla-actividades {
    position: relative;

}

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

.form-check-label {
  font-size: 0.7rem;
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
