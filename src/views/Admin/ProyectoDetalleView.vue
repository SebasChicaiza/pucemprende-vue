<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const proyectoId = parseInt(route.params.id)

const proyecto = ref(null)
const equipoNombre = ref('')
const miembros = ref([])
const personas = ref([])
const logoUrl = ref('')
const loading = ref(true)

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    // 1. Obtener todos los proyectos y filtrar por ID
    const proyectosRes = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const foundProyecto = proyectosRes.data.find((p) => p.id === proyectoId)
    if (!foundProyecto) return
    proyecto.value = foundProyecto

    // 2. Obtener el equipo correspondiente
    const equiposRes = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const equipo = equiposRes.data.find((e) => e.id === foundProyecto.equipo_id)
    equipoNombre.value = equipo ? equipo.nombre : 'Equipo no encontrado'

    // 3. Obtener los miembros de ese equipo
    const miembrosRes = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/miembros-equipo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const miembrosFiltrados = miembrosRes.data.filter(
      (m) => m.equipo_id === foundProyecto.equipo_id,
    )
    miembros.value = miembrosFiltrados

    // 4. Obtener los datos personales
    const personasRes = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/persona`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    personas.value = personasRes.data

    // 5. Obtener el logo del proyecto (archivos-evento → archivo → url)
    const [archivosEventoRes, archivosRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
    console.log('Archivos Evento:', archivosEventoRes.data)
    const archivoEvento = archivosEventoRes.data.find(
      (ae) => ae.evento_id === foundProyecto.evento_id,
    )
    console.log('Archivo Evento:', archivoEvento)

    if (archivoEvento) {
      const archivo = archivosRes.data.find((a) => a.id === archivoEvento.archivo_id)
      logoUrl.value = archivo?.url || ''
    }
  } catch (err) {
    console.error('Error cargando detalles del proyecto', err)
  } finally {
    loading.value = false
  }
})

function getPersonaCompleta(personaId) {
  const persona = personas.value.find((p) => p.id === personaId)
  return persona
}
</script>

<template>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div v-if="loading" class="text-center text-muted">Cargando...</div>
        <div v-else-if="proyecto" class="card shadow-lg p-4">
          <div class="card-body p-5">
            <div v-if="logoUrl" class="project-logo-wrapper mb-4 text-center">
              <img :src="logoUrl" alt="Logo del proyecto" class="project-logo-img" />
            </div>

            <h1 class="project-display-title">{{ proyecto.titulo }}</h1>
            <p class="text-muted mb-4">{{ proyecto.descripcion }}</p>

            <div class="mb-3"><strong>Estado:</strong> {{ proyecto.estado }}</div>
            <div class="mb-3"><strong>Equipo:</strong> {{ equipoNombre }}</div>
            <div class="mb-3">
              <strong>Inicio:</strong> {{ proyecto.fecha_inicio.split('T')[0] }} &nbsp;
              <strong>Fin:</strong> {{ proyecto.fecha_fin.split('T')[0] }}
            </div>

            <hr class="my-4" />
            <h5 class="mb-3">Miembros del equipo</h5>
            <div class="row">
              <div
                class="col-sm-6 col-md-4 col-lg-3 mb-4"
                v-for="miembro in miembros"
                :key="miembro.id"
              >
                <div class="card miembro-card">
                  <div class="card-body text-center">
                    <div class="icon-wrapper mb-2">
                      <i class="bi bi-person-circle fs-1 text-primary"></i>
                    </div>
                    <p class="mb-0 fw-bold">
                      {{ getPersonaCompleta(miembro.persona_id)?.nombre }}
                      {{ getPersonaCompleta(miembro.persona_id)?.apellido }}
                    </p>
                    <p class="text-muted small mb-0">
                      {{ getPersonaCompleta(miembro.persona_id)?.email }}
                    </p>
                    <p class="text-muted small mb-0">
                      {{ getPersonaCompleta(miembro.persona_id)?.telefono }}
                    </p>
                  </div>
                </div>
              </div>
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
  transition: transform 0.2s ease-in-out;
}
.miembro-card:hover {
  transform: scale(1.02);
}

.icon-wrapper {
  display: flex;
  justify-content: center;
}
</style>
