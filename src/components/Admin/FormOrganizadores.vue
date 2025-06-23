<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Crear una organización</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Nombre de la organización</label>
          <input
            v-model="form.nombre_organizacion"
            type="text"
            placeholder="Ingrese el nombre de la organización"
            required
          />
        </div>
        <div class="form-group">
          <label>Abreviatura</label>
          <input
            v-model="form.abreviatura"
            type="text"
            placeholder="Ingrese la abreviatura de la organización"
            required
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input
              v-model="form.nombre_persona"
              type="text"
              placeholder="Nombre del Encargado"
              required
            />
          </div>
          <div class="form-group">
            <label>Apellido</label>
            <input
              v-model="form.apellido"
              type="text"
              placeholder="Apellido del Encargado"
              required
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Identificación</label>
            <input
              v-model="form.identificacion"
              type="text"
              placeholder="CI o RUC del Encargado"
              required
            />
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input
              v-model="form.telefono"
              type="text"
              placeholder="Contacto del Encargado"
              required
            />
          </div>
        </div>
        <div class="form-group">
          <label>Correo Electrónico</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="Ingrese el correo del encargado de la organización"
            required
          />
        </div>
        <div class="form-group">
          <label>Rol Interno</label>
          <input
            v-model="form.rol_interno"
            type="text"
            placeholder="Ingrese el rol interno del encargado de la organización"
            required
          />
        </div>
        <button class="save-btn" type="submit">Guardar</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const emit = defineEmits(['close', 'submit'])

const props = defineProps({
  organizador: {
    type: Object,
    default: null,
  },
})

const form = reactive({
  nombre_organizacion: '',
  abreviatura: '',
  nombre_persona: '',
  apellido: '',
  identificacion: '',
  telefono: '',
  email: '',
  rol_interno: '',
})

function close() {
  emit('close')
}

function submit() {
  emit('submit', { ...form })
  // Opcional: limpiar el formulario después de enviar
  Object.keys(form).forEach((k) => (form[k] = ''))
}
watch(
  () => props.organizador,
  (nuevo) => {
    if (nuevo) {
      Object.assign(form, nuevo)
    } else {
      Object.keys(form).forEach((k) => (form[k] = ''))
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0006;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background: #fff;
  border-radius: 22px;
  width: 800px;
  max-width: 95vw;
  padding: 2.2rem 2rem 2rem 2rem;
  box-shadow: 0 4px 32px #0002;
  position: relative;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.7rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #222;
  cursor: pointer;
  line-height: 1;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
input[type='text'],
input[type='email'] {
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  padding: 0.5rem 0.8rem;
  font-size: 1rem;
  margin-top: 0.2rem;
}
.save-btn {
  background: #174384;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 1.08rem;
  font-weight: 600;
  margin-top: 0.7rem;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.save-btn:hover {
  background: #0e2c5a;
}
</style>
