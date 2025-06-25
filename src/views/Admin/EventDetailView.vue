<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DefaultImage from '@/assets/banners/EventoConstruccion.png'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import ImageManagementModal from '@/components/Admin/ImageManagementModal.vue';
import ScrollBar from '@/components/ScrollBar.vue'; // Import ScrollBar Component

const route = useRoute()
const router = useRouter()
const eventId = ref(null)
const eventDetails = ref(null)
const eventImages = ref([])
const loading = ref(true)
const loadingImages = ref(false)
const isLoadingImagesInModal = ref(false);

const mainImage = ref('');
const DEFAULT_IMAGE_URL = DefaultImage;

const universalDeleteModalRef = ref(null);
const modalTitle = ref('');
const modalMessage = ref('');
const modalWarning = ref('');
const modalConfirmText = ref('');
const currentDeleteAction = ref(null);

const showOkModal = ref(false);
const okModalMessage = ref('');

const showCreateEditModal = ref(false)
const currentEventToEdit = ref(null)

const showImageManagementModal = ref(false);
const imageToDelete = ref(null);

const imagesToDisplay = computed(() => {
  if (eventImages.value && eventImages.value.length > 0) {
    return eventImages.value;
  }
  return [{ id: 'default', url: DEFAULT_IMAGE_URL, tipo: 'Default Image' }];
});

const selectImage = (image) => {
  mainImage.value = image.url;
};

async function fetchEventDetails() {
  loading.value = true;
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )
    eventDetails.value = response.data
  } catch (err) {
    console.error('Error fetching event details:', err.response?.data || err.message)
    error.value = `Error al cargar los detalles del evento: ${err.response?.data?.message || err.message}`
    throw err;
  } finally {
    loading.value = false;
  }
}

async function fetchEventImages() {
  loadingImages.value = true;
  const token = localStorage.getItem('token');
  if (!token) {
    loadingImages.value = false;
    mainImage.value = DEFAULT_IMAGE_URL;
    return;
  }

  try {
    const eventArchivosResponse = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento/evento/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const fetchedImages = eventArchivosResponse.data;
    eventImages.value = fetchedImages;

    if (eventImages.value.length > 0) {
      if (!mainImage.value || !fetchedImages.some(img => img.url === mainImage.value)) {
          mainImage.value = eventImages.value[0].url;
      }
    } else {
      mainImage.value = DEFAULT_IMAGE_URL;
    }

  } catch (err) {
    console.error('Error fetching event images:', err.response?.data || err.message);
    mainImage.value = DEFAULT_IMAGE_URL;
  } finally {
    loadingImages.value = false;
  }
}

const handleDeleteConfirmed = async () => {
    if (currentDeleteAction.value === 'deleteEvent') {
        await deleteEvent();
    } else if (currentDeleteAction.value === 'deleteImage') {
        await confirmDeleteImage();
    }
    currentDeleteAction.value = null;
};

const showDeleteConfirmation = () => {
    modalTitle.value = 'Confirmar Eliminación de Evento';
    modalMessage.value = '¿Estás seguro de que quieres eliminar este evento?';
    modalWarning.value = 'Esta acción es irreversible y eliminará permanentemente el evento, incluyendo todos sus cronogramas y actividades.';
    modalConfirmText.value = 'Sí, Eliminar Evento';
    currentDeleteAction.value = 'deleteEvent';
    universalDeleteModalRef.value.show();
};

const deleteEvent = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    error.value = 'Token de autenticación no encontrado.';
    return;
  }

  loading.value = true;
  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    okModalMessage.value = '¡El evento ha sido eliminado exitosamente!';
    showOkModal.value = true;

    setTimeout(() => {
      router.push("/admin/eventos/");
    }, 1000);

  } catch (err) {
    console.error('Error deleting event:', err.response?.data || err.message);
    error.value = `Error al eliminar el evento: ${err.response?.data?.message || err.message}`;
  } finally {
    if (universalDeleteModalRef.value) {
      universalDeleteModalRef.value.hide();
    }
    loading.value = false;
  }
};

const handleOkModalClose = () => {
  showOkModal.value = false;
};

