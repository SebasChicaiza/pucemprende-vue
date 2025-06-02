<script setup>
defineProps({
  image: String,
  title: String,
  description: String,
  date: String,
  link: String,
})
</script>

<template>
  <router-link :to="link" class="carrousel-card">
    <img :src="image" alt="Evento" class="img-principal" />
    <h5 style="font-weight: 800">{{ title }}</h5>
    <p>{{ description }}</p>
    <p class="fecha-hora">{{ date }}</p>
  </router-link>
</template>

<style scoped>
h5 {
  font-weight: bold;
}
h5,
p {
  color: black;
}
.carrousel-card {
  min-width: 400px;
  max-width: 400px;
  margin-right: 1rem;
  background-color: transparent;
  border-radius: 1rem;
  padding: 1rem;
  transition: 0.4s ease;
  text-decoration: none !important;
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
