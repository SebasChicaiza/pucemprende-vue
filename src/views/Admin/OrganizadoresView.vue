<template>
  <LoaderComponent v-if="loading" />
  <div v-else class="d-flex admin-panel-layout">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column main-content-wrapper">
      <PageHeaderRoute />

      <div v-if="isSuperAdmin" class="content-area-scrollable">
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
            <button class="btn btn-primary send-email-btn" @click="showCorreoModal = true">
              <i class="bi bi-envelope-fill"></i>
              Enviar Correo Masivo
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
                <tr v-for="org in paginatedOrganizadores" :key="org.id">
                  <td class="org-name-cell" data-label="Organización">
                    <i class="bi bi-building org-icon"></i>
                    {{ org.org_nom }}
                  </td>
                  <td data-label="Abreviatura">{{ org.org_abreviatura }}</td>
                  <td data-label="Encargado">{{ org.encar_nombre }} {{ org.encar_apellido }}</td>
                  <td data-label="Identificación">{{ org.encar_identificacion }}</td>
                  <td data-label="Rol Interno">
                    <span
                      :class="[
                        'role-badge',
                        `role-${org.encar_rol?.toLowerCase().replace(/\s/g, '-')}`,
                      ]"
                    >
                      {{ org.encar_rol }}
                    </span>
                  </td>
                  <td data-label="Contacto">
                    <i class="bi bi-telephone-fill contact-icon"></i> {{ org.org_telf }}
                  </td>
                  <td data-label="Correo Electrónico">
                    <a :href="`mailto:${org.org_email}`" class="email-link">
                      <i class="bi bi-envelope-fill contact-icon"></i> {{ org.org_email }}
                    </a>
                  </td>
                  <td class="action-buttons-cell" data-label="Acciones">
                    <button
                      class="action-btn edit-btn"
                      @click="editarOrganizador(org)"
                      title="Editar Organizador"
                    >
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button
                      class="action-btn delete-btn"
                      @click="confirmDeleteOrganizador(org)"
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
      <!-- Mass Email Modal -->
      <div v-if="showCorreoModal" class="modal-backdrop-custom">
        <div class="modal-content-custom">
          <div class="modal-header-custom">
            <h5>Enviar correo masivo</h5>
            <button class="close-btn-custom" @click="cerrarModalCorreo">&times;</button>
          </div>
          <div class="modal-body-custom">
            <label class="form-label">Asunto</label>
            <input
              v-model="correoAsunto"
              type="text"
              class="form-control mb-3"
              placeholder="Asunto del correo"
            />

            <label class="form-label">Contenido</label>
            <textarea
              v-model="correoContenido"
              class="form-control"
              rows="6"
              placeholder="Mensaje del correo"
            ></textarea>

            <p v-if="correoSuccess" class="text-success mt-3">{{ correoSuccess }}</p>
            <p v-if="correoError" class="text-danger mt-3">{{ correoError }}</p>
          </div>
          <div class="modal-footer-custom">
            <button class="btn btn-outline-secondary" @click="cerrarModalCorreo">Cancelar</button>
            <button class="btn btn-primary" @click="enviarCorreo" :disabled="correoLoading">
              <span v-if="correoLoading" class="spinner-border spinner-border-sm me-2"></span>
              Enviar
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Confirmation Dialog for deletion -->
      <ConfirmationDialog
        :visible="showConfirmDialog"
        :message="confirmDialogMessage"
        @confirm="executeDeleteOrganizador"
        @cancel="cancelDeleteOrganizador"
      />
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import FormOrganizadores from '@/components/Admin/FormOrganizadores.vue'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue' // Import the new confirmation dialog
import { isSuperAdmin } from '@/stores/user'

const abrir = ref(false)
const organizadores = ref([])
const error = ref('')
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 15
const organizadorEdit = ref(null)

// State for Mass Email Modal
const showCorreoModal = ref(false)
const correoAsunto = ref('')
const correoContenido = ref('')
const correoLoading = ref(false)
const correoSuccess = ref('')
const correoError = ref('')

// State for Confirmation Dialog
const showConfirmDialog = ref(false)
const confirmDialogMessage = ref('')
const organizadorIdToDelete = ref(null) // To store the ID of the organizer to be deleted

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

// Function to open the custom confirmation dialog
function confirmDeleteOrganizador(org) {
  organizadorIdToDelete.value = org.id
  confirmDialogMessage.value = `¿Estás seguro de que quieres eliminar al organizador "${org.org_nom}"? Esta acción no se puede deshacer.`
  showConfirmDialog.value = true
}

