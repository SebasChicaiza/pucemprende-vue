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
import EvaluateTemplateModal from '@/components/Admin/Formularios/EvaluateTemplateModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)

const procesoId = ref(null)
const procesoDetails = ref(null)
const eventDetails = ref(null)
const plantillasWithRoles = ref([])

const showErrorModal = ref(false)
const errorMessage = ref('')

const showOkModal = ref(false)
const okModalMessage = ref('')

const universalDeleteModalRef = ref(null)
const modalTitle = ref('')
const modalMessage = ref('')
const modalWarning = ref('')
const modalConfirmText = ref('')

const showConfirmationModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

let onConfirmCallback = () => {}

const showEvaluateTemplateModal = ref(false)
const currentPlantillaToEvaluate = ref(null)
const currentProcesoEventoId = ref(null)

const user = ref(null)
const userEventPermissions = ref([])

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

const handleDynamicConfirm = () => {
  onConfirmCallback()
  showConfirmationModal.value = false
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false
}

const userEventRoleId = computed(() => {
  if (!user.value || !procesoDetails.value || !procesoDetails.value.procesoEventoId) {
    console.log('User or event details not available. User role for event is null.')
    return null
  }
  const eventPermission = userEventPermissions.value.find(
    (perm) => perm.evento_id === procesoDetails.value.procesoEventoId,
  )
  const roleId = eventPermission ? eventPermission.rol_id : null
  console.log(`Current Event ID: ${procesoDetails.value.procesoEventoId}`)
  console.log(`Determined Role for this Event: ${roleId}`)
  return roleId
})

const canViewPlantilla = (plantilla) => {
  if (!plantilla) {
    return false
  }

  console.log('--- Checking User and Plantilla data ---')
  console.log('Current User Object:', user.value)
  console.log(`User's role for this event: ${userEventRoleId.value}`)
  console.log(`Allowed roles for this plantilla: ${plantilla.allowedRoles}`)

  const hasAllowedRole =
    plantilla.allowedRoles &&
    userEventRoleId.value !== null &&
    plantilla.allowedRoles.includes(userEventRoleId.value)

  const result = hasAllowedRole
  console.log(`- Has permission: ${result}`)
  console.log('---------------------------------------')

  return result
}

const hasVisiblePlantillas = computed(() => {
  return plantillasWithRoles.value.some((plantilla) => canViewPlantilla(plantilla))
})

async function fetchEventDetails(eventId) {
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    eventDetails.value = response.data
  } catch (err) {
    console.error('Error al obtener los detalles del evento:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los detalles del evento: ${
      err.response?.data?.message || err.message
    }`
    showErrorModal.value = true
    eventDetails.value = null
  }
}

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
    currentProcesoEventoId.value = procesoDetails.value.procesoEventoId

    if (procesoDetails.value.procesoEventoId) {
      await fetchEventDetails(procesoDetails.value.procesoEventoId)
    }

    const plantillas = procesoDetails.value.plantillas || []
    const plantillasWithRolesData = await Promise.all(
      plantillas.map(async (plantilla) => {
        try {
          const rolesResponse = await axios.get(
            `${import.meta.env.VITE_URL_BACKEND}/api/roles-plantilla/plantilla/${
              plantilla.plantillaId
            }`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            },
          )
          const allowedRoles = rolesResponse.data.map((r) => r.rol_id)
          return { ...plantilla, allowedRoles }
        } catch (err) {
          console.error(`Error fetching roles for plantilla ${plantilla.plantillaId}:`, err)
          return { ...plantilla, allowedRoles: [] }
        }
      }),
    )
    plantillasWithRoles.value = plantillasWithRolesData
  } catch (err) {
    console.error('Error al obtener los detalles del proceso:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los detalles del proceso de evaluación: ${
      err.response?.data?.message || err.message
    }`
    showErrorModal.value = true
    procesoDetails.value = null
  } finally {
    loading.value = false
  }
}

