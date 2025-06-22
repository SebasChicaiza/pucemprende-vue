<script setup>
import { ref } from 'vue'
import { onMounted } from 'vue'
import { onUnmounted } from 'vue'
import EventoCard from '@/components/EventoCard.vue'

import evento1 from '@/assets/pruebas/evento1danza.jpeg'
import evento2 from '@/assets/pruebas/bootcamp.jpg'
import evento3 from '@/assets/pruebas/feriadigital.jpg'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'

// Array de imágenes de banners
const banners = [
  new URL('@/assets/banners/banner1.jpg', import.meta.url).href,
  new URL('@/assets/banners/banner2.png', import.meta.url).href,
  new URL('@/assets/banners/banner3.jpg', import.meta.url).href,
]

const current = ref(0)

const nextSlide = () => {
  current.value = (current.value + 1) % banners.length
}

const prevSlide = () => {
  current.value = (current.value - 1 + banners.length) % banners.length
}

const eventos = [
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
    link: '/eventos/1',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
    link: '/eventos/2',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
    link: '/eventos/3',
  },
]
const showDropdown = ref(false)
const dropdownRef = ref(null)
const sedes = ['Todos', 'Sede Quito', 'Sede Esmeraldas', 'Sede Ambato']
const sedeSeleccionada = ref('Todos')

const seleccionarSede = (sede) => {
  sedeSeleccionada.value = sede
  showDropdown.value = false
}
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
<template>
  <AppNavbar/>
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
  <section>
    <div class="feed-eventos-div">
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
      <div class="eventos-container">
        <EventoCard
          v-for="(evento, index) in eventos"
          :key="index"
          :image="evento.image"
          :title="evento.title"
          :description="evento.description"
          :date="evento.date"
          :link="evento.link"
        />
      </div>
    </div>
  </section>
  <AppFooter/>
</template>
<style scoped>
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

  /* Opcional: transición */
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
.eventos-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem; /* Menor espacio entre tarjetas */
  justify-content: center; /* Centra el grid horizontalmente */
  width: fit-content;
  margin: 0 auto;
}

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
</style>
