<script>
export default {
  data() {
    return {
      form: {
        usuario: '',
        email: '',
        clave: '',
        clave_confirmation: '',
        rol_id: 2,
        nombre: '',
        apellido: '',
        telefono: '',
        identificacion: '',
        alumni: 0,
        genero: 'M',
        estado: 'Activo',
      },
      error: '',
      success: false,
    }
  },
  methods: {
    async handleRegister() {
      this.error = ''
      this.success = false
      try {
        const response = await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/register`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.form),
        })

        const text = await response.text()
        let data
        try {
          data = JSON.parse(text)
        } catch (err) {
          console.error('Respuesta inesperada:', text + err)
          this.error = 'Error inesperado del servidor.'
          return
        }

        if (!response.ok) {
          this.error = data.message || 'Error al registrarse'
        } else {
          this.success = true
          this.form = {
            usuario: '',
            email: '',
            clave: '',
            clave_confirmation: '',
            rol_id: 2,
            nombre: '',
            apellido: '',
            telefono: '',
            identificacion: '',
            alumni: 0,
            genero: 'M',
            estado: 'Activo',
          }
        }
      } catch (e) {
        console.error(e)
        this.error = 'Fallo en la conexión con el servidor.'
      }
    },
  },
}
</script>

<template>
  <div
    class="vh-100 d-flex justify-content-center align-items-center"
    style="background: linear-gradient(to right, #61c0ff, #007bff)"
  >
    <div
      class="bg-white p-5 rounded-4 shadow-lg position-relative my-5"
      style="width: 100%; max-width: 600px"
    >
      <h4 class="fw-bold text-center mb-4">Registro</h4>

      <form @submit.prevent="handleRegister">
        <div class="row">
          <div class="col-md-6 mb-3">
            <input
              v-model="form.nombre"
              type="text"
              class="form-control bg-light border-0"
              placeholder="Nombres"
              required
            />
          </div>
          <div class="col-md-6 mb-3">
            <input
              v-model="form.apellido"
              type="text"
              class="form-control bg-light border-0"
              placeholder="Apellidos"
              required
            />
          </div>
          <div class="col-md-6 mb-3">
            <input
              v-model="form.identificacion"
              type="text"
              class="form-control bg-light border-0"
              placeholder="Cédula"
              required
            />
          </div>
          <div class="col-md-6 mb-3">
            <input
              v-model="form.telefono"
              type="text"
              class="form-control bg-light border-0"
              placeholder="Teléfono"
              required
            />
          </div>
          <div class="col-12 mb-3">
            <input
              v-model="form.email"
              type="email"
              class="form-control bg-light border-0"
              placeholder="Correo Electrónico"
              required
            />
          </div>
          <div class="col-12 mb-3">
            <input
              v-model="form.usuario"
              type="text"
              class="form-control bg-light border-0"
              placeholder="Nombre de usuario"
              required
            />
          </div>
          <div class="col-md-6 mb-3">
            <input
              v-model="form.clave"
              type="password"
              class="form-control bg-light border-0"
              placeholder="Contraseña"
              required
            />
          </div>
          <div class="col-md-6 mb-3">
            <input
              v-model="form.clave_confirmation"
              type="password"
              class="form-control bg-light border-0"
              placeholder="Confirmar Contraseña"
              required
            />
          </div>

          <!-- Género -->
          <div class="col-12 mb-3">
            <select v-model="form.genero" class="form-select bg-light border-0" required>
              <option disabled value="">Selecciona tu género</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otros</option>
            </select>
          </div>

          <!-- Alumni Switch -->
          <div class="col-12 mb-3">
            <div
              class="form-check form-switch bg-light px-3 py-2 rounded d-flex align-items-center justify-content-between"
              style="height: 40px"
            >
              <label class="form-check-label text-muted mb-0" for="alumniSwitch"
                >¿Eres Alumni PUCE?</label
              >
              <input
                class="form-check-input"
                type="checkbox"
                id="alumniSwitch"
                v-model="form.alumni"
                :true-value="1"
                :false-value="0"
              />
            </div>
          </div>
        </div>

        <div class="text-center mb-3">
          <small class="text-muted"
            >¿Ya tienes una cuenta?
            <router-link to="/login" class="text-primary fw-bold">Inicia sesión</router-link></small
          >
        </div>

        <div class="text-center mb-4">
          <button
            type="submit"
            class="btn text-white fw-bold px-4 py-2"
            style="background-color: #1a3b7b; border-radius: 30px"
          >
            Registrarse
          </button>
        </div>

        <div class="position-absolute" style="bottom: 20px; right: 20px">
          <img
            src="/src/assets/universidad_varios/puce_logo.png"
            alt="Logo"
            style="width: 50px; height: 50px"
          />
        </div>

        <div v-if="error" class="alert alert-danger mt-3 text-center">{{ error }}</div>
        <div v-if="success" class="alert alert-success mt-3 text-center">
          Registro exitoso. Ahora puedes iniciar sesión.
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
input::placeholder {
  color: #aaa;
}
</style>
