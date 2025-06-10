<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const menuOpen = ref(false)
const isMobile = ref(window.innerWidth < 992)
const user = ref(null)
const router = useRouter()

const checkMobile = () => {
  isMobile.value = window.innerWidth < 992
}

onMounted(() => {
  window.addEventListener('resize', checkMobile)
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
  }
  console.log(user)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function logout() {
  localStorage.removeItem('user')
  router.push('/login') // o usar router.push('/login') si prefieres redireccionar
}
function cerrarSesion() {
  logout()
  menuOpen.value = false
}
</script>
<template>
  <nav class="navbar px-4 py-2">
    <div class="d-flex justify-content-between align-items-center w-100">
      <!-- Logo + navegación -->
      <div class="d-none d-lg-flex align-items-center">
        <router-link to="/">
          <img
            src="../assets/universidad_varios/logoBordeadoPUCE-sinmargen.png"
            alt="Logo PUCE"
            class="me-4"
            style="height: 70px"
          />
        </router-link>

        <!-- Botones de navegación -->
        <router-link to="/" class="btn">Inicio</router-link>
        <router-link to="/eventos" class="btn">Eventos</router-link>
        <router-link to="/sobreNosotros" class="btn">Sobre Nosotros</router-link>
      </div>
      <!-- Botón hamburguesa (solo móvil) -->
      <router-link to="/">
        <img
          v-if="isMobile"
          src="../assets/universidad_varios/logoBordeadoPUCE-sinmargen.png"
          alt="Logo PUCE "
          style="height: 50px"
        />
      </router-link>
      <button
        class="btn d-lg-none text-white"
        @click="menuOpen = !menuOpen"
        style="font-size: 2rem"
      >
        ☰
      </button>

      <!-- Botones de sesión -->
      <div v-if="!isMobile && !user" class="d-lg-flex">
        <router-link to="/login" class="btn-ini btn me-3">Iniciar Sesión</router-link>
        <router-link to="/registro" class="btn-reg btn">Registrarse</router-link>
      </div>
      <div v-else-if="!isMobile && user" class="d-lg-flex">
        <router-link to="/cuenta" class="btn-ini btn me-3">Mi Cuenta</router-link>
        <button @click="logout" class="btn-reg btn">Cerrar Sesión</button>
      </div>
    </div>
    <!-- Menú responsive solo visible en móvil cuando está abierto -->
    <transition name="slide-fade">
      <div
        v-if="menuOpen && isMobile && !user"
        class="d-flex flex-column p-3 mt-2 rounded gap-2 position-absolute"
        style="top: 100%; right: 0; background-color: #174384; z-index: 1000"
      >
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
      <!-- Menú para usuario autenticado -->
      <div
        v-else-if="menuOpen && isMobile && user"
        class="d-flex flex-column p-3 mt-2 rounded gap-2 position-absolute"
        style="top: 100%; right: 0; background-color: #174384; z-index: 1000"
      >
        <router-link to="/" class="btn" @click="menuOpen = false">Inicio</router-link>
        <router-link to="/eventos" class="btn" @click="menuOpen = false">Eventos</router-link>
        <router-link to="/sobreNosotros" class="btn" @click="menuOpen = false"
          >Sobre Nosotros</router-link
        >
        <router-link to="/cuenta" class="btn-ini btn" @click="menuOpen = false"
          >Mi Cuenta</router-link
        >
        <button class="btn-reg btn" @click="cerrarSesion">Cerrar Sesión</button>
      </div>
    </transition>
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
  font-size: medium;
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
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.slide-fade-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.slide-fade-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
