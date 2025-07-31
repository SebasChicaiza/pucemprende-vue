<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import EvaluateTemplateModal from '@/components/Admin/Formularios/EvaluateTemplateModal.vue' // NEW: Import the new modal

const route = useRoute()
const router = useRouter()
const loading = ref(true) // Set to true initially to show loader on mount

const procesoId = ref(null)
const procesoDetails = ref(null)
// Removed eventInfo ref as it's now static text
// const eventInfo = ref(null) // To store event details

const showErrorModal = ref(false)
const errorMessage = ref('')

// --- Existing Modals State ---
const showOkModal = ref(false)
const okModalMessage = ref('')
const universalDeleteModalRef = ref(null)

// --- Dynamic Confirmation Modal State ---
const showConfirmationModal = ref(false) // Controls visibility of the dynamic modal
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

// Stores the callback function to execute when the dynamic confirmation is accepted
let onConfirmCallback = () => {}

// NEW: State for EvaluateTemplateModal
const showEvaluateTemplateModal = ref(false)
const currentPlantillaToEvaluate = ref(null)

// Placeholder functions for other modals
const handleOkModalClose = () => {
  showOkModal.value = false
}
const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
const handleDeleteConfirmed = () => {
  universalDeleteModalRef.value.hide()
  okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'
  showOkModal.value = true
}

// --- Handlers for the dynamic ConfirmationModal's events ---
const handleDynamicConfirm = () => {
  onConfirmCallback() // Execute the stored callback
  showConfirmationModal.value = false // Hide the modal after confirmation
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false // Just hide the modal on cancel
}

