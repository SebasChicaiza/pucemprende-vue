<script setup>
import {
  ref,
  watch,
  defineEmits,
  defineProps,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'
import { Modal, Collapse } from 'bootstrap' // Import Collapse
import axios from 'axios'
import LoaderComponent from '@/components/LoaderComponent.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import OkModal from '@/components/OkModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  procesoId: {
    type: Number,
    required: true,
  },
  processTitle: {
    type: String,
    default: 'Proceso de Evaluación',
  },
})

const emit = defineEmits(['close', 'success', 'error'])

const plantillasModalRef = ref(null)
let bsModal = null

const allNewPlantillasInSession = ref([])
const activeAccordionItem = ref(null) // Stores the ID of the currently open accordion item
const nextPlantillaTempId = ref(1)

const currentCriterioName = ref('')
const currentCriterioDescription = ref('')
const currentCriterioPeso = ref(0)
const editingCriterioIndex = ref(null)

const modalLoading = ref(false)
const showErrorModal = ref(false)
const errorMessage = ref('')
const showOkModal = ref(false)
const okModalMessage = ref('')

const showDeleteConfirmation = ref(false)
const confirmDeleteTitle = ref('')
const confirmDeleteMessage = ref('')
const confirmDeleteConfirmText = ref('')
const confirmDeleteCancelText = ref('Cancelar')
const plantillaToDeleteId = ref(null)
const plantillaToDeleteName = ref('')

const editingPlantillaNameId = ref(null)
const tempPlantillaName = ref('')
const inPlaceEditInputRef = ref(null)

const currentPlantilla = computed(() => {
  // console.log('Computed currentPlantilla. activeAccordionItem:', activeAccordionItem.value);
  const found = allNewPlantillasInSession.value.find((p) => p.id === activeAccordionItem.value)
  // console.log('Found currentPlantilla:', found);
  return found
})

const totalPeso = computed(() => {
  if (!currentPlantilla.value) return 0
  return currentPlantilla.value.criterios.reduce(
    (sum, criterio) => sum + (Number(criterio.peso) || 0),
    0,
  )
})

const isAddCriterioValid = computed(() => {
  return (
    currentCriterioName.value.trim() !== '' &&
    currentCriterioDescription.value.trim() !== '' &&
    Number(currentCriterioPeso.value) > 0 &&
    Number(currentCriterioPeso.value) <= 100
  )
})

watch(currentCriterioName, () => {
  if (errorMessage.value) errorMessage.value = ''
})
watch(currentCriterioDescription, () => {
  if (errorMessage.value) errorMessage.value = ''
})
watch(currentCriterioPeso, () => {
  if (errorMessage.value) errorMessage.value = ''
})

// Watch for changes in activeAccordionItem to reset criterion input fields
// and to control Bootstrap's accordion state
watch(activeAccordionItem, (newId, oldId) => {
  // console.log('activeAccordionItem changed from', oldId, 'to', newId);

  // Reset criterion input fields when a new accordion item becomes active
  currentCriterioName.value = ''
  currentCriterioDescription.value = ''
  currentCriterioPeso.value = 0
  editingCriterioIndex.value = null
  errorMessage.value = ''
  showErrorModal.value = false

  nextTick(() => {
    // Hide old accordion item
    if (oldId) {
      const oldCollapseElement = document.getElementById(`collapse${oldId}`)
      if (oldCollapseElement) {
        const bsCollapseInstance = Collapse.getInstance(oldCollapseElement)
        if (bsCollapseInstance) {
          bsCollapseInstance.hide()
        } else {
          new Collapse(oldCollapseElement, { toggle: false }).hide()
        }
      }
    }

    // Show new accordion item
    if (newId) {
      const newCollapseElement = document.getElementById(`collapse${newId}`)
      if (newCollapseElement) {
        const bsCollapseInstance = Collapse.getInstance(newCollapseElement)
        if (bsCollapseInstance) {
          bsCollapseInstance.show()
        } else {
          new Collapse(newCollapseElement, { toggle: false }).show()
        }
      }
    }
  })
})

