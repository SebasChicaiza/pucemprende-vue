<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted } from 'vue'
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import AdminEventCard from '@/components/Admin/Eventos/AdminEventCard.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'

const abrir = ref(false)

const events = ref([])
const error = ref('')
const loading = ref(false)


// Function to fetch events
async function fetchEvents() {
  const token = localStorage.getItem('token') // Get token from localStorage

  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  loading.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error del servidor:', errorText);
      error.value = `Error al cargar los eventos: ${response.statusText} (HTTP ${response.status})`;
      return;
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Datos de eventos:', data);
      events.value = data;
    } else {
      error.value = 'El servidor no devolvió datos en formato JSON.';
      console.error('Unexpected response type:', contentType);
    }
  } catch (err) {
    console.error('Error al hacer la solicitud:', err);
    error.value = `Fallo en la conexión con el servidor: ${err.message}`;
  } finally {
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
  <LoaderComponent/>
  <div class="d-flex">
    <Sidebar />

    <div class="flex-grow-1" style="min-height: 100vh">
      <PageHeaderRoute />

      <div class="p-4">
        <p>Eventos del admin</p>
        <p v-if="error" class="error-text">{{ error }}</p>

        <div v-if="!loading" class="event-cards-container">
          <AdminEventCard v-for="event in events" :key="event.id" :event="event" />
        </div>
        <button @click="abrir = true" class="bg-blue-600 text-white px-4 py-2 rounded-md">
          Crear Evento
        </button>
        <ModalCrearEvento :show="abrir" @close="abrir = false" @submit="guardarEvento" />
      </div>
    </div>
  </div>
</template>
