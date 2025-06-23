<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DefaultImage from '@/assets/banners/EventoConstruccion.png'

const route = useRoute()
const router = useRouter()
const eventId = ref(null)
const eventDetails = ref(null)
const eventImages = ref([])
const loading = ref(true)
const loadingImages = ref(true)
const error = ref(null)

const mainImage = ref('');
const DEFAULT_IMAGE_URL = DefaultImage;

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
  const token = localStorage.getItem('token')
  if (!token) {
    loadingImages.value = false;
    mainImage.value = DEFAULT_IMAGE_URL;
    return
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
    )

    const archivoLinks = eventArchivosResponse.data

    const imagePromises = archivoLinks.map(async (link) => {
      try {
        const archivoResponse = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/archivos/${link.archivo_id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        )
        return archivoResponse.data
      } catch (innerErr) {
        console.error(`Error fetching archivo ${link.archivo_id}:`, innerErr.response?.data || innerErr.message)
        return null
      }
    })

    const fetchedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
    eventImages.value = fetchedImages;

    if (eventImages.value.length > 0) {
      mainImage.value = eventImages.value[0].url;
    } else {
      mainImage.value = DEFAULT_IMAGE_URL;
    }

  } catch (err) {
    console.error('Error fetching event images:', err.response?.data || err.message)
    mainImage.value = DEFAULT_IMAGE_URL;
  } finally {
    loadingImages.value = false;
  }
}

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
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
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
            <h1 class="mb-0">{{ eventDetails.nombre }}</h1>
            <button class="btn btn-secondary" @click="goBack">
              <i class="fas fa-arrow-left me-2"></i>Volver
            </button>
          </div>
          <div class="row align-items-stretch mb-5 main-event-details">
            <div class="col-md-7 d-flex">
              <div class="d-flex flex-column me-3 image-thumbnail-sidebar">
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

            <div class="col-md-5 event-info-section">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h2 class="mb-0">{{ eventDetails.nombre }}</h2>
                <button class="btn btn-primary btn-sm">Editar</button>
              </div>

              <div class="info-group">
                <p class="info-label">Descripción</p>
                <p class="info-content">{{ eventDetails.descripcion }}</p>
              </div>

              <div class="info-group">
                <p class="info-label">Categoría</p>
                <p class="info-content">{{ eventDetails.categoria }}</p>
              </div>

              <div class="info-group">
                <p class="info-label">Sede del evento</p>
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


          <div class="card mb-4" v-if="eventDetails.cronogramas && eventDetails.cronogramas.length > 0">
            <div class="card-header">
              Cronogramas
            </div>
            <div class="card-body">
              <div v-for="cronograma in eventDetails.cronogramas" :key="cronograma.id" class="mb-3 border p-3 rounded">
                <h5>{{ cronograma.titulo }}</h5>
                <p>Descripción: {{ cronograma.descripcion }}</p>
                <p>Inicio: {{ new Date(cronograma.fecha_inicio).toLocaleDateString() }}</p>
                <p>Fin: {{ new Date(cronograma.fecha_fin).toLocaleDateString() }}</p>
                <h6>Actividades:</h6>
                <ul v-if="cronograma.actividades_cronogramas && cronograma.actividades_cronogramas.length > 0">
                  <li v-for="actividad in cronograma.actividades_cronogramas" :key="actividad.id">
                    {{ actividad.titulo }} ({{ new Date(actividad.fecha_inicio).toLocaleDateString() }} - {{ new Date(actividad.fecha_fin).toLocaleDateString() }})
                  </li>
                </ul>
                <p v-else class="text-muted">No hay actividades para este cronograma.</p>
              </div>
            </div>
          </div>
          <div v-else class="text-muted mt-3">No hay cronogramas disponibles para este evento.</div>

        </div>
        <div v-else-if="!loading" class="container text-center text-muted mt-5">
          No se pudieron cargar los detalles del evento o el evento no existe.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-event-details {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.image-thumbnail-sidebar {
  width: 100px;
  flex-shrink: 0;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}

.thumbnail-container {
  width: 100px;
  height: 60px;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
}

.thumbnail-container:hover {
  border-color: #007bff;
}

.thumbnail-container.active-thumbnail {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  margin-bottom: 15px;
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
</style>
