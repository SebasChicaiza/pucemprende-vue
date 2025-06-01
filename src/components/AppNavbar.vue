<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const menuOpen = ref(false)
const isMobile = ref(window.innerWidth < 992)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 992
}

onMounted(() => {
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>
<template>
  <nav class="navbar px-4 py-2">
    <div class="d-flex justify-content-between align-items-center w-100">
      <!-- Logo + navegación -->
      <div class="d-none d-lg-flex align-items-center">
        <img
          src="../assets/universidad_varios/pucemprende-logo-reducido.png"
          alt="Logo PUCE"
          class="me-4"
          style="height: 50px"
        />

        <!-- Botones de navegación -->
        <router-link to="/" class="btn">Inicio</router-link>
        <router-link to="/eventos" class="btn">Eventos</router-link>
        <router-link to="/sobre" class="btn">Sobre Nosotros</router-link>
      </div>
      <!-- Botón hamburguesa (solo móvil) -->
      <img
        v-if="isMobile"
        src="../assets/universidad_varios/pucemprende-logo-reducido.png"
        alt="Logo PUCE "
        style="height: 50px"
      />
      <button
        class="btn d-lg-none text-white"
        @click="menuOpen = !menuOpen"
        style="font-size: 2rem"
      >
        ☰
      </button>

      <!-- Botones de sesión -->
      <div v-if="!isMobile" class="d-lg-flex">
        <router-link to="/login" class="btn-ini btn me-3">Iniciar Sesión</router-link>
        <router-link to="/registro" class="btn-reg btn">Registrarse</router-link>
      </div>
    </div>
    <!-- Menú responsive solo visible en móvil cuando está abierto -->
    <div v-if="menuOpen && isMobile" class="d-flex flex-column bg-primary p-3 mt-2 rounded gap-2">
      <router-link to="/" class="btn" @click="menuOpen = false">Inicio</router-link>
      <router-link to="/eventos" class="btn" @click="menuOpen = false">Eventos</router-link>
      <router-link to="/sobreNosotros" class="btn" @click="menuOpen = false"
        >Sobre Nosotros</router-link
      >
      <router-link to="/login" class="btn-ini btn" @click="menuOpen = false"
        >Iniciar Sesión</router-link
      >
      <router-link to="/registro" class="btn-reg btn" @click="menuOpen = false"
        >Registrarse</router-link
      >
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background-color: #174384;
  height: 6rem;
}
.btn {
  color: white;
  font-weight: 400;
  font-size: large;
}
.btn:hover {
  text-decoration: underline;
}
.btn-ini {
  outline: 2px solid #19e4ff; /* Define estilo, ancho y color de una vez */
  outline-offset: -4px;
  border-radius: 20rem;
  transition: 0.5s ease;
  font-weight: 500;
}
.btn-ini:hover {
  text-decoration: none;
  background-color: #19e4ff;
  color: black;
}

.btn-reg {
  background-color: #19e4ff;
  color: black;
  font-weight: 600;
  border-radius: 20rem;
}
</style>
