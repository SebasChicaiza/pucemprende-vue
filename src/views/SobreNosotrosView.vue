<script setup>
import { ref } from 'vue' // ref para variables reactivas
import heroLogo from '@/assets/fotosOficinas/PUCE-Emprende incubadora.jpeg' // Importa la imagen directamente

// Datos para las historias de éxito
const successStories = ref([
  {
    companyName: 'TechSolutions Innova',
    founderName: 'Ana García',
    image: new URL('@/assets/fotosOficinas/PUCE-Emprende incubadora.jpeg', import.meta.url).href, // Nuevo método de importación para Vite/Vue CLI 4+
    description:
      'TechSolutions Innova, fundada en 2020 con el apoyo de PUCEEmprende, revolucionó el mercado con su software de gestión de energía renovable. Han logrado expandirse a nivel regional y son un referente en tecnología limpia.',
    quote:
      'PUCEEmprende fue la chispa que encendió nuestra visión, brindándonos las herramientas y el mentorazgo necesarios para transformar una idea en una empresa sólida.',
  },
  {
    companyName: 'Delicias Naturales',
    founderName: 'Carlos Ramírez',
    image: new URL('@/assets/fotosOficinas/PUCE-Emprende incubadora.jpeg', import.meta.url).href,
    description:
      'Delicias Naturales, un emprendimiento de alimentos orgánicos y saludables iniciado en 2021, ha conquistado el paladar local. Gracias al acompañamiento de PUCEEmprende, consolidaron su cadena de producción y distribución.',
    quote:
      'El equipo de PUCEEmprende no solo nos guio en el negocio, sino que creyó en nuestro producto desde el primer día. ¡Son parte fundamental de nuestro éxito!',
  },
  {
    companyName: 'Art & Design Studio',
    founderName: 'Sofía Vargas',
    image: new URL('@/assets/fotosOficinas/PUCE-Emprende incubadora.jpeg', import.meta.url).href,
    description:
      'Art & Design Studio, lanzado en 2019, es un estudio de diseño gráfico y arte digital que ha colaborado con grandes marcas. PUCEEmprende les ayudó a estructurar su modelo de negocio y a proyectar su creatividad.',
    quote:
      'Nos dieron la confianza y la estructura para monetizar nuestra pasión. Sin PUCEEmprende, probablemente seguiríamos siendo solo un hobby, no una empresa exitosa.',
  },
])

// No necesitamos mounted() para inicializar Bootstrap Carousel si data-bs-ride="carousel" está presente.
// Si por alguna razón no funciona, y necesitas inicializarlo manualmente, lo harías así (fuera de setup o en un onMounted):
// import { onMounted } from 'vue';
// onMounted(() => {
//   const carouselElement = document.getElementById('successStoriesCarousel');
//   if (carouselElement) {
//     new bootstrap.Carousel(carouselElement);
//   }
// });
</script>

