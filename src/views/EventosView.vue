<script setup>

import { ref, computed, onMounted, onUnmounted } from 'vue'


import EventoCard from '@/components/EventoCard.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'


// IMPORTACIONES DE STORES

import { useEventosStore } from '@/stores/eventos.js'


// INICIALIZACIÓN DEL STORE
const eventosStore = useEventosStore()


// CONFIGURACIÓN DEL CARRUSEL DE BANNERS


// Array de imágenes de banners
const banners = [
  new URL('@/assets/banners/banner1.jpg', import.meta.url).href,
  new URL('@/assets/banners/banner2.png', import.meta.url).href,
  new URL('@/assets/banners/banner3.jpg', import.meta.url).href,
]

// Estado reactivo para el carrusel
const current = ref(0)

// Función para avanzar al siguiente slide
const nextSlide = () => {
  current.value = (current.value + 1) % banners.length
}

// Función para retroceder al slide anterior
const prevSlide = () => {
  current.value = (current.value - 1 + banners.length) % banners.length
}


// FUNCIONES HELPER PARA EVENTOS


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

// CONFIGURACIÓN DEL FILTRO DE SEDES

// Estado reactivo para el dropdown de sedes
const showDropdown = ref(false)
const dropdownRef = ref(null)
const sedes = ['Todos', 'Sede Quito', 'Sede Esmeraldas', 'Sede Ambato']
const sedeSeleccionada = ref('Todos')

// Función para seleccionar una sede
const seleccionarSede = (sede) => {
  sedeSeleccionada.value = sede
  showDropdown.value = false
}

// Función para cerrar el dropdown al hacer click fuera
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

/**
 * Computed que transforma los eventos del store al formato esperado por EventoCard
 * Aplica filtros por sede si es necesario
 */
const eventos = computed(() => {
  let eventosFiltrados = eventosStore.events

  // Filtrar por sede si no es "Todos"
  if (sedeSeleccionada.value !== 'Todos') {
    eventosFiltrados = eventosFiltrados.filter(evento =>
      evento.sede === sedeSeleccionada.value.replace('Sede ', '')
    )
  }

  // Transformar al formato esperado por EventoCard
  return eventosFiltrados.map(evento => ({
    id: evento.id,
    image: obtenerImagenEvento(evento),
    title: evento.nombre || 'Evento sin título',
    description: evento.descripcion || 'Sin descripción disponible',
    date: formatearFecha(evento.fecha_inicio),
    link: `/eventos/${evento.id}` // Generar link dinámico con el ID real
  }))
})


// LIFECYCLE HOOKS


/**
 * Hook que se ejecuta cuando el componente se monta
 * - Agrega listener para clicks fuera del dropdown
 * - Carga los próximos eventos desde la API
 */
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  // Cargar los próximos eventos desde la API
  await eventosStore.fetchProximosEventos()
})

