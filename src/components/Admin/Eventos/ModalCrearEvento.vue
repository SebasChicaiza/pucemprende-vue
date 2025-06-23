<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Loader from '@/components/LoaderComponent.vue'
import imageHolder from '@/assets/iconos/imageHolder.png'
import ScrollBar from '@/components/ScrollBar.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import axios from 'axios';


// Define tabTitleMap here, at the top level of script setup
const tabTitleMap = computed(() => ({
  info: 'Información del Evento',
  imagenes: 'Imágenes del Evento',
  cronograma: 'Añadir Cronogramas',
  actividades: 'Añadir Actividades'
}));

const props = defineProps({
  show: Boolean,
  eventData: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  id: null,
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
  fecha_inicio: '', // Now holds date AND time
  fecha_fin: '',    // Now holds date AND time
});

const actividadForm = reactive({
  cronograma_id: '',
  titulo: '',
  descripcion: '',
  fecha_inicio: '', // Now holds date AND time
  fecha_fin: '',    // Now holds date AND time
  dependencia_id: null,
});

const cronogramas = ref([]); // This will now hold cronograms with their activities

const activeTab = ref('info');
const descripcionCount = computed(() => form.descripcion.length);
const error = ref('');
const loading = ref(false);
const categorias = ref([]); // This holds the fetched categories with IDs
const sede = ref([]);
const eventIdStore = ref(null);
const cronogramaIdStore = ref([]); // This might still be useful for new cronogramas before saving
const showConfirmationModal = ref(false);
const ConfModalMessage = ref('');
const showSuccessModal = ref(false);
const successMessage = ref('');
const coverInput = ref(null);
const additionalInput = ref(null);

const coverImage = reactive({ id: null, url: imageHolder, file: null });
const additionalImages = ref([]);


const addingActividad = ref(false);
const reorderingActividades = ref(false);
const actividadError = ref(null);

const isClosingModal = ref(false);

const isEditing = computed(() => form.id !== null);

const tabOrder = computed(() => {
  return isEditing.value ? ['info', 'cronograma', 'actividades'] : ['info', 'imagenes', 'cronograma', 'actividades'];
});

const goToPreviousTab = () => {
  const currentTabIndex = tabOrder.value.indexOf(activeTab.value);
  if (currentTabIndex > 0) {
    activeTab.value = tabOrder.value[currentTabIndex - 1];
  }
};

const handleModalClose = () => {
  showSuccessModal.value = false;
  successMessage.value = '';
};

async function showTimedSuccessMessage(message, duration = 1000) {
  successMessage.value = message;
  showSuccessModal.value = true;
  await new Promise(resolve => setTimeout(resolve, duration + 100));
}

const promptCloseConfirmation = () => {
  isClosingModal.value = true;
  ConfModalMessage.value = "Al cerrar el modal se borrará toda la información del evento que ingresaste. ¿Estás seguro de que quieres continuar?";
  showConfirmationModal.value = true;
};

const isTabCompleted = (tabName) => {
  const activeIndex = tabOrder.value.indexOf(activeTab.value);
  const tabIndex = tabOrder.value.indexOf(tabName);
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
    coverImage: { id: coverImage.id, url: coverImage.url },
    additionalImages: additionalImages.value.map(img => ({ id: img.id, url: img.url })),
  };
  localStorage.setItem('eventDraft', JSON.stringify(dataToStore));
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

    if (parsedData.coverImage) {
      coverImage.id = parsedData.coverImage.id;
      coverImage.url = parsedData.coverImage.url;
      coverImage.file = null;
    } else {
      coverImage.id = null;
      coverImage.url = imageHolder;
      coverImage.file = null;
    }

    if (parsedData.additionalImages) {
      additionalImages.value = parsedData.additionalImages.map(img => ({ ...img, file: null }));
    } else {
      additionalImages.value = [];
    }
  }
};

const clearLocalStorage = () => {
  localStorage.removeItem('eventDraft');
};

