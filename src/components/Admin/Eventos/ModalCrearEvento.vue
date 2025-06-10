<script setup>
import { reactive } from 'vue'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  nombre: '',
  descripcion: '',
  categoria: '',
  modalidad: '',
  fechaInicio: '',
  fechaFin: '',
  estado: 'Activo',
  espacio: '',
  sede: '',
  capacidad: '',
  ingresoProyectos: false,
  seNecesitaRubricas: false,
})

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content fade-in">
      <h2 class="modal-title">Evento</h2>

      <div class="modal-tabs">
        <span class="tab active">Información del Evento</span>
        <span class="tab">Imágenes del Evento</span>
        <span class="tab">Añadir Cronogramas</span>
        <span class="tab">Añadir Actividades</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <input v-model="form.nombre" type="text" placeholder="Nombre del evento*" required />
          <input
            v-model="form.descripcion"
            type="text"
            placeholder="Descripción*"
            maxlength="225"
            required
          />
          <select v-model="form.categoria" required>
            <option disabled value="">Seleccione una Categoría</option>
            <option>Emprendimiento</option>
            <option>Tecnología</option>
          </select>
          <select v-model="form.modalidad" required>
            <option disabled value="">Seleccione una Modalidad</option>
            <option>Presencial</option>
            <option>Virtual</option>
            <option>Híbrida</option>
          </select>
          <input v-model="form.fechaInicio" type="date" required />
          <input v-model="form.fechaFin" type="date" required />
          <select v-model="form.estado" required>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <input v-model="form.espacio" type="text" placeholder="Lugar del evento" />
          <input v-model="form.sede" type="text" placeholder="Sede PUCE" />
          <input v-model="form.capacidad" type="number" placeholder="Capacidad" />
        </div>

        <div class="checkbox-group">
          <label
            ><input type="checkbox" v-model="form.ingresoProyectos" /> Ingreso de Proyectos</label
          >
          <label
            ><input type="checkbox" v-model="form.seNecesitaRubricas" /> Se necesita Rúbricas</label
          >
        </div>

        <div class="button-row">
          <button type="button" class="btn btn-cancel" @click="$emit('close')">Volver</button>
          <button type="submit" class="btn btn-primary">Siguiente</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Overlay del fondo */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal centrado */
.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 800px;
  width: 95%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: fadeSlideIn 0.4s ease;
}

/* Animación */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeSlideIn 0.3s ease-out;
}

/* Título */
.modal-title {
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

/* Tabs visuales */
.modal-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1.5rem;
}

.tab {
  padding-bottom: 0.5rem;
  color: #999;
  cursor: default;
}

.tab.active {
  color: #0056b3;
  border-bottom: 2px solid #0056b3;
}

/* Grid del formulario */
.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  margin-bottom: 1rem;
}

input,
select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
}

/* Grupo de checkboxes */
.checkbox-group {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.checkbox-group label {
  font-size: 0.95rem;
}

/* Botones */
.button-row {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 1rem;
}

.btn {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background-color: #eee;
  color: #333;
}

.btn-primary {
  background-color: #0056b3;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

/* Responsivo en móvil */
@media (max-width: 480px) {
  .modal-content {
    padding: 1.25rem;
  }

  .modal-title {
    font-size: 1.4rem;
  }

  .button-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-group {
    flex-direction: column;
  }
}
</style>