/**
 * Hook que se ejecuta cuando el componente se desmonta
 * - Remueve listener para evitar memory leaks
 */
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
<template>

  <!-- BARRA DE NAVEGACIÓN -->

  <AppNavbar/>

  <!-- BANNER CARRUSEL -->

  <div class="main-banner">
    <div class="carousel-container">
      <!-- Botón izquierda -->
      <button class="arrow left" @click="prevSlide">‹</button>

      <!-- Imagen activa -->
      <img :src="banners[current]" alt="Banner" class="banner-image" />

      <!-- Botón derecha -->
      <button class="arrow right" @click="nextSlide">›</button>
    </div>
  </div>

  <!-- SECCIÓN DE EVENTOS -->

  <section>
    <div class="feed-eventos-div">
      <!-- Header con filtros -->
      <div class="feed-header">
        <h4 class="texto-feed-header">Próximos Eventos</h4>
        <div ref="dropdownRef" class="dropdown-container">
          <button class="btn-ubicaciones" @click="showDropdown = !showDropdown">
            <img
              src="@/assets/iconos/arrowDown.png"
              alt=""
              style="width: 1rem; margin-left: 4rem; margin-right: 1rem"
            />
            {{ sedeSeleccionada }}
          </button>

          <transition name="fade-slide">
            <ul v-if="showDropdown" class="dropdown-list">
              <li
                v-for="sede in sedes"
                :key="sede"
                @click="seleccionarSede(sede)"
                class="dropdown-item"
              >
                {{ sede }}
              </li>
            </ul>
          </transition>
        </div>
      </div>

      <!-- Estado de carga -->
      <div v-if="eventosStore.loading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando próximos eventos...</span>
        </div>
        <p class="mt-2">Cargando próximos eventos...</p>
      </div>

      <!-- Estado de error -->
      <div v-else-if="eventosStore.error" class="text-center py-4">
        <div class="alert alert-warning" role="alert">
          <i class="bi bi-exclamation-triangle"></i>
          {{ eventosStore.error }}
        </div>
        <button @click="eventosStore.fetchProximosEventos" class="btn btn-outline-primary">
          Reintentar
        </button>
      </div>

      <!-- Grid de eventos -->
      <div v-else-if="eventos.length > 0" class="eventos-container">
        <EventoCard
          v-for="evento in eventos"
          :key="evento.id"
          :image="evento.image"
          :title="evento.title"
          :description="evento.description"
          :date="evento.date"
          :link="evento.link"
        />
      </div>

      <!-- Estado vacío -->
      <div v-else class="text-center py-4">
        <p class="text-muted">No hay próximos eventos disponibles en este momento.</p>
      </div>
    </div>
  </section>


  <!-- PIE DE PÁGINA -->
  <AppFooter/>
</template>
<style scoped>

/* ESTILOS DEL CARRUSEL DE BANNERS */

.carousel-container {
  position: relative;
  width: 100%;
  max-width: 1400px;
  margin: 2rem auto;
  border-radius: 1rem;
  height: 20rem;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 1rem;
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  background: #ffffffcc;
  border: none;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.3s ease;
}

.arrow:hover {
  background: #8d8a9cee;
}

.arrow.left {
  left: 1rem;
}

.arrow.right {
  right: 1rem;
}

/* ESTILOS DEL HEADER DE EVENTOS */
.feed-header {
  display: flex;
  flex-direction: row;
  margin: 4rem;
}

.texto-feed-header {
  font-size: 2rem;
  font-weight: 800;
  color: #174384;
}

.btn-ubicaciones {
  background-color: transparent;
  border: none;
  color: #174384;
  font-weight: bold;
}


/* ESTILOS DEL GRID DE EVENTOS */

.eventos-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  justify-content: center;
  width: fit-content;
  margin: 0 auto;
}


/* ESTILOS PARA ESTADOS DE CARGA Y ERROR */

.spinner-border {
  width: 3rem;
  height: 3rem;
}

.alert {
  margin: 1rem auto;
  max-width: 600px;
  border-radius: 0.5rem;
}


/* ESTILOS DEL DROPDOWN */

.dropdown-container {
  position: relative;
  display: inline-block;
  margin: 0.5rem;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  z-index: 10;
}

.dropdown-item {
  padding: 0.5rem;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f0f0f0;
}


/* ANIMACIONES DEL DROPDOWN */

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
}


/* ESTILOS RESPONSIVOS */

@media (max-width: 1200px) {
  .eventos-container {
    grid-template-columns: repeat(2, 1fr); /* 2 columnas en tablets */
  }
}

@media (max-width: 800px) {
  .eventos-container {
    grid-template-columns: 1fr; /* 1 columna en móvil */
  }
}

@media (max-width: 1300px) {
  .main-banner {
    width: 80%;
    margin: 0 auto;
  }

  .carousel-container {
    height: 10rem;
  }

  .banner-image {
    height: 100%;
    object-fit: cover;
  }
}
</style>
