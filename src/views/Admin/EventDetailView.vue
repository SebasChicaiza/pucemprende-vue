<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DefaultImage from '@/assets/banners/EventoConstruccion.png'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ModalCrearEvento from '@/components/Admin/Eventos/ModalCrearEvento.vue'
import ImageManagementModal from '@/components/Admin/ImageManagementModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import { useProyectosEventosStore } from '@/stores/proyectos_eventos'
import { usePlantillasEvaluacionStore } from '@/stores/plantillas_evaluacion' // Import the new store
import { useEventosInscritosStore } from '@/stores/useEventosInscritosStore'
import ConfirmationDialog from '@/components/Admin/Proyectos/ConfirmationDialog.vue'
import ManageCertificate from '@/components/Admin/Eventos/ManageCertificate.vue'
import ViewMyCertificates from '@/components/Admin/Eventos/ViewMyCertificates.vue'

const route = useRoute()
const router = useRouter()
const eventId = ref(null)
const eventDetails = ref(null)
const eventImages = ref([])
// Agrega estas variables:
const eventProjects = ref([])
const loadingProjects = ref(false)

const loading = ref(true)
const loadingImages = ref(false)
const isLoadingImagesInModal = ref(false)

const mainImage = ref('')
const DEFAULT_IMAGE_URL = DefaultImage
const showConfirmDialog = ref(false)

const universalDeleteModalRef = ref(null)
const modalTitle = ref('')
const modalMessage = ref('')
const modalWarning = ref('')
const modalConfirmText = ref('')
const currentDeleteAction = ref(null)

const showManageCertificateModal = ref(false)
const showViewMyCertificatesModal = ref(false)
const showOkModal = ref(false)
const okModalMessage = ref('')

const showErrorModal = ref(false)
const errorMessage = ref('')

const showCreateEditModal = ref(false)
const currentEventToEdit = ref(null)

const showImageManagementModal = ref(false)
const imageToDelete = ref(null)
const imageManagementModalRef = ref(null)

const showReactivateConfirmModal = ref(false)

// Initialize the Pinia stores
const proyectosEventosStore = useProyectosEventosStore()
const plantillasEvaluacionStore = usePlantillasEvaluacionStore() // Initialize the new store

// Use computed properties from the stores
const eventProjectsComputed = computed(() => proyectosEventosStore.getProjectsForEvent(eventId.value))
const loadingProjectsComputed = computed(() => proyectosEventosStore.isLoadingProjects)
const eventForms = computed(() => plantillasEvaluacionStore.getPlantillasForEvent(eventId.value)) // Computed for forms
const loadingForms = computed(() => plantillasEvaluacionStore.isLoadingPlantillas) // Computed for forms loading

const imagesToDisplay = computed(() => {
  if (eventImages.value && eventImages.value.length > 0) {
    return eventImages.value
  }
  return [
    { id: 'default', url: DEFAULT_IMAGE_URL, tipo: 'Default Image', name: 'Imagen por Defecto' },
  ]
})

const canEditEvent = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userRolId = user.rol_id

  if (userRolId === 8) {
    return true
  }

  if (userRolId === 1 && eventDetails.value) {
    const eventos = JSON.parse(localStorage.getItem('eventos') || '[]')
    // Ensure eventDetails.value.id is used for matching against evento_id
    const hasEventPermission = eventos.some(
      (e) => e.evento_id === eventDetails.value.id && e.rol_id === 1,
    )
    return hasEventPermission
  }

  return false
})

const selectImage = (image) => {
  mainImage.value = image.url
}

async function fetchEventDetails() {
  loading.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    eventDetails.value = response.data
  } catch (err) {
    console.error('Error fetching event details:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los detalles del evento: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
    throw err
  } finally {
    loading.value = false
  }
}

async function fetchEventImages() {
  loadingImages.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    loadingImages.value = false
    mainImage.value = DEFAULT_IMAGE_URL
    return
  }

  try {
    const eventArchivosResponse = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento/evento/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const fetchedImages = eventArchivosResponse.data
    eventImages.value = fetchedImages

    if (eventImages.value.length > 0) {
      if (!mainImage.value || !fetchedImages.some((img) => img.url === mainImage.value)) {
        mainImage.value = eventImages.value[0].url
      }
    } else {
      mainImage.value = DEFAULT_IMAGE_URL
    }
  } catch (err) {
    console.error('Error fetching event images, no image found:', err.response?.data || err.message)
    mainImage.value = DEFAULT_IMAGE_URL
    eventImages.value = []
  } finally {
    loadingImages.value = false
  }
}

const handleDeleteConfirmed = async () => {
  if (currentDeleteAction.value === 'deleteEvent') {
    await deleteEvent()
  } else if (currentDeleteAction.value === 'deleteImage') {
    await confirmDeleteImage()
  }
  currentDeleteAction.value = null
}

const showDeleteConfirmation = () => {
  modalTitle.value = 'Confirmar Eliminación de Evento'
  modalMessage.value = '¿Estás seguro de que quieres deshabilitar este evento?'
  modalWarning.value =
    'Esta accion deshabilitara el evento, todos los usuarios no podrar ver el evento'
  modalConfirmText.value = 'Sí, Deshabilitar Evento'
  currentDeleteAction.value = 'deleteEvent'
  universalDeleteModalRef.value.show()
}

