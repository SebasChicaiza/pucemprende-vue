<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import axios from 'axios'
import LoaderComponent from '@/components/LoaderComponent.vue'
import ErrorModal from '@/components/ErrorModal.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  plantilla: {
    type: Object,
    default: null,
  },
  procesoEventoId: {
    type: [Number, String],
    default: null,
  },
  userEventPermissions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'submit-evaluation'])

const teams = ref([])
const loadingTeams = ref(false)
const isFullPageLoading = ref(false)
const teamSearchQuery = ref('')
const selectedTeamId = ref(null)
const evaluationScores = ref({})
const isSubmitting = ref(false)

const evaluadorId = ref(null)

const showErrorModal = ref(false)
const errorMessage = ref('')

const isTeamDropdownOpen = ref(false)
const teamSearchInputRef = ref(null)

const selectedTeamName = computed(() => {
  const team = teams.value.find((t) => t.id === selectedTeamId.value)
  return team ? team.nombre : 'Seleccionar Equipo'
})

const filteredTeams = computed(() => {
  if (!teamSearchQuery.value) {
    return teams.value.filter((team) => !team.estado_borrado)
  }
  const query = teamSearchQuery.value.toLowerCase()
  return teams.value.filter(
    (team) => !team.estado_borrado && team.nombre.toLowerCase().includes(query),
  )
})

const currentEventRoleId = computed(() => {
  if (!props.procesoEventoId || props.userEventPermissions.length === 0) {
    return null
  }
  const eventPermission = props.userEventPermissions.find(
    (perm) => perm.evento_id === props.procesoEventoId,
  )
  return eventPermission ? eventPermission.rol_id : null
})

watch(
  () => props.plantilla,
  (newPlantilla) => {
    if (newPlantilla) {
      evaluationScores.value = {}
      newPlantilla.criterios.forEach((criterio) => {
        evaluationScores.value[criterio.criterioId] = { score: 0, comment: '' }
      })
      selectedTeamId.value = null
      teamSearchQuery.value = ''
      isTeamDropdownOpen.value = false
      fetchTeams()
    }
  },
  { immediate: true },
)

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      fetchTeams()
    }
  },
)

async function fetchTeams() {
  loadingTeams.value = true
  errorMessage.value = ''
  showErrorModal.value = false
  const token = localStorage.getItem('token')

  if (!token) {
    errorMessage.value = 'Token de autenticación no encontrado para cargar equipos.'
    showErrorModal.value = true
    loadingTeams.value = false
    return
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    teams.value = response.data
  } catch (err) {
    console.error('Error fetching teams:', err.response?.data || err.message)
    errorMessage.value = `Error al cargar los equipos: ${err.response?.data?.message || err.message}`
    showErrorModal.value = true
    teams.value = []
  } finally {
    loadingTeams.value = false
  }
}

async function fetchEvaluadorId() {
  const userString = localStorage.getItem('user')
  if (!userString) {
    throw new Error('Usuario no encontrado en el almacenamiento local.')
  }

  const user = JSON.parse(userString)
  const userId = user.id
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('Token de autenticación no encontrado.')
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/user/${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return response.data.id
  } catch (err) {
    console.error('Error fetching evaluador persona ID:', err.response?.data || err.message)
    throw new Error(
      `Error al obtener el ID del evaluador: ${err.response?.data?.message || err.message}`,
    )
  }
}

const toggleTeamDropdown = async () => {
  isTeamDropdownOpen.value = !isTeamDropdownOpen.value
  if (isTeamDropdownOpen.value) {
    await nextTick()
    if (teamSearchInputRef.value) {
      teamSearchInputRef.value.focus()
    }
  }
}

const selectTeam = (team) => {
  selectedTeamId.value = team.id
  teamSearchQuery.value = team.nombre
  isTeamDropdownOpen.value = false
}

