<script setup>
defineProps({
  event: Object,
})
</script>

<template>
  <div class="card event-card">
    <div class="card-body">
      <div class="d-flex justify-content-between">
        <small class="text-muted fw-bold">Evento</small>
        <i class="fas fa-pen edit-icon"></i>
      </div>

      <h5 class="card-title mt-2 fixed-title">
        {{ event.nombre.length > 30 ? event.nombre.slice(0, 30) + '...' : event.nombre }}
      </h5>
      <p class="card-text mb-3 fixed-description">
        {{ event.descripcion.length > 120 ? event.descripcion.slice(0, 120) + '...' : event.descripcion }}
      </p>

      <p class="mb-1">
        <strong>Inicia:</strong> {{ new Date(event.fecha_inicio).toLocaleDateString() }}<br />
        <strong>Finaliza:</strong> {{ new Date(event.fecha_fin).toLocaleDateString() }}
      </p>

      <p class="mb-2"><strong>Categoría:</strong> {{ event.categoria_id === 1 ? 'Emprendimientos' : 'Tecnología' }}</p>

      <div class="d-flex align-items-center mb-3">
        <i :class="event.estado_borrado ? 'fas fa-times-circle text-danger me-1' : 'fas fa-check-circle text-success me-1'"></i>
        <span :class="event.estado_borrado ? 'text-danger fw-semibold' : 'text-success fw-semibold'">Estado:</span>
        <span :class="event.estado_borrado ? 'text-danger ms-1' : 'text-muted ms-1'">{{ event.estado_borrado ? 'Inactivo' : 'Activo' }}</span>
      </div>


      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm">Ver evento</button>
        <button class="btn btn-primary btn-sm">Inscribirse</button>
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
}
.event-card .card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
</style>
