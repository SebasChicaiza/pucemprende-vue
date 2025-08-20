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
const miembrosProyecto = ref([])
const logoUrl = ref('')
const loading = ref(true)
const error = ref('')
const dynamicTitle = ref('Cargando...')

// QR
const qrDataUrl = ref('')
const showQr = ref(false)

// Permisos
const esSuperadmin = computed(() => user.value?.rol_id === 8)
const puedeEditar = computed(() => {
  if (esSuperadmin.value) return true
  return miembrosProyecto.value.some(
    (m) => m.persona_id === user.value.persona_id && m.rol_id === 1,
  )
})
const isMiembroProyecto = computed(() =>
  miembrosProyecto.value.some((m) => m.persona_id === user.value.persona_id),
)

// Utilidades
function formatDate(iso) {
  if (!iso || typeof iso !== 'string') return '-'
  const i = iso.indexOf('T')
  return i > 0 ? iso.slice(0, i) : iso
}

function mapMiembro(m) {
  // Soporta nombre vs nombres y apellido vs apellidos
  const nombre = m.nombre ?? m.nombres ?? ''
  const apellido = m.apellido ?? m.apellidos ?? ''
  return {
    id: m.id,
    persona_id: m.persona_id,
    rol_id: m.rol_id,
    nombre,
    apellido,
  }
}

// Carga (UNA sola request)
onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    loading.value = false
    return
  }
  const headers = { Authorization: `Bearer ${token}` }

  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyectos-completos/${proyectoId}`,
      { headers },
    )

    // Logo puede venir como logoUrl o logotipo
    const logo = data.logoUrl ?? data.logotipo ?? null

    proyecto.value = {
      ...data,
      evento_id: data.evento_id, // 👈 asegúrate de conservarlo
      nombre_evento: data.evento_nombre ?? 'Evento desconocido',
      equipo_nombre: data.equipo_nombre ?? 'Sin equipo',
      logoUrl: logo,
    }

    miembrosProyecto.value = Array.isArray(data.miembros) ? data.miembros.map(mapMiembro) : []

    logoUrl.value = logo ?? ''

    dynamicTitle.value = data.titulo ?? 'Proyecto'
    document.title = `PUCEmprende – ${dynamicTitle.value}`
    error.value = ''
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
    error.value = 'No se pudo cargar el proyecto.'
  } finally {
    loading.value = false
  }
})

// QR (se mantiene igual)
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
        <p v-else-if="error" class="text-danger text-center">{{ error }}</p>

        <div v-else-if="proyecto" class="card shadow-lg p-4">
          <div class="card-body p-5">
            <!-- Logo -->
            <div v-if="logoUrl" class="project-logo-wrapper mb-4 text-center">
              <img :src="logoUrl" alt="Logo del proyecto" class="project-logo-img" />
            </div>

            <!-- Datos generales -->
            <h1 class="project-display-title">{{ proyecto.titulo }}</h1>
            <p class="text-muted mb-4">{{ proyecto.descripcion }}</p>

            <div class="mb-2"><strong>Estado:</strong> {{ proyecto.estado }}</div>
            <div class="mb-2"><strong>Equipo:</strong> {{ proyecto.equipo_nombre }}</div>
            <div class="mb-2">
              <strong>Evento:</strong>
              <RouterLink
                v-if="proyecto.evento_id"
                :to="`/admin/eventos/${proyecto.evento_id}`"
                class="link-primary text-decoration-underline ms-1"
              >
                {{ proyecto.nombre_evento }}
              </RouterLink>
              <span v-else class="ms-1">{{ proyecto.nombre_evento }}</span>
            </div>

            <div class="mb-3">
              <strong>Inicio:</strong> {{ formatDate(proyecto.fecha_inicio) }}
              &nbsp;
              <strong>Fin:</strong> {{ formatDate(proyecto.fecha_fin) }}
            </div>

            <!-- Generar QR (mantenido) -->
            <div class="mb-4 text-end" v-if="isMiembroProyecto || esSuperadmin">
              <button @click="generarQR" class="btn btn-outline-primary">
                <i class="bi bi-qr-code me-1"></i> Generar QR
              </button>
            </div>

            <!-- Preview/Descarga del QR -->
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

            <!-- Miembros -->
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
                      <p class="fw-bold mb-1">{{ miembro.nombre }} {{ miembro.apellido }}</p>
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