const resetForm = () => {
  Object.assign(form, {
    id: null,
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
  Object.assign(cronogramaForm, {
    evento_id: '',
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
  });
  Object.assign(actividadForm, {
    cronograma_id: '',
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    dependencia_id: null,
  });
  cronogramas.value = [];
  activeTab.value = 'info';
  eventIdStore.value = null;
  cronogramaIdStore.value = [];
  coverImage.id = null;
  coverImage.url = imageHolder;
  coverImage.file = null;
  additionalImages.value = [];
  error.value = '';
};

watch([form, cronogramaForm, actividadForm, cronogramas, activeTab, eventIdStore, cronogramaIdStore, coverImage, additionalImages], () => {
  saveToLocalStorage();
}, { deep: true });

watch(() => props.show, (newVal) => {
  if (!newVal) {
    resetForm();
    clearLocalStorage();
  } else {
    loadFromLocalStorage();
  }
});

watch(() => props.eventData, (newEventData) => {
  if (newEventData) {
    console.log('newEventData received in ModalCrearEvento:', newEventData);

    const foundCategory = categorias.value.find(
      (cat) => cat.nombre === newEventData.categoria
    );

    let categoryIdToAssign = null;
    if (foundCategory) {
      categoryIdToAssign = foundCategory.id;
      console.log('Found category ID:', categoryIdToAssign, 'for name:', newEventData.categoria);
    } else {
      console.warn(`Category name "${newEventData.categoria}" not found in fetched categories. Setting categoria_id to null.`);
    }

    Object.assign(form, {
      id: newEventData.id,
      nombre: newEventData.nombre,
      descripcion: newEventData.descripcion,
      fecha_inicio: new Date(newEventData.fecha_inicio).toISOString().slice(0, 16),
      fecha_fin: new Date(newEventData.fecha_fin).toISOString().slice(0, 16),
      capacidad: newEventData.capacidad,
      espacio: newEventData.espacio,
      modalidad: newEventData.modalidad,
      sede_id: newEventData.sede_id,
      categoria_id: categoryIdToAssign,
      hayEquipos: newEventData.hayEquipos,
      hayFormulario: newEventData.hayFormulario,
      estado: newEventData.estado,
      inscripcionesAbiertas: newEventData.inscripcionesAbiertas,
    });
    activeTab.value = 'info';
    eventIdStore.value = newEventData.id;

    if (newEventData.archivos && newEventData.archivos.length > 0) {
      const cover = newEventData.archivos.find(a => a.tipo === 'cover');
      if (cover) {
        coverImage.id = cover.id;
        coverImage.url = cover.url;
      } else {
        coverImage.id = null;
        coverImage.url = imageHolder;
      }

      additionalImages.value = newEventData.archivos
        .filter(a => a.tipo === 'additional')
        .map(a => ({ id: a.id, url: a.url, file: null }));
    } else {
      coverImage.id = null;
      coverImage.url = imageHolder;
      additionalImages.value = [];
    }


    if (newEventData.cronogramas && newEventData.cronogramas.length > 0) {
      cronogramas.value = newEventData.cronogramas.map(c => {
        const tempCronogramaId = c.id;
        return {
          id: c.id,
          tempId: tempCronogramaId,
          evento_id: c.evento_id,
          titulo: c.titulo,
          descripcion: c.descripcion,
          fecha_inicio: new Date(c.fecha_inicio).toISOString().slice(0, 16),
          fecha_fin: new Date(c.fecha_fin).toISOString().slice(0, 16),
          actividades: c.actividades_cronogramas ? c.actividades_cronogramas.map(a => ({
            id: a.id,
            tempId: `temp_act_${a.id}`,
            cronograma_id: tempCronogramaId,
            titulo: a.titulo,
            descripcion: a.descripcion,
            fecha_inicio: new Date(a.fecha_inicio).toISOString().slice(0, 16),
            fecha_fin: new Date(a.fecha_fin).toISOString().slice(0, 16),
            orden: a.orden,
            dependencia_id: a.dependencia_id,
          })).sort((a,b) => a.orden - b.orden) : [],
        };
      });
      if (cronogramas.value.length > 0) {
        actividadForm.cronograma_id = cronogramas.value[0].tempId;
      }
    } else {
      cronogramas.value = [];
    }

  } else {
    console.log('newEventData is null, resetting form for new event creation.');
    resetForm();
  }
}, { immediate: true });


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

async function sendEventData(data, eventId = null) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  try {
    let response;
    if (eventId) {
      console.log('JSON enviado al backend (Actualizar Evento):', JSON.stringify(data, null, 2));
      response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId}`, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Evento actualizado con éxito:', response.data);
    } else {
      console.log('JSON enviado al backend (Crear Evento):', JSON.stringify(data, null, 2));
      response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Evento creado con éxito:', response.data);
    }
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error('Error del servidor (Axios):', err.response.data);
      throw new Error(err.response.data?.message || 'Error al procesar el evento.');
    } else if (err.request) {
      console.error('No se recibió respuesta del servidor (Axios):', err.request);
      throw new Error('Fallo en la conexión con el servidor.');
    } else {
      console.error('Error al configurar la solicitud (Axios):', err.message);
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
    const payload = {
      ...cronogramaData,
      evento_id: eventId,
      fecha_inicio: new Date(cronogramaData.fecha_inicio).toISOString(),
      fecha_fin: new Date(cronogramaData.fecha_fin).toISOString(),
    };
    console.log('JSON enviado al backend (Cronograma):', JSON.stringify(payload, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
  loading.value = true;
  try {
    const payload = {
      ...activityData,
      cronograma_id: cronogramaBackendId,
      fecha_inicio: new Date(activityData.fecha_inicio).toISOString(),
      fecha_fin: new Date(activityData.fecha_fin).toISOString(),
    };
    console.log('JSON enviado al backend (Actividad):', JSON.stringify(payload, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Actividad creada con éxito:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar actividad:', error);
    throw new Error(error.response?.data?.message || 'Fallo al añadir la actividad.');
  } finally {
    loading.value = false;
  }
}

async function updateCronograma(cronogramaData) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  try {
    const payload = {
      ...JSON.parse(JSON.stringify(cronogramaData)),
      fecha_inicio: new Date(cronogramaData.fecha_inicio).toISOString(),
      fecha_fin: new Date(cronogramaData.fecha_fin).toISOString(),
    };
    const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/cronogramas/${payload.id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Cronograma actualizado con éxito:', response.data);
    return response.data;
  } catch (err) {
    console.error('Error del servidor al actualizar cronograma:', err.response?.data || err.message);
    throw new Error(err.response?.data?.mensaje || 'Error al actualizar el cronograma.');
  } finally {
    loading.value = false;
  }
}

async function updateActivityOrderAndDependency(activityId, cronogramaBackendId, orden, dependenciaId) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  const payload = {
    cronograma_id: cronogramaBackendId,
    orden: orden,
    dependencia_id: dependenciaId,
  };
  try {
    const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/actividades-cronograma/${activityId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`Actividad ID ${activityId} orden y dependencia actualizadas:`, response.data);
    return true;
  } catch (error) {
    console.error(`Error al actualizar el orden/dependencia de la actividad ID ${activityId}:`, error);
    throw new Error(error.response?.data?.message || `Fallo al actualizar la actividad ID ${activityId}.`);
  } finally {
    loading.value = false;
  }
}

async function linkArchivoToEvento(archivoId, eventoId) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token de autenticación no encontrado.');
  }
  loading.value = true;
  try {
    const payload = {
      archivo_id: archivoId,
      evento_id: eventoId,
    };
    console.log('JSON enviado al backend (Link Archivo-Evento):', JSON.stringify(payload, null, 2));
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Archivo vinculado al evento con éxito:', response.data);
    return response.data;
  } catch (err) {
    console.error('Error al vincular archivo al evento:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || 'Fallo al vincular archivo al evento.');
  } finally {
    loading.value = false;
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

  // Navigate to the next tab based on whether it's editing or creating
  const currentTabIndex = tabOrder.value.indexOf(activeTab.value);
  if (currentTabIndex < tabOrder.value.length - 1) {
    activeTab.value = tabOrder.value[currentTabIndex + 1];
  }
  saveToLocalStorage();
}

async function uploadFileToBackend(file, type) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Token de autenticación no encontrado. Por favor, inicie sesión.');
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name.split('.')[0]);
  formData.append('tipo', type);

  loading.value = true;
  try {
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/archivos/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log(`File uploaded (${type}):`, response.data);
    return { id: response.data.file.id, url: response.data.file.url };
  } catch (error) {
    console.error(`Error uploading ${type} file:`, error.response?.data || error.message);
    alert(`Error al subir la imagen (${type}).`);
    return null;
  } finally {
    loading.value = false;
  }
}

async function handleCoverChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size <= 10 * 1024 * 1024) {
    coverImage.url = URL.createObjectURL(file);
    coverImage.file = file;
    coverImage.id = null;
  } else {
    event.target.value = '';
    coverImage.url = imageHolder;
    coverImage.file = null;
    coverImage.id = null;
    alert('La imagen de portada debe pesar menos de 10 MB.');
  }
  saveToLocalStorage();
}

async function handleAdditionalChange(event) {
  const files = Array.from(event.target.files);
  const newAdditionalImages = [];

  for (const file of files) {
    if (file.size <= 10 * 1024 * 1024) {
      newAdditionalImages.push({
        id: null,
        url: URL.createObjectURL(file),
        file: file,
      });
    } else {
      alert(`La imagen "${file.name}" debe pesar menos de 10 MB y no se añadirá.`);
    }
  }
  additionalImages.value = [...additionalImages.value, ...newAdditionalImages];
  event.target.value = '';
  saveToLocalStorage();
}

async function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files);
  const newAdditionalImages = [];

  for (const file of files) {
    if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
      newAdditionalImages.push({
        id: null,
        url: URL.createObjectURL(file),
        file: file,
      });
    } else {
      alert(`El archivo "${file.name}" no es una imagen o excede los 10 MB y no se añadirá.`);
    }
  }
  additionalImages.value = [...additionalImages.value, ...newAdditionalImages];
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
    error.value = '⚠️ Las fechas y horas ingresadas para el cronograma no son válidas.';
    return;
  }

  if (fechaInicio >= fechaFin) {
    error.value = '⚠️ La fecha y hora de inicio del cronograma debe ser anterior a la fecha y hora de fin.';
    return;
  }

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  cronogramas.value.push({
    ...JSON.parse(JSON.stringify(cronogramaForm)),
    tempId: tempId,
    actividades: [],
    orden: cronogramas.value.length + 1,
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

  successMessage.value = `La actividad "<strong>${newActivity.titulo}</strong>" ha sido añadida a la lista.`;
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

const formatDisplayDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  return date.toLocaleDateString('es-ES', options);
};


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
  } else if (activeTab.value === 'actividades') {
    await processFinalSave();
  }
  isClosingModal.value = false;
}

function handleConfirmationCancel() {
  showConfirmationModal.value = false;
  isClosingModal.value = false;
}

async function processFinalSave() {
  error.value = null;

  try {
    loading.value = true;
    const eventPayload = {
      ...JSON.parse(JSON.stringify(form)),
      hayEquipos: Number(form.hayEquipos),
      hayFormulario: Boolean(form.hayFormulario),
      inscripcionesAbiertas: Boolean(form.inscripcionesAbiertas),
      categoria_id: Number(form.categoria_id)
    };

    const createdOrUpdatedEvent = await sendEventData(eventPayload, form.id);
    eventIdStore.value = createdOrUpdatedEvent.id;
    loading.value = false;
    await showTimedSuccessMessage(isEditing.value ? 'Evento actualizado con éxito.' : 'Evento creado con éxito.');

    if (!isEditing.value) { // Only handle image upload/linking if not in edit mode
      const allImagesToLink = [];

      if (coverImage.file) {
        console.log('Uploading cover image...');
        const uploadedCover = await uploadFileToBackend(coverImage.file, 'cover');
        if (uploadedCover) {
          coverImage.id = uploadedCover.id;
          coverImage.url = uploadedCover.url;
          allImagesToLink.push(uploadedCover.id);
          await showTimedSuccessMessage('Cover del evento cargada');
        }
      } else if (coverImage.id) {
        allImagesToLink.push(coverImage.id);
      }

      for (const img of additionalImages.value) {
        if (img.file) {
          console.log(`Uploading additional image: ${img.file.name}`);
          const uploadedImg = await uploadFileToBackend(img.file, 'additional');
          if (uploadedImg) {
            img.id = uploadedImg.id;
            img.url = uploadedImg.url;
            allImagesToLink.push(uploadedImg.id);
            await showTimedSuccessMessage(`Imagen adicional del evento "${img.file.name}" cargada.`);
          }
        } else if (img.id) {
          allImagesToLink.push(img.id);
        }
      }

      if (eventIdStore.value && allImagesToLink.length > 0) {
        for (const archivoId of allImagesToLink) {
          if (archivoId) {
            console.log(`Linking archivo ID ${archivoId} to event ID ${eventIdStore.value}`);
            await linkArchivoToEvento(archivoId, eventIdStore.value);
          }
        }
        await showTimedSuccessMessage('Todas las imagenes han sido guardadas con el evento');
      }
    }

    for (const cronograma of cronogramas.value) {
      let createdOrUpdatedCronograma = null;
      if (cronograma.id) {
        loading.value = true;
        createdOrUpdatedCronograma = await updateCronograma(cronograma);
        loading.value = false;
        await showTimedSuccessMessage(`Cronograma "<strong>${cronograma.titulo}</strong>" actualizado con éxito.`);
      } else {
        loading.value = true;
        createdOrUpdatedCronograma = await enviarCronogramas(JSON.parse(JSON.stringify(cronograma)), eventIdStore.value);
        cronograma.id = createdOrUpdatedCronograma.id;
        cronograma.tempId = createdOrUpdatedCronograma.id;
        loading.value = false;
        await showTimedSuccessMessage(`Cronograma "<strong>${cronograma.titulo}</strong>" creado con éxito.`);
      }

      if (cronograma.actividades && cronograma.actividades.length > 0) {
        let previousActivityBackendId = null;
        const sortedActivities = cronograma.actividades.sort((a, b) => a.orden - b.orden);

        for (let i = 0; i < sortedActivities.length; i++) {
          const activity = sortedActivities[i];
          let dependencyIdToSend = null;
          if (i > 0) {
            const previousActivityInOrder = sortedActivities[i - 1];
            dependencyIdToSend = previousActivityInOrder.id || previousActivityBackendId;
          }

          if (activity.id) {
            loading.value = true;
            await updateActivityOrderAndDependency(activity.id, createdOrUpdatedCronograma.id, activity.orden, dependencyIdToSend);
            previousActivityBackendId = activity.id;
            loading.value = false;
            await showTimedSuccessMessage(`Actividad "<strong>${activity.titulo}</strong>" actualizada con éxito.`);
          } else {
            const activityPayload = {
              ...JSON.parse(JSON.stringify(activity)),
              cronograma_id: createdOrUpdatedCronograma.id,
            };
            loading.value = true;
            const createdOrUpdatedActivity = await enviarActividad(activityPayload, createdOrUpdatedCronograma.id);
            activity.id = createdOrUpdatedActivity.id;
            activity.tempId = createdOrUpdatedActivity.id;

            previousActivityBackendId = activity.id;
            loading.value = false;
            await showTimedSuccessMessage(`Actividad "<strong>${activity.titulo}</strong>" creada con éxito.`);

            loading.value = true;
            await updateActivityOrderAndDependency(activity.id, createdOrUpdatedCronograma.id, activity.orden, dependencyIdToSend);
            loading.value = false;
          }
        }
      }
    }

    await showTimedSuccessMessage(isEditing.value ? '¡Evento actualizado y configurado con éxito!' : '¡Evento, cronogramas y actividades creados y configurados con éxito!', 1000);

    clearLocalStorage();
    emit('submit', { id: eventIdStore.value });
    emit('close');
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
          v-for="tab in tabOrder"
          :key="tab"
          :class="[
            'tab',
            activeTab === tab ? 'active' : '',
            isTabCompleted(tab) ? 'completed' : ''
          ]"
          @click="activeTab = tab"
        >
          {{ tabTitleMap[tab] }}
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
                    v-if="coverImage.url"
                    :src="coverImage.url"
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
                <div v-if="additionalImages.length" class="imagenes-grid">
                  <img
                    v-for="(img, idx) in additionalImages"
                    :key="idx"
                    :src="img.url"
                    class="imagenes-thumb"
                    alt="Imagen adicional"
                  />
                </div>
              </div>
            </div>
            <div class="button-row">
              <button type="button" class="btn btn-cancel" @click="activeTab = 'info'">
                <i class="fas fa-angle-left"></i>Volver
              </button>
              <button type="submit" class="btn btn-primary" @click="activeTab = 'cronograma'">
                Siguiente<i class="fas fa-angle-right"></i>
              </button>
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
                <input v-model="cronogramaForm.fecha_inicio" type="datetime-local" placeholder=" " required />
                <label>Fecha y Hora de Inicio *</label>
              </div>
              <div class="form-group">
                <input v-model="cronogramaForm.fecha_fin" type="datetime-local" placeholder=" " required />
                <label>Fecha y Hora de Fin *</label>
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
                  <td>{{ formatDisplayDateTime(cronograma.fecha_inicio) }}</td>
                  <td>{{ formatDisplayDateTime(cronograma.fecha_fin) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="no-cronogramas-message">Aún no has añadido ningún cronograma.</p>

          <div class="button-row">
            <button type="button" class="btn btn-cancel" @click="goToPreviousTab()">
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

            </div>
            <div class="form-row">
              <div class="form-group">
                <input v-model="actividadForm.fecha_inicio" type="datetime-local" placeholder=" " required />
                <label>Fecha y Hora de Inicio *</label>
              </div>
              <div class="form-group">
                <input v-model="actividadForm.fecha_fin" type="datetime-local" placeholder=" " required />
                <label>Fecha y Hora de Fin *</label>
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
                    <div class="order-controls-horizontal">
                      <button @click="moverArriba(actividadForm.cronograma_id, idx)"
                        :disabled="idx === 0 || reorderingActividades" class="order-btn">
                        <i class="fas fa-caret-up"></i>
                      </button>
                      <span class="order-number">{{ act.orden }}</span>
                      <button @click="moverAbajo(actividadForm.cronograma_id, idx)"
                        :disabled="idx === activitiesForSelectedCronograma.length - 1 || reorderingActividades" class="order-btn">
                        <i class="fas fa-caret-down"></i>
                      </button>
                    </div>
                  </td>
                  <td>{{ act.titulo }}</td>
                  <td>{{ act.descripcion }}</td>
                  <td>{{ formatDisplayDateTime(act.fecha_inicio) }}</td>
                  <td>{{ formatDisplayDateTime(act.fecha_fin) }}</td>
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
    title="Confirmar"
    :message="ConfModalMessage"
    confirm-text="Sí, continuar"
    cancel-text="No, quedarme"
    @confirm="handleConfirmationConfirm"
    @cancel="handleConfirmationCancel"
  />

  <OkModal
    :show="showSuccessModal"
    title="Información"
    :message="successMessage"
    @close="handleModalClose"
    :duration="1000"
  />
</template>

<style scoped>

/* Styles for the Cronogramas Table */
.tabla-cronogramas {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  overflow-x: auto; /* Ensures table is scrollable on small screens */
}

.tabla-cronogramas h4 {
  font-size: 0.9rem;
  color: #333; /* Consistent dark text */
  margin-top: 0.7rem;
  margin-bottom: 0.7rem;
  text-align: center;
}

.tabla-cronogramas table {
  width: 100%;
  border-collapse: collapse;
}

.tabla-cronogramas thead {
  background-color: #174384; /* Using the deep blue from .btn-primary and .tab.active */
  color: white;
}

.tabla-cronogramas th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  white-space: nowrap;

}

.tabla-cronogramas tbody tr:nth-child(even) {
  background-color: #f8f9fa; /* Keeping a light background for even rows */
}

.tabla-cronogramas tbody tr:hover {
  background-color: #e5eef8; /* Lighter blue on hover, consistent with previous suggestion */
}

.tabla-cronogramas td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #dee2e6; /* Light border between rows */
  font-size: 0.8rem;
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
  gap: 1rem;
  padding-left: 2px;
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
  gap: 0.8rem;
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
  position: relative;
  margin-top: 2rem; /* As per your request */
  margin-bottom: 1rem; /* As per your request */
  overflow-x: auto; /* Ensures table is scrollable on small screens */
  border: 1px solid #dee2e6; /* Consistent with cronogramas for overall table border */
  border-radius: 8px; /* Match other rounded elements */
}

.tabla-actividades h5 { /* Changed from h4 as per template structure */
  font-size: 0.9rem;
  color: #333;
  margin-top: 0.7rem;
  margin-bottom: 0.7rem;
  text-align: center;
  padding: 0.5rem 1rem;
  background-color: #f0f0f0; /* Light background for consistency */
  border-bottom: 1px solid #dee2e6;
  border-radius: 8px 8px 0 0;
}

.tabla-actividades table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.70rem; /* As per your request, keeps it small */
  background: #fff;
}

.tabla-actividades thead {
  background-color: #174384; /* Deep blue, consistent with cronogramas */
  color: white;
}

.tabla-actividades th {
  padding: 0.6rem 0.8rem; /* Slightly reduced padding for compactness */
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem; /* Keeping header font small */
  white-space: nowrap; /* Prevent text wrapping in headers */
  border: none; /* Remove individual cell borders in thead, border is on tbody td */
}

.tabla-actividades tbody tr:nth-child(even) {
  background-color: #f8f9fa; /* Consistent alternating row background */
}

.tabla-actividades tbody tr:hover {
  background-color: #e5eef8; /* Consistent hover effect */
}

.tabla-actividades td {
  border: 1px solid #ddd; /* As per your request for cell borders */
  padding: 0.5rem 0.7rem; /* As per your request, compact padding */
  text-align: left;
  font-size: 0.75rem; /* Slightly larger than table font, but still small for readability */
  color: #495057;
  vertical-align: middle; /* Aligns content, especially buttons, nicely */
}

.tabla-actividades tbody tr:last-child td {
  border-bottom: 1px solid #ddd; /* Keep bottom border for all rows as per your border-1px-solid-#ddd request */
}

.order-controls-horizontal {
  display: flex; /* Arrange children in a row */
  align-items: center; /* Vertically center items in the row */
  justify-content: center; /* Horizontally center the group within the cell */
  gap: 1px; /* Space between buttons and the number */
  min-width: 60px; /* Ensure enough space for the horizontal layout */
}

.order-btn {
  background: none;
  border: none;
  font-size: 1rem; /* Adjust icon size */
  cursor: pointer;
  color: #174384;
  padding: 0;
  line-height: 1;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.order-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.order-btn:disabled {
  color: #bbb;
  cursor: not-allowed;
  background-color: transparent;
}

.order-number {
  font-weight: 600;
  font-size: 0.8rem;
  color: #333;
  margin: 0;
  text-align: center;
  min-width: 15px; /* Give the number a small fixed width to prevent jumpiness */
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
