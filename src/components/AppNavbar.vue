<script setup></script>
<template>
  <nav class="navbar px-4 py-2">
    <div class="d-flex justify-content-between align-items-center w-100">
      <!-- Logo + navegación -->
      <div class="d-flex align-items-center">
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

      <!-- Botones de sesión -->
      <div>
        <router-link to="/login" class="btn-ini btn me-3">Iniciar Sesión</router-link>
        <router-link to="/registro" class="btn-reg btn">Registrarse</router-link>
      </div>
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
}
</style>
