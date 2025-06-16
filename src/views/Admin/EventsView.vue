<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed } from 'vue'
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
  //const token = '75|gKZX3yOMWD1qjgg54tZTRJYHcZbxYfEaliXyBFIC18f79e58'; //To test the API call, you can use a hardcoded token like this
  const token = localStorage.getItem('token');

  if (!token) {
    error.value = 'Token de autenticación no encontrado.';
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // Log the response status and headers
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error del servidor:', errorText);
      error.value = `Error al cargar los eventos: ${response.statusText} (HTTP ${response.status})`;
      loading.value = false; // Ensure loading is turned off in case of error
      return;
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Datos de eventos:', data);
      events.value = data;
    } else {
      const errorText = await response.text();
      console.error('Error inesperado: contenido no JSON', errorText);
      error.value = 'Error al cargar los eventos. Verifique el servidor.';
    }

  } catch (err) {
    console.error('Error al hacer la solicitud:', err);
    error.value = `Fallo en la conexión con el servidor: ${err.message}`;
  } finally {
    console.log('Loader is turning off');
    loading.value = false; // Ensure loader is turned off
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
            <div class="col-md-3 mb-3" v-for="event in filteredEvents" :key="event.id">
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
