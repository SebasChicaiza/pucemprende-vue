<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const proyecto = ref(null)
const loading = ref(true)
const error = ref('')
const equipoNombre = ref('')

// Puedes usar esta función o traerla de una API real
const equiposMock = [
  { id: 1, nombre: 'PucEmprende Dev Team' },
  { id: 2, nombre: 'Innovadores Salud' },
]

function getEquipoNombre(id) {
  const equipo = equiposMock.find((e) => e.id === id)
  return equipo ? equipo.nombre : 'Sin equipo'
}

async function fetchProyecto() {
  const token = localStorage.getItem('token')
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const found = response.data.find((p) => p.id === parseInt(route.params.id))
    if (found) {
      proyecto.value = found
      equipoNombre.value = getEquipoNombre(found.equipo_id)
    } else {
      error.value = 'Proyecto no encontrado.'
    }
  } catch (err) {
    error.value = 'Error al obtener los datos del proyecto.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchProyecto)
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <p v-if="error" class="text-danger-custom">{{ error }}</p>

        <div v-if="proyecto" class="project-detail-card">
          <h2 class="project-title">{{ proyecto.titulo }}</h2>
          <hr class="project-divider" />

          <div class="project-info-grid">
            <div class="info-item">
              <i class="bi bi-person-fill team-icon"></i>
              <p>
                <strong>Equipo:</strong> <span class="team-name">{{ equipoNombre }}</span>
              </p>
            </div>
            <div class="info-item">
              <i class="bi bi-bar-chart-fill status-icon"></i>
              <p>
                <strong>Estado:</strong>
                <span
                  :class="[
                    'status-badge',
                    `status-${proyecto.estado.toLowerCase().replace(/\s/g, '-')}`,
                  ]"
                >
                  {{ proyecto.estado }}
                </span>
              </p>
            </div>
            <div class="info-item">
              <i class="bi bi-calendar-fill date-icon"></i>
              <p>
                <strong>Inicio:</strong>
                {{
                  new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }}
              </p>
            </div>
            <div class="info-item">
              <i class="bi bi-calendar-check-fill date-icon"></i>
              <p>
                <strong>Fin:</strong>
                {{
                  new Date(proyecto.fecha_fin).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }}
              </p>
            </div>
          </div>

          <div class="project-description">
            <h4>Descripción del Proyecto:</h4>
            <p>{{ proyecto.descripcion }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* General enhancements for the project detail card */
.project-detail-card {
  max-width: 800px; /* Slightly wider for more content */
  margin: 30px auto; /* More margin for visual breathing room */
  padding: 40px; /* Increased padding */
  background-color: #ffffff;
  border-radius: 12px; /* Softer rounded corners */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); /* More pronounced, softer shadow */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Modern, readable font */
  color: #333;
}

.project-title {
  font-size: 2.5rem; /* Larger, more impactful title */
  color: #2c3e50; /* Darker, professional color */
  margin-bottom: 0.8rem;
  text-align: center;
  font-weight: 700;
}

.project-divider {
  border: 0;
  height: 2px;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0), #a0a0a0, rgba(0, 0, 0, 0));
  margin: 2rem 0;
}

/* Info grid for better layout of key details */
.project-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive grid for info items */
  gap: 25px; /* Spacing between grid items */
  margin-bottom: 2.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px; /* Space between icon and text */
  font-size: 1.1rem;
  color: #555;
}

.info-item strong {
  color: #2c3e50;
  font-weight: 600;
}

/* Icons */
.team-icon,
.status-icon,
.date-icon {
  font-size: 1.6rem;
  color: #3498db; /* A vibrant blue for icons */
}

/* Status Badge Styling */
.status-badge {
  padding: 0.4em 0.8em;
  border-radius: 20px; /* Pill-shaped badge */
  font-weight: bold;
  font-size: 0.95rem;
  color: #fff;
  display: inline-block; /* Ensures padding and border-radius work correctly */
  min-width: 90px; /* Ensures consistent width for badges */
  text-align: center;
}

/* Specific status colors (customize as needed) */
.status-pendiente {
  background-color: #f39c12;
} /* Orange for pending */
.status-en-progreso {
  background-color: #3498db;
} /* Blue for in progress */
.status-completado {
  background-color: #27ae60;
} /* Green for completed */
.status-cancelado {
  background-color: #e74c3c;
} /* Red for cancelled */
.status-en-revision {
  background-color: #9b59b6;
} /* Purple for review */

/* Description section */
.project-description {
  background-color: #f9f9f9;
  border-left: 5px solid #3498db; /* A subtle accent border */
  padding: 20px;
  border-radius: 8px;
  margin-top: 3rem;
}

.project-description h4 {
  font-size: 1.3rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  font-weight: 600;
}

.project-description p {
  line-height: 1.7;
  color: #444;
  font-size: 1.05rem;
}

/* Custom error message style */
.text-danger-custom {
  color: #e74c3c; /* A more impactful red */
  font-weight: bold;
  text-align: center;
  margin-top: 2rem;
  font-size: 1.15rem;
  background-color: #ffebeb;
  padding: 15px 20px;
  border-radius: 8px;
  border: 1px solid #e74c3c;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
</style>
