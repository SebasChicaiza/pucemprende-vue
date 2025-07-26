<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import FormOrganizadores from '@/components/Admin/FormOrganizadores.vue'

const abrir = ref(false)
const organizadores = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 15
const organizadorEdit = ref(null)

const totalPages = computed(() => Math.ceil(filteredOrganizadores.value.length / pageSize))

const filteredOrganizadores = computed(() =>
  organizadores.value.filter(
    (org) =>
      org.org_nom?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.org_abreviatura?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.encar_nombre?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.encar_apellido?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.encar_identificacion?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.encar_rol?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.org_telf?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.org_email?.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
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
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/organizaciones`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    organizadores.value = response.data
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Error al cargar los organizadores'
  } finally {
    loading.value = false
  }
}

function editarOrganizador(org) {
  organizadorEdit.value = { ...org }
  abrir.value = true
}

function eliminarOrganizador(org) {
  if (confirm('¿Eliminar organizador?')) {
    organizadores.value = organizadores.value.filter((o) => o.id !== org.id)
  }
}

function abrirModalAgregar() {
  abrir.value = true
}

onMounted(fetchOrganizadores)
</script>
<template>
  <LoaderComponent v-if="loading" />
  <div v-else class="d-flex admin-panel-layout">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column main-content-wrapper">
      <PageHeaderRoute />
      <div class="content-area-scrollable">
        <div class="organizations-dashboard-header">
          <h2 class="dashboard-title">Gestión de Organizadores</h2>
          <div class="action-bar">
            <div class="search-input-container">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por organización, persona, contacto..."
                class="form-control search-input"
              />
            </div>
            <button class="btn add-organizador-btn" @click="abrirModalAgregar">
              <i class="bi bi-plus-lg add-icon"></i>
              <span>Nuevo Organizador</span>
            </button>
          </div>
        </div>

        <p v-if="error" class="alert alert-danger custom-error-alert" role="alert">
          {{ error }}
        </p>

        <div class="organizations-table-container">
          <div class="table-responsive-wrapper">
            <table class="organizations-table">
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Abreviatura</th>
                  <th>Encargado</th>
                  <th>Identificación</th>
                  <th>Rol Interno</th>
                  <th>Contacto</th>
                  <th>Correo Electrónico</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedOrganizadores.length === 0">
                  <td colspan="8" class="text-center no-results-message">
                    No se encontraron organizadores que coincidan con su búsqueda.
                  </td>
                </tr>
                <tr v-for="org in paginatedOrganizadores" :key="org.id">
                  <td class="org-name-cell">
                    <i class="bi bi-building org-icon"></i>
                    {{ org.org_nom }}
                  </td>
                  <td>{{ org.org_abreviatura }}</td>
                  <td>{{ org.encar_nombre }} {{ org.encar_apellido }}</td>
                  <td>{{ org.encar_identificacion }}</td>
                  <td>
                    <span
                      :class="[
                        'role-badge',
                        `role-${org.encar_rol?.toLowerCase().replace(/\s/g, '-')}`,
                      ]"
                    >
                      {{ org.encar_rol }}
                    </span>
                  </td>
                  <td><i class="bi bi-telephone-fill contact-icon"></i> {{ org.org_telf }}</td>
                  <td>
                    <a :href="`mailto:${org.org_email}`" class="email-link">
                      <i class="bi bi-envelope-fill contact-icon"></i> {{ org.org_email }}
                    </a>
                  </td>
                  <td class="action-buttons-cell">
                    <button
                      class="action-btn edit-btn"
                      @click="editarOrganizador(org)"
                      title="Editar Organizador"
                    >
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button
                      class="action-btn delete-btn"
                      @click="eliminarOrganizador(org)"
                      title="Eliminar Organizador"
                    >
                      <i class="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-controls-container" v-if="filteredOrganizadores.length > pageSize">
            <button
              class="pagination-arrow-btn"
              @click="currentPage--"
              :disabled="currentPage === 1"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              :class="['pagination-page-btn', { 'active-page': page === currentPage }]"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button
              class="pagination-arrow-btn"
              @click="currentPage++"
              :disabled="currentPage === totalPages"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>

        <FormOrganizadores
          v-if="abrir"
          :organizador="organizadorEdit"
          @close="
            () => {
              abrir = false
              organizadorEdit = null
            }
          "
          @submit="
            () => {
              abrir = false
              organizadorEdit = null
              fetchOrganizadores()
            }
          "
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- General Layout & Page Structure --- */
.admin-panel-layout {
  min-height: 100vh;
  background-color: #f5f7fa; /* Lighter, modern background */
  font-family: 'Inter', sans-serif; /* Consistent modern font */
  color: #333d47; /* Darker, more readable default text color */
}

.main-content-wrapper {
  background-color: #ffffff;
  border-radius: 12px 0 0 12px;
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.03); /* Subtle shadow on the left edge */
  height: 100vh; /* Ensure it takes full height */
}

.content-area-scrollable {
  padding: 2.5rem 3rem; /* Generous internal padding */
  overflow-y: auto; /* Enable scrolling */
  height: calc(100vh - 60px); /* Adjust for header */
}

/* --- Dashboard Header & Controls --- */
.organizations-dashboard-header {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e6ec; /* Subtle separator */
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

.search-input-container {
  position: relative;
  flex-grow: 1; /* Allows search bar to take available space */
  max-width: 500px; /* Limit search bar width */
}

.search-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #8898aa;
  font-size: 1.1rem;
}

.search-input {
  padding: 0.75rem 0.75rem 0.75rem 45px; /* Adjust padding for icon */
  border: 1px solid #dcdfe6;
  border-radius: 0.75rem; /* More rounded */
  font-size: 1rem;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03); /* Subtle shadow */
}

.search-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.add-organizador-btn {
  background-color: #28a745; /* Vibrant green for 'add' action */
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: none;
  box-shadow: 0 4px 10px rgba(40, 167, 69, 0.2);
}

.add-organizador-btn:hover {
  background-color: #218838;
  box-shadow: 0 6px 15px rgba(40, 167, 69, 0.3);
  transform: translateY(-2px);
}

.add-icon {
  font-size: 1.2rem;
}

/* --- Error Message Styling --- */
.custom-error-alert {
  background-color: #feebeb;
  color: #d82c2c;
  border: 1px solid #d82c2c;
  padding: 1.2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  text-align: center;
  max-width: 700px;
  margin: 2rem auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* --- Organizations Table --- */
.organizations-table-container {
  width: 90%;
  background-color: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.07); /* Clearer shadow for table */
  padding: 1.5rem; /* Internal padding */
  overflow: hidden; /* Ensures border-radius is respected */
}

.table-responsive-wrapper {
  overflow-x: auto; /* Enables horizontal scrolling for the table if needed */
  padding-bottom: 10px; /* Space for scrollbar */
}

.organizations-table {
  width: 100%;
  border-collapse: separate; /* Allows for border-spacing */
  border-spacing: 0; /* Remove default spacing */
  font-size: 0.95rem;
  min-width: 1000px; /* Ensure table doesn't get too squished on smaller screens */
}

.organizations-table thead th {
  background-color: #f8f9fc; /* Light header background */
  color: #5d6d7e; /* Muted header text color */
  font-weight: 700;
  padding: 1rem 1.2rem;
  text-align: left;
  position: sticky; /* Make header sticky */
  top: 0;
  z-index: 10; /* Ensure it stays on top */
  border-bottom: 2px solid #e0e6ec; /* Stronger bottom border */
  white-space: nowrap; /* Prevent wrapping in headers */
}

/* First and last header cells for rounded corners */
.organizations-table thead th:first-child {
  border-top-left-radius: 0.75rem;
}
.organizations-table thead th:last-child {
  border-top-right-radius: 0.75rem;
}

.organizations-table tbody tr {
  background-color: #ffffff;
  transition: background-color 0.2s ease-in-out;
}

.organizations-table tbody tr:nth-child(even) {
  background-color: #fdfdfd; /* Subtle zebra striping */
}

.organizations-table tbody tr:hover {
  background-color: #eef7ff; /* Highlight row on hover */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* Subtle lift on hover */
  transform: translateY(-1px);
}

.organizations-table tbody td {
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #eceff1; /* Light border between rows */
  white-space: nowrap; /* Prevent text wrapping */
  overflow: hidden;
  text-overflow: ellipsis; /* Add ellipsis for overflow */
  max-width: 200px; /* Control column width */
}

.organizations-table tbody tr:last-child td {
  border-bottom: none; /* No border on the last row */
}

.org-name-cell {
  font-weight: 600;
  color: #3f51b5; /* Highlight organization name */
  display: flex;
  align-items: center;
  gap: 8px;
}

.org-icon {
  font-size: 1.1rem;
  color: #007bff;
}

.contact-icon {
  font-size: 0.9rem;
  margin-right: 5px;
  color: #6c757d;
}

.email-link {
  color: #007bff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
}
.email-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

.no-results-message {
  padding: 3rem 0;
  font-style: italic;
  color: #8898aa;
  font-size: 1.1rem;
}

/* --- Role Badge Styling --- */
.role-badge {
  display: inline-block;
  padding: 0.3em 0.8em;
  border-radius: 1rem; /* Rounded pill shape */
  font-weight: 600;
  font-size: 0.85rem;
  color: #fff;
  white-space: nowrap;
  text-transform: capitalize; /* Capitalize the first letter of the role */
}

/* Example role colors (customize based on your roles) */
.role-lider {
  background-color: #007bff;
} /* Blue */
.role-integrante {
  background-color: #6c757d;
} /* Grey */
.role-administrador {
  background-color: #28a745;
} /* Green */
.role-colaborador {
  background-color: #ffc107;
  color: #333;
} /* Yellow (needs dark text) */
/* Add more as needed: .role-some-role { background-color: #your-color; } */

/* --- Action Buttons --- */
.action-buttons-cell {
  text-align: center; /* Center buttons in the cell */
  white-space: nowrap; /* Keep buttons on one line */
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  font-size: 1.15rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  color: #6c757d; /* Default button color */
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(1.1); /* Slight enlarge on hover */
}

.edit-btn:hover {
  color: #007bff; /* Blue on hover */
}

.delete-btn:hover {
  color: #dc3545; /* Red on hover */
}

/* --- Pagination Controls --- */
.pagination-controls-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  padding: 1rem 0;
  border-top: 1px solid #eef2f6; /* Separator from table */
}

.pagination-page-btn,
.pagination-arrow-btn {
  background-color: #e9ecef;
  border: 1px solid #dee2e6;
  color: #495057;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  min-width: 40px; /* Ensure consistent size */
  text-align: center;
}

.pagination-page-btn:hover:not(.active-page):not(:disabled),
.pagination-arrow-btn:hover:not(:disabled) {
  background-color: #dde1e5;
  color: #212529;
}

.active-page {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.25);
  transform: translateY(-1px);
}

.pagination-page-btn:disabled,
.pagination-arrow-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f8f9fa;
  color: #adb5bd;
}

/* --- Responsive Adjustments --- */
@media (max-width: 992px) {
  .content-area-scrollable {
    padding: 2rem;
  }
  .dashboard-title {
    font-size: 2rem;
  }
  .add-organizador-btn {
    padding: 0.6rem 1.2rem;
  }
  .organizations-table {
    min-width: 800px; /* Allow horizontal scroll earlier */
  }
  .organizations-table thead th,
  .organizations-table tbody td {
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
  .org-icon,
  .meta-item-icon {
    font-size: 1rem;
  }
  .action-btn {
    font-size: 1rem;
    padding: 0.4rem 0.5rem;
  }
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch; /* Stretch search and button */
  }
  .search-input-container {
    max-width: 100%; /* Full width on small screens */
  }
  .organizations-table-container {
    padding: 1rem;
  }
  .organizations-table {
    min-width: 700px; /* Further reduce min-width if needed for very small screens */
  }
}

@media (max-width: 576px) {
  .content-area-scrollable {
    padding: 1.5rem;
  }
  .dashboard-title {
    font-size: 1.8rem;
    text-align: center;
  }
  .action-bar {
    gap: 1rem;
  }
  .add-organizador-btn {
    width: 100%; /* Full width button */
    justify-content: center; /* Center icon and text */
  }
  .organizations-table thead th,
  .organizations-table tbody td {
    padding: 0.7rem 0.8rem;
    font-size: 0.85rem;
  }
  .pagination-page-btn,
  .pagination-arrow-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