const initializeModal = () => {
  if (plantillasModalRef.value && !bsModal) {
    bsModal = new Modal(plantillasModalRef.value, { backdrop: 'static', keyboard: false })
    plantillasModalRef.value.addEventListener('hidden.bs.modal', () => {
      emit('close')
      resetModalState()
    })
    // We are now explicitly controlling Bootstrap's collapse state via the activeAccordionItem watch
    // So, we don't need to listen to Bootstrap's 'shown.bs.collapse'/'hidden.bs.collapse' to SET activeAccordionItem
  }
}

onMounted(() => {
  initializeModal()
})

onUnmounted(() => {
  if (bsModal) {
    bsModal.dispose()
    bsModal = null
  }
})

watch(
  () => props.show,
  (newVal) => {
    nextTick(() => {
      if (newVal) {
        if (!bsModal) {
          initializeModal()
        }
        bsModal?.show()
        resetModalState()
        fetchPlantillasData() // Fetch data when modal opens
      } else {
        bsModal?.hide()
      }
    })
  },
  { immediate: true },
)

const resetModalState = () => {
  allNewPlantillasInSession.value = []
  activeAccordionItem.value = null
  nextPlantillaTempId.value = 1
  currentCriterioName.value = ''
  currentCriterioDescription.value = ''
  currentCriterioPeso.value = 0
  editingCriterioIndex.value = null
  errorMessage.value = ''
  showErrorModal.value = false
  okModalMessage.value = ''
  showOkModal.value = false
  modalLoading.value = false
  plantillaToDeleteId.value = null
  plantillaToDeleteName.value = ''
  editingPlantillaNameId.value = null
  tempPlantillaName.value = ''
}

const handleModalClose = () => {
  emit('close')
}

