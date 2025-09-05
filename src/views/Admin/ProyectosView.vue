<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { user } from '@/stores/userPermisos' // opcional: superadmin
import { useRouter } from 'vue-router'

// Agregamos el router para navegación
const router = useRouter()

/* --------- Estado --------- */
const indexProyectos = ref([]) // índice ligero de /api/proyectos
const detallesCache = new Map() // Map<id, ProyectoCompleto>
const inflightById = new Map() // Map<id, Promise> para dedupe
const visibles = ref([]) // proyectos completos visibles (+ __puedeEditar)

const loadingIndex = ref(false)
const loadingDetalles = ref(false)
const error = ref('')

const searchQuery = ref('')
const orden = ref('alfabetico')

const currentPage = ref(1)
const pageSize = 8

let debounceTimer = null
let abortCtrlBatch = null

/* --------- Usuario actual desde localStorage --------- */
function getStoredUserId() {
  const byId = Number(localStorage.getItem('id')) // <-- tu caso real
  if (Number.isFinite(byId) && byId > 0) return byId

  const byUser = Number(localStorage.getItem('user'))
  if (Number.isFinite(byUser) && byUser > 0) return byUser

  const keys = ['USER', 'currentUser', 'auth', 'session', 'account']
  for (const k of keys) {
    const raw = localStorage.getItem(k)
    if (!raw) continue
    try {
      const obj = JSON.parse(raw)
      const cand =
        obj?.id ??
        obj?.user_id ??
        obj?.userId ??
        obj?.usuario_id ??
        obj?.usuarioId ??
        obj?.user?.id ??
        obj?.user?.user_id
      if (cand) return Number(cand)
    } catch {}
  }
  return 0
}
const esSuperadmin = computed(() => Number(user.value?.rol_id) === 8)

/* --------- Normalizaciones --------- */
function normalizarIndex(p) {
  return {
    id: p.id,
    estado: p.estado,
    titulo: p.titulo ?? '',
    equipo_nombre: p.equipo_nombre ?? p.equipo?.nombre ?? 'Sin equipo',
    nombre_evento: p.nombre_evento ?? p.evento_nombre ?? 'Evento desconocido',
    fecha_inicio: p.fecha_inicio ?? null,
  }
}

function normalizarDetalle(d) {
  // Asegura que 'miembros' exista y tenga la forma esperada
  const miembros = Array.isArray(d?.miembros)
    ? d.miembros
    : Array.isArray(d?.equipo)
      ? d.equipo
      : []
  return {
    ...d,
    miembros,
    equipo: miembros, // compat si en algún sitio usan 'equipo'
    nombre_evento: d?.evento_nombre ?? d?.nombre_evento ?? 'Evento desconocido',
    equipo_nombre: d?.equipo_nombre ?? d?.equipo?.nombre ?? 'Sin equipo',
    logoUrl: d?.logoUrl ?? d?.logotipo ?? null,
  }
}

/* --------- Fetch índice --------- */
async function fetchIndice() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    return
  }
  loadingIndex.value = true
  try {
    // ⇩⇩ Si tu endpoint es singular, cambia a /api/proyecto
    const res = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const lista = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    indexProyectos.value = lista.map(normalizarIndex)
    currentPage.value = 1
    error.value = ''
  } catch (e) {
    console.error(e)
    error.value = 'Error al cargar listado de proyectos.'
    indexProyectos.value = []
  } finally {
    loadingIndex.value = false
  }
}

/* --------- Buscar/ordenar/paginar en el índice --------- */
const filteredIndex = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return indexProyectos.value.filter((p) => {
    if (p.estado === 'BORRADO') return false
    if (!q) return true
    return (
      p.titulo.toLowerCase().includes(q) ||
      p.equipo_nombre.toLowerCase().includes(q) ||
      p.nombre_evento.toLowerCase().includes(q)
    )
  })
})

const ordenadoIndex = computed(() => {
  const arr = [...filteredIndex.value]
  if (orden.value === 'alfabetico') arr.sort((a, b) => a.titulo.localeCompare(b.titulo))
  else if (orden.value === 'fecha')
    arr.sort((a, b) => new Date(a.fecha_inicio || 0) - new Date(b.fecha_inicio || 0))
  return arr
})

const totalPages = computed(() => Math.max(1, Math.ceil(ordenadoIndex.value.length / pageSize)))
const visibleIds = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return ordenadoIndex.value.slice(start, start + pageSize).map((p) => p.id)
})