const deleteEvent = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return
  }

  loading.value = true
  try {
    await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId.value}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    okModalMessage.value = '¡El evento ha deshabilitado exitosamente!'
    showOkModal.value = true

    setTimeout(() => {
      router.push('/admin/eventos/')
    }, 1000)
  } catch (err) {
    console.error('Error deleting event:', err.response?.data || err.message)
    errorMessage.value = `Error al eliminar el evento: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
  } finally {
    if (universalDeleteModalRef.value) {
      universalDeleteModalRef.value.hide()
    }
    loading.value = false
  }
}

const handleOkModalClose = () => {
  showOkModal.value = false
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

async function fetchEventDetailsForEdit(idToEdit) {
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return null
  }

  loading.value = true
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${idToEdit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    console.log('Detailed Event Data for Edit:', response.data)
    currentEventToEdit.value = response.data
    showCreateEditModal.value = true
    return response.data
  } catch (err) {
    console.error('Error fetching detailed event for edit:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar detalles del evento para edición: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
    return null
  } finally {
    loading.value = false
  }
}

const handleEditButtonClick = () => {
  if (eventId.value) {
    fetchEventDetailsForEdit(eventId.value)
  } else {
    console.error('Cannot edit: Event ID is not available.')
    errorMessage.value = 'No se puede editar: El ID del evento no está disponible.'
    showErrorModal.value = true
  }
}

const handleModalClose = () => {
  showCreateEditModal.value = false
  currentEventToEdit.value = null
}

const handleModalSubmit = async (emittedEventData) => {
  showCreateEditModal.value = false
  currentEventToEdit.value = null

  if (eventId.value) {
    await fetchEventDetails()
    await fetchEventImages()
    await proyectosEventosStore.fetchProjectsAndTeams(eventId.value) // Re-fetch projects and teams after event edit
    await plantillasEvaluacionStore.fetchPlantillasForEvent(eventId.value) // Re-fetch forms after event edit
  }
}

async function uploadFileToBackend(file, eventoId) {
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado. Por favor, inicie sesión.'
    showErrorModal.value = true
    return null
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', file.name.split('.')[0])
  formData.append('evento_id', eventoId)

  console.log('Uploading file to backend:', formData)

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    console.log('File uploaded to Archivos:', response.data)
    return {
      id: response.data.file.id,
      url: response.data.file.url,
      tipo: response.data.file.tipo,
      name: file.name,
    }
  } catch (error) {
    console.error('Error uploading file to Archivos:', error.response?.data || error.message)
    errorMessage.value = `Error al subir la imagen: ${error.response?.data?.message || error.message}`
    showErrorModal.value = true
    return null
  }
}

const openImageManagementModal = () => {
  showImageManagementModal.value = true
}

const closeImageManagementModal = () => {
  showImageManagementModal.value = false
}

const triggerDeleteImage = (image) => {
  imageToDelete.value = image
  modalTitle.value = 'Confirmar Eliminación de Imagen'
  modalMessage.value = '¿Estás seguro de que quieres eliminar esta imagen?'
  modalWarning.value =
    'Esta acción es irreversible y eliminará permanentemente la imagen del evento.'
  modalConfirmText.value = 'Sí, Eliminar Imagen'
  currentDeleteAction.value = 'deleteImage'
  universalDeleteModalRef.value.show()
}

const confirmDeleteImage = async () => {
  if (!imageToDelete.value) return

  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado para eliminar imagen.'
    showErrorModal.value = true
    return
  }

  isLoadingImagesInModal.value = true
  try {
    await axios.delete(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento/${imageToDelete.value.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    okModalMessage.value = '¡Imagen eliminada exitosamente!'
    showOkModal.value = true

    await fetchEventImages()

    if (mainImage.value === imageToDelete.value.url) {
      mainImage.value = eventImages.value.length > 0 ? eventImages.value[0].url : DEFAULT_IMAGE_URL
    }
  } catch (err) {
    console.error('Error deleting image:', err.response?.data || err.message)
    errorMessage.value = `Error al eliminar la imagen: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
  } finally {
    if (universalDeleteModalRef.value) {
      universalDeleteModalRef.value.hide()
    }
    imageToDelete.value = null
    isLoadingImagesInModal.value = false
  }
}

const triggerReactivateEvent = () => {
  showReactivateConfirmModal.value = true
}

const handleReactivateConfirm = async () => {
  showReactivateConfirmModal.value = false
  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return
  }

  loading.value = true
  try {
    await axios.put(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos/${eventId.value}`,
      { estado_borrado: false },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    okModalMessage.value = '¡El evento ha sido reactivado exitosamente!'
    showOkModal.value = true
    await fetchEventDetails()
  } catch (err) {
    console.error('Error reactivating event:', err.response?.data || err.message)
    errorMessage.value = `Error al reactivar el evento: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
  } finally {
    loading.value = false
  }
}

const handleReactivateCancel = () => {
  showReactivateConfirmModal.value = false
}

