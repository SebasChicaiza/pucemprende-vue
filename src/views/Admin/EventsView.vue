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

async function fetchEventDetailsForEdit(eventId) {
  const token = localStorage.getItem('token');
  if (!token) {
    error.value = 'Token de autenticación no encontrado.';
    return null; // Return null if token is missing
  }

  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${eventId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Detailed Event Data for Edit:', response.data);
    currentEventToEdit.value = response.data;
    showCreateEditModal.value = true;
    return response.data; // Return the fetched data
  } catch (err) {
    console.error('Error fetching detailed event for edit:', err.response?.data || err.message);
    error.value = `Error al cargar detalles del evento: ${err.response?.data?.message || err.message}`;
    return null; // Return null on error
  } finally {
    loading.value = false;
  }
}

const handleEditEvent = (eventData) => {
  if (eventData && eventData.id) {
    fetchEventDetailsForEdit(eventData.id);
  } else {
    console.error('No event ID found for editing.');
  }
};

const handleModalClose = () => {
  showCreateEditModal.value = false;
  currentEventToEdit.value = null;
};

// MODIFIED handleModalSubmit
const handleModalSubmit = async (emittedEventData) => {
  showCreateEditModal.value = false;
  currentEventToEdit.value = null;

  if (emittedEventData && emittedEventData.id) {
    // Re-fetch the complete event data to ensure the list is updated with all details,
    // especially if new cronogramas/activities were added/updated.
    await fetchEvents(); // Or you could specifically refetch only the one event if performance is critical
    console.log('Event list refreshed after modal submission.');
  } else {
    console.warn('No event ID received on submit, performing full re-fetch.');
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
