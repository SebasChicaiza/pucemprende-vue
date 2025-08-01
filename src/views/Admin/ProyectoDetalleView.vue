<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { user } from '@/stores/userPermisos'

const route = useRoute()
const proyectoId = parseInt(route.params.id)

const proyecto = ref(null)
const equipoNombre = ref('')
const miembrosProyecto = ref([])
const personas = ref([])
const logoUrl = ref('')
const loading = ref(true)
const dynamicTitle = ref('Cargando...')

// Estado para el QR
const qrDataUrl = ref('')
const showQr = ref(false)

// Permisos y helper para miembros
const esSuperadmin = computed(() => user.value?.rol_id === 8)
const puedeEditar = computed(() => {
  if (esSuperadmin.value) return true
  return miembrosProyecto.value.some(
    (m) => m.persona_id === user.value.persona_id && m.rol_id === 1,
  )
})
// Sólo miembros pueden generar QR
const isMiembroProyecto = computed(() =>
  miembrosProyecto.value.some((m) => m.persona_id === user.value.persona_id),
)

// Lógica para generar el QR
async function generarQR() {
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('Token no encontrado')
    return
  }
  const headers = { Authorization: `Bearer ${token}` }
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos/${proyectoId}/qr`,
      { headers },
    )
    qrDataUrl.value = `data:image/svg+xml;base64,${data.qr}`
    showQr.value = true
  } catch (err) {
    console.error('Error generando QR:', err)
  }
}

// Carga inicial de datos
onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) return
  const headers = { Authorization: `Bearer ${token}` }

  try {
    // 1. Proyecto
    const { data: proyectos } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto`,
      { headers },
    )
    const found = proyectos.find((p) => p.id === proyectoId)
    if (!found) return
    proyecto.value = found
    dynamicTitle.value = found.titulo
    document.title = `PUCEmprende – ${found.titulo}`

    // 2. Equipo
    const { data: equipos } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers,
    })
    const eq = equipos.find((e) => e.id === found.equipo_id && !e.estado_borrado)
    equipoNombre.value = eq ? eq.nombre : 'Equipo no disponible'

    // 3. Miembros del proyecto
    const { data: allMiembros } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/miembros-proyecto`,
      { headers },
    )
    miembrosProyecto.value = allMiembros.filter((m) => m.proyecto_id === proyectoId)

    // 4. Personas
    const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/persona`, { headers })
    personas.value = data

    // 5. Logo
    const [archp, archs] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`, { headers }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos`, { headers }),
    ])
    const relacion = archp.data
      .filter((r) => r.proyecto_id === proyectoId)
      .map((r) => archs.data.find((a) => a.id === r.archivo_id && !a.estado_borrado))
      .filter((a) => a && ['jpg', 'jpeg', 'png'].includes(a.tipo.toLowerCase()))
    if (relacion.length) {
      const ultimo = relacion.sort((a, b) => b.id - a.id)[0]
      logoUrl.value = ultimo.url
    }
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
  } finally {
    loading.value = false
  }
})

// Helpers
function getPersonaCompleta(id) {
  return personas.value.find((p) => p.id === id) || {}
}
function getRolNombre(rolId) {
  return rolId === 1 ? 'Líder' : rolId === 2 ? 'Integrante' : 'Otro'
}
</script>

<template>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column">
      <PageHeaderRoute :dynamicTitle="dynamicTitle" currentRouteName="Proyecto Detalle" />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div v-if="loading" class="text-center text-muted">Cargando...</div>

        <div v-else-if="proyecto" class="card shadow-lg p-4">
          <div class="card-body p-5">
            <!-- Logo -->
            <div v-if="logoUrl" class="project-logo-wrapper mb-4 text-center">
              <img :src="logoUrl" alt="Logo del proyecto" class="project-logo-img" />
            </div>

            <!-- Datos generales -->
            <h1 class="project-display-title">{{ proyecto.titulo }}</h1>
            <p class="text-muted mb-4">{{ proyecto.descripcion }}</p>
            <div class="mb-3"><strong>Estado:</strong> {{ proyecto.estado }}</div>
            <div class="mb-3"><strong>Equipo:</strong> {{ equipoNombre }}</div>
            <div class="mb-3">
              <strong>Inicio:</strong> {{ proyecto.fecha_inicio.split('T')[0] }}
              &nbsp;
              <strong>Fin:</strong> {{ proyecto.fecha_fin.split('T')[0] }}
            </div>

            <!-- Botón Generar QR (solo para miembros del proyecto) -->
            <div class="mb-4 text-end" v-if="isMiembroProyecto || esSuperadmin">
              <button @click="generarQR" class="btn btn-outline-primary">
                <i class="bi bi-qr-code me-1"></i> Generar QR
              </button>
            </div>

            <!-- Previsualización y descarga del QR -->
            <div v-if="showQr" class="text-center mb-5">
              <img :src="qrDataUrl" alt="QR del proyecto" style="max-width: 200px" />
              <div class="mt-2">
                <a
                  :href="qrDataUrl"
                  :download="`qr-proyecto-${proyectoId}.svg`"
                  class="btn btn-sm btn-secondary"
                >
                  <i class="bi bi-download me-1"></i> Descargar QR
                </a>
              </div>
            </div>

            <!-- Miembros del proyecto -->
            <div v-if="miembrosProyecto.length">
              <hr class="my-4" />
              <h5 class="mb-3">Miembros del proyecto</h5>
              <div class="row">
                <div
                  v-for="miembro in miembrosProyecto"
                  :key="miembro.id"
                  class="col-sm-6 col-md-4 col-lg-3 mb-4"
                >
                  <div class="card miembro-card">
                    <div class="card-body text-center">
                      <i class="bi bi-person-circle fs-1 text-primary mb-2"></i>
                      <p class="fw-bold mb-1">
                        {{ getPersonaCompleta(miembro.persona_id).nombre }}
                        {{ getPersonaCompleta(miembro.persona_id).apellido }}
                      </p>
                      <span class="badge bg-secondary">
                        {{ getRolNombre(miembro.rol_id) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-muted">
              No hay miembros inscritos en este proyecto.
            </div>
          </div>
        </div>

        <div v-else class="text-danger">Proyecto no encontrado.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-display-title {
  font-size: 2rem;
  font-weight: bold;
  color: #174384;
}
.project-logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.project-logo-img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #e0e6ec;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.miembro-card {
  background: #f8f9fc;
  border: 1px solid #dce2ea;
  border-radius: 12px;
  transition: transform 0.2s;
}
.miembro-card:hover {
  transform: scale(1.03);
}
</style>
