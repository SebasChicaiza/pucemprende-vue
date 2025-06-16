<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios';
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import AdminEventCard from '@/components/Admin/Eventos/AdminEventCard.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'


const abrir = ref(false)

const events = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')


const filteredEvents = computed(() =>
  events.value.filter(event =>
    event.nombre.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)


// Function to fetch events
async function fetchEvents() {
  const token = localStorage.getItem('token');
  //const token = '75|gKZX3yOMWD1qjgg54tZTRJYHcZbxYfEaliXyBFIC18f79e58'; // To test the API call, you can use a hardcoded token like this

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
      console.error('Response Status (Axios):', err.response.status);
      console.error('Response Headers (Axios):', err.response.headers);

      const errorMessage = err.response.data?.message || err.response.statusText || `HTTP Error ${err.response.status}`;
      error.value = `Error al cargar los eventos: ${errorMessage}`;
    } else if (err.request) {
      // The request was made but no response was received
      console.error('No se recibió respuesta del servidor (Axios):', err.request);
      error.value = 'No se pudo conectar con el servidor. Verifique su conexión de red.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error al configurar la solicitud (Axios):', err.message);
      error.value = `Fallo en la solicitud: ${err.message}`;
    }
  } finally {
    console.log('Loader is turning off');
    loading.value = false;
  }
}


onMounted(fetchEvents)

function guardarEvento(data) {
  console.log('Datos del evento:', data)
  abrir.value = false
}
</script>

<template>
  <LoaderComponent v-if="loading"/>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <input v-model="searchQuery" type="text" placeholder="Buscar por nombre" class="form-control mb-3"/>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row" v-if="!loading">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3"
              v-for="event in filteredEvents"
              :key="event.id"
            >
              <AdminEventCard :event="event" />
            </div>
          </div>
        </div>
        <button @click="abrir = true" class="bg-blue-600 text-white px-4 py-2 rounded-md">
          Crear Evento
        </button>
        <ModalCrearEvento :show="abrir" @close="abrir = false" @submit="guardarEvento" />
      </div>
    </div>
  </div>
</template>
