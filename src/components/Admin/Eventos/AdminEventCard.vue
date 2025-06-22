<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['edit-event']);

const emitEditEvent = () => {
  emit('edit-event', props.event);
};
</script>

<template>
  <div class="card event-card">
    <div class="card-body">
      <div class="d-flex justify-content-between">
        <small class="text-muted fw-bold">Evento</small>
        <i class="fas fa-pen edit-icon" @click="emitEditEvent"></i>
      </div>

      <h5 class="card-title mt-2 fixed-title">
        {{ event.nombre.length > 30 ? event.nombre.slice(0, 30) + '...' : event.nombre }}
      </h5>
      <p class="card-text mb-3">
        {{ event.descripcion.length > 120 ? event.descripcion.slice(0, 120) + '...' : event.descripcion }}
      </p>

      <p class="card-text mb-1">
        <strong>Inicia:</strong> {{ new Date(event.fecha_inicio).toLocaleDateString() }}<br />
        <strong>Finaliza:</strong> {{ new Date(event.fecha_fin).toLocaleDateString() }}
      </p>

      <p class="card-text mb-2"><strong>Categoría: </strong>
        <span>{{ event.categoria }}</span>
      </p>

      <div class="card-text d-flex align-items-center mb-3">
        <i :class="event.estado_borrado ? 'fas fa-times-circle text-danger me-1' : 'fas fa-check-circle text-success me-1'"></i>
        <span :class="event.estado_borrado ? 'text-danger fw-semibold' : 'text-success fw-semibold'">Estado:</span>
        <span :class="event.estado_borrado ? 'text-danger ms-1' : 'text-muted ms-1'">{{ event.estado_borrado ? 'Inactivo' : 'Activo' }}</span>
      </div>


      <div class="d-flex gap-2 ">
        <button class="btn btn-outline-primary btn-sm">Ver evento</button>
        <button v-if="event.inscripcionesAbiertas" class="btn btn-primary btn-sm">Inscribirse</button>
        <p v-else class="text-muted mb-0 d-flex align-items-center justify-content-center" style="font-size: 0.85rem;">
          Inscripciones aún no abiertas
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  max-width: 300px;
  height: 375px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  border: none;
  transition: max-width 0.3s, height 0.3s;
  box-sizing: border-box;
}
.event-card .card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

.event-card .edit-icon {
  color: #6c757d;
  cursor: pointer;
}

.event-card .edit-icon:hover {
  color: #000;
}

.event-card .card-title {
  font-weight: bold;
  font-size: 1.1rem;
}

.event-card .card-text {
  font-size: 0.9rem;
  color: #555;
  text-align: justify;
}

.event-card .btn {
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

.event-card .btn-outline-primary {
  color: #174384;
  border-color: #174384;
}
.event-card .btn-outline-primary:hover {
  background-color: #174384;
  color: #fff;
}
.event-card .btn-primary {
  background-color: #174384;
  border-color: #174384;
}
.event-card .btn-primary:hover {
  background-color: #ffffff;
  border-color: #174384;
  color: #174384;
}

.fixed-title {
  height: 1.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fixed-description {
  height: 5rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tablet (landscape & portrait) */
@media (max-width: 1240px) {
  .event-card {
    width: 100%;
    max-width: 600px;
    height: 375px;
    margin: 0 auto 16px auto;
  }
  .event-card .card-body {
    padding: 1.2rem 0.7rem;
  }
  .event-card .card-title {
    font-size: 0.9rem;
  }
  .event-card .card-text {
    font-size: 0.8rem;
  }
  .event-card .btn-outline-primary {
  color: #174384;
  border-color: #174384;
  }
}

/* Large mobile devices (phablets, landscape phones, 600px and up) */
@media (max-width: 1130px) {
  .event-card {
    max-width: 100vw;
    height: 440px;
    margin: 0 4px 16px 4px;
  }
  .event-card .card-body {
    padding: 1rem 0.7rem;
  }
  .event-card .card-title {
    font-size: 0.8rem;
  }
  .event-card .card-text {
    font-size: 0.8rem;
  }
  .d-flex.gap-2 {
    flex-direction: column !important;
    gap: 0.5rem;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .event-card {
    max-width: 100vw;
    height: auto;
    margin: 0 0 16px 0;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .event-card .card-body {
    padding: 0.7rem 0.4rem;
  }
  .event-card .card-title {
    font-size: 0.88rem;
  }
  .event-card .card-text {
    font-size: 0.75rem;
  }
  .d-flex.gap-2 {
    flex-direction: column !important;
    gap: 0.5rem;
  }
}
</style>