// Function to execute deletion after confirmation
async function executeDeleteOrganizador() {
  showConfirmDialog.value = false // Close the dialog
  const token = localStorage.getItem('token')
  if (!token) {
    alert('No se encontró token de autenticación. Por favor, inicia sesión.')
    return
  }

  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/organizaciones/${organizadorIdToDelete.value}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    alert('Organizador eliminado correctamente.') // Consider a custom modal for this too
    fetchOrganizadores() // Re-fetch the list
  } catch (err) {
    console.error('Error al eliminar el organizador:', err)
    alert(
      err.response?.data?.message ||
        'Ocurrió un error al eliminar el organizador. Intenta de nuevo.',
    )
  } finally {
    organizadorIdToDelete.value = null // Clear the stored ID
  }
}

// Function to cancel deletion
function cancelDeleteOrganizador() {
  showConfirmDialog.value = false
  organizadorIdToDelete.value = null
}

function abrirModalAgregar() {
  abrir.value = true
}

onMounted(fetchOrganizadores)

function cerrarModalCorreo() {
  showCorreoModal.value = false
  correoAsunto.value = ''
  correoContenido.value = ''
  correoSuccess.value = ''
  correoError.value = ''
  correoLoading.value = false
}

async function enviarCorreo() {
  correoLoading.value = true
  correoError.value = ''
  correoSuccess.value = ''
  const token = localStorage.getItem('token')

  try {
    await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/organizaciones/enviar-correo`,
      {
        asunto: correoAsunto.value,
        contenido: correoContenido.value,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    correoSuccess.value = 'Correos enviados exitosamente.'
  } catch (err) {
    correoError.value = err.response?.data?.message || 'Hubo un error al enviar los correos.'
  } finally {
    correoLoading.value = false
  }
}
</script>

<style scoped>
/* --- General Layout & Page Structure --- */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content-custom {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header-custom,
.modal-footer-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e0e6ec;
  padding-bottom: 1rem;
}

.modal-footer-custom {
  justify-content: flex-end;
  border-top: 1px solid #e0e6ec;
  padding-top: 1rem;
  margin-top: 1rem;
  border-bottom: none; /* remove redundant border */
}

.close-btn-custom {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  transition: color 0.2s ease;
}
.close-btn-custom:hover {
  color: #343a40;
}

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
  overflow-y: auto; /* Enable scrolling for the main content area */
}

.content-area-scrollable {
  padding: 2.5rem 3rem; /* Generous internal padding */
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

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.add-organizador-btn {
  background-color: #28a745; /* Vibrant green for 'add' action */
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(40, 167, 69, 0.2);
}

.add-organizador-btn:hover {
  background-color: #218838;
  box-shadow: 0 6px 15px rgba(40, 167, 69, 0.3);
  transform: translateY(-2px);
}

.send-email-btn {
  background-color: #007bff; /* Blue for 'send email' action */
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);
  word-break: break-word;
}
.send-email-btn td {
  word-break: break-word;
}

.send-email-btn:hover {
  background-color: #0056b3;
  box-shadow: 0 6px 15px rgba(0, 123, 255, 0.3);
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
  width: 100%;
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
  font-size: 0.9rem; /* Slightly larger font for readability */
  min-width: 800px; /* Adjusted min-width to be less aggressive */
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
  transition:
    background-color 0.2s ease-in-out,
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
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
  overflow: hidden; /* Still hide overflow if text is too long after wrapping */
  max-width: 150px; /* Control column width for content */
  vertical-align: top; /* Align text to the top when wrapping */
}

/* Specific column width adjustments for better fit and wrapping */
.organizations-table .col-org {
  max-width: 200px; /* Increased max-width for organization name */
  white-space: normal; /* Allow wrapping */
  word-break: break-word; /* Break long words */
}
.organizations-table .col-abbr {
  max-width: 100px;
}
.organizations-table .col-encargado {
  max-width: 180px; /* Increased max-width for encargado name */
  white-space: normal; /* Allow wrapping */
  word-break: break-word; /* Break long words */
}
.organizations-table .col-id {
  max-width: 120px;
}
.organizations-table .col-rol {
  max-width: 120px;
}
.organizations-table .col-contact {
  max-width: 120px;
}
.organizations-table .col-email {
  max-width: 220px; /* Increased max-width for email */
  white-space: normal; /* Allow wrapping */
  word-break: break-all; /* Break long email addresses */
}
.organizations-table .col-actions {
  width: 100px;
  min-width: 100px;
} /* Fixed width for actions */

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
  word-break: break-word;
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
  color: #174384; /* Default to white text for badges */
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
  color: #333; /* Needs dark text for contrast */
} /* Yellow */
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
@media (max-width: 1200px) {
  .organizations-table {
    min-width: 700px; /* Reduced min-width further for slightly smaller desktops/large tablets */
  }
  .organizations-table tbody td {
    max-width: 120px; /* Further restrict max-width of cells */
  }
  .organizations-table .col-email {
    max-width: 180px;
  }
  .organizations-table .col-org {
    max-width: 150px;
  }
  .organizations-table .col-encargado {
    max-width: 150px;
  } /* Ensure this also adjusts */
}

@media (max-width: 992px) {
  .content-area-scrollable {
    padding: 2rem;
  }
  .dashboard-title {
    font-size: 2rem;
  }
  .add-organizador-btn,
  .send-email-btn {
    padding: 0.6rem 1.2rem;
  }
  .organizations-table {
    min-width: 600px; /* Allow horizontal scroll earlier, but try to fit more */
  }
  .organizations-table thead th,
  .organizations-table tbody td {
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
  .org-icon,
  .contact-icon {
    font-size: 1rem;
  }
  .action-btn {
    font-size: 1rem;
    padding: 0.4rem 0.5rem;
  }
  .organizations-table .col-id,
  .organizations-table .col-rol {
    display: none; /* Hide less critical columns on medium screens */
  }
  /* Ensure wrapping on smaller screens for visible columns */
  .organizations-table .col-org,
  .organizations-table .col-encargado,
  .organizations-table .col-email {
    white-space: normal;
    word-break: break-word;
  }
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input-container {
    max-width: 100%;
  }
  .organizations-table-container {
    padding: 1rem;
  }
  .organizations-table {
    min-width: unset; /* Remove min-width entirely for small screens */
    display: block; /* Allows table to behave like a block element */
    width: 100%;
  }
  .organizations-table thead {
    display: none; /* Hide table header on very small screens */
  }
  .organizations-table tbody,
  .organizations-table tr,
  .organizations-table td {
    display: block; /* Make table rows and cells behave like blocks */
    width: 100%;
  }
  .organizations-table tr {
    margin-bottom: 1rem;
    border: 1px solid #e0e6ec;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  .organizations-table tbody td {
    text-align: right;
    padding-left: 50%; /* Space for pseudo-element label */
    position: relative;
    border-bottom: 1px dashed #eceff1;
    white-space: normal; /* Allow text to wrap */
    max-width: unset; /* Remove max-width */
    word-break: break-word; /* Ensure words break */
  }
  .organizations-table tbody td:last-child {
    border-bottom: none;
  }
  .organizations-table tbody td::before {
    content: attr(data-label); /* Use data-label for column names */
    position: absolute;
    left: 1rem;
    width: calc(50% - 1rem);
    padding-right: 10px;
    white-space: nowrap;
    text-align: left;
    font-weight: 600;
    color: #5d6d7e;
  }

  /* Assign data-label to each td */
  .organizations-table tbody td:nth-of-type(1)::before {
    content: 'Organización:';
  }
  .organizations-table tbody td:nth-of-type(2)::before {
    content: 'Abreviatura:';
  }
  .organizations-table tbody td:nth-of-type(3)::before {
    content: 'Encargado:';
  }
  .organizations-table tbody td:nth-of-type(4)::before {
    content: 'Identificación:';
  }
  .organizations-table tbody td:nth-of-type(5)::before {
    content: 'Rol Interno:';
  }
  .organizations-table tbody td:nth-of-type(6)::before {
    content: 'Contacto:';
  }
  .organizations-table tbody td:nth-of-type(7)::before {
    content: 'Correo Electrónico:';
  }
  .organizations-table tbody td:nth-of-type(8)::before {
    content: 'Acciones:';
  }

  /* Hide columns that are now labels */
  .organizations-table .col-id,
  .organizations-table .col-rol {
    display: block; /* Show them as part of the card */
  }

  .action-buttons-cell {
    text-align: center;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  .add-organizador-btn,
  .send-email-btn {
    width: 100%;
    justify-content: center;
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
  .organizations-table tbody td {
    font-size: 0.85rem;
  }
  .pagination-page-btn,
  .pagination-arrow-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