const openEvaluateTemplateModal = (plantilla) => {
  currentPlantillaToEvaluate.value = plantilla
  showEvaluateTemplateModal.value = true
}

const handleEvaluationSubmit = (evaluationData) => {
  console.log('Evaluación enviada:', evaluationData)
  showEvaluateTemplateModal.value = false
  currentPlantillaToEvaluate.value = null
  okModalMessage.value = '¡Evaluación guardada exitosamente!'
  showOkModal.value = true
}

const handleEvaluateModalClose = () => {
  showEvaluateTemplateModal.value = false
  currentPlantillaToEvaluate.value = null
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const loadUserPermissions = () => {
  const userString = localStorage.getItem('user')
  if (userString) {
    try {
      user.value = JSON.parse(userString)
    } catch (e) {
      console.error('Error al analizar el usuario desde localStorage', e)
      user.value = null
    }
  }
  const eventosString = localStorage.getItem('eventos')
  if (eventosString) {
    try {
      userEventPermissions.value = JSON.parse(eventosString)
      console.log('Event permissions loaded from localStorage:', userEventPermissions.value)
    } catch (e) {
      console.error('Error al analizar eventos desde localStorage', e)
      userEventPermissions.value = []
    }
  }
}

onMounted(async () => {
  loadUserPermissions()
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
      procesoDetails.value = null
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
            <div
              class="card card-body p-4 border-0 shadow-sm custom-tab-content mb-4"
              v-if="eventDetails"
            >
              <h5 class="mb-3">Información del Evento Asociado</h5>
              <p class="mb-2"><strong>Nombre del Evento:</strong> {{ eventDetails.nombre }}</p>
              <p class="mb-2"><strong>Descripción:</strong> {{ eventDetails.descripcion }}</p>
              <p class="mb-2">
                <strong>Fecha de Inicio:</strong> {{ formatDate(eventDetails.fecha_inicio) }}
              </p>
              <p class="mb-0">
                <strong>Fecha de Fin:</strong> {{ formatDate(eventDetails.fecha_fin) }}
              </p>
            </div>
            <div v-else class="card card-body p-4 border-0 shadow-sm custom-tab-content mb-4">
              <p class="text-muted text-center py-2">
                No se pudo cargar la información del evento asociado.
              </p>
            </div>
            <div v-if="userEventRoleId === null">
              <div class="card card-body p-4 border-0 shadow-sm custom-tab-content mb-4">
                <p class="text-muted text-center py-2">
                  Tienes que estar inscrito en el evento para ver las plantillas.
                </p>
              </div>
            </div>
            <div v-else>
              <h5 class="mb-3">Plantillas de Evaluación</h5>
              <div v-if="plantillasWithRoles && plantillasWithRoles.length > 0">
                <div class="accordion" id="plantillasAccordion">
                  <template v-for="plantilla in plantillasWithRoles" :key="plantilla.plantillaId">
                    <div v-if="canViewPlantilla(plantilla)" class="accordion-item mb-3">
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
                                  <i class="fas fa-star me-2 text-warning"></i>
                                  <strong>{{ criterio.criterioNombre }}</strong
                                  >:
                                  {{ criterio.criterioDescripcion }}
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
                  </template>
                </div>
                <p v-if="!hasVisiblePlantillas" class="text-muted text-center py-4">
                  No tienes permiso para ver ninguna de las plantillas de este evento.
                </p>
              </div>
              <p v-else class="text-muted text-center py-4">
                Este proceso de evaluación no tiene plantillas asociadas.
              </p>
            </div>
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
    <EvaluateTemplateModal
      :show="showEvaluateTemplateModal"
      :plantilla="currentPlantillaToEvaluate"
      :proceso-evento-id="currentProcesoEventoId"
      :proceso-id="procesoId"
      :user-event-permissions="userEventPermissions"
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
  display: none;
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
