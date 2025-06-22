<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios';
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import AdminEventCard from '@/components/Admin/Eventos/AdminEventCard.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'

const showCreateEditModal = ref(false)
const currentEventToEdit = ref(null)

const events = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')

const filteredEvents = computed(() =>
  events.value.filter(event =>
    event.nombre.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

async function fetchEvents() {
  const token = localStorage.getItem('token');

  if (!token) {
    error.value = 'Token de autenticación no encontrado.';
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);

    // Directly assign the fetched data
    events.value = response.data;
    error.value = null;

  } catch (err) {
    if (err.response) {
      console.error('Error del servidor (Axios):', err.response.data);
      const errorMessage = err.response.data?.message || err.response.statusText || `HTTP Error ${err.response.status}`;
      error.value = `Error al cargar los eventos: ${errorMessage}`;
    } else if (err.request) {
      console.error('No se recibió respuesta del servidor (Axios):', err.request);
      error.value = 'No se pudo conectar con el servidor. Verifique su conexión de red.';
    } else {
      console.error('Error al configurar la solicitud (Axios):', err.message);
      error.value = `Fallo en la solicitud: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchEvents)

const openCreateModal = () => {
  currentEventToEdit.value = null;
  showCreateEditModal.value = true;
};

const handleEditEvent = (eventData) => {
  currentEventToEdit.value = eventData;
  showCreateEditModal.value = true;
};

const handleModalClose = () => {
  showCreateEditModal.value = false;
  currentEventToEdit.value = null;
  // No need to fetch events here. Changes are handled by handleModalSubmit.
};

// --- MODIFIED handleModalSubmit ---
// This function now receives the actual event data from the modal
const handleModalSubmit = (updatedOrCreatedEvent) => {
  // Hide the modal (moved here for explicit control)
  showCreateEditModal.value = false;
  currentEventToEdit.value = null; // Clear event data

  if (updatedOrCreatedEvent && updatedOrCreatedEvent.id) {
    const index = events.value.findIndex(e => e.id === updatedOrCreatedEvent.id);

    if (index !== -1) {
      // Event exists, so it was an UPDATE
      // Replace the old event object with the updated one
      events.value[index] = updatedOrCreatedEvent;
      console.log('Event updated in list:', updatedOrCreatedEvent.nombre);
    } else {
      // Event does not exist, so it was a CREATION
      // Add the new event to the beginning of the list
      events.value.unshift(updatedOrCreatedEvent);
      console.log('New event added to list:', updatedOrCreatedEvent.nombre);
    }
  } else {
    // Fallback: If for some reason no event data was passed, re-fetch all.
    // This should ideally not be hit if ModalCrearEvento correctly emits data.
    console.warn('No event data received on submit, performing full re-fetch.');
    fetchEvents();
  }
};
</script>

<template>
  <LoaderComponent v-if="loading"/>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="d-flex align-items-center mb-3 gap-2">
          <input v-model="searchQuery" type="text" placeholder="Buscar por nombre" class="form-control"/>
          <button class="btn btn-default" @click="openCreateModal">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row" v-if="!loading">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3"
              v-for="event in filteredEvents"
              :key="event.id"
            >
              <AdminEventCard
                :event="event"
                @edit-event="handleEditEvent"
              />
            </div>
            <div v-if="filteredEvents.length === 0 && !loading" class="col-12 text-center text-muted mt-5">
              No se encontraron eventos.
            </div>
          </div>
          <div v-else class="text-center text-muted mt-5">
            Cargando eventos...
          </div>
        </div>
        <ModalCrearEvento
          :show="showCreateEditModal"
          :eventData="currentEventToEdit"
          @close="handleModalClose"
          @submit="handleModalSubmit"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-default {
  background-color: #174384;
  border-color: #174384;
  color: #fff;
}
.btn-default:hover {
  background-color: #ffffff;
  border-color: #174384;
  color: #174384;
}

.error-text {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
</style>