<template>
  <div class="sobre-nosotros-view">
    <section
      class="hero-section position-relative d-flex align-items-center justify-content-center text-center"
    >
      <img
        :src="heroLogo"
        alt="Logo de PUCEEmprende: Foco con el nombre"
        class="img-fluid hero-logo"
      />
      <div class="hero-content position-absolute text-white">
        <h1 class="display-4 fw-bold mb-2">Sobre Nosotros</h1>
        <p class="lead">
          Impulsando la innovación y el espíritu emprendedor universitario desde 2005.
        </p>
      </div>
    </section>

    <section class="about-us-detailed py-5 bg-light">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h2 class="text-center mb-4 text-primary">Nuestra Historia y Propósito</h2>
            <p class="lead text-center mb-5">
              PUCEEmprende nació en 2005 dentro de las aulas de Administración como una respuesta al
              espíritu innovador de nuestros estudiantes. Desde entonces, nos hemos consolidado como
              un pilar fundamental en la formación y el apoyo a jóvenes emprendedores.
            </p>

            <div class="row text-center mb-5">
              <div class="col-md-4 mb-4">
                <i class="bi bi-bullseye icon-large text-secondary mb-3"></i>
                <h3 class="h4 text-primary">Nuestra Misión</h3>
                <p>
                  Acompañar, fortalecer y potenciar a los alumnos de la PUCE en el camino de
                  transformar sus ideas en proyectos reales con impacto positivo en la sociedad.
                </p>
              </div>
              <div class="col-md-4 mb-4">
                <i class="bi bi-rocket-takeoff icon-large text-secondary mb-3"></i>
                <h3 class="h4 text-primary">Nuestra Visión</h3>
                <p>
                  Ser el referente principal en la formación de emprendedores innovadores y la
                  creación de startups exitosas en el ámbito universitario ecuatoriano.
                </p>
              </div>
              <div class="col-md-4 mb-4">
                <i class="bi bi-patch-check icon-large text-secondary mb-3"></i>
                <h3 class="h4 text-primary">Nuestros Valores</h3>
                <p>
                  Innovación, Colaboración, Liderazgo, Impacto Social y Excelencia son los pilares
                  que guían cada una de nuestras iniciativas.
                </p>
              </div>
            </div>

            <div class="text-center mt-4">
              <router-link to="/programas" class="btn btn-primary btn-lg">
                Conoce Nuestros Programas <i class="bi bi-arrow-right"></i>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="success-stories py-5 bg-primary text-white">
      <div class="container">
        <h2 class="text-center mb-5 display-5 fw-bold">
          <i class="bi bi-award-fill me-3"></i>Historias de Éxito
        </h2>

        <div id="successStoriesCarousel" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">
            <div
              v-for="(story, index) in successStories"
              :key="index"
              :class="['carousel-item', { active: index === 0 }]"
            >
              <div class="row justify-content-center align-items-center">
                <div class="col-md-5 mb-4 mb-md-0">
                  <img
                    :src="story.image"
                    :alt="`Equipo de ${story.companyName}`"
                    class="img-fluid rounded shadow-lg"
                  />
                </div>
                <div class="col-md-7 text-center text-md-start">
                  <h3 class="h2 fw-bold text-warning">{{ story.companyName }}</h3>
                  <p class="lead">{{ story.founderName }}</p>
                  <p>{{ story.description }}</p>
                  <p class="fst-italic mt-3">"{{ story.quote }}"</p>
                </div>
              </div>
            </div>
          </div>

          <button
            class="carousel-control-prev"
            type="button"
            data-bs-target="#successStoriesCarousel"
            data-bs-slide="prev"
            aria-label="Historia anterior"
          >
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Anterior</span>
          </button>
          <button
            class="carousel-control-next"
            type="button"
            data-bs-target="#successStoriesCarousel"
            data-bs-slide="next"
            aria-label="Historia siguiente"
          >
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Siguiente</span>
          </button>

          <div class="carousel-indicators">
            <button
              v-for="(story, index) in successStories"
              :key="index"
              type="button"
              :data-bs-target="`#successStoriesCarousel`"
              :data-bs-slide-to="index"
              :class="{ active: index === 0 }"
              :aria-current="index === 0 ? 'true' : null"
              :aria-label="`Slide ${index + 1}`"
            ></button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Estilos Específicos de la Vista (igual que antes) */

/* Hero Section */
.hero-section {
  min-height: 400px;
  background:
    linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
    url('../assets/images/hero_background.jpg') no-repeat center center;
  background-size: cover;
  color: white;
  overflow: hidden;
}

.hero-logo {
  max-width: 500px;
  height: auto;
  z-index: 1;
}

.hero-content {
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* Iconos grandes (Bootstrap Icons) */
.icon-large {
  font-size: 3.5rem;
  line-height: 1;
}

/* Sección de Historias de Éxito */
.success-stories {
  background-color: var(--bs-primary);
}

.success-stories .carousel-item {
  padding: 4rem 2rem;
}

.success-stories .img-fluid {
  border-radius: 0.75rem;
  border: 4px solid var(--bs-warning);
}

.success-stories .carousel-control-prev-icon,
.success-stories .carousel-control-next-icon {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  padding: 1.5rem;
}

.success-stories .carousel-indicators button {
  background-color: var(--bs-white);
  border: 1px solid var(--bs-white);
}

.success-stories .carousel-indicators button.active {
  background-color: var(--bs-warning);
  border-color: var(--bs-warning);
}

/* Media Queries para Responsividad */
@media (max-width: 767.98px) {
  .hero-section {
    min-height: 300px;
  }
  .hero-content h1 {
    font-size: 2.5rem;
  }
  .hero-content p {
    font-size: 1rem;
  }
  .success-stories .carousel-item {
    padding: 2rem 1rem;
  }
  .success-stories .h2 {
    font-size: 1.8rem;
  }
  .icon-large {
    font-size: 2.5rem;
  }
}
</style>
