<script setup></script>

<template>
  <main>
    <div class="banner-home d-flex align-items-center justify-content-start">
      <!-- Imagen -->
      <div class="img-banner me-5">
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
          <router-link to="/sobre" class="btn btn-warning fw-bold px-4 py-2 rounded-pill">
            Conoce más
          </router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.banner-home {
  background-color: #174384;
  min-height: 25rem;
  padding: 2rem;
  padding-left: 18rem;
  padding-bottom: 5rem;
}
.txt-banner {
  margin-left: 4rem;
}
.txt-up h2 {
  font-size: 3rem;
}
</style>