const uploadNewImages = async (newFiles) => {
  if (!newFiles || newFiles.length === 0) {
    console.warn('No files selected for upload.')
    return
  }

  const token = localStorage.getItem('token')
  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado para subir imágenes.'
    showErrorModal.value = true
    return
  }

  isLoadingImagesInModal.value = true
  const uploadPromises = []

  for (const file of newFiles) {
    uploadPromises.push(
      (async () => {
        const uploadedArchivo = await uploadFileToBackend(file, eventId.value)
        if (uploadedArchivo) {
          try {
            const linkResponse = await axios.post(
              `${import.meta.env.VITE_URL_BACKEND}/api/archivos-evento`,
              {
                archivo_id: uploadedArchivo.id,
                evento_id: eventId.value,
                url: uploadedArchivo.url,
                tipo: uploadedArchivo.tipo,
                name: uploadedArchivo.name,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              },
            )
            console.log(
              `Image ${uploadedArchivo.id} linked to event ${eventId.value}:`,
              linkResponse.data,
            )
            return linkResponse.data
          } catch (linkError) {
            console.error(
              `Error linking image ${uploadedArchivo.id} to event:`,
              linkError.response?.data || linkError.message,
            )
            errorMessage.value = `Error al vincular la imagen ${file.name}: ${linkError.response?.data?.message || linkError.message}`
            showErrorModal.value = true
            return null
          }
        }
        return null
      })(),
    )
  }

  const results = await Promise.all(uploadPromises)
  const successfulUploads = results.filter((result) => result !== null)

  if (successfulUploads.length > 0) {
    okModalMessage.value = `¡${successfulUploads.length} imágenes subidas y asociadas al evento exitosamente!`
    showOkModal.value = true
    await fetchEventImages()
    if (imageManagementModalRef.value) {
      imageManagementModalRef.value.clearUploadState()
    }
  }

  isLoadingImagesInModal.value = false
}

const handleCertificateEditButtonClick = async () => {
  console.log('Navigating to certificate management for event ID:', eventId.value)
  showManageCertificateModal.value = true
}

const closeManageCertificateModal = () => {
  showManageCertificateModal.value = false
}

const handleCertificateSave = () => {
  showOkModal.value = true
  okModalMessage.value = 'Certificado guardado exitosamente.'
}

const closeViewMyCertificatesModal = () => {
  showViewMyCertificatesModal.value = false
}

const handleCertificateButtonClick = async () => {
  console.log('Navigating to certificate generation for event ID:', eventId.value)
  showViewMyCertificatesModal.value = true
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Hora inválida'
  const options = { hour: '2-digit', minute: '2-digit', hour12: true }
  return date.toLocaleTimeString('es-ES', options)
}

const formatShortDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Fecha inválida'
  const options = { month: 'short', day: 'numeric' }
  return date.toLocaleDateString('es-ES', options)
}

// NEW: Function to redirect to crearProyecto
const redirectToCreateProject = () => {
  if (eventId.value) {
    router.push(`/admin/crearProyecto/${eventId.value}`)
  } else {
    errorMessage.value = 'No se puede crear un proyecto: El ID del evento no está disponible.'
    showErrorModal.value = true
  }
}

// Reemplaza la llamada actual a fetchProjectsAndTeams con esta función:
async function fetchEventTeams() {
  if (!eventId.value) return

  loadingProjects.value = true
  const token = localStorage.getItem('token')

  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado.'
    showErrorModal.value = true
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/equipos/evento/${eventId.value}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    // Actualiza la variable reactiva de equipos
    eventProjects.value = response.data || []
  } catch (err) {
    console.error('Error fetching event teams:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los equipos: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
    eventProjects.value = []
  } finally {
    loadingProjects.value = false
  }
}

onMounted(async () => {
  try {
    eventId.value = route.params.id
    if (eventId.value) {
      await fetchEventDetails()
      await fetchEventImages()
      await fetchEventTeams()
      await plantillasEvaluacionStore.fetchPlantillasForEvent(eventId.value)
    } else {
      errorMessage.value = 'ID de evento no proporcionado.'
      showErrorModal.value = true
      mainImage.value = DEFAULT_IMAGE_URL
    }
  } catch (e) {
    console.error('Error during initial event details load:', e)
    errorMessage.value = `Error durante la carga inicial de detalles del evento: ${e.message}`
    showErrorModal.value = true
    mainImage.value = DEFAULT_IMAGE_URL
  }
})

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      loading.value = true
      try {
        eventId.value = newId
        errorMessage.value = ''
        showErrorModal.value = false
        eventDetails.value = null
        eventImages.value = []
        mainImage.value = DEFAULT_IMAGE_URL
        loadingImages.value = true
        proyectosEventosStore.clearProjects() // Clear projects cache when event ID changes
        await fetchEventTeams()
        plantillasEvaluacionStore.clearPlantillas() // Clear forms cache when event ID changes
        await plantillasEvaluacionStore.fetchPlantillasForEvent(newId)

        await fetchEventDetails()
        await fetchEventImages()
      } catch (e) {
        console.error('Error during route param change load:', e)
        errorMessage.value = `Error durante el cambio de ruta y carga de datos: ${e.message}`
        showErrorModal.value = true
      } finally {
        loading.value = false
      }
    }
  },
)

const goBack = () => {
  router.back()
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  return date.toLocaleDateString('es-ES', options)
}

const puedeInscribirse = computed(() => {
  return (
    eventDetails.value.inscripcionesAbiertas &&
    !useEventosInscritosStore().estaInscrito(eventDetails.value.id) &&
    !eventDetails.value.estado_borrado
  )
})

