<script setup>
import LoaderComponent from '@/components/LoaderComponent.vue'
import AppNavbar from '@/components/AppNavbar.vue';
import AppFooter from '@/components/AppFooter.vue';
</script>

<template>
  <AppNavbar/>
  <LoaderComponent v-if="loading" />
  <div
    class="vh-100 d-flex justify-content-center align-items-center"
    style="background: linear-gradient(to right, #61c0ff, #007bff)"
  >
    <div class="bg-white p-5 rounded-4 shadow-lg" style="width: 100%; max-width: 380px">
      <div class="text-center mb-4">
        <img
          src="@/assets/universidad_varios/puce_logo.png"
          alt="Logo"
          class="img-fluid"
          style="width: 60px"
        />
        <h4 class="fw-bold mt-3">Login</h4>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group mb-3">
          <input
            type="email"
            v-model="email"
            class="form-control bg-light border-0"
            placeholder="Correo Electrónico"
            required
          />
        </div>

        <div class="form-group mb-3">
          <input
            type="password"
            v-model="password"
            class="form-control bg-light border-0"
            placeholder="Contraseña"
            required
          />
        </div>

        <div class="text-end mb-3">
          <a href="#" class="text-primary small fw-semibold" style="font-style: italic"
            >¿Olvidaste tu contraseña?</a
          >
        </div>

        <button
          type="submit"
          class="btn w-100 text-white fw-bold py-2"
          style="background-color: #1a3b7b; border-radius: 30px"
        >
          Iniciar Sesión
        </button>
      </form>

      <div v-if="error" class="alert alert-danger mt-3 text-center">{{ error }}</div>
    </div>
  </div>
  <AppFooter/>
</template>

<script>
export default {
  name: 'LoginForm',
  components: {
    LoaderComponent,
  },
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false,
    }
  },
  methods: {
    async handleLogin() {
      this.error = ''
      this.loading = true
      try {
        await fetch(`${import.meta.env.VITE_URL_BACKEND}/sanctum/csrf-cookie`, {
          credentials: 'include',
        })

        const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/login`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
          }),
          credentials: 'include',
        })

        const text = await response.text()
        let data

        try {
          data = JSON.parse(text)
        } catch (jsonError) {
          console.error('Respuesta no válida (HTML en vez de JSON):', text + jsonError)
          this.error = 'El servidor no respondió correctamente. Intenta más tarde.'
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Error al iniciar sesión')
        }

        localStorage.setItem('token', `Bearer ${data.access_token}`)
        localStorage.setItem('user', JSON.stringify(data.user))

        if (data.user.rol_id === 1 || data.user.rol_id === 8) {
          this.$router.push('/admin/eventos')
        } else if (data.user.rol_id === 2) {
          this.$router.push('/eventos')
        } else {
          this.$router.push('/')
        }
      } catch (err) {
        this.error = 'Correo o contraseña incorrectos.'
        console.error('Login error:', err)
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
