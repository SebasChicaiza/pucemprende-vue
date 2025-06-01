<script setup>
defineProps({
  image: String,
  title: String,
  description: String,
  date: String,
})
</script>

<template>
  <div class="carrousel-card">
    <!-- Personaliza con props -->
    <img :src="image" alt="Evento" class="img-principal" />
    <h5>{{ title }}</h5>
    <p>{{ description }}</p>
    <p class="fecha-hora">{{ date }}</p>
  </div>
</template>

<style scoped>
.carrousel-card {
  min-width: 400px;
  max-width: 400px;
  margin-right: 1rem;
  background-color: #fff;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.1);
  transition: 0.4s ease;
}
.carrousel-card:hover {
  transform: scale(1.03);
}
.img-principal {
  width: 100%;
  height: 15rem;
  object-fit: cover; /* recorta la imagen sin deformarla */
  border-radius: 1rem;
  margin-bottom: 1rem;
  background-color: #f0f0f0; /* fallback por si no carga la imagen */
}
</style>