function handleInscribirse() {
  if (eventDetails.value.hayEquipos > 0) {
    router.push({ name: 'CrearEquipo', params: { eventoId: eventDetails.value.id } })
  } else {
    showConfirmDialog.value = true
  }
}

const toastMessage = ref('')
const showToast = ref(false)
const toastType = ref('')

const inscribirEnEvento = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    toast('Token no encontrado', 'error')
    return
  }
  loading.value = true

  try {
    await fetch(`${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/inscribirse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ evento_id: eventDetails.value.id }),
    })
    console.log('Inscripción exitosa al evento', eventDetails.value.event)
    if (eventDetails.value.hayEquipos > 0) {
      router.push({ name: 'crearProyecto', params: { eventoId: eventDetails.value.id } })
    } else {
      showConfirmDialog.value = true
    }
  } catch (error) {
    toast('Error al inscribirse al evento', 'error')
    console.error(error)
  } finally {
    showConfirmDialog.value = false
    toast('Inscripción exitosa al evento sin proyecto.', 'success')
    loading.value = false
    await useEventosInscritosStore().fetchEventosInscritos()
  }
}

const toast = (msg, type) => {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => (showToast.value = false), 3000)
}

const confirmarSinProyecto = () => {
  inscribirEnEvento()
}
function closeDialog() {
  showConfirmDialog.value = false
}
</script>

<template>
  <div class="event-detail-view-wrapper">
    <LoaderComponent v-if="loading" />
    <div class="d-flex" style="height: 100vh; overflow: hidden">
      <Sidebar />

      <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
        <PageHeaderRoute
          :currentRouteName="route.name"
          :dynamicTitle="eventDetails ? eventDetails.nombre : 'Cargando...'"
        />

        <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
          <div class="container-fluid" v-if="eventDetails">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <div class="d-flex align-items-center">
                <button class="btn btn-secondary me-3 animated-btn" @click="goBack">
                  <i class="fas fa-arrow-left me-2"></i>Volver
                </button>
                <h3 class="mb-0">{{ eventDetails.nombre }}</h3>
              </div>
              <div class="d-flex">
                <button
                  v-if="eventDetails.estado === 'Finalizado'"
                  class="btn btn-terciario btn-m me-2 animated-btn"
                  @click="handleCertificateButtonClick"
                >
                  <i class="fa-solid fa-file-pdf me-2"></i>Mis certificado
                </button>
                <button
                  v-if="canEditEvent"
                  class="btn btn-primary btn-m me-2 animated-btn"
                  @click="handleCertificateEditButtonClick"
                >
                  <i class="fa-solid fa-file-pdf me-2"></i>Administrar certificado
                </button>
                <button
                  v-if="canEditEvent"
                  class="btn btn-primary btn-m me-2 animated-btn"
                  @click="handleEditButtonClick"
                >
                  <i class="fa-solid fa-pencil me-2"></i>Editar
                </button>
                <div v-if="!eventDetails.estado_borrado && canEditEvent">
                  <button class="btn btn-danger btn-m animated-btn" @click="showDeleteConfirmation">
                    <i class="fa-solid fa-triangle-exclamation me-2"></i>Deshabilitar evento
                  </button>
                </div>
              </div>
            </div>
            <div class="row align-items-stretch mb-5">
              <div class="col-md-8 d-flex">
                <div class="d-flex flex-column me-3 image-thumbnail-sidebar">
                  <ScrollBar :maxHeight="'calc(100% - 60px)'" class="image-list-scroll-area">
                    <div v-if="loadingImages" class="text-center my-3">
                      <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Cargando miniaturas...</span>
                      </div>
                    </div>
                    <div
                      v-else
                      class="flex-grow-1 d-flex flex-column justify-content-start align-items-center"
                    >
                      <div
                        v-for="image in imagesToDisplay"
                        :key="image.id"
                        class="thumbnail-container mb-2"
                        :class="{ 'active-thumbnail': mainImage === image.url }"
                        @click="selectImage(image)"
                      >
                        <img :src="image.url" class="img-fluid thumbnail-img" :alt="image.tipo" />
                      </div>
                    </div>
                  </ScrollBar>
                  <button
                    v-if="canEditEvent"
                    class="btn btn-primary add-image-plus-btn animated-btn"
                    @click="openImageManagementModal"
                    title="Editar Imágenes"
                  >
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
                <div class="flex-grow-1 main-image-display">
                  <div
                    v-if="loadingImages"
                    class="d-flex justify-content-center align-items-center h-100"
                  >
                    <div
                      class="spinner-border text-primary"
                      role="status"
                      style="width: 3rem; height: 3rem"
                    ></div>
                  </div>
                  <img
                    v-else
                    :src="mainImage"
                    class="img-fluid rounded main-event-image"
                    :alt="eventDetails.nombre || 'Event Image'"
                  />
                </div>
              </div>

              <div class="col-md-4 event-info-section">
                <div class="info-group">
                  <p class="info-label">Descripción</p>
                  <p class="info-content">{{ eventDetails.descripcion }}</p>
                </div>

                <div class="info-group">
                  <p class="info-label">Categoría</p>
                  <p class="info-content">{{ eventDetails.categoria }}</p>
                </div>

                <div class="info-group">
                  <p class="info-label">Sede del evento</p>
                  <p class="info-content">{{ eventDetails.espacio }}</p>
                </div>

                <div class="d-flex justify-content-between flex-wrap info-dates mb-3">
                  <div class="me-4">
                    <p class="info-label">Fecha de Inicio:</p>
                    <p class="info-content">{{ formatDate(eventDetails.fecha_inicio) }}</p>
                  </div>
                  <div>
                    <p class="info-label">Fecha de Finalización:</p>
                    <p class="info-content">{{ formatDate(eventDetails.fecha_fin) }}</p>
                  </div>
                </div>
                <!-- Botón solo si inscripciones están abiertas -->
                <template v-if="eventDetails.inscripcionesAbiertas">
                  <button
                    v-if="puedeInscribirse"
                    class="btn btn-success mb-4 animated-btn"
                    @click="handleInscribirse"
                  >
                    Inscribirse
                  </button>
                  <button v-else class="btn btn-secondary mb-4 animated-btn" disabled>
                    Ya inscrito
                  </button>
                </template>
                <p v-else class="text-muted mt-3 mb-4">Este evento aún no acepta inscripciones.</p>
              </div>

              <hr class="my-3" />

              <div class="d-flex justify-content-between flex-wrap event-attributes">
                <div class="attribute-item">
                  <p class="info-label">Estado:</p>
                  <p class="info-content">{{ eventDetails.estado }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Modalidad:</p>
                  <p class="info-content">{{ eventDetails.modalidad }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Capacidad:</p>
                  <p class="info-content">{{ eventDetails.capacidad }}</p>
                </div>
                <div class="attribute-item">
                  <p class="info-label">Inscripciones Abiertas:</p>
                  <p class="info-content">{{ eventDetails.inscripcionesAbiertas ? 'Sí' : 'No' }}</p>
                </div>
              </div>
            </div>

            <div
              class="d-flex justify-content-between align-items-center mb-4 p-3 border rounded status-section"
            >
              <div class="d-flex align-items-center">
                <span v-if="!eventDetails.estado_borrado" class="text-success status-text">
                  <i class="fas fa-check-circle me-2"></i> Este evento está activo
                </span>
                <span v-else class="text-danger status-text">
                  <i class="fas fa-times-circle me-2"></i> El evento está desactivado
                </span>
              </div>
              <button
                v-if="eventDetails.estado_borrado && canEditEvent"
                class="btn btn-success animated-btn"
                @click="triggerReactivateEvent"
              >
                <i class="fa-solid fa-circle-check me-2"></i>Reactivar evento
              </button>
            </div>

            <div class="mt-4">
              <ul class="nav nav-pills mb-3 custom-pills" id="pills-tab" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link active"
                    id="pills-cronogramas-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#pills-cronogramas"
                    type="button"
                    role="tab"
                    aria-controls="pills-cronogramas"
                    aria-selected="true"
                  >
                    Cronogramas
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    id="pills-equipos-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#pills-equipos"
                    type="button"
                    role="tab"
                    aria-controls="pills-equipos"
                    aria-selected="false"
                  >
                    Equipos
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    id="pills-formularios-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#pills-formularios"
                    type="button"
                    role="tab"
                    aria-controls="pills-formularios"
                    aria-selected="false"
                  >
                    Formularios
                  </button>
                </li>
              </ul>
              <div class="tab-content" id="pills-tabContent">
                <div
                  class="tab-pane fade show active"
                  id="pills-cronogramas"
                  role="tabpanel"
                  aria-labelledby="pills-cronogramas-tab"
                >
                  <div
                    v-if="
                      eventDetails &&
                      eventDetails.cronogramas &&
                      eventDetails.cronogramas.length > 0
                    "
                  >
                    <div class="accordion" id="nestedAccordionCronogramas">
                      <div
                        class="accordion-item"
                        v-for="cronograma in eventDetails.cronogramas"
                        :key="cronograma.id"
                      >
                        <h2 class="accordion-header" :id="`cronogramaHeading${cronograma.id}`">
                          <button
                            class="accordion-button nested-accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            :data-bs-target="`#cronogramaCollapse${cronograma.id}`"
                            aria-expanded="false"
                            :aria-controls="`cronogramaCollapse${cronograma.id}`"
                          >
                            <i class="fas fa-calendar-alt me-2 nested-accordion-icon"></i>
                            {{ cronograma.titulo }}
                          </button>
                        </h2>
                        <div
                          :id="`cronogramaCollapse${cronograma.id}`"
                          class="accordion-collapse collapse"
                          :aria-labelledby="`cronogramaHeading${cronograma.id}`"
                          data-bs-parent="#nestedAccordionCronogramas"
                        >
                          <div class="accordion-body nested-accordion-body">
                            <p class="mb-2">
                              <strong>Descripción:</strong> {{ cronograma.descripcion }}
                            </p>
                            <p class="mb-2">
                              <strong>Inicio:</strong> {{ formatDate(cronograma.fecha_inicio) }}
                            </p>
                            <p class="mb-3">
                              <strong>Fin:</strong> {{ formatDate(cronograma.fecha_fin) }}
                            </p>
                            <h6 class="mt-3 mb-2 cronograma-activities-title">Actividades:</h6>
                            <div
                              v-if="
                                cronograma.actividades_cronogramas &&
                                cronograma.actividades_cronogramas.length > 0
                              "
                            >
                              <div
                                class="accordion accordion-flush"
                                :id="`activitiesAccordion${cronograma.id}`"
                              >
                                <div
                                  class="accordion-item"
                                  v-for="actividad in cronograma.actividades_cronogramas"
                                  :key="actividad.id"
                                >
                                  <h2
                                    class="accordion-header"
                                    :id="`activityHeading${actividad.id}`"
                                  >
                                    <button
                                      class="accordion-button activity-accordion-button collapsed"
                                      type="button"
                                      data-bs-toggle="collapse"
                                      :data-bs-target="`#activityCollapse${actividad.id}`"
                                      aria-expanded="false"
                                      :aria-controls="`activityCollapse${actividad.id}`"
                                    >
                                      <i class="fas fa-check-circle activity-icon me-2"></i>
                                      {{ actividad.titulo }}
                                      <div class="activity-date-display ms-auto">
                                        <i
                                          class="fas fa-clock activity-date-icon me-1"
                                          title="Inicio de Actividad"
                                        ></i>
                                        <span class="activity-start-date">{{
                                          formatTime(actividad.fecha_inicio)
                                        }}</span>
                                        <span class="mx-1">-</span>
                                        <span class="activity-end-date">{{
                                          formatTime(actividad.fecha_fin)
                                        }}</span>
                                        <i
                                          class="fas fa-calendar-alt activity-date-icon ms-2 me-1"
                                          title="Fecha de Actividad"
                                        ></i>
                                        <span class="activity-full-date">{{
                                          formatShortDate(actividad.fecha_inicio)
                                        }}</span>
                                      </div>
                                    </button>
                                  </h2>
                                  <div
                                    :id="`activityCollapse${actividad.id}`"
                                    class="accordion-collapse collapse"
                                    :aria-labelledby="`activityHeading${actividad.id}`"
                                    :data-bs-parent="`#activitiesAccordion${cronograma.id}`"
                                  >
                                    <div class="accordion-body activity-accordion-body">
                                      <p class="mb-2">
                                        <strong>Descripción:</strong>
                                        {{ actividad.descripcion || 'Sin descripción.' }}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p v-else class="text-muted text-center py-2">
                              No hay actividades para este cronograma.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-muted mt-3">
                    No hay cronogramas disponibles para este evento.
                  </p>
                </div>

                <div
                  class="tab-pane fade"
                  id="pills-equipos"
                  role="tabpanel"
                  aria-labelledby="pills-equipos-tab"
                >
                  <div class="card card-body p-4 border-0 shadow-sm custom-tab-content">
                    <h5 class="mb-3">Equipos del Evento</h5>
                    <div v-if="loadingProjects" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando equipos...</span>
                      </div>
                      <p class="text-muted mt-2">Cargando equipos...</p>
                    </div>
                    <div v-else-if="eventProjects.length === 0" class="text-center text-muted py-2">
                      Este evento no tiene equipos asociados.
                    </div>
                    <div v-else class="row g-3">
                      <div
                        v-for="team in eventProjects"
                        :key="team.id"
                        class="col-md-6 col-lg-4"
                      >
                        <div class="project-card">
                          <h6 class="project-title">{{ team.nombre }}</h6>
                          <p class="project-description">{{ team.descripcion || 'Sin descripción disponible' }}</p>
                          <hr />
                          <p class="team-info">
                            <strong>ID del Equipo:</strong> {{ team.id }}
                          </p>
                          <p class="project-status">
                            <strong>Estado:</strong>
                            <span :class="{ 'text-danger': team.estado_borrado, 'text-success': !team.estado_borrado }">
                              {{ team.estado_borrado ? 'Deshabilitado' : 'Activo' }}
                              <i
                                v-if="team.estado_borrado"
                                class="fas fa-exclamation-circle ms-1"
                                title="Equipo Deshabilitado"
                              ></i>
                              <i
                                v-else
                                class="fas fa-check-circle ms-1"
                                title="Equipo Activo"
                              ></i>
                            </span>
                          </p>
                          <p class="project-dates">
                            <strong>Creado:</strong> {{ formatDate(team.creado_en) }}
                          </p>
                          <p class="project-dates">
                            <strong>Actualizado:</strong> {{ formatDate(team.actualizado_en) }}
                          </p>
                          <p class="team-info">
                            <strong>Evento ID:</strong> {{ team.evento_id }}
                          </p>
                          <p class="team-info">
                            <strong>Ranking:</strong> {{ team.ranking || 'Sin clasificar' }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="tab-pane fade"
                  id="pills-formularios"
                  role="tabpanel"
                  aria-labelledby="pills-formularios-tab"
                >
                  <div class="card card-body p-4 border-0 shadow-sm custom-tab-content">
                    <h5 class="mb-3">Plantillas de Evaluación para este Evento</h5>
                    <div v-if="loadingForms" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando formularios...</span>
                      </div>
                      <p class="text-muted mt-2">Cargando plantillas de evaluación...</p>
                    </div>
                    <div v-else-if="eventForms.length === 0" class="text-center text-muted py-2">
                      Este evento no tiene procesos de evaluación o plantillas asociadas.
                    </div>
                    <div v-else>
                      <div class="accordion" id="evaluationProcessesAccordion">
                        <div
                          v-for="proceso in eventForms"
                          :key="proceso.procesoId"
                          class="accordion-item mb-3"
                        >
                          <h2 class="accordion-header" :id="`procesoHeading${proceso.procesoId}`">
                            <button
                              class="accordion-button nested-accordion-button collapsed"
                              type="button"
                              data-bs-toggle="collapse"
                              :data-bs-target="`#procesoCollapse${proceso.procesoId}`"
                              aria-expanded="false"
                              :aria-controls="`procesoCollapse${proceso.procesoId}`"
                            >
                              <i class="fas fa-file-alt me-2 nested-accordion-icon"></i>
                              Proceso: {{ proceso.procesoTitulo }}
                            </button>
                          </h2>
                          <div
                            :id="`procesoCollapse${proceso.procesoId}`"
                            class="accordion-collapse collapse"
                            :aria-labelledby="`procesoHeading${proceso.procesoId}`"
                            data-bs-parent="#evaluationProcessesAccordion"
                          >
                            <div class="accordion-body nested-accordion-body">
                              <h6 class="mb-3">Plantillas:</h6>
                              <div v-if="proceso.plantillas && proceso.plantillas.length > 0">
                                <div
                                  class="accordion accordion-flush"
                                  :id="`plantillasAccordion${proceso.procesoId}`"
                                >
                                  <div
                                    v-for="plantilla in proceso.plantillas"
                                    :key="plantilla.plantillaId"
                                    class="accordion-item"
                                  >
                                    <h2
                                      class="accordion-header"
                                      :id="`plantillaHeading${plantilla.plantillaId}`"
                                    >
                                      <button
                                        class="accordion-button activity-accordion-button collapsed"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        :data-bs-target="`#plantillaCollapse${plantilla.plantillaId}`"
                                        aria-expanded="false"
                                        :aria-controls="`plantillaCollapse${plantilla.plantillaId}`"
                                      >
                                        <i class="fas fa-clipboard-list activity-icon me-2"></i>
                                        {{ plantilla.plantillaNombre }}
                                      </button>
                                    </h2>
                                    <div
                                      :id="`plantillaCollapse${plantilla.plantillaId}`"
                                      class="accordion-collapse collapse"
                                      :aria-labelledby="`plantillaHeading${plantilla.plantillaId}`"
                                      :data-bs-parent="`#plantillasAccordion${proceso.procesoId}`"
                                    >
                                      <div class="accordion-body activity-accordion-body">
                                        <h6 class="mt-2 mb-2">Criterios:</h6>
                                        <ul
                                          v-if="
                                            plantilla.criterios && plantilla.criterios.length > 0
                                          "
                                          class="list-group list-group-flush"
                                        >
                                          <li
                                            v-for="criterio in plantilla.criterios"
                                            :key="criterio.criterioId"
                                            class="list-group-item d-flex justify-content-between align-items-center"
                                          >
                                            <div>
                                              <strong>{{ criterio.criterioNombre }}</strong
                                              >: {{ criterio.criterioDescripcion }}
                                            </div>
                                            <span class="badge bg-primary rounded-pill"
                                              >{{ criterio.criterioPeso }}%</span
                                            >
                                          </li>
                                        </ul>
                                        <p v-else class="text-muted text-center py-2">
                                          No hay criterios para esta plantilla.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p v-else class="text-muted text-center py-2">
                                No hay plantillas para este proceso de evaluación.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!loading" class="container text-center text-muted mt-5">
            No se pudieron cargar los detalles del evento o el evento no existe.
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

    <ModalCrearEvento
      :show="showCreateEditModal"
      :eventData="currentEventToEdit"
      @close="handleModalClose"
      @submit="handleModalSubmit"
    />

    <ManageCertificate
      :show="showManageCertificateModal"
      :eventId="eventId"
      @close="closeManageCertificateModal"
      @save="handleCertificateSave"
    />

    <ViewMyCertificates
      :show="showViewMyCertificatesModal"
      :eventId="eventId"
      @close="closeViewMyCertificatesModal"
    />

    <ImageManagementModal
      :show="showImageManagementModal"
      :currentImages="eventImages"
      :isLoading="isLoadingImagesInModal"
      @close="closeImageManagementModal"
      @delete-image="triggerDeleteImage"
      @upload-images="uploadNewImages"
      ref="imageManagementModalRef"
    />

    <ConfirmationModal
      :show="showReactivateConfirmModal"
      title="Reactivar Evento"
      message="¿Estás seguro de que quieres reactivar este evento? El evento volverá a estar visible y activo."
      confirmText="Sí, Reactivar"
      cancelText="Cancelar"
      @confirm="handleReactivateConfirm"
      @cancel="handleReactivateCancel"
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

    <ConfirmationDialog
      :visible="showConfirmDialog"
      message="¿Deseas inscribirte al evento?"
      @confirm="confirmarSinProyecto"
      @cancel="closeDialog"
    />

    <div v-if="showToast" :class="['toast-notification', toastType, 'show']">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.event-detail-view-wrapper {
  /* This is the new single root element */
  height: 100vh;
  overflow: hidden;
}

.image-thumbnail-sidebar {
  width: 120px;
  flex-shrink: 0;
  max-height: 60vh;
  position: relative;
  padding-bottom: 10px;
}

.image-list-scroll-area {
  flex-grow: 1;
}

.thumbnail-container {
  width: 100px;
  height: 50px;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
}

.thumbnail-container:hover {
  border-color: #84b5ff;
}

.thumbnail-container.active-thumbnail {
  border-color: #174384;
  border-width: 3px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.btn-terciario {
  background-color: #cfac11;
  border-color: #ffcf4c;
  color: #ffffff;
}

.btn-terciario:hover {
  background-color: #b89a0e;
  border-color: #8f740b;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.main-image-display {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.main-event-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.event-info-section {
  padding-left: 20px;
}

.info-group {
  margin-bottom: 10px;
}

.info-label {
  font-weight: bold;
  color: #555;
  margin-bottom: 5px;
  font-size: 0.95rem;
}

.info-content {
  margin-bottom: 0;
  font-size: 1rem;
  color: #333;
}

.info-dates {
  margin-top: 20px;
  margin-bottom: 20px !important;
}

.event-attributes .attribute-item {
  flex: 1 1 auto;
  min-width: 150px;
  margin-right: 15px;
  margin-bottom: 10px;
}

.card-header {
  font-weight: bold;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.card {
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.25rem;
}

.card.mb-4:not(.main-event-details) {
  margin-top: 20px;
}

/* Styles for the new Plus button */
.add-image-plus-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 10;
  transition: background-color 0.2s;
}

.add-image-plus-btn:hover {
  background-color: #0d284a;
}

.error-text {
  color: red;
  font-weight: bold;
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

.accordion-button .accordion-indicator-icon {
  transition:
    transform 0.2s ease-in-out,
    color 0.2s ease;
  color: #ffffff;
}

.accordion-button:not(.collapsed) .accordion-indicator-icon {
  transform: rotate(90deg);
  color: #174384;
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

/* Specific styles for nested accordion buttons */
.nested-accordion-button {
  background-color: #f0f5ff;
  color: #3730a3;
  font-weight: 500;
}

.nested-accordion-button:not(.collapsed) {
  background-color: #c3d9ff;
  color: #174384;
}

.nested-accordion-button .nested-accordion-icon {
  color: #3730a3;
  transition: transform 0.2s ease-in-out;
}

.nested-accordion-button:not(.collapsed) .nested-accordion-icon {
  transform: rotate(90deg);
  color: #174384;
}

.nested-accordion-body {
  background-color: #ffffff;
}

/* Styles for Custom Nav Pills */
.custom-pills .nav-link {
  border-radius: 0.5rem 0.5rem 0 0;
  margin-right: 0.25rem;
  padding: 0.75rem 1.5rem;
  background-color: #e0e7ff;
  color: #174384;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid #c3d9ff;
  border-bottom: none;
}

.custom-pills .nav-link:hover:not(.active) {
  background-color: #d0e0ff;
  color: #0d284a;
}

.custom-pills .nav-link.active {
  background-color: #174384;
  color: #ffffff;
  border-color: #174384;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.tab-content {
  background-color: #ffffff;
  border: 1px solid #e0e7ff;
  border-radius: 0 0.5rem 0.5rem 0.5rem;
  padding: 1.5rem;
  min-height: 200px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.custom-tab-content {
  border: none !important;
  box-shadow: none !important;
}

/* New styles for status section */
.status-section {
  background-color: #f8f9fa;
  border-color: #e9ecef !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.status-text {
  font-weight: 600;
  font-size: 1rem;
}

.text-success {
  color: #28a745 !important;
}

.text-danger {
  color: #dc3545 !important;
}

.activity-accordion-button {
  display: flex; /* Make it a flex container */
  align-items: center; /* Vertically align items */
  justify-content: space-between; /* Push date display to the right */
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  color: #343a40;
  font-weight: 500;
  font-size: 0.95rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.activity-date-display {
  display: flex;
  align-items: center;
  font-size: 0.85rem; /* Slightly smaller font for dates */
  color: #5a6268; /* A bit darker than previous to stand out */
  font-weight: normal;
}

.activity-date-icon {
  color: #007bff; /* A nice blue for calendar/clock icons */
  font-size: 0.9rem;
}

.activity-start-date,
.activity-end-date,
.activity-full-date {
  white-space: nowrap; /* Prevent dates from wrapping */
}

/* Styles for Project Cards in Equipos tab */
.project-card {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  height: 100%; /* Ensure cards in a row have equal height */
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.project-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #174384;
  margin-bottom: 5px;
}

.project-description {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 10px;
  flex-grow: 1; /* Allow description to take available space */
}

.team-info,
.project-status,
.project-dates {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 5px;
}

.team-info strong,
.project-status strong,
.project-dates strong {
  color: #333;
}

/* Ensure the full date is displayed on smaller screens if necessary, or adjust layout */
@media (max-width: 576px) {
  .activity-date-display {
    flex-wrap: wrap; /* Allow dates to wrap on very small screens */
    justify-content: flex-end; /* Keep them to the right */
    text-align: right;
  }
  .activity-date-icon {
    margin-left: 0.5rem !important; /* Adjust icon spacing */
    margin-right: 0.25rem !important;
  }
  .activity-full-date {
    flex-basis: 100%; /* Make full date take full line if it wraps */
    margin-top: 0.2rem;
  }
}

.toast-notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 2000;
  transition: opacity 0.3s ease-in-out;
  opacity: 0;
  pointer-events: none;
}
.toast-notification.show {
  opacity: 1;
}
.toast-notification.success {
  background-color: #28a745;
}
.toast-notification.error {
  background-color: #dc3545;
}
</style>
