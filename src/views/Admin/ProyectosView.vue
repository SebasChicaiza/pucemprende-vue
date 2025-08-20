<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

/**
 * Estado
 */
const proyectos = ref([])
const error = ref('')
const loading = ref(false)

const searchQuery = ref('')
const orden = ref('alfabetico')

const currentPage = ref(1)
const pageSize = 8

/**
 * Derivados
 */
const filteredProyectos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return proyectos.value.filter((p) => {
    if (p.estado === 'BORRADO') return false

    // Búsqueda por título, equipo y evento (mejor UX)
    const hayMatch =
      p.titulo?.toLowerCase().includes(q) ||
      p.equipo_nombre?.toLowerCase().includes(q) ||
      p.nombre_evento?.toLowerCase().includes(q)

    return hayMatch
  })
})

const proyectosOrdenados = computed(() => {
  const arr = [...filteredProyectos.value]

  if (orden.value === 'alfabetico') {
    arr.sort((a, b) => a.titulo.localeCompare(b.titulo))
  } else if (orden.value === 'fecha') {
    // Maneja ISO strings de backend
    arr.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
  }

  const start = (currentPage.value - 1) * pageSize
  return arr.slice(start, start + pageSize)
})

const totalPages = computed(() => {
  const pages = Math.ceil(filteredProyectos.value.length / pageSize)
  return pages || 1
})

/**
 * Efectos de UX: resetear página al cambiar búsqueda u orden
 */
watch([searchQuery, orden], () => {
  currentPage.value = 1
})

/**
 * Data fetching (UNA sola llamada)
 */
async function fetchProyectosCompletos() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }

  loading.value = true
  try {
    const res = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    // Mapeo para mantener compatibilidad con ProjectCard:
    // - nombre_evento (lo espera tu card)
    // - equipo (miembros)
    // - equipo_nombre (para mostrarlo directo)
    // - logoUrl (si ya viene del backend)
    proyectos.value = (res.data || []).map((p) => ({
      ...p,
      nombre_evento: p.evento_nombre ?? 'Evento desconocido',
      equipo: Array.isArray(p.miembros) ? p.miembros : [],
      equipo_nombre: p.equipo_nombre ?? 'Sin equipo',
      logoUrl: p.logoUrl ?? null,
    }))

    error.value = ''
  } catch (e) {
    console.error(e)
    error.value = 'Error al cargar proyectos. Intente más tarde.'
    proyectos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchProyectosCompletos()
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
            placeholder="Buscar por título, equipo o evento"
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
                :equipoNombre="proyecto.equipo_nombre"
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
