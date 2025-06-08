<script setup>
import CarrouselCard from '@/components/CarrouselCard.vue'
import evento1 from '@/assets/pruebas/evento1danza.jpeg'
import evento2 from '@/assets/pruebas/bootcamp.jpg'
import evento3 from '@/assets/pruebas/feriadigital.jpg'
import { onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'

// En HomeView.vue o App.vue por ejemplo
onMounted(() => {
  // Precarga "SobreNosotrosView.vue" mientras el usuario navega en Home
  import(/* webpackPrefetch: true */ '../views/EventosView.vue')
})

const eventos = [
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
  },
  {
    image: evento1,
    title: 'Festival Joven Danza',
    description: 'Unidos por la danza, unidos por la paz',
    date: '24 de abril, 2025',
  },
  {
    image: evento2,
    title: 'Bootcamp Full Stack',
    description: 'Aprende Vue y Laravel desde cero.',
    date: '24 de abril, 2025',
  },
  {
    image: evento3,
    title: 'Charla de UX',
    description: 'Diseño centrado en el usuario.',
    date: '16 - 20 de noviembre, 2025',
  },
]
</script>

<template>
  <AppNavbar />

  <main>
    <div class="banner-home d-flex align-items-center justify-content-start">
      <!-- Imagen -->
      <div class="img-banner">
        <img
          src="../assets/universidad_varios/img-home-banner.jpg"
          alt="Banner Principal"
          style="height: 25rem; border-radius: 20rem"
        />
      </div>

      <!-- Texto y botón -->
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
    <section>
      <div class="events-primary-carrousel">
        <div class="events-carrousel-content">
          <div class="carrousel-header">
            <h3>Eventos Populares</h3>
          </div>
          <div class="carrousel-cards-container">
            <CarrouselCard
              v-for="(evento, index) in eventos"
              :key="index"
              :image="evento.image"
              :title="evento.title"
              :description="evento.description"
              :date="evento.date"
            />
          </div>
        </div>
      </div>
    </section>
  </main>
  <AppFooter />
</template>

<style scoped>
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
