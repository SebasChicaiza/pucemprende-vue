<template>
  <div class="project-card">
    <div class="project-scroll-content">
      <div class="project-header">
        <h3 class="project-title">{{ proyecto.titulo }}</h3>
        <div class="project-logo">
          <img
            v-if="proyecto.logoUrl"
            :src="proyecto.logoUrl"
            alt="Logo del proyecto"
            class="logo-img m-2"
          />
          <span v-else class="logo-placeholder">Logo</span>
        </div>

        <div
          v-if="puedeEditar"
          class="edit-icon"
          @click="$router.push(`/admin/proyectos/${proyecto.id}/editar`)"
        >
          <i class="bi bi-pencil-square"></i>
        </div>
      </div>
      <div class="project-subtitle">
        <span>Equipo: {{ equipoNombre || 'Sin equipo' }}</span>
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
      <button class="details-btn" @click="$router.push(`/admin/proyectos/${proyecto.id}`)">
        Ver Detalles
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { puedeEditarProyecto } from '@/stores/userPermisos' // ajusta la ruta

const props = defineProps({
  proyecto: { type: Object, required: true },
  equipoNombre: { type: String, default: '' },
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

const puedeEditar = computed(() => puedeEditarProyecto(props.proyecto))
</script>

<style scoped>
.edit-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  color: #cbe2ff;
  font-size: 1.2rem;
  transition: color 0.2s;
}
.edit-icon:hover {
  color: white;
}

.logo-img {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
}

.project-card {
  background: #174384;
  color: #fff;
  border-radius: 12px;
  padding: 1.2rem 1rem 1rem 1rem;
  width: 270px;
  min-height: 360px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 8px #0001;
  margin: 0.5rem;
  position: relative;
  overflow: hidden;
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
.project-scroll-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 0.8rem;
}
</style>