const handleOkModalClose = () => {
  showOkModal.value = false
  okModalMessage.value = ''
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

const fetchPlantillasData = async () => {
  modalLoading.value = true
  const token = localStorage.getItem('token')
  if (!token) {
    displayError('Token de autenticación no encontrado.')
    modalLoading.value = false
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion-detalle`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const procesosDetalle = response.data
    const currentProceso = procesosDetalle.find((p) => p.procesoId === props.procesoId)

    if (currentProceso && currentProceso.plantillas.length > 0) {
      allNewPlantillasInSession.value = currentProceso.plantillas.map((p) => ({
        id: p.plantillaId, // Use backend ID
        nombre_plantilla: p.plantillaNombre,
        criterios: p.criterios.map((c) => ({
          id: c.criterioId, // Use backend ID
          nombre: c.criterioNombre,
          descripcion: c.criterioDescripcion,
          peso: c.criterioPeso,
        })),
      }))
      // Set the first plantilla as active initially
      if (allNewPlantillasInSession.value.length > 0) {
        activeAccordionItem.value = allNewPlantillasInSession.value[0].id
        // The watch on activeAccordionItem will now handle opening the accordion.
      }
    } else {
      // If no existing plantillas, add a new one to start
      addNewPlantillaSession()
    }
  } catch (err) {
    console.error('Error fetching plantillas data:', err.response?.data || err.message)
    displayError('Error al cargar las plantillas existentes. Intente de nuevo más tarde.')
    // Still add a new plantilla if fetching fails to allow creation
    addNewPlantillaSession()
  } finally {
    modalLoading.value = false
  }
}

const addNewPlantillaSession = () => {
  const newId = `temp-${nextPlantillaTempId.value++}` // Use string for temporary ID
  const newPlantilla = {
    id: newId,
    nombre_plantilla: `Nueva Plantilla ${allNewPlantillasInSession.value.length + 1}`,
    criterios: [],
  }
  allNewPlantillasInSession.value.push(newPlantilla)
  activeAccordionItem.value = newId
}

const openDeletePlantillaConfirmation = (plantillaId, plantillaName) => {
  if (!plantillaId || !plantillaName) {
    console.error('No se pudo obtener la información de la plantilla para eliminar.')
    displayError('No se pudo obtener la información de la plantilla para eliminar.')
    return
  }
  plantillaToDeleteId.value = plantillaId
  plantillaToDeleteName.value = plantillaName
  confirmDeleteTitle.value = 'Confirmar Eliminación de Plantilla'
  confirmDeleteMessage.value =
    '¿Estás seguro de que quieres eliminar la plantilla? Esta acción no se puede deshacer.'
  confirmDeleteConfirmText.value = 'Sí, Eliminar'
  confirmDeleteCancelText.value = 'Cancelar'
  showDeleteConfirmation.value = true
}

const handleDeletePlantillaConfirmed = () => {
  if (plantillaToDeleteId.value) {
    const idToDelete = plantillaToDeleteId.value
    const indexToDelete = allNewPlantillasInSession.value.findIndex((p) => p.id === idToDelete)

    if (indexToDelete !== -1) {
      allNewPlantillasInSession.value.splice(indexToDelete, 1)
      if (activeAccordionItem.value === idToDelete) {
        activeAccordionItem.value =
          allNewPlantillasInSession.value.length > 0
            ? allNewPlantillasInSession.value[Math.max(0, indexToDelete - 1)].id
            : null
      }
    }
  }
  plantillaToDeleteId.value = null
  plantillaToDeleteName.value = ''
  showDeleteConfirmation.value = false
  errorMessage.value = ''
  showErrorModal.value = false
}

const handleDeleteConfirmationCancelled = () => {
  showDeleteConfirmation.value = false
  plantillaToDeleteId.value = null
  plantillaToDeleteName.value = ''
}

const startEditingPlantillaName = (plantillaId, currentName) => {
  editingPlantillaNameId.value = plantillaId
  tempPlantillaName.value = currentName
  nextTick(() => {
    if (inPlaceEditInputRef.value) {
      inPlaceEditInputRef.value.focus()
      inPlaceEditInputRef.value.select()
    }
  })
}

const savePlantillaName = (plantilla) => {
  if (editingPlantillaNameId.value !== plantilla.id) {
    return
  }

  if (!tempPlantillaName.value.trim()) {
    displayError('El nombre de la plantilla no puede estar vacío.')
    return
  }
  plantilla.nombre_plantilla = tempPlantillaName.value.trim()
  editingPlantillaNameId.value = null
  tempPlantillaName.value = ''
  errorMessage.value = ''
  showErrorModal.value = false
}

const cancelEditingPlantillaName = () => {
  editingPlantillaNameId.value = null
  tempPlantillaName.value = ''
  errorMessage.value = ''
  showErrorModal.value = false
}

const addOrUpdateCriterio = () => {
  if (!currentPlantilla.value) {
    displayError('Por favor, seleccione una plantilla primero.')
    return
  }
  if (!isAddCriterioValid.value) {
    displayError(
      'Por favor, complete todos los campos del criterio y asegúrese de que el peso sea un número válido entre 1 y 100.',
    )
    return
  }

  const newPeso = Number(currentCriterioPeso.value)

  if (editingCriterioIndex.value !== null) {
    const oldPeso = currentPlantilla.value.criterios[editingCriterioIndex.value].peso
    if (totalPeso.value - oldPeso + newPeso > 100) {
      displayError(
        `El peso total de los criterios no puede exceder 100%. Actualmente es ${totalPeso.value - oldPeso + newPeso}%.`,
      )
      return
    }
    currentPlantilla.value.criterios[editingCriterioIndex.value] = {
      id: currentPlantilla.value.criterios[editingCriterioIndex.value].id, // Keep existing ID
      nombre: currentCriterioName.value.trim(),
      descripcion: currentCriterioDescription.value.trim(),
      peso: newPeso,
    }
  } else {
    if (totalPeso.value + newPeso > 100) {
      displayError(
        `El peso total de los criterios no puede exceder 100%. Actualmente es ${totalPeso.value + newPeso}%.`,
      )
      return
    }
    currentPlantilla.value.criterios.push({
      id: null, // New criteria won't have an ID until saved to DB
      nombre: currentCriterioName.value.trim(),
      descripcion: currentCriterioDescription.value.trim(),
      peso: newPeso,
    })
  }

  currentCriterioName.value = ''
  currentCriterioDescription.value = ''
  currentCriterioPeso.value = 0
  editingCriterioIndex.value = null
  errorMessage.value = ''
  showErrorModal.value = false
}

const editCriterio = (index) => {
  if (!currentPlantilla.value) return
  const criterio = currentPlantilla.value.criterios[index]
  currentCriterioName.value = criterio.nombre
  currentCriterioDescription.value = criterio.descripcion
  currentCriterioPeso.value = criterio.peso
  editingCriterioIndex.value = index
  errorMessage.value = ''
  showErrorModal.value = false
}

const deleteCriterio = (index) => {
  if (!currentPlantilla.value) return
  currentPlantilla.value.criterios.splice(index, 1)
  errorMessage.value = ''
  showErrorModal.value = false
}

const submitAllPlantillas = async () => {
  if (allNewPlantillasInSession.value.length === 0) {
    displayError('Debe crear al menos una plantilla para guardar.')
    return
  }

  for (const plantilla of allNewPlantillasInSession.value) {
    if (!plantilla.nombre_plantilla.trim()) {
      displayError(`La plantilla con ID temporal "${plantilla.id}" debe tener un nombre.`)
      return
    }
    if (plantilla.criterios.length === 0) {
      displayError(`La plantilla "${plantilla.nombre_plantilla}" debe tener al menos un criterio.`)
      return
    }
    const currentPlantillaTotalPeso = plantilla.criterios.reduce(
      (sum, c) => sum + (Number(c.peso) || 0),
      0,
    )
    if (currentPlantillaTotalPeso !== 100) {
      displayError(
        `El peso total de los criterios para la plantilla "${plantilla.nombre_plantilla}" debe ser exactamente 100%. Actualmente es ${currentPlantillaTotalPeso}%.`,
      )
      return
    }
  }

  modalLoading.value = true
  errorMessage.value = ''
  showErrorModal.value = false

  const token = localStorage.getItem('token')
  if (!token) {
    displayError('Token de autenticación no encontrado.')
    modalLoading.value = false
    return
  }

  try {
    for (const plantilla of allNewPlantillasInSession.value) {
      const criteriosPayload = plantilla.criterios.map((c) => {
        const criterioData = {
          nombre: c.nombre,
          descripcion: c.descripcion,
          peso: Number(c.peso),
        }
        // Only include 'id' if it's an existing backend ID (number type)
        if (c.id && typeof c.id === 'number') {
          criterioData.id = c.id
        }
        return criterioData
      })

      const payload = {
        nombre_plantilla: plantilla.nombre_plantilla.trim(),
        criterios: criteriosPayload,
      }

      if (typeof plantilla.id === 'string' && plantilla.id.startsWith('temp-')) {
        // This is a new plantilla, use POST
        payload.proceso_id = props.procesoId // Add proceso_id only for new plantillas
        await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/plantillas-criterios`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      } else {
        // This is an existing plantilla, use PUT
        await axios.put(
          `${import.meta.env.VITE_URL_BACKEND}/api/plantillas-criterios/${plantilla.id}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        )
      }
    }

    okModalMessage.value = `Todas las plantillas han sido procesadas con éxito!`
    showOkModal.value = true
    emit('success', { message: okModalMessage.value })
    handleModalClose()
  } catch (err) {
    console.error('Error processing plantillas:', err.response?.data || err.message)
    let errorToDisplay = 'Error desconocido al procesar las plantillas.'

    if (err.response && err.response.data) {
      if (err.response.data.errors) {
        const errors = err.response.data.errors
        const allErrors = Object.values(errors).flat()
        if (allErrors.length > 0) {
          errorToDisplay = allErrors.join('; ')
        } else if (err.response.data.message) {
          errorToDisplay = err.response.data.message
        }
      } else if (err.response.data.message) {
        errorToDisplay = err.response.data.message
      }
    } else if (err.message) {
      errorToDisplay = err.message
    }
    displayError(`Error al procesar plantillas: ${errorToDisplay}`)
  } finally {
    modalLoading.value = false
  }
}

const displayError = (message) => {
  errorMessage.value = message
  showErrorModal.value = true
}

// Function to toggle accordion manually
const toggleAccordion = (plantillaId) => {
  // If the clicked item is already active, close it
  if (activeAccordionItem.value === plantillaId) {
    activeAccordionItem.value = null
  } else {
    // Otherwise, set it as the active item
    activeAccordionItem.value = plantillaId
  }
  // The watch on activeAccordionItem will handle the Bootstrap Collapse show/hide.
}
</script>

<template>
  <teleport to="body">
    <div
      class="modal fade"
      tabindex="-1"
      aria-labelledby="plantillasEvaluacionModalLabel"
      aria-hidden="true"
      ref="plantillasModalRef"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="plantillasEvaluacionModalLabel">
              Gestionar Plantillas de Evaluación para "{{ processTitle }}"
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="handleModalClose"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body-custom">
            <LoaderComponent v-if="modalLoading" />
            <div v-else class="container-fluid d-flex flex-column h-100">
              <ErrorModal
                :show="showErrorModal"
                :message="errorMessage"
                @close="handleErrorModalClose"
              />
              <OkModal
                :show="showOkModal"
                :message="okModalMessage"
                :duration="1000"
                @close="handleOkModalClose"
              />

              <div class="d-flex justify-content-end mb-3 gap-2 flex-shrink-0">
                <button class="btn btn-primary btn-sm" @click="addNewPlantillaSession">
                  <i class="fas fa-plus me-2"></i>Añadir Nueva Plantilla
                </button>
                <button
                  class="btn btn-info btn-sm"
                  @click="
                    startEditingPlantillaName(
                      currentPlantilla.id,
                      currentPlantilla.nombre_plantilla,
                    )
                  "
                  :disabled="!currentPlantilla"
                  title="Editar nombre de la plantilla actual"
                >
                  <i class="fas fa-pencil-alt me-2"></i>Editar Nombre
                </button>
                <button
                  class="btn btn-danger btn-sm"
                  @click="
                    openDeletePlantillaConfirmation(
                      currentPlantilla.id,
                      currentPlantilla.nombre_plantilla,
                    )
                  "
                  :disabled="!currentPlantilla || allNewPlantillasInSession.length <= 1"
                >
                  <i class="fas fa-trash me-2"></i>Eliminar Actual
                </button>
              </div>

              <ScrollBar class="flex-grow-1">
                <div class="accordion" id="plantillasAccordion">
                  <div
                    v-if="allNewPlantillasInSession.length === 0"
                    class="text-center text-muted py-4"
                  >
                    No hay plantillas creadas aún. Haga clic en "Añadir Nueva Plantilla" para
                    empezar.
                  </div>
                  <div
                    v-for="(plantilla, index) in allNewPlantillasInSession"
                    :key="plantilla.id"
                    class="accordion-item"
                  >
                    <h2 class="accordion-header" :id="`heading${plantilla.id}`">
                      <button
                        class="accordion-button"
                        :class="{ collapsed: activeAccordionItem !== plantilla.id }"
                        type="button"
                        @click="toggleAccordion(plantilla.id)"
                        :aria-expanded="activeAccordionItem === plantilla.id ? 'true' : 'false'"
                        :aria-controls="`collapse${plantilla.id}`"
                      >
                        <template v-if="editingPlantillaNameId === plantilla.id">
                          <input
                            type="text"
                            class="form-control form-control-sm accordion-title-input editing-input"
                            v-model="tempPlantillaName"
                            @keyup.enter="savePlantillaName(plantilla)"
                            @keyup.esc="cancelEditingPlantillaName"
                            @blur="savePlantillaName(plantilla)"
                            :ref="
                              (el) => {
                                inPlaceEditInputRef = el
                              }
                            "
                            tabindex="0"
                          />
                        </template>
                        <template v-else>
                          <span class="accordion-title-text">
                            {{ plantilla.nombre_plantilla }}
                          </span>
                        </template>
                        <span class="ms-auto me-3 text-muted small"
                          >Total:
                          {{
                            plantilla.criterios.reduce((sum, c) => sum + (Number(c.peso) || 0), 0)
                          }}%</span
                        >
                      </button>
                    </h2>
                    <div
                      :id="`collapse${plantilla.id}`"
                      class="accordion-collapse collapse"
                      :class="{ show: activeAccordionItem === plantilla.id }"
                      :aria-labelledby="`heading${plantilla.id}`"
                      data-bs-parent="#plantillasAccordion"
                    >
                      <div class="accordion-body">
                        <h6 class="mb-3">
                          Criterios de Evaluación para "{{ plantilla.nombre_plantilla }}"
                        </h6>
                        <div class="row g-2 mb-3 align-items-end">
                          <div class="col-md-4">
                            <label for="criterioName" class="form-label-sm"
                              >Nombre del Criterio:</label
                            >
                            <input
                              type="text"
                              id="criterioName"
                              class="form-control form-control-sm"
                              v-model="currentCriterioName"
                              placeholder="Ej: Innovación"
                            />
                          </div>
                          <div class="col-md-5">
                            <label for="criterioDescription" class="form-label-sm"
                              >Descripción:</label
                            >
                            <input
                              type="text"
                              id="criterioDescription"
                              class="form-control form-control-sm"
                              v-model="currentCriterioDescription"
                              placeholder="Ej: Originalidad y creatividad de la solución."
                            />
                          </div>
                          <div class="col-md-2">
                            <label for="criterioPeso" class="form-label-sm">Peso (%):</label>
                            <input
                              type="number"
                              id="criterioPeso"
                              class="form-control form-control-sm"
                              v-model.number="currentCriterioPeso"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div class="col-md-1 d-flex align-items-center justify-content-end">
                            <button
                              class="btn btn-primary btn-sm btn-add-criterio"
                              @click="addOrUpdateCriterio"
                              :disabled="!isAddCriterioValid"
                            >
                              <i
                                :class="
                                  editingCriterioIndex !== null ? 'fas fa-save' : 'fas fa-plus'
                                "
                              ></i>
                            </button>
                          </div>
                        </div>

                        <div class="table-responsive">
                          <table class="table table-bordered table-striped table-sm">
                            <thead>
                              <tr>
                                <th style="width: 25%">Nombre</th>
                                <th style="width: 50%">Descripción</th>
                                <th style="width: 15%">Peso (%)</th>
                                <th style="width: 10%" class="text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-if="currentPlantilla && currentPlantilla.criterios.length === 0"
                              >
                                <td colspan="4" class="text-center text-muted">
                                  No hay criterios añadidos aún.
                                </td>
                              </tr>
                              <tr
                                v-for="(criterio, idx) in currentPlantilla
                                  ? currentPlantilla.criterios
                                  : []"
                                :key="idx"
                              >
                                <td>{{ criterio.nombre }}</td>
                                <td>{{ criterio.descripcion }}</td>
                                <td>{{ criterio.peso }}%</td>
                                <td class="text-center">
                                  <button
                                    class="btn-action-icon btn-action-edit-icon me-1"
                                    @click="editCriterio(idx)"
                                  >
                                    <i class="fas fa-edit"></i>
                                  </button>
                                  <button
                                    class="btn-action-icon btn-action-delete-icon"
                                    @click="deleteCriterio(idx)"
                                  >
                                    <i class="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colspan="2" class="text-end fw-bold">Total Peso:</td>
                                <td
                                  :class="{
                                    'text-danger': totalPeso !== 100,
                                    'text-success': totalPeso === 100,
                                  }"
                                  class="fw-bold"
                                >
                                  {{ totalPeso }}%
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollBar>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="handleModalClose"
              :disabled="modalLoading"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="submitAllPlantillas"
              :disabled="modalLoading || allNewPlantillasInSession.length === 0"
            >
              <span
                v-if="modalLoading"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Guardar Todas las Plantillas
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal
      :show="showDeleteConfirmation"
      :title="confirmDeleteTitle"
      :message="confirmDeleteMessage"
      :confirmText="confirmDeleteConfirmText"
      :cancelText="confirmDeleteCancelText"
      @confirm="handleDeletePlantillaConfirmed"
      @cancel="handleDeleteConfirmationCancelled"
    />
  </teleport>
</template>

<style scoped>
.modal-dialog {
  max-width: 1200px;
  width: 95%;
  height: 90vh; /* Set a fixed height for the dialog */
  display: flex;
  align-items: center;
}

.modal-content {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  height: 100%; /* Fill the constrained modal-dialog height */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  background-color: #174384;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-close {
  background: transparent
    url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e")
    center / 0.8em auto no-repeat;
  border: 0;
  border-radius: 0.375rem;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  font-size: 1rem;
  padding: 0.4rem;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body-custom {
  padding: 1.5rem;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 600;
  margin-bottom: 0.4rem;
  display: block;
  color: #333;
  font-size: 0.9rem;
}

.form-label-sm {
  font-weight: 600;
  margin-bottom: 0.3rem;
  display: block;
  color: #333;
  font-size: 0.85rem;
}

.form-control,
.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-control-sm {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border-radius: 5px;
}

.form-control:focus,
.form-select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.btn-add-criterio {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-add-criterio:hover:not(:disabled) {
  background-color: #218838;
  border-color: #1e7e34;
}

.btn-add-criterio:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table {
  width: 100%;
  margin-bottom: 1rem;
  color: #212529;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  padding: 0.6rem 0.75rem;
  vertical-align: middle;
  border-top: 1px solid #dee2e6;
}

.table thead th {
  vertical-align: bottom;
  border-bottom: 2px solid #dee2e6;
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
}

.table-bordered {
  border: 1px solid #dee2e6;
}

.table-bordered th,
.table-bordered td {
  border: 1px solid #dee2e6;
}

.table-striped tbody tr:nth-of-type(odd) {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-sm {
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
  border-radius: 0.15rem;
}

.btn-action-icon {
  background: none;
  border: none;
  padding: 0.2rem;
  font-size: 0.9em;
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-action-edit-icon {
  color: #17a2b8;
}

.btn-action-edit-icon:hover {
  color: #138496;
}

.btn-action-delete-icon {
  color: #dc3545;
}

.btn-action-delete-icon:hover {
  color: #c82333;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background-color: #f8f8f8;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  flex-shrink: 0;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
  font-size: 0.9rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: 1px solid #007bff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: 1px solid #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
  border: 1px solid #17a2b8;
}

.btn-info:hover:not(:disabled) {
  background-color: #138496;
  border-color: #117a8b;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-danger {
  color: #dc3545;
}

.text-success {
  color: #28a745;
}

.no-data-message {
  text-align: center;
  color: #888;
  padding: 20px;
}

.accordion-item {
  border: 1px solid #dee2e6;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  overflow: hidden;
}

.accordion-header {
  margin-bottom: 0;
  position: relative;
}

.accordion-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  background-color: #f8f9fa;
  border: none;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.accordion-button:not(.collapsed) {
  color: #174384;
  background-color: #e0f2f7;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.125);
}

.accordion-button:hover {
  background-color: #e9ecef;
}

.accordion-button:focus {
  z-index: 3;
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.accordion-title-text {
  flex-grow: 1;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: inherit;
}

.accordion-title-input {
  flex-grow: 1;
  background-color: transparent;
  border: 1px solid #ddd;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: inherit;
  margin-left: 0.5rem;
}

.accordion-title-input.editing-input:focus {
  border-color: #007bff;
  background-color: white;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.accordion-body {
  padding: 1rem 1.5rem;
  border-top: 1px solid #dee2e6;
}

.row.g-2 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
}
.row.g-3 {
  --bs-gutter-x: 0.75rem;
  --bs-gutter-y: 0.75rem;
}
</style>