/* --------- Dedup por id --------- */
async function fetchDetalleById(id, signal) {
  if (detallesCache.has(id)) return detallesCache.get(id)
  if (inflightById.has(id)) return inflightById.get(id)

  const token = localStorage.getItem('token')
  const p = axios
    .get(`${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    .then((r) => {
      const norm = normalizarDetalle(r.data || {})
      detallesCache.set(id, norm)
      inflightById.delete(id)
      return norm
    })
    .catch((err) => {
      inflightById.delete(id)
      throw err
    })

  inflightById.set(id, p)
  return p
}

/* --------- Carga de visibles (batch + fallback + dedup) --------- */
async function fetchDetallesVisibles() {
  const ids = visibleIds.value
  if (ids.length === 0) {
    visibles.value = []
    return
  }

  if (abortCtrlBatch) abortCtrlBatch.abort()
  abortCtrlBatch = new AbortController()

  loadingDetalles.value = true
  try {
    const missing = ids.filter((id) => !detallesCache.has(id))

    if (missing.length) {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ids: missing.join(',') },
          signal: abortCtrlBatch.signal,
        })
        if (Array.isArray(res.data)) {
          res.data.forEach((d) => detallesCache.set(d.id, normalizarDetalle(d)))
        } else {
          const limit = 4
          for (let i = 0; i < missing.length; i += limit) {
            const chunk = missing.slice(i, i + limit)
            await Promise.all(chunk.map((id) => fetchDetalleById(id, abortCtrlBatch.signal)))
          }
        }
      } catch {
        const limit = 4
        for (let i = 0; i < missing.length; i += limit) {
          const chunk = missing.slice(i, i + limit)
          await Promise.all(chunk.map((id) => fetchDetalleById(id, abortCtrlBatch.signal)))
        }
      }
    }

    // === Permisos: compara userId (localStorage) con miembro.id y rol_id === 1 ===
    const myUserId = getStoredUserId()

    visibles.value = ids
      .map((id) => {
        const p = detallesCache.get(id)
        return p ? { ...p, __puedeEditar: puedeEditarDe(p, myUserId) } : null
      })
      .filter(Boolean)

    error.value = ''
  } catch (e) {
    if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
      console.error(e)
      error.value = 'Error al cargar proyectos.'
    }
  } finally {
    loadingDetalles.value = false
  }
}

/* --------- Permisos en el padre --------- */
function puedeEditarDe(proy, myUserId) {
  if (esSuperadmin.value) return true
  if (!myUserId) return false

  const miembros = Array.isArray(proy.miembros)
    ? proy.miembros
    : Array.isArray(proy.equipo)
      ? proy.equipo
      : []

  // <- AQUÍ comparamos con 'miembro.id' (user id del backend) y rol 1
  return miembros.some(
    (m) => Number(m.id ?? m.usuario_id ?? m.user_id) === Number(myUserId) && Number(m.rol_id) === 1,
  )
}

/* --------- Editables IDs --------- */
const editablesIds = ref([])

async function fetchEditablesIds() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyectos/editables`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    editablesIds.value = Array.isArray(res.data.proyecto_ids) ? res.data.proyecto_ids : []
  } catch (e) {
    editablesIds.value = []
  }
}

/* --------- Reacciones --------- */
watch(
  () => orden.value,
  () => {
    currentPage.value = 1
    fetchDetallesVisibles()
  },
)

watch(
  () => searchQuery.value,
  () => {
    currentPage.value = 1
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchDetallesVisibles, 300)
  },
)

watch(visibleIds, fetchDetallesVisibles)

onMounted(async () => {
  await fetchEditablesIds()
  await fetchIndice()
  await fetchDetallesVisibles()
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortCtrlBatch) abortCtrlBatch.abort()
})

// Función para navegar a la creación de proyecto
function irACrearProyecto() {
  router.push('/admin/crearProyecto')  // Cambio aquí: /admin/crearProyecto en lugar de /admin/proyectos/crear
}
</script>

<template>
  <LoaderComponent v-if="loadingIndex || loadingDetalles" />

  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <!-- Encabezado con búsqueda, ordenamiento y botón crear -->
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div class="d-flex align-items-center gap-2 flex-grow-1">
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

          <!-- Botón para crear nuevo proyecto -->
          <button
            @click="irACrearProyecto"
            class="btn-crear-proyecto"
            title="Crear nuevo proyecto"
          >
            <i class="fas fa-plus me-2"></i>
            Crear Proyecto
          </button>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div class="container">
          <div class="row g-1" v-if="visibles.length">
            <div
              class="col-12 col-sm-12 col-md-6 col-lg-3 mb-1"
              v-for="proyecto in visibles"
              :key="proyecto.id"
            >
              <ProjectCard :proyecto="proyecto" :puedeEditar="editablesIds.includes(proyecto.id)" />
            </div>
          </div>

          <div v-else class="col-12 text-center text-muted mt-5">
            <div class="empty-state">
              <i class="fas fa-folder-open fa-3x mb-3 text-muted"></i>
              <h5>No se encontraron proyectos</h5>
              <p class="text-muted">Comienza creando tu primer proyecto</p>
              <button @click="irACrearProyecto" class="btn-crear-proyecto">
                <i class="fas fa-plus me-2"></i>
                Crear Primer Proyecto
              </button>
            </div>
          </div>
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

.btn-crear-proyecto {
  background: linear-gradient(135deg, #174384, #2563eb);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(23, 67, 132, 0.2);
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.btn-crear-proyecto:hover {
  background: linear-gradient(135deg, #0f2e5c, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(23, 67, 132, 0.3);
}

.btn-crear-proyecto:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(23, 67, 132, 0.2);
}

.empty-state {
  padding: 3rem 2rem;
  text-align: center;
}

.empty-state .btn-crear-proyecto {
  margin: 0 auto;
  margin-top: 1rem;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .d-flex.align-items-center.justify-content-between {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .btn-crear-proyecto {
    width: 100%;
    justify-content: center;
  }
}
</style>
