<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const proyectos = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')
const orden = ref('alfabetico')
const currentPage = ref(1)
const pageSize = 6

// Simulación de nombres de equipos (puedes reemplazar por llamada real)
const equiposMock = [
  { id: 1, nombre: 'PucEmprende Dev Team' },
  { id: 2, nombre: 'Innovadores Salud' },
]

function getEquipoNombre(equipoId) {
  const equipo = equiposMock.find((e) => e.id === equipoId)
  return equipo ? equipo.nombre : 'Sin equipo'
}

const filteredProyectos = computed(() =>
  proyectos.value.filter((proyecto) =>
    proyecto.titulo.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
)

const proyectosOrdenados = computed(() => {
  let arr = [...filteredProyectos.value]
  if (orden.value === 'alfabetico') {
    arr.sort((a, b) => a.titulo.localeCompare(b.titulo))
  } else if (orden.value === 'fecha') {
    arr.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
  }
  const start = (currentPage.value - 1) * pageSize
  return arr.slice(start, start + pageSize)
})

const totalPages = computed(() => Math.ceil(filteredProyectos.value.length / pageSize))

async function fetchProyectos() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    proyectos.value = response.data
    error.value = ''
  } catch (e) {
    error.value = 'Error al cargar proyectos. Intente más tarde.'
    proyectos.value = []
  } finally {
    loading.value = false
  }
}

function verDetalles(proyecto) {
  alert(`Ver detalles de: ${proyecto.titulo}`)
}

onMounted(fetchProyectos)
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="d-flex align-items-center mb-3 gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por título"
            class="form-control"
          />
          <select v-model="orden" class="orden-select">
            <option value="alfabetico">Ordenar: Alfabéticamente</option>
            <option value="fecha">Ordenar: Fecha de inicio</option>
          </select>
          <!-- Puedes agregar aquí un botón de filtros si lo necesitas -->
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row" v-if="!loading">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-3"
              v-for="proyecto in proyectosOrdenados"
              :key="proyecto.id"
            >
              <ProjectCard
                :proyecto="proyecto"
                :equipoNombre="getEquipoNombre(proyecto.equipo_id)"
                @ver-detalles="verDetalles"
              />
            </div>
            <div
              v-if="proyectosOrdenados.length === 0 && !loading"
              class="col-12 text-center text-muted mt-5"
            >
              No se encontraron proyectos.
            </div>
          </div>
          <div v-else class="text-center text-muted mt-5">Cargando proyectos...</div>
        </div>
        <div class="pagination">
          <button
            v-for="page in totalPages"
            :key="page"
            :class="['page-btn', { active: page === currentPage }]"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orden-select {
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #cbe2ff;
}
.error-text {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
.pagination {
  display: flex;
  gap: 0.3rem;
  margin-top: 1rem;
}
.page-btn {
  background: #eee;
  border: none;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
}
.page-btn.active {
  background: #174384;
  color: #fff;
}
</style>