async function fetchEventDetailsForEdit(idToEdit) {
  const token = localStorage.getItem('token');
  if (!token) {
    error.value = 'Token de autenticación no encontrado.';
    return null;
  }

  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${idToEdit}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Detailed Event Data for Edit:', response.data);
    currentEventToEdit.value = response.data;
    showCreateEditModal.value = true;
    return response.data;
  } catch (err) {
    console.error('Error fetching detailed event for edit:', err.response?.data || err.message);
    error.value = `Error al cargar detalles del evento para edición: ${err.response?.data?.message || err.message}`;
    return null;
  } finally {
    loading.value = false;
  }
}

const handleEditButtonClick = () => {
  if (eventId.value) {
    fetchEventDetailsForEdit(eventId.value);
  } else {
    console.error('Cannot edit: Event ID is not available.');
  }
};

const handleModalClose = () => {
  showCreateEditModal.value = false;
  currentEventToEdit.value = null;
};

const handleModalSubmit = async (emittedEventData) => {
  showCreateEditModal.value = false;
  currentEventToEdit.value = null;

  if (eventId.value) {
    await fetchEventDetails();
    await fetchEventImages();
  }
};

async function uploadFileToBackend(file, type = 'general') {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Token de autenticación no encontrado. Por favor, inicie sesión.');
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name.split('.')[0]);
  formData.append('tipo', type);

  isLoadingImagesInModal.value = true;
  try {
    const response = await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/archivos/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('File uploaded to Archivos:', response.data);
    return { id: response.data.file.id, url: response.data.file.url, tipo: response.data.file.tipo };
  } catch (error) {
    console.error('Error uploading file to Archivos:', error.response?.data || error.message);
    alert(`Error al subir la imagen: ${error.response?.data?.message || error.message}`);
    return null;
  } finally {
  }
}

const openImageManagementModal = () => {
  showImageManagementModal.value = true;
};

const closeImageManagementModal = () => {
  showImageManagementModal.value = false;
  fetchEventImages();
};

const triggerDeleteImage = (image) => {
    imageToDelete.value = image;
    modalTitle.value = 'Confirmar Eliminación de Imagen';
    modalMessage.value = '¿Estás seguro de que quieres eliminar esta imagen?';
    modalWarning.value = 'Esta acción es irreversible y eliminará permanentemente la imagen del evento.';
    modalConfirmText.value = 'Sí, Eliminar Imagen';
    currentDeleteAction.value = 'deleteImage';
    universalDeleteModalRef.value.show();
};

const confirmDeleteImage = async () => {
  if (!imageToDelete.value) return;

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token de autenticación no encontrado para eliminar imagen.');
    return;
  }

  isLoadingImagesInModal.value = true;
  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento/${imageToDelete.value.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    okModalMessage.value = '¡Imagen eliminada exitosamente!';
    showOkModal.value = true;

    eventImages.value = eventImages.value.filter(img => img.id !== imageToDelete.value.id);
    if (mainImage.value === imageToDelete.value.url) {
      mainImage.value = eventImages.value.length > 0 ? eventImages.value[0].url : DEFAULT_IMAGE_URL;
    }

  } catch (err) {
    console.error('Error deleting image:', err.response?.data || err.message);
    error.value = `Error al eliminar la imagen: ${err.response?.data?.message || err.message}`;
  } finally {
    if (universalDeleteModalRef.value) {
      universalDeleteModalRef.value.hide();
    }
    imageToDelete.value = null;
    isLoadingImagesInModal.value = false;
  }
};

