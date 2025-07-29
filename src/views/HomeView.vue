<script setup>

import CarrouselCard from '@/components/CarrouselCard.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { onMounted, computed } from 'vue'
import { useEventosStore } from '@/stores/eventos.js'


const eventosStore = useEventosStore()


/**
 * Formatea una fecha ISO a formato español legible
 * @param {string} fechaISO - Fecha en formato ISO
 * @returns {string} - Fecha formateada en español
 */
const formatearFecha = (fechaISO) => {
  if (!fechaISO) return 'Fecha por definir'

  try {
    const fecha = new Date(fechaISO)
    const opciones = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Guayaquil'
    }
    return fecha.toLocaleDateString('es-ES', opciones)
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return 'Fecha por definir'
  }
}

/**
 * Obtiene la URL correcta de la imagen del evento
 * @param {Object} evento - Objeto del evento
 * @returns {string} - URL de la imagen o imagen por defecto
 */
const obtenerImagenEvento = (evento) => {
  // Si el evento tiene imagen desde la API (campo 'imagen' de la vista)
  if (evento.imagen && evento.imagen !== '') {
    // Si es una URL completa (comienza con http)
    if (evento.imagen.startsWith('http')) {
      return evento.imagen
    }
    // Si es una ruta relativa del backend
    return `${import.meta.env.VITE_URL_BACKEND}/storage/${evento.imagen}`
  }

  // Imagen por defecto si no hay imagen disponible
  return new URL('@/assets/iconos/imageHolder.png', import.meta.url).href
}


/**
 * Computed que transforma los eventos del store al formato esperado por CarrouselCard
 * Mapea los campos de la vista vw_ultimos_eventos a los props del componente
 */
const eventos = computed(() => {
  return eventosStore.allEventsList.map(evento => ({
    id: evento.id,
    image: obtenerImagenEvento(evento),
    title: evento.nombre || 'Evento sin título',
    description: evento.descripcion || 'Sin descripción disponible',
    date: formatearFecha(evento.fecha_inicio)
  }))
})


/**
 * Hook que se ejecuta cuando el componente se monta
 * - Precarga la vista de eventos para mejorar la navegación
 * - Carga los últimos eventos desde la API
 */
onMounted(async () => {
  // Precarga la vista de eventos para mejorar la experiencia de usuario
  import(/* webpackPrefetch: true */ '../views/EventosView.vue')

  // Cargar los últimos eventos desde la API usando el store
  await eventosStore.fetchUltimosEventos()
})
</script>

<template>
   <!-- BARRA DE NAVEGACIÓN -->

  <AppNavbar/>

  <main>

    <!-- BANNER PRINCIPAL DE BIENVENIDA -->
         <div class="banner-home d-flex align-items-center justify-content-start">
      <!-- Imagen del banner -->
      <div class="img-banner">
        <img
          src="../assets/universidad_varios/img-home-banner.jpg"
          alt="Banner Principal"
          style="height: 25rem; border-radius: 20rem"
        />
      </div>

      <!-- Texto y botón del banner -->
      <div class="txt-banner text-white text-center">
        <div class="txt-up mb-4">
          <h2 class="fw-bold m-0">Tus ideas</h2>
          <h2 class="fw-bold m-0">toman forma</h2>
          <h2 class="fw-bold m-0" style="color: #19e4ff">aquí</h2>
        </div>
        <div class="btn-down">
          <router-link to="/sobreNosotros" class="btn btn-warning fw-bold px-4 py-2 rounded-pill">
            Conoce más
          </router-link>
        </div>
      </div>
    </div>


    <!-- SECCIÓN DE ÚLTIMOS EVENTOS -->

    <section>
      <div class="events-primary-carrousel">
        <div class="events-carrousel-content">
          <!-- Título de la sección -->
          <div class="carrousel-header">
            <h3>Últimos Eventos</h3>
          </div>

          <!-- Estado de carga -->
          <div v-if="eventosStore.loadingAllEvents" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando últimos eventos...</span>
            </div>
            <p class="mt-2">Cargando últimos eventos...</p>
          </div>

          <!-- Estado de error -->
          <div v-else-if="eventosStore.allEventsError" class="text-center py-4">
            <div class="alert alert-warning" role="alert">
              <i class="bi bi-exclamation-triangle"></i>
              {{ eventosStore.allEventsError }}
            </div>
            <button @click="eventosStore.fetchUltimosEventos" class="btn btn-outline-primary">
              Reintentar
            </button>
          </div>

          <!-- Lista de eventos en carrusel -->
          <div v-else-if="eventos.length > 0" class="carrousel-cards-container">
            <CarrouselCard
              v-for="evento in eventos"
              :key="evento.id"
              :image="evento.image"
              :title="evento.title"
              :description="evento.description"
              :date="evento.date"
            />
          </div>

          <!-- Estado vacío -->
          <div v-else class="text-center py-4">
            <p class="text-muted">No hay eventos disponibles en este momento.</p>
          </div>
        </div>
      </div>
    </section>
  </main>


  <!-- PIE DE PÁGINA -->

  <AppFooter/>
</template>

<style scoped>

/* ESTILOS DEL BANNER PRINCIPAL */

.banner-home {
  background-color: #174384;
  min-height: 25rem;
  padding-block: 2rem 5rem; /* padding arriba y abajo */
  padding-inline-start: clamp(1rem, 20vw, 20%);
  padding-inline-end: clamp(1rem, 5vw, 10%);
}

.txt-banner {
  margin-left: 4rem;
}

.txt-up h2 {
  font-size: 3rem;
}


/* ESTILOS DE LA SECCIÓN DE EVENTOS */

.events-carrousel-content {
  margin: 2rem;
}

.carrousel-header h3 {
  font-weight: bold;
  padding-bottom: 1rem;
}

.carrousel-cards-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 1rem;
  padding-bottom: 1rem;
}

.carrousel-card {
  scroll-snap-align: start;
}


/* ESTILOS PARA ESTADOS DE CARGA Y ERROR */

.spinner-border {
  width: 3rem;
  height: 3rem;
}

.alert {
  margin: 1rem 0;
  border-radius: 0.5rem;
}

/* ESTILOS RESPONSIVOS */

@media (max-width: 1300px) {
  .banner-home {
    flex-direction: column;
    padding-left: 2rem; /* reduce el padding lateral */
    text-align: center;
  }

  .img-banner {
    margin: 0 auto 2rem auto; /* centra la imagen en móvil */
  }

  .img-banner img {
    width: clamp(8rem, 60vw, 50rem);
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    object-fit: cover;
  }

  .txt-banner {
    margin-left: 0;
  }

  .txt-up h2 {
    font-size: 2rem;
  }
}
</style>
