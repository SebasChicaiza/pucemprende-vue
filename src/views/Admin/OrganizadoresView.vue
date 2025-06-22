<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const abrir = ref(false)
const organizadores = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 15

const totalPages = computed(() =>
  Math.ceil(filteredOrganizadores.value.length / pageSize)
)

const filteredOrganizadores = computed(() =>
  organizadores.value.filter(org =>
    org.organizacion?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const paginatedOrganizadores = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrganizadores.value.slice(start, start + pageSize)
})

async function fetchOrganizadores() {
  const token = localStorage.getItem('token')
  if (!token) {
    error.value = 'Token de autenticación no encontrado.'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/organizadores`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    organizadores.value = response.data
    error.value = ''
  } catch (err) {
    if (err.response) {
      const errorMessage = err.response.data?.message || err.response.statusText || `HTTP Error ${err.response.status}`
      error.value = `Error al cargar los organizadores: ${errorMessage}`
    } else if (err.request) {
      error.value = 'No se pudo conectar con el servidor. Verifique su conexión de red.'
    } else {
      error.value = `Fallo en la solicitud: ${err.message}`
    }
  } finally {
    loading.value = false
  }
}

function editarOrganizador(org) {
  alert('Editar: ' + org.organizacion)
}

function eliminarOrganizador(org) {
  if (confirm('¿Eliminar organizador?')) {
    organizadores.value = organizadores.value.filter(o => o.id !== org.id)
  }
}

function abrirModalAgregar() {
  alert('Abrir modal para agregar organizador')
}

onMounted(fetchOrganizadores)
</script>

<template>
  <LoaderComponent v-if="loading"/>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <div class="d-flex align-items-center mb-3 gap-2">
          <input v-model="searchQuery" type="text" placeholder="Buscar organización" class="form-control"/>
          <button class="btn btn-default" @click="abrirModalAgregar">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="org-table-wrapper">
          <table class="org-table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Abreviaturas</th>
                <th>Encargado</th>
                <th>Identificación</th>
                <th>Rol Interno</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in paginatedOrganizadores" :key="org.id">
                <td>{{ org.organizacion }}</td>
                <td>{{ org.abreviatura }}</td>
                <td>{{ org.encargado }}</td>
                <td>{{ org.identificacion }}</td>
                <td>{{ org.rol_interno }}</td>
                <td>{{ org.telefono }}</td>
                <td>{{ org.correo }}</td>
                <td>
                  <button class="icon-btn" @click="editarOrganizador(org)">
                    <span class="icon-pencil"></span>
                  </button>
                  <button class="icon-btn" @click="eliminarOrganizador(org)">
                    <span class="icon-trash"></span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="org-pagination">
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
  </div>
</template>

<style scoped>
.org-table-wrapper {
  background: #fafafa;
  border-radius: 8px;
  padding: 1rem;
  position: relative;
}
.org-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.97rem;
  background: #fff;
}
.org-table th,
.org-table td {
  border: 1px solid #e0e0e0;
  padding: 0.5rem 0.7rem;
  text-align: left;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.org-table th {
  background: #f5f5f5;
  font-weight: 600;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 1.1rem;
}
.icon-pencil::before {
  content: "✏️";
}
.icon-trash::before {
  content: "🗑️";
}
.btn-default {
  background-color: #174384;
  border-color: #174384;
  color: #fff;
}
.btn-default:hover {
  background-color: #ffffff;
  border-color: #174384;
  color: #174384;
}
.org-pagination {
  margin: 1rem 0 0 0;
  text-align: left;
}
.page-btn {
  background: #eee;
  border: none;
  margin-right: 0.3rem;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
}
.page-btn.active {
  background: #174384;
  color: #fff;
}
</style>