const uploadNewImages = async (newFiles) => {
  if (!newFiles || newFiles.length === 0) {
    console.warn('No files selected for upload.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token de autenticación no encontrado para subir imágenes.');
    return;
  }

  isLoadingImagesInModal.value = true;
  const uploadPromises = [];
  const newlyUploadedImages = [];

  for (const file of newFiles) {
    uploadPromises.push(
      (async () => {
        const uploadedArchivo = await uploadFileToBackend(file, file.type.split('/')[1] || 'general');
        if (uploadedArchivo) {
          try {
            const linkResponse = await axios.post(
              `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento`,
              {
                archivo_id: uploadedArchivo.id,
                evento_id: eventId.value,
                url: uploadedArchivo.url,
                tipo: uploadedArchivo.tipo
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            console.log(`Image ${uploadedArchivo.id} linked to event ${eventId.value}`);
            newlyUploadedImages.push(linkResponse.data); // Push the linked image object from the backend
            return true;
          } catch (linkError) {
            console.error(`Error linking image ${uploadedArchivo.id} to event:`, linkError.response?.data || linkError.message);
            error.value = `Error al vincular la imagen ${file.name}: ${linkError.response?.data?.message || linkError.message}`;
            return false;
          }
        }
        return false;
      })()
    );
  }

  const results = await Promise.all(uploadPromises);
  const allSucceeded = results.every(result => result === true);

  if (allSucceeded) {
    okModalMessage.value = '¡Imágenes subidas y asociadas al evento exitosamente!';
    eventImages.value = [...eventImages.value, ...newlyUploadedImages];
  } else {
    okModalMessage.value = '¡Algunas imágenes no pudieron subirse o asociarse correctamente!';
  }
  showOkModal.value = true;

  isLoadingImagesInModal.value = false;
};

onMounted(async () => {
  try {
    eventId.value = route.params.id;
    if (eventId.value) {
      await fetchEventDetails();
      await fetchEventImages();
    } else {
      error.value = 'ID de evento no proporcionado.';
      mainImage.value = DEFAULT_IMAGE_URL;
    }
  } catch (e) {
    console.error("Error during initial event details load:", e);
    mainImage.value = DEFAULT_IMAGE_URL;
  }
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      loading.value = true;
      try {
        eventId.value = newId;
        error.value = null;
        eventDetails.value = null;
        eventImages.value = [];
        mainImage.value = DEFAULT_IMAGE_URL;
        loadingImages.value = true;

        await fetchEventDetails();
        await fetchEventImages();
      } catch (e) {
        console.error("Error during route param change load:", e);
      } finally {
        loading.value = false;
      }
    }
  }
);

const goBack = () => {
  router.back();
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }; // Added hour and minute
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  return date.toLocaleDateString('es-ES', options);
};
</script>

