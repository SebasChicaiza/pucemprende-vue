<script setup>
import { ref, watch, defineEmits, defineProps, computed, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'add',
  },
  initialData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'add-user', 'edit-user'])

const cedulaSearchQuery = ref('')
const foundPerson = ref(null)
const personSearchLoading = ref(false)
const personSearchError = ref(null)

const eventSearchQuery = ref('')
const allEvents = ref([])
const selectedEvent = ref(null) // This now holds the full event object
const eventSearchLoading = ref(false)
const eventSearchError = ref(null)
const showEventSuggestions = ref(false)

const selectedRole = ref('') // This holds the role ID
const allRoles = ref([]) // This holds full role objects
const rolesLoading = ref(false)
const rolesError = ref(null)

const assignmentId = ref(null)

const isSubmitting = ref(false)
const submissionError = ref(null)

const filteredEventOptions = computed(() => {
  if (!eventSearchQuery.value) {
    return allEvents.value
  }
  const query = eventSearchQuery.value.toLowerCase()
  return allEvents.value.filter((event) => event.nombre.toLowerCase().includes(query))
})

// --- API Calls ---

async function fetchPersonByCedula() {
  if (!cedulaSearchQuery.value.trim()) {
    foundPerson.value = null
    personSearchError.value = null
    return
  }

  personSearchLoading.value = true
  personSearchError.value = null
  foundPerson.value = null

  const token = localStorage.getItem('token')
  if (!token) {
    personSearchError.value = 'Token de autenticación no encontrado.'
    personSearchLoading.value = false
    return
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${cedulaSearchQuery.value.trim()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      foundPerson.value = response.data[0]
    } else {
      personSearchError.value = 'Persona no encontrada con esa cédula.'
    }
  } catch (err) {
    if (err.response && err.response.status === 404) {
      personSearchError.value = 'Persona no encontrada con esa cédula.'
    } else {
      personSearchError.value = `Error al buscar persona: ${err.response?.data?.message || err.message}`
    }
    console.error('Error fetching person by cedula:', err)
  } finally {
    personSearchLoading.value = false
  }
}