// Function to fetch proceso details
async function fetchProcesoDetails() {
  loading.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    loading.value = false
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion/${procesoId.value}/detalle`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    procesoDetails.value = response.data
  } catch (err) {
    console.error('Error fetching proceso details:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los detalles del proceso de evaluación: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
    procesoDetails.value = null // Clear details on error
  } finally {
    loading.value = false
  }
}

// Function to open the evaluation modal
const openEvaluateTemplateModal = (plantilla) => {
  currentPlantillaToEvaluate.value = plantilla
  showEvaluateTemplateModal.value = true
}

// Function to handle evaluation submission (from modal)
const handleEvaluationSubmit = (evaluationData) => {
  console.log('Evaluación enviada:', evaluationData)
  showEvaluateTemplateModal.value = false
  currentPlantillaToEvaluate.value = null
  okModalMessage.value = '¡Evaluación guardada exitosamente!'
  showOkModal.value = true
  // Here you would typically send this data to your backend
}

// Function to close the evaluation modal
const handleEvaluateModalClose = () => {
  showEvaluateTemplateModal.value = false
  currentPlantillaToEvaluate.value = null
}

// Format date function to display DD/MM/YYYY without time
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-indexed
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

onMounted(async () => {
  procesoId.value = route.params.id
  if (procesoId.value) {
    await fetchProcesoDetails()
  } else {
    errorMessage.value = 'ID de proceso de evaluación no proporcionado.'
    showErrorModal.value = true
  }
})

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      procesoId.value = newId
      errorMessage.value = ''
      showErrorModal.value = false
      procesoDetails.value = null // Clear previous details
      await fetchProcesoDetails()
    }
  },
)

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="form-detail-view-wrapper">
    <LoaderComponent v-if="loading" />
    <div class="d-flex" style="height: 100vh; overflow: hidden">
      <Sidebar />
      <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
        <PageHeaderRoute
          :dynamicTitle="
            procesoDetails ? `Formularios - ${procesoDetails.procesoTitulo}` : 'Cargando...'
          "
        />
        <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
          <div class="container-fluid" v-if="procesoDetails">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-secondary me-3 animated-btn" @click="goBack">
                  <i class="fas fa-arrow-left me-2"></i>Volver
                </button>
                <h3 class="mb-0">
                  Detalle de Proceso de Evaluación: {{ procesoDetails.procesoTitulo }}
                </h3>
              </div>
            </div>

            <!-- Event Information Card -->
            <div class="card card-body p-4 border-0 shadow-sm custom-tab-content mb-4">
              <h5 class="mb-3">
                <i class="fas fa-calendar-check text-success me-2"></i>Información del Evento
                Asociado
              </h5>
              <p class="mb-2">
                <strong>Nombre del Evento:</strong> Conferencia de Innovación Tecnológica
              </p>
              <p class="mb-2">
                <strong>Descripción:</strong> Un evento para explorar las últimas tendencias y
                avances en el mundo de la tecnología y la innovación.
              </p>
              <p class="mb-2"><strong>Fecha de Inicio:</strong> 15/10/2025</p>
              <p class="mb-0"><strong>Fecha de Fin:</strong> 17/10/2025</p>
            </div>
            <!-- END Event Information Card -->

            <h5 class="mb-3">Plantillas de Evaluación</h5>
            <div v-if="procesoDetails.plantillas && procesoDetails.plantillas.length > 0">
              <div class="accordion" id="plantillasAccordion">
                <div
                  v-for="plantilla in procesoDetails.plantillas"
                  :key="plantilla.plantillaId"
                  class="accordion-item mb-3"
                >
                  <h2 class="accordion-header" :id="`plantillaHeading${plantilla.plantillaId}`">
                    <button
                      class="accordion-button nested-accordion-button"
                      type="button"
                      aria-expanded="true"
                      :aria-controls="`plantillaCollapse${plantilla.plantillaId}`"
                    >
                      <i class="fas fa-clipboard-list text-info me-2 nested-accordion-icon"></i>
                      {{ plantilla.plantillaNombre }}
                    </button>
                  </h2>
                  <div
                    :id="`plantillaCollapse${plantilla.plantillaId}`"
                    class="accordion-collapse collapse show"
                    :aria-labelledby="`plantillaHeading${plantilla.plantillaId}`"
                  >
                    <div class="accordion-body nested-accordion-body">
                      <h6 class="mt-3 mb-2 cronograma-activities-title">
                        <i class="fas fa-check-square text-success me-2"></i>Criterios de
                        Evaluación:
                      </h6>
                      <div v-if="plantilla.criterios && plantilla.criterios.length > 0">
                        <ul class="list-group list-group-flush">
                          <li
                            v-for="criterio in plantilla.criterios"
                            :key="criterio.criterioId"
                            class="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <i class="fas fa-star me-2 text-warning"></i
                              ><strong>{{ criterio.criterioNombre }}</strong
                              >: {{ criterio.criterioDescripcion }}
                            </div>
                            <span class="badge bg-primary rounded-pill"
                              >{{ criterio.criterioPeso }}%</span
                            >
                          </li>
                        </ul>
                      </div>
                      <p v-else class="text-muted text-center py-2">
                        No hay criterios definidos para esta plantilla.
                      </p>

                      <div class="d-flex justify-content-end mt-4">
                        <button
                          class="btn btn-primary animated-btn"
                          @click="openEvaluateTemplateModal(plantilla)"
                        >
                          <i class="fas fa-edit me-2"></i>Evaluar plantilla
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-muted text-center py-4">
              Este proceso de evaluación no tiene plantillas asociadas.
            </p>
          </div>
          <div v-else-if="!loading" class="container text-center text-muted mt-5">
            No se pudieron cargar los detalles del proceso de evaluación o el proceso no existe.
          </div>
        </div>
      </div>
    </div>

    <OkModal
      :show="showOkModal"
      :message="okModalMessage"
      :duration="1000"
      @close="handleOkModalClose"
    />

    <ConfirmationModal
      :show="showConfirmationModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :confirmText="confirmModalConfirmText"
      :cancelText="confirmModalCancelText"
      @confirm="handleDynamicConfirm"
      @cancel="handleDynamicCancel"
    />

    <DeleteModal
      ref="universalDeleteModalRef"
      :title="modalTitle"
      :message="modalMessage"
      :warning="modalWarning"
      :confirmButtonText="modalConfirmText"
      @confirmed="handleDeleteConfirmed"
    />

    <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />

    <!-- NEW: Evaluate Template Modal -->
    <EvaluateTemplateModal
      :show="showEvaluateTemplateModal"
      :plantilla="currentPlantillaToEvaluate"
      @close="handleEvaluateModalClose"
      @submit-evaluation="handleEvaluationSubmit"
    />
  </div>
</template>

<style scoped>
.form-detail-view-wrapper {
  height: 100vh;
  overflow: hidden;
}

/* Base styles for all animated buttons */
.animated-btn {
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background-color: #174384;
  border-color: #174384;
}

.btn-primary:hover {
  background-color: #14386b;
  border-color: #14386b;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-success {
  background-color: #28a745;
  border-color: #28a745;
}

.btn-success:hover {
  background-color: #218838;
  border-color: #1e7e34;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.card {
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.25rem;
}

.custom-tab-content {
  border: none !important;
  box-shadow: none !important;
}

/* Custom styles for the accordion */
.accordion-button {
  background-color: #174384;
  color: #ffffff;
  font-weight: 600;
  border-bottom: 1px solid #14386b;
  transition:
    all 0.2s ease,
    color 0.2s ease;
  padding: 1rem 1.25rem;
}

.accordion-button:not(.collapsed) {
  background-color: #e0e7ff;
  color: #174384;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.125);
}

.accordion-button:focus {
  box-shadow: 0 0 0 0.25rem rgba(23, 67, 132, 0.25);
}

.accordion-button::after {
  display: none; /* Ensure no default caret is shown */
}

.accordion-body {
  padding: 1.5rem;
  background-color: #fdfdff;
  border-top: 1px dashed #e0e0e0;
}

.accordion-item {
  margin-bottom: 10px;
  border: 1px solid #dcdcdc;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.accordion-item:first-of-type {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.accordion-item:last-of-type {
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.cronograma-activities-title {
  color: #174384;
  font-weight: 700;
  border-bottom: 2px solid #e0e7ff;
  padding-bottom: 5px;
  margin-bottom: 10px;
}

.list-group-item {
  border-color: #f0f0f0;
  padding-left: 0.5rem;
  font-size: 0.95rem;
  color: #495057;
}

.activity-icon {
  color: #28a745;
}

/* Specific styles for nested accordion buttons */
.nested-accordion-button {
  background-color: #f0f5ff;
  color: #3730a3;
  font-weight: 500;
}

.nested-accordion-button .nested-accordion-icon {
  color: #3730a3;
  transition: transform 0.2s ease-in-out;
}

.nested-accordion-body {
  background-color: #ffffff;
}
</style>