<template>
  <LoaderComponent v-if="loading"/>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute :currentRouteName="route.name" :dynamicTitle="eventDetails ? eventDetails.nombre : 'Cargando...'" />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container-fluid" v-else-if="eventDetails">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <div class="d-flex align-items-center">
              <button class="btn btn-secondary me-3" @click="goBack">
                <i class="fas fa-arrow-left me-2"></i>Volver
              </button>
              <h3 class="mb-0">{{ eventDetails.nombre }}</h3>
            </div>
            <div class="d-flex">
                <button class="btn btn-primary btn-m me-2" @click="handleEditButtonClick">Editar</button>
                <button class="btn btn-danger btn-m" @click="showDeleteConfirmation">
                    <i class="fas fa-trash-alt me-2"></i>Eliminar
                </button>
            </div>
          </div>
          <div class="row align-items-stretch mb-5">
            <div class="col-md-8 d-flex">
              <div class="d-flex flex-column me-3 image-thumbnail-sidebar">
                <ScrollBar :maxHeight="'calc(100% - 60px)'" class="image-list-scroll-area">
                  <div v-if="loadingImages" class="text-center my-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                      <span class="visually-hidden">Cargando miniaturas...</span>
                    </div>
                  </div>
                  <div v-else class="flex-grow-1 d-flex flex-column justify-content-start align-items-center">
                    <div
                      v-for="image in imagesToDisplay"
                      :key="image.id"
                      class="thumbnail-container mb-2"
                      :class="{ 'active-thumbnail': mainImage === image.url }"
                      @click="selectImage(image)"
                    >
                      <img :src="image.url" class="img-fluid thumbnail-img" :alt="image.tipo" />
                    </div>
                  </div>
                </ScrollBar>
                <button class="btn btn-primary add-image-plus-btn" @click="openImageManagementModal" title="Editar Imágenes">
                    <i class="fas fa-plus"></i>
                </button>
              </div>
              <div class="flex-grow-1 main-image-display">
                <div v-if="loadingImages" class="d-flex justify-content-center align-items-center h-100">
                  <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Cargando imagen principal...</span>
                  </div>
                </div>
                <img v-else :src="mainImage" class="img-fluid rounded main-event-image" :alt="eventDetails.nombre || 'Event Image'" />
              </div>
            </div>

            <div class="col-md-4 event-info-section">

              <div class="info-group">
                <p class="info-label">Descripción</p>
                <p class="info-content">{{ eventDetails.descripcion }}</p>
              </div>

              <div class="info-group">
                <p class="info-label">Categoría</p>
                <p class="info-content">{{ eventDetails.categoria }}</p>
              </div>

              <div class="info-group">
                <p class="info-label">Espacio donde se realizara el evento: </p>
                <p class="info-content">{{ eventDetails.espacio }}</p>
              </div>



              <div class="d-flex justify-content-between flex-wrap info-dates mb-3">
                <div class="me-4">
                  <p class="info-label">Fecha de Inicio:</p>
                  <p class="info-content">{{ formatDate(eventDetails.fecha_inicio) }}</p>
                </div>
                <div>
                  <p class="info-label">Fecha de Finalización:</p>
                  <p class="info-content">{{ formatDate(eventDetails.fecha_fin) }}</p>
                </div>
              </div>

              <button class="btn btn-success mb-4">Inscribirse</button>
            </div>

            <hr class="my-3">

              <div class="d-flex justify-content-between flex-wrap event-attributes">
                <div class="attribute-item">
                  <p class="info-label">Estado:</p>
                  <p class="info-content">{{ eventDetails.estado }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Modalidad:</p>
                  <p class="info-content">{{ eventDetails.modalidad }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Capacidad:</p>
                  <p class="info-content">{{ eventDetails.capacidad }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Inscripciones Abiertas:</p>
                  <p class="info-content">{{ eventDetails.inscripcionesAbiertas ? 'Sí' : 'No' }}</p>
                </div>
              </div>
          </div>

          <div class="mt-4">
            <!-- Horizontal Tabs for Cronogramas, Equipos, Formularios -->
            <ul class="nav nav-pills mb-3 custom-pills" id="pills-tab" role="tablist">
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link active"
                  id="pills-cronogramas-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-cronogramas"
                  type="button"
                  role="tab"
                  aria-controls="pills-cronogramas"
                  aria-selected="true"
                >
                  Cronogramas
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  id="pills-equipos-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-equipos"
                  type="button"
                  role="tab"
                  aria-controls="pills-equipos"
                  aria-selected="false"
                >
                  Equipos
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  id="pills-formularios-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-formularios"
                  type="button"
                  role="tab"
                  aria-controls="pills-formularios"
                  aria-selected="false"
                >
                  Formularios
                </button>
              </li>
            </ul>
            <div class="tab-content" id="pills-tabContent">
              <!-- Cronogramas Tab Content -->
              <div class="tab-pane fade show active" id="pills-cronogramas" role="tabpanel" aria-labelledby="pills-cronogramas-tab">
                <div v-if="eventDetails.cronogramas && eventDetails.cronogramas.length > 0">
                  <div class="accordion" id="nestedAccordionCronogramas">
                    <div class="accordion-item" v-for="(cronograma) in eventDetails.cronogramas" :key="cronograma.id">
                      <h2 class="accordion-header" :id="`nestedHeading${cronograma.id}`">
                        <button
                          class="accordion-button nested-accordion-button collapsed"
                          type="button"
                          data-bs-toggle="collapse"
                          :data-bs-target="`#nestedCollapse${cronograma.id}`"
                          aria-expanded="false"
                          :aria-controls="`nestedCollapse${cronograma.id}`"
                        >
                          <i class="fas fa-calendar-alt me-2 nested-accordion-icon"></i>
                          {{ cronograma.titulo }}
                        </button>
                      </h2>
                      <div :id="`nestedCollapse${cronograma.id}`" class="accordion-collapse collapse" :aria-labelledby="`nestedHeading${cronograma.id}`" data-bs-parent="#nestedAccordionCronogramas">
                        <div class="accordion-body nested-accordion-body">
                          <p class="mb-2"><strong>Descripción:</strong> {{ cronograma.descripcion }}</p>
                          <p class="mb-2"><strong>Inicio:</strong> {{ formatDate(cronograma.fecha_inicio) }}</p>
                          <p class="mb-3"><strong>Fin:</strong> {{ formatDate(cronograma.fecha_fin) }}</p>
                          <h6 class="mt-3 mb-2 cronograma-activities-title">Actividades:</h6>
                          <ul v-if="cronograma.actividades_cronogramas && cronograma.actividades_cronogramas.length > 0" class="list-group list-group-flush">
                            <li v-for="actividad in cronograma.actividades_cronogramas" :key="actividad.id" class="list-group-item">
                              <i class="fas fa-check-circle activity-icon me-2"></i>
                              {{ actividad.titulo }} ({{ formatDate(actividad.fecha_inicio) }} - {{ formatDate(actividad.fecha_fin) }})
                            </li>
                          </ul>
                          <p v-else class="text-muted text-center py-2">No hay actividades para este cronograma.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-muted mt-3">No hay cronogramas disponibles para este evento.</p>
              </div>

              <!-- Equipos Tab Content -->
              <div class="tab-pane fade" id="pills-equipos" role="tabpanel" aria-labelledby="pills-equipos-tab">
                <div class="card card-body p-4 border-0 shadow-sm custom-tab-content">
                  <h5 class="mb-3">Información de Equipos</h5>
                  <p class="mb-0">Equipos del evento: <strong>{{ eventDetails.nombre }}</strong></p>
                  <p class="text-muted mt-2">Aquí se mostrará la información de los equipos asociados a este evento.</p>
                </div>
              </div>

              <!-- Formularios Tab Content -->
              <div class="tab-pane fade" id="pills-formularios" role="tabpanel" aria-labelledby="pills-formularios-tab">
                <div class="card card-body p-4 border-0 shadow-sm custom-tab-content">
                  <h5 class="mb-3">Información de Formularios</h5>
                  <p class="mb-0">Formularios del evento: <strong>{{ eventDetails.nombre }}</strong></p>
                  <p class="text-muted mt-2">Aquí se mostrará la información de los formularios asociados a este evento.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
        <div v-else-if="!loading" class="container text-center text-muted mt-5">
          No se pudieron cargar los detalles del evento o el evento no existe.
        </div>
      </div>
    </div>
  </div>


  <OkModal
    :show="showOkModal"
    :message="okModalMessage"
    :duration = 1000
    @close="handleOkModalClose"
  />

  <ModalCrearEvento
    :show="showCreateEditModal"
    :eventData="currentEventToEdit"
    @close="handleModalClose"
    @submit="handleModalSubmit"
  />

  <ImageManagementModal
    :show="showImageManagementModal"
    :currentImages="eventImages"
    :isLoading="isLoadingImagesInModal"
    @close="closeImageManagementModal"
    @delete-image="triggerDeleteImage"
    @upload-images="uploadNewImages"
  />

  <DeleteModal
    ref="universalDeleteModalRef"
    :title="modalTitle"
    :message="modalMessage"
    :warning="modalWarning"
    :confirmButtonText="modalConfirmText"
    @confirmed="handleDeleteConfirmed"
  />
</template>

<style scoped>
.image-thumbnail-sidebar {
  width: 120px;
  flex-shrink: 0;
  max-height: 60vh;
  position: relative;
  padding-bottom: 10px;
}

.image-list-scroll-area {
    flex-grow: 1;
}

.thumbnail-container {
  width: 100px;
  height: 50px;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
}

.thumbnail-container:hover {
  border-color: #84b5ff;
}

.thumbnail-container.active-thumbnail {
  border-color: #174384;
  border-width: 3px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-primary {
  background-color: #174384;
  border-color: #174384;
}
.btn-primary:hover {
  background-color: #14386b;
  border-color: #14386b;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
}
.btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.main-image-display {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  width: 100%;
  aspect-ratio: 21 / 9;
}

.main-event-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.event-info-section {
  padding-left: 20px;
}

.info-group {
  margin-bottom: 10px;
}

.info-label {
  font-weight: bold;
  color: #555;
  margin-bottom: 5px;
  font-size: 0.95rem;
}

.info-content {
  margin-bottom: 0;
  font-size: 1rem;
  color: #333;
}

.info-dates {
  margin-top: 20px;
  margin-bottom: 20px !important;
}

.event-attributes .attribute-item {
  flex: 1 1 auto;
  min-width: 150px;
  margin-right: 15px;
  margin-bottom: 10px;
}

.card-header {
  font-weight: bold;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.card {
  border: 1px solid rgba(0,0,0,.125);
  border-radius: .25rem;
}

.card.mb-4:not(.main-event-details) {
  margin-top: 20px;
}

/* Styles for the new Plus button */
.add-image-plus-btn {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 45px;
    height: 45px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10;
    transition: background-color 0.2s, box-shadow 0.2s;
}

.add-image-plus-btn:hover {
    background-color: #0d284a; /* Darker blue on hover */
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.error-text {
    color: red;
    font-weight: bold;
}

/* Custom styles for the accordion */
.accordion-button {
  /* Collapsed state (default) */
  background-color: #174384; /* Dark blue background */
  color: #ffffff; /* White text */
  font-weight: 600;
  border-bottom: 1px solid #14386b; /* Slightly darker border for contrast */
  transition: background-color 0.2s ease, color 0.2s ease;
  padding: 1rem 1.25rem; /* Standard Bootstrap padding */
}

.accordion-button:not(.collapsed) {
  /* Expanded state */
  background-color: #e0e7ff; /* Light blue background */
  color: #174384; /* Dark blue text */
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.125);
}

.accordion-button:focus {
  box-shadow: 0 0 0 0.25rem rgba(23, 67, 132, 0.25); /* Custom focus ring */
}

.accordion-button .accordion-indicator-icon {
  transition: transform 0.2s ease-in-out, color 0.2s ease;
  color: #ffffff; /* Default color when collapsed (matches button text) */
}

.accordion-button:not(.collapsed) .accordion-indicator-icon {
  transform: rotate(90deg); /* Rotate icon when expanded */
  color: #174384; /* Color when expanded (matches button text) */
}

.accordion-button::after {
    display: none; /* Hide Bootstrap's default arrow icon */
}


.accordion-body {
  padding: 1.5rem;
  background-color: #fdfdff; /* Very light background for body */
  border-top: 1px dashed #e0e0e0;
}

.accordion-item {
  margin-bottom: 10px; /* Space between accordion items */
  border: 1px solid #dcdcdc; /* Lighter border for overall item */
  border-radius: 0.5rem; /* Rounded corners for accordion item */
  overflow: hidden; /* Ensures rounded corners are visible */
  box-shadow: 0 2px 5px rgba(0,0,0,0.05); /* Subtle shadow */
}

.accordion-item:first-of-type {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.accordion-item:last-of-type {
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.cronograma-activities-title {
    color: #174384; /* Match primary brand color */
    font-weight: 700;
    border-bottom: 2px solid #e0e7ff;
    padding-bottom: 5px;
    margin-bottom: 10px;
}

.list-group-item {
    border-color: #f0f0f0; /* Lighter borders for list items */
    padding-left: 0.5rem; /* Adjust padding for list items */
    font-size: 0.95rem;
    color: #495057;
}

.activity-icon {
    color: #28a745; /* Green check icon */
}

/* Specific styles for nested accordion buttons */
.nested-accordion-button {
  background-color: #f0f5ff; /* Lighter blue for nested buttons */
  color: #3730a3; /* Darker text for contrast */
  font-weight: 500;
}

.nested-accordion-button:not(.collapsed) {
  background-color: #c3d9ff; /* Even lighter when expanded */
  color: #174384;
}

.nested-accordion-button .nested-accordion-icon {
  color: #3730a3; /* Icon color for nested buttons */
  transition: transform 0.2s ease-in-out;
}

.nested-accordion-button:not(.collapsed) .nested-accordion-icon {
  transform: rotate(90deg);
  color: #174384;
}

.nested-accordion-body {
  background-color: #ffffff; /* White background for nested body */
}

/* Styles for Custom Nav Pills */
.custom-pills .nav-link {
    border-radius: 0.5rem 0.5rem 0 0; /* Rounded top corners */
    margin-right: 0.25rem; /* Small space between pills */
    padding: 0.75rem 1.5rem;
    background-color: #e0e7ff; /* Light background for inactive tabs */
    color: #174384; /* Text color for inactive tabs */
    font-weight: 600;
    transition: all 0.3s ease;
    border: 1px solid #c3d9ff;
    border-bottom: none; /* No bottom border for active tab continuity */
}

.custom-pills .nav-link:hover:not(.active) {
    background-color: #d0e0ff; /* Slightly darker on hover */
    color: #0d284a;
}

.custom-pills .nav-link.active {
    background-color: #174384; /* Dark blue for active tab */
    color: #ffffff; /* White text for active tab */
    border-color: #174384;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1); /* Subtle shadow for active tab */
}

.tab-content {
    background-color: #ffffff; /* White background for tab content */
    border: 1px solid #e0e7ff; /* Border around the entire tab content area */
    border-radius: 0 0.5rem 0.5rem 0.5rem; /* Rounded bottom and right corners */
    padding: 1.5rem;
    min-height: 200px; /* Minimum height for consistency */
    box-shadow: 0 4px 8px rgba(0,0,0,0.05); /* Subtle shadow for content area */
    transition: all 0.3s ease; /* Smooth transition for tab content change */
}

.custom-tab-content {
  border: none !important; /* Remove card border if nested directly */
  box-shadow: none !important; /* Remove card shadow if nested directly */
}
</style>