async function fetchAssignmentDetails(id) {
  personSearchLoading.value = true
  eventSearchLoading.value = true
  rolesLoading.value = true
  submissionError.value = null

  const token = localStorage.getItem('token')
  if (!token) {
    submissionError.value = 'Token de autenticación no encontrado.'
    personSearchLoading.value = false
    eventSearchLoading.value = false
    rolesLoading.value = false
    return
  }

  try {
    const assignmentResponse = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    const assignmentData = assignmentResponse.data
    assignmentId.value = assignmentData.id

    const personResponse = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/persona/${assignmentData.persona_id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    if (
      personResponse.data &&
      Array.isArray(personResponse.data) &&
      personResponse.data.length > 0
    ) {
      foundPerson.value = personResponse.data[0]
    } else if (personResponse.data && !Array.isArray(personResponse.data)) {
      foundPerson.value = personResponse.data
    } else {
      personSearchError.value = 'Detalles de persona no encontrados para la asignación.'
    }
    if (foundPerson.value) {
      cedulaSearchQuery.value = foundPerson.value.identificacion
    }

    const eventResponse = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/eventos/${assignmentData.evento_id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    selectedEvent.value = eventResponse.data
    eventSearchQuery.value = eventResponse.data.nombre

    selectedRole.value = assignmentData.rol_id
  } catch (err) {
    submissionError.value = `Error al cargar los detalles de la asignación: ${err.response?.data?.message || err.message}`
    console.error('Error fetching assignment details:', err)
  } finally {
    personSearchLoading.value = false
    eventSearchLoading.value = false
    rolesLoading.value = false
  }
}

async function fetchEventsForAutocomplete() {
  eventSearchLoading.value = true
  eventSearchError.value = null
  const token = localStorage.getItem('token')
  if (!token) {
    eventSearchError.value = 'Token de autenticación no encontrado.'
    eventSearchLoading.value = false
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    allEvents.value = response.data
  } catch (err) {
    eventSearchError.value = `Error al cargar eventos: ${err.response?.data?.message || err.message}`
    console.error('Error fetching events:', err)
  } finally {
    eventSearchLoading.value = false
  }
}

async function fetchRolesForSelect() {
  rolesLoading.value = true
  rolesError.value = null
  const token = localStorage.getItem('token')
  if (!token) {
    rolesError.value = 'Token de autenticación no encontrado.'
    rolesLoading.value = false
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/rolEvento`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    allRoles.value = response.data
  } catch (err) {
    rolesError.value = `Error al cargar roles: ${err.response?.data?.message || err.message}`
    console.error('Error fetching roles:', err)
  } finally {
    rolesLoading.value = false
  }
}

const onEventInput = () => {
  selectedEvent.value = null
  showEventSuggestions.value = true
}

const selectEventSuggestion = (event) => {
  eventSearchQuery.value = event.nombre
  selectedEvent.value = event // Store the full event object
  showEventSuggestions.value = false
}

const clearEventInput = () => {
  eventSearchQuery.value = ''
  selectedEvent.value = null
  showEventSuggestions.value = false
}

const onEventFocus = () => {
  showEventSuggestions.value = true
}

async function handleAction() {
  if (!foundPerson.value) {
    submissionError.value = 'Por favor, busca y selecciona una persona.'
    return
  }
  if (!selectedEvent.value) {
    submissionError.value = 'Por favor, selecciona un evento.'
    return
  }
  if (!selectedRole.value) {
    submissionError.value = 'Por favor, selecciona un rol.'
    return
  }

  isSubmitting.value = true
  submissionError.value = null

  const token = localStorage.getItem('token')
  if (!token) {
    submissionError.value = 'Token de autenticación no encontrado.'
    isSubmitting.value = false
    return
  }

  try {
    // Correctly construct the payload with direct IDs for the parent component
    const payloadToEmit = {
      persona_id: foundPerson.value.id,
      evento_id: selectedEvent.value.id,
      rol_id: selectedRole.value,
      // Include names for the parent's success message
      person_name: `${foundPerson.value.nombre} ${foundPerson.value.apellido}`,
      event_name: selectedEvent.value.nombre,
      role_name:
        allRoles.value.find((r) => r.id === selectedRole.value)?.nombre || 'Rol Desconocido',
    }

    if (props.mode === 'add') {
      // In add mode, we emit the payload to the parent
      emit('add-user', payloadToEmit)
    } else if (props.mode === 'edit') {
      emit('edit-user', {
        id: assignmentId.value,
        person: foundPerson.value, // Keep full object if editUserAssignment expects it
        event: selectedEvent.value, // Keep full object if editUserAssignment expects it
        role: allRoles.value.find((r) => r.id === selectedRole.value), // Keep full object
      })
    }
    closeModal()
  } catch (err) {
    submissionError.value = `Error al ${props.mode === 'add' ? 'asignar' : 'guardar'} rol: ${err.response?.data?.message || err.message}`
    console.error(`Error ${props.mode === 'add' ? 'adding' : 'editing'} user to event:`, err)
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  // Reset all fields when modal is closed
  cedulaSearchQuery.value = ''
  foundPerson.value = null
  personSearchError.value = null
  personSearchLoading.value = false

  eventSearchQuery.value = ''
  selectedEvent.value = null
  eventSearchError.value = null
  eventSearchLoading.value = false
  showEventSuggestions.value = false

  selectedRole.value = ''
  rolesError.value = null
  rolesLoading.value = false

  assignmentId.value = null

  isSubmitting.value = false
  submissionError.value = null

  emit('close')
}

onMounted(() => {
  fetchEventsForAutocomplete()
  fetchRolesForSelect()
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      // Clear fields and reset state when modal is opened for a fresh start
      cedulaSearchQuery.value = ''
      foundPerson.value = null
      personSearchError.value = null
      personSearchLoading.value = false

      eventSearchQuery.value = ''
      selectedEvent.value = null
      eventSearchError.value = null
      eventSearchLoading.value = false
      showEventSuggestions.value = false

      selectedRole.value = ''
      rolesError.value = null
      rolesLoading.value = false

      assignmentId.value = null

      isSubmitting.value = false
      submissionError.value = null

      // Fetch initial data if in edit mode
      if (props.mode === 'edit' && props.initialData && props.initialData.id) {
        fetchAssignmentDetails(props.initialData.id)
      }
    }
  },
)
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content add-user-modal">
        <div class="modal-header">
          <h2>
            <i class="fas fa-user-plus"></i>
            {{ props.mode === 'add' ? 'Añadir Usuario al Evento' : 'Editar Asignación de Usuario' }}
          </h2>
          <button class="close-button" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="add-user-grid">
            <div class="person-search-section">
              <h3>Buscar Persona</h3>
              <div class="form-group">
                <label for="cedula-search">Cédula:</label>
                <div class="input-with-button">
                  <input
                    type="text"
                    id="cedula-search"
                    v-model="cedulaSearchQuery"
                    placeholder="Ingrese la cédula"
                    @keyup.enter="fetchPersonByCedula"
                    :disabled="props.mode === 'edit'"
                  />
                  <button
                    @click="fetchPersonByCedula"
                    class="btn btn-search"
                    :disabled="personSearchLoading || props.mode === 'edit'"
                  >
                    <i v-if="personSearchLoading" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-search"></i>
                  </button>
                </div>
                <p v-if="personSearchError" class="error-message">{{ personSearchError }}</p>
              </div>

              <div v-if="foundPerson" class="found-person-card">
                <h4>Persona Encontrada:</h4>
                <p><strong>Nombre:</strong> {{ foundPerson.nombre }} {{ foundPerson.apellido }}</p>
                <p><strong>Cédula:</strong> {{ foundPerson.identificacion }}</p>
                <p><strong>Email:</strong> {{ foundPerson.email }}</p>
                <button
                  v-if="props.mode === 'add'"
                  @click="((foundPerson = null), (cedulaSearchQuery = ''))"
                  class="btn btn-clear-person"
                >
                  Limpiar Selección
                </button>
              </div>
              <p
                v-else-if="
                  !personSearchLoading && cedulaSearchQuery && !personSearchError && !foundPerson
                "
                class="info-message"
              >
                Presione Enter o el botón para buscar.
              </p>
            </div>

            <div class="event-role-selection-section">
              <h3>Asignar a Evento y Rol</h3>
              <div class="form-group">
                <label for="event-search">Evento:</label>
                <div class="autocomplete-wrapper" id="event-autocomplete-wrapper">
                  <div class="input-with-clear">
                    <input
                      type="text"
                      id="event-search"
                      v-model="eventSearchQuery"
                      @input="onEventInput"
                      @focus="onEventFocus"
                      placeholder="Buscar o seleccionar evento"
                      :disabled="eventSearchLoading || props.mode === 'edit'"
                    />
                    <button
                      v-if="eventSearchQuery && props.mode === 'add'"
                      class="clear-button"
                      @click="clearEventInput"
                    >
                      &times;
                    </button>
                  </div>
                  <p v-if="eventSearchError" class="error-message">{{ eventSearchError }}</p>
                  <ul
                    v-if="
                      showEventSuggestions &&
                      filteredEventOptions.length &&
                      eventSearchQuery &&
                      props.mode === 'add'
                    "
                    class="suggestions-list"
                  >
                    <li
                      v-for="event in filteredEventOptions"
                      :key="event.id"
                      @click="selectEventSuggestion(event)"
                    >
                      {{ event.nombre }}
                    </li>
                  </ul>
                  <p v-if="eventSearchLoading" class="loading-message">Cargando eventos...</p>
                </div>
                <div v-if="selectedEvent" class="selected-item-info">
                  <strong>Evento Seleccionado:</strong> {{ selectedEvent.nombre }}
                </div>
              </div>

              <div class="form-group">
                <label for="role-select">Rol en el Evento:</label>
                <select id="role-select" v-model="selectedRole" :disabled="rolesLoading">
                  <option value="">Selecciona un Rol</option>
                  <option v-for="role in allRoles" :key="role.id" :value="role.id">
                    {{ role.nombre }}
                  </option>
                </select>
                <p v-if="rolesError" class="error-message">{{ rolesError }}</p>
                <p v-if="rolesLoading" class="loading-message">Cargando roles...</p>
              </div>
            </div>
          </div>
          <p v-if="submissionError" class="error-message form-submission-error">
            {{ submissionError }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button
            class="btn btn-primary"
            @click="handleAction"
            :disabled="isSubmitting || !foundPerson || !selectedEvent || !selectedRole"
          >
            <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
            <span v-else>{{ props.mode === 'add' ? 'Asignar Rol' : 'Guardar Cambios' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Keep existing styles as is */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content.add-user-modal {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 1200px;
  max-width: 95%;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 2.2rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.close-button:hover {
  color: #666;
}

.modal-body {
  flex-grow: 1;
  margin-bottom: 20px;
}

.add-user-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.person-search-section,
.event-role-selection-section {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 10px;
  background-color: #f9f9f9;
}

.person-search-section h3,
.event-role-selection-section h3 {
  font-size: 1.3em;
  color: #174384;
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 0.95em;
}

.input-with-button {
  display: flex;
  gap: 10px;
}

.form-group input[type='text'] {
  flex-grow: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
  background-color: white;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-group input[type='text']:focus {
  border-color: #174384;
  box-shadow: 0 0 0 3px rgba(23, 67, 132, 0.2);
  outline: none;
}

.btn-search {
  background-color: #174384;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-search:hover:not(:disabled) {
  background-color: #123466;
}

.btn-search:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 0.85em;
  margin-top: 5px;
}

.info-message {
  color: #6c757d;
  font-size: 0.85em;
  margin-top: 5px;
}

.loading-message {
  color: #007bff;
  font-size: 0.85em;
  margin-top: 5px;
}

.found-person-card {
  background-color: #e6ffed;
  border: 1px solid #28a745;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.found-person-card h4 {
  color: #28a745;
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1em;
}

.found-person-card p {
  margin-bottom: 5px;
  font-size: 0.9em;
  color: #333;
}

.btn-clear-person {
  background-color: #ffc107;
  color: #333;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
  margin-top: 10px;
  transition: background-color 0.2s;
}

.btn-clear-person:hover {
  background-color: #e0a800;
}

.autocomplete-wrapper {
  position: relative;
}

.input-with-clear {
  position: relative;
  display: flex;
  align-items: center;
}

.clear-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.2em;
  color: #999;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.clear-button:hover {
  color: #666;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  border: 1px solid #ddd;
  border-top: none;
  background-color: white;
  z-index: 10;
  max-height: 150px;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 0 0 8px 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions-list li {
  padding: 10px 12px;
  cursor: pointer;
  color: #333;
  font-size: 0.95em;
}

.suggestions-list li:hover {
  background-color: #f0f0f0;
}

.selected-item-info {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #e7f5ff;
  border: 1px solid #007bff;
  border-radius: 6px;
  font-size: 0.9em;
  color: #333;
}

.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
  background-color: #f8f8f8;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23777777%22%20d%3D%22M287%2C197.3L159.3%2C69.6c-3.1-3.1-8.2-3.1-11.3,0l-127.7,127.7c-3.1,3.1-3.1,8.2,0,11.3s8.2,3.1,11.3,0l121-121l121,121C283.8,200.4,285.9,200.4,287,197.3z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-group select:focus {
  border-color: #174384;
  box-shadow: 0 0 0 3px rgba(23, 67, 132, 0.2);
  outline: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.btn-primary {
  background-color: #174384;
  color: white;
  border: 1px solid #174384;
}

.btn-primary:hover:not(:disabled) {
  background-color: #123466;
  border-color: #123466;
}

.btn-primary:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #555;
  border: 1px solid #ccc;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
  border-color: #bbb;
}

.form-submission-error {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .add-user-grid {
    grid-template-columns: 1fr;
  }
}
</style>
