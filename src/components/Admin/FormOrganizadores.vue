<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ props.organizador ? 'Editar organización' : 'Crear una organización' }}</h2>
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
            placeholder="Ingrese la abreviatura"
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
          <input v-model="form.email" type="email" placeholder="Correo del Encargado" required />
        </div>

        <div class="form-group">
          <label>Rol Interno</label>
          <input v-model="form.rol_interno" type="text" placeholder="Rol del Encargado" required />
        </div>

        <div class="button-group">
          <button class="save-btn" type="submit">Guardar</button>
          <button v-if="props.organizador?.id" class="delete-btn" type="button" @click="eliminar">
            Eliminar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import axios from 'axios'

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

const token = localStorage.getItem('token')

async function submit() {
  const payload = {
    orgNombre: form.nombre_organizacion,
    orgAbreviatura: form.abreviatura,
    encarNombre: form.nombre_persona,
    encarApellido: form.apellido,
    encarIdentificacion: form.identificacion,
    orgTelf: form.telefono,
    orgEmail: form.email,
    encarRol: form.rol_interno,
  }

  try {
    if (props.organizador?.id) {
      await axios.put(
        `${import.meta.env.VITE_URL_BACKEND}/api/organizaciones/${props.organizador.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } else {
      await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/organizaciones`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }

    emit('submit')
    close()
  } catch (error) {
    console.error('Error al guardar:', error)
    alert('Ocurrió un error al guardar la organización.')
  }
}

async function eliminar() {
  if (!confirm('¿Estás seguro de eliminar esta organización?')) return

  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/organizaciones/${props.organizador.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    emit('submit')
    close()
  } catch (error) {
    console.error('Error al eliminar:', error)
    alert('No se pudo eliminar la organización.')
  }
}

function close() {
  emit('close')
}

watch(
  () => props.organizador,
  (nuevo) => {
    if (nuevo) {
      form.nombre_organizacion = nuevo.org_nom || ''
      form.abreviatura = nuevo.org_abreviatura || ''
      form.nombre_persona = nuevo.encar_nombre || ''
      form.apellido = nuevo.encar_apellido || ''
      form.identificacion = nuevo.encar_identificacion || ''
      form.telefono = nuevo.org_telf || ''
      form.email = nuevo.org_email || ''
      form.rol_interno = nuevo.encar_rol || ''
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
  inset: 0;
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
.button-group {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
}
.save-btn {
  background: #174384;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
}
.save-btn:hover {
  background: #0e2c5a;
}
.delete-btn {
  background: #dc3545;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
}
.delete-btn:hover {
  background: #c82333;
}
</style>
