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
const pageSize = 8
const equipos = ref([])
const proyectosConEventos = ref([])
const eventos = ref([]) // para traer nombre del evento

async function fetchEquipos() {
  const token = localStorage.getItem('token')
  if (!token) return

  loading.value = true
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    equipos.value = response.data
  } catch (e) {
    console.error('Error cargando equipos', e)
  } finally {
    loading.value = false
  }
}
const equipoMap = computed(() =>
  equipos.value.reduce((map, equipo) => {
    map[equipo.id] = equipo.nombre
    return map
  }, {}),
)

function getEquipoNombre(equipoId) {
  const equipo = equipos.value.find((e) => e.id === equipoId)

  if (!equipoId || !equipo) return 'Sin equipo'
  if (equipo.estado_borrado === true) return 'Equipo eliminado'

  return equipo.nombre
}

const filteredProyectos = computed(() =>
  proyectos.value.filter(
    (proyecto) =>
      proyecto.estado !== 'BORRADO' &&
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
    return
  }

  loading.value = true
  try {
    const [proyRes, archivosProyectoRes, archivosRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const archivosProyecto = archivosProyectoRes.data
    const archivos = archivosRes.data

    proyectos.value = proyRes.data.map((p) => {
      const eventoData = proyectosConEventos.value.find((pe) => pe.proyecto_id === p.id)
      const evento = eventos.value.find((e) => e.id === eventoData?.evento_id)
      const equipo = equipos.value.find((eq) => eq.id === p.equipo_id)
      const miembros = equipo?.miembros || []

      const archivosRelacionados = archivosProyecto
        .filter((rel) => rel.proyecto_id === p.id)
        .map((rel) => archivos.find((a) => a.id === rel.archivo_id && !a.estado_borrado))

      const imagenesValidas = archivosRelacionados
        .filter((a) => a && ['jpg', 'jpeg', 'png'].includes(a?.tipo?.toLowerCase()))
        .sort((a, b) => b.id - a.id)

      const logo = imagenesValidas[0]

      return {
        ...p,
        evento_id: eventoData?.evento_id,
        nombre_evento: evento?.nombre || 'Evento desconocido',
        equipo: miembros,
        logoUrl: logo?.url || null,
      }
    })

    error.value = ''
  } catch (e) {
    error.value = 'Error al cargar proyectos. Intente más tarde.'
    proyectos.value = []
  } finally {
    loading.value = false
  }
}

async function fetchProyectosConEventos() {
  const token = localStorage.getItem('token')
  if (!token) return
  loading.value = true

  try {
    const [proyEventoRes, eventosRes, equiposRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto/proyectosConEventos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    proyectosConEventos.value = proyEventoRes.data
    eventos.value = eventosRes.data
    equipos.value = equiposRes.data
  } catch (e) {
    console.error('Error al cargar proyectos con eventos:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchEquipos()
  await fetchProyectosConEventos()
  await fetchProyectos()
})
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
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="container">
          <div class="row g-1" v-if="!loading">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-1"
              v-for="proyecto in proyectosOrdenados"
              :key="proyecto.id"
            >
              <ProjectCard
                :proyecto="proyecto"
                :equipoNombre="getEquipoNombre(proyecto.equipo_id)"
                :nombreEvento="proyecto.nombre_evento"
                :equipo="proyecto.equipo"
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
        <div class="pagination justify-content-center">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>

          <button
            v-for="page in totalPages"
            :key="page"
            :class="['page-btn', { active: page === currentPage }]"
            @click="currentPage = page"
          >
            {{ page }}
          </button>

          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
            ›
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
