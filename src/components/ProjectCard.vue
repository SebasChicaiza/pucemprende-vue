<template>
  <div class="project-card">
    <div class="project-header">
      <h3 class="project-title">{{ proyecto.titulo }}</h3>
      <span class="project-dot"></span>
    </div>
    <div class="project-subtitle">
      <span>Equipo: {{ equipoNombre || 'Sin equipo' }}</span>
    </div>
    <div class="project-logo">
      <span class="logo-placeholder">Logo</span>
    </div>
    <div class="project-description">
      <strong>Descripción</strong>
      <p>{{ proyecto.descripcion }}</p>
    </div>
    <div class="project-dates">
      <small>
        <b>Inicio:</b> {{ formatDate(proyecto.fecha_inicio) }}<br />
        <b>Fin:</b> {{ formatDate(proyecto.fecha_fin) }}
      </small>
    </div>
    <button class="details-btn" @click="$emit('ver-detalles', proyecto)">Ver Detalles</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  proyecto: { type: Object, required: true },
  equipoNombre: { type: String, default: '' },
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}
</script>

<style scoped>
.project-card {
  background: #174384;
  color: #fff;
  border-radius: 12px;
  padding: 1.2rem 1rem 1rem 1rem;
  width: 240px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 8px #0001;
  margin: 0.5rem;
  position: relative;
}
.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.project-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}
.project-dot {
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  display: inline-block;
}
.project-subtitle {
  font-size: 0.95rem;
  margin: 0.2rem 0 0.7rem 0;
  color: #cbe2ff;
}
.project-logo {
  display: flex;
  align-items: center;
  margin-bottom: 0.7rem;
}
.logo-placeholder {
  width: 38px;
  height: 38px;
  background: #fff3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.95rem;
}
.project-description {
  margin-bottom: 0.7rem;
}
.project-description strong {
  font-size: 0.97rem;
}
.project-description p {
  margin: 0.2rem 0 0 0;
  font-size: 0.93rem;
  color: #e2eaf7;
}
.project-dates {
  font-size: 0.85rem;
  color: #cbe2ff;
  margin-bottom: 0.8rem;
}
.details-btn {
  background: #fff;
  color: #174384;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  transition:
    background 0.2s,
    color 0.2s;
}
.details-btn:hover {
  background: #174384;
  color: #fff;
  border: 1px solid #fff;
}
</style>
