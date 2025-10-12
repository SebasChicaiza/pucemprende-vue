<template>
  <div class="project-card">
    <div class="project-scroll-content">
      <div class="project-header">
        <div class="project-actions" v-if="puedeEditar">
          <button
            class="icon-btn edit-icon"
            title="Editar proyecto"
            @click.stop="$router.push(`/admin/proyectos/${proyecto.id}/editar`)"
          >
            <i class="bi bi-pencil-square"></i>
          </button>
          <button
            class="icon-btn delete-icon"
            title="Eliminar proyecto"
            @click.stop="showDeleteDialog = true"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="project-logo">
          <img
            v-if="logoSrc"
            :src="logoSrc"
            alt="Logo del proyecto"
            class="logo-img m-2"
            loading="lazy"
          />
          <span v-else class="logo-placeholder">Logo</span>
        </div>
      </div>

      <!-- Título del proyecto -->
      <h6 class="project-title" :title="projectTitle">{{ projectTitle }}</h6>

      <div class="project-description">
        <strong>Descripción</strong>
        <p>{{ proyecto.descripcion || 'Sin descripción' }}</p>
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

    <!-- Dialog de confirmación y notificación -->
    <div v-if="showDeleteDialog" class="dialog-backdrop">
      <div class="dialog-content">
        <p>¿Seguro que deseas eliminar este proyecto?</p>
        <div class="dialog-actions">
          <button class="btn btn-danger" @click="eliminarProyecto" :disabled="deleting">
            Sí, eliminar
          </button>
          <button class="btn btn-secondary" @click="showDeleteDialog = false" :disabled="deleting">
            Cancelar
          </button>
        </div>
        <p v-if="deleteError" class="dialog-error">{{ deleteError }}</p>
      </div>
    </div>
    <div v-if="deleteSuccess" class="toast-notification success">
      Proyecto eliminado correctamente.
    </div>
    <div v-if="deleteError && !showDeleteDialog" class="toast-notification error">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const props = defineProps({
  proyecto: { type: Object, required: true, default: () => ({}) },
  puedeEditar: { type: Boolean, default: false },
})

const emit = defineEmits(['deleted'])

const logoSrc = computed(() => props.proyecto?.logoUrl || props.proyecto?.logotipo || null)
const projectTitle = computed(() => props.proyecto?.titulo || props.proyecto?.nombre || 'Proyecto sin título')

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteSuccess = ref(false)
const deleteError = ref('')

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d) ? '—' : d.toLocaleDateString()
}

async function eliminarProyecto() {
  deleting.value = true
  deleteError.value = ''
  const token = localStorage.getItem('token')
  if (!token) {
    deleteError.value = 'Token no encontrado'
    deleting.value = false
    return
  }
  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto/delete/${props.proyecto.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    deleteSuccess.value = true
    showDeleteDialog.value = false
    emit('deleted', props.proyecto.id)
    setTimeout(() => {
      deleteSuccess.value = false
    }, 2000)
  } catch (e) {
    deleteError.value = 'No se pudo eliminar el proyecto.'
    console.log('Error al eliminar proyecto:', e)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
}
.project-actions {
  display: flex;
  gap: 0.3rem;
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
}
.icon-btn {
  background: transparent;
  border: none;
  color: #cbe2ff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  transition:
    color 0.2s,
    background 0.2s;
}
.icon-btn.delete-icon {
  color: #e74c3c;
}
.icon-btn:hover {
  color: #fff;
  background: #17438433;
  border-radius: 50%;
}
.icon-btn.delete-icon:hover {
  background: #e74c3c33;
}
.project-logo {
  margin: 0 auto;
  margin-top: 0.5rem;
  margin-bottom: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-img {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
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
.project-card {
  background: #174384;
  color: #fff;
  border-radius: 12px;
  padding: 1.2rem 1rem 1rem;
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
.project-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.4rem 0;
}
.project-subtitle {
  font-size: 0.95rem;
  margin: 0.2rem 0 0.7rem;
  color: #cbe2ff;
}
.project-description {
  margin-bottom: 0.7rem;
}
.project-description strong {
  font-size: 0.97rem;
}
.project-description p {
  margin: 0.2rem 0 0;
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
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog-content {
  background: #fff;
  color: #222;
  border-radius: 12px;
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  min-width: 260px;
  max-width: 90vw;
  box-shadow: 0 4px 24px #0002;
  text-align: center;
}
.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.2rem;
}
.btn.btn-danger {
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  cursor: pointer;
}
.btn.btn-secondary {
  background: #cbe2ff;
  color: #174384;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  cursor: pointer;
}
.dialog-error {
  color: #e74c3c;
  margin-top: 1rem;
  font-weight: 500;
}
.toast-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  min-width: 220px;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  z-index: 2000;
  box-shadow: 0 2px 12px #0002;
}
.toast-notification.success {
  background: #174384;
  color: #fff;
}
.toast-notification.error {
  background: #e74c3c;
  color: #fff;
}
</style>