const submitEvaluation = async () => {
  if (!selectedTeamId.value) {
    errorMessage.value = 'Por favor, selecciona un equipo para evaluar.'
    showErrorModal.value = true
    return
  }

  const rolEventoId = currentEventRoleId.value
  if (!rolEventoId) {
    errorMessage.value =
      'No se pudo obtener el rol del usuario para este evento. Por favor, recarga la página.'
    showErrorModal.value = true
    return
  }

  isSubmitting.value = true
  isFullPageLoading.value = true
  errorMessage.value = ''
  showErrorModal.value = false

  try {
    const evaluatorId = await fetchEvaluadorId()
    const token = localStorage.getItem('token')

    const evaluationPromises = Object.entries(evaluationScores.value).map(([criterioId, data]) => {
      const payload = {
        equipo_id: selectedTeamId.value,
        criterio_id: parseInt(criterioId),
        evaluador_id: evaluatorId,
        puntaje: data.score,
        comentarios: data.comment,
        rolEvento_id: rolEventoId,
      }
      console.log('Payload for evaluation:', payload)
      return axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/resultado-evaluacion`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    })

    await Promise.all(evaluationPromises)

    const rubricaPayload = {
      persona_id: evaluatorId,
      plantilla_id: props.plantilla.plantillaId,
      equipo_id: selectedTeamId.value,
    }
    await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/resultado-rubrica`, rubricaPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    emit('submit-evaluation', { success: true })
    close()
  } catch (err) {
    console.error('Error during evaluation submission:', err.message)
    errorMessage.value = `Error al guardar la evaluación: ${err.message}`
    showErrorModal.value = true
  } finally {
    isSubmitting.value = false
    isFullPageLoading.value = false
  }
}

const close = () => {
  emit('close')
}

const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fas fa-clipboard-check me-2 text-primary"></i>Evaluar Plantilla:
            {{ plantilla?.plantillaNombre }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        <div class="modal-body">
          <LoaderComponent v-if="loadingTeams || isFullPageLoading" />
          <div v-else>
            <div class="mb-4">
              <label for="teamSelect" class="form-label">Seleccionar Equipo a Evaluar:</label>
              <div class="custom-select-wrapper" :class="{ open: isTeamDropdownOpen }">
                <div class="selected-item" @click="toggleTeamDropdown">
                  <span>{{ selectedTeamName }}</span>
                  <i
                    class="fas fa-chevron-down dropdown-arrow"
                    :class="{ rotate: isTeamDropdownOpen }"
                  ></i>
                </div>
                <div class="options-container" v-if="isTeamDropdownOpen">
                  <input
                    type="text"
                    ref="teamSearchInputRef"
                    class="form-control search-input"
                    v-model="teamSearchQuery"
                    placeholder="Buscar equipo..."
                    @input="selectedTeamId = null"
                    @click.stop
                  />
                  <ul class="options-list">
                    <li v-if="filteredTeams.length === 0" class="option disabled">
                      No se encontraron equipos activos o que coincidan con la búsqueda.
                    </li>
                    <li
                      v-for="team in filteredTeams"
                      :key="team.id"
                      class="option"
                      :class="{ selected: selectedTeamId === team.id }"
                      @click="selectTeam(team)"
                    >
                      {{ team.nombre }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <hr />

            <h6 class="mb-3">
              <i class="fas fa-star-half-alt me-2 text-warning"></i>Calificación de Criterios:
            </h6>
            <div v-if="plantilla?.criterios && plantilla.criterios.length > 0">
              <div
                v-for="criterio in plantilla.criterios"
                :key="criterio.criterioId"
                class="mb-3 p-3 border rounded bg-light"
              >
                <p class="mb-1">
                  <strong
                    ><i class="fas fa-check-circle me-2 text-success"></i
                    >{{ criterio.criterioNombre }}</strong
                  >
                  (Peso: {{ criterio.criterioPeso }}%)
                </p>
                <p class="text-muted small mb-2">{{ criterio.criterioDescripcion }}</p>
                <div class="score-input-group">
                  <label class="form-label mb-0 me-2">Puntuación (0-5):</label>
                  <div class="score-radios">
                    <label
                      v-for="score in [0, 1, 2, 3, 4, 5]"
                      :key="score"
                      class="score-radio-label"
                    >
                      <input
                        type="radio"
                        :name="`score-${criterio.criterioId}`"
                        :value="score"
                        v-model.number="evaluationScores[criterio.criterioId].score"
                        class="score-radio-input"
                      />
                      <span class="score-circle">{{ score }}</span>
                    </label>
                  </div>
                </div>
                <div class="mt-2">
                  <label :for="`comment-${criterio.criterioId}`" class="form-label mb-0"
                    >Comentario (Opcional):</label
                  >
                  <textarea
                    :id="`comment-${criterio.criterioId}`"
                    class="form-control form-control-sm"
                    v-model="evaluationScores[criterio.criterioId].comment"
                    rows="2"
                  ></textarea>
                </div>
              </div>
            </div>
            <p v-else class="text-muted text-center">
              Esta plantilla no tiene criterios definidos para evaluar.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary animated-btn"
            @click="close"
            :disabled="isSubmitting"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary animated-btn"
            @click="submitEvaluation"
            :disabled="isSubmitting"
          >
            Guardar Evaluación
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorModal
    :show="showErrorModal"
    :message="errorMessage"
    @close="handleErrorModalClose"
    style="z-index: 1100"
  />
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-dialog {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 700px;
}

.modal-content {
  border: none;
}

.modal-header {
  background-color: #174384;
  color: #fff;
  border-bottom: 1px solid #14386b;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.btn-close {
  background-color: transparent;
  border: none;
  font-size: 1.5rem;
  color: #ffffff;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  border-top: 1px solid #e9ecef;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
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

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.form-label {
  font-weight: 600;
  color: #333;
}

.form-control,
.form-select {
  border-radius: 0.25rem;
}

.bg-light {
  background-color: #f8f9fa !important;
}

.badge {
  font-size: 0.85em;
  padding: 0.4em 0.7em;
}

.text-primary {
  color: #174384 !important;
}
.text-success {
  color: #28a745 !important;
}
.text-info {
  color: #17a2b8 !important;
}
.text-warning {
  color: #ffc107 !important;
}
.text-danger {
  color: #dc3545 !important;
}
.text-secondary {
  color: #6c757d !important;
}

.custom-select-wrapper {
  position: relative;
  width: 100%;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  background-color: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1.5;
  color: #495057;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
}

.custom-select-wrapper.open {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.selected-item {
  padding: 0.375rem 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-arrow {
  transition: transform 0.2s ease-in-out;
}

.dropdown-arrow.rotate {
  transform: rotate(180deg);
}

.options-container {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-top: none;
  border-radius: 0 0 0.25rem 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.175);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.search-input {
  width: calc(100% - 1.5rem);
  margin: 0.5rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 0.2rem;
  padding: 0.375rem 0.75rem;
}

.options-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option:hover {
  background-color: #f0f0f0;
}

.option.selected {
  background-color: #e9ecef;
  font-weight: 600;
}

.option.disabled {
  color: #6c757d;
  cursor: not-allowed;
  background-color: #f8f9fa;
}

.score-input-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.score-radios {
  display: flex;
  gap: 10px;
}

.score-radio-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.score-radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.score-circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #ced4da;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  background-color: #fff;
  transition: all 0.2s ease-in-out;
}

.score-radio-input:checked + .score-circle {
  background-color: #174384;
  border-color: #174384;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(23, 67, 132, 0.3);
}

.score-radio-label:hover .score-circle {
  border-color: #174384;
  box-shadow: 0 0 0 2px rgba(23, 67, 132, 0.2);
}
</style>
