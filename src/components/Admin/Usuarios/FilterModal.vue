<script setup>
import { ref, watch, defineEmits, defineProps, computed } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  eventsOptions: {
    type: Array,
    default: () => []
  },
  rolesOptions: {
    type: Array,
    default: () => []
  },
  statusOptions: {
    type: Array,
    default: () => []
  },
  alumniOptions: { // Prop for alumni filter options
    type: Array,
    default: () => []
  },
  initialFilters: { // To pre-populate filters if they are already applied
    type: Object,
    default: () => ({ event: '', role: '', status: '', alumni: '' }) // Add alumni to initialFilters
  }
});

const emit = defineEmits(['close', 'apply-filters', 'clear-filters']);

// For 'Rol en el Evento' and 'Estado' (remain as simple selects)
const selectedRole = ref('');
const selectedStatus = ref('');
const selectedAlumni = ref(''); // Ref for alumni filter

// For 'Filtrar por Evento' (autocomplete input)
const eventSearchQuery = ref('');
const showEventSuggestions = ref(false); // Controls visibility of the suggestion list

// Watch for changes in initialFilters prop to update local refs
watch(() => props.initialFilters, (newFilters) => {
  eventSearchQuery.value = newFilters.event; // Initialize input with current filter
  selectedRole.value = newFilters.role;
  selectedStatus.value = newFilters.status;
  selectedAlumni.value = newFilters.alumni; // Initialize selectedAlumni
}, { immediate: true }); // Run immediately on component mount

// Computed property to filter event suggestions based on user input
const filteredEventOptions = computed(() => {
  if (!eventSearchQuery.value) {
    return props.eventsOptions; // If input is empty, show all options
  }
  const query = eventSearchQuery.value.toLowerCase();
  return props.eventsOptions.filter(event => event.toLowerCase().includes(query));
});

// Event handlers for the autocomplete input
const onEventInput = () => {
  showEventSuggestions.value = true;
};

const selectEventSuggestion = (event) => {
  eventSearchQuery.value = event; // Set input value to the selected suggestion
  showEventSuggestions.value = false; // Hide suggestions
};

const clearEventInput = () => {
  eventSearchQuery.value = ''; // Clear the input
  showEventSuggestions.value = false; // Hide suggestions
};

const onEventFocus = () => {
  showEventSuggestions.value = true;
};

// Use a click-outside listener to close suggestions when clicking elsewhere
const onClickOutsideEventAutocomplete = (event) => {
  const autocompleteWrapper = document.getElementById('event-autocomplete-wrapper');
  if (autocompleteWrapper && !autocompleteWrapper.contains(event.target)) {
    showEventSuggestions.value = false;
  }
};

// Attach/detach click-outside listener
watch(showEventSuggestions, (newVal) => {
  if (newVal) {
    document.addEventListener('click', onClickOutsideEventAutocomplete);
  } else {
    document.removeEventListener('click', onClickOutsideEventAutocomplete);
  }
});


const applyFilters = () => {
  emit('apply-filters', {
    event: eventSearchQuery.value, // Use eventSearchQuery as the filter value
    role: selectedRole.value,
    status: selectedStatus.value,
    alumni: selectedAlumni.value // Include alumni in applied filters
  });
  closeModal();
};

const clearFilters = () => {
  eventSearchQuery.value = ''; // Reset event filter
  selectedRole.value = '';
  selectedStatus.value = '';
  selectedAlumni.value = ''; // Clear alumni filter
  emit('clear-filters');
  closeModal();
};

const closeModal = () => {
  showEventSuggestions.value = false; // Ensure suggestions are hidden when closing modal
  emit('close');
};

// Reset selections when the modal is opened/closed to reflect initialFilters
watch(() => props.show, (newVal) => {
  if (newVal) {
    eventSearchQuery.value = props.initialFilters.event;
    selectedRole.value = props.initialFilters.role;
    selectedStatus.value = props.initialFilters.status;
    selectedAlumni.value = props.initialFilters.alumni; // Reset selectedAlumni on modal open
  }
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-filter"></i> Filtrar Usuarios</h2>
          <button class="close-button" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="filter-group">
            <label for="filter-event">Filtrar por Evento:</label>
            <div class="autocomplete-wrapper" id="event-autocomplete-wrapper">
              <div class="input-with-clear">
                <input
                  type="text"
                  id="filter-event"
                  v-model="eventSearchQuery"
                  @input="onEventInput"
                  @focus="onEventFocus"
                  placeholder="Escribe para buscar o seleccionar"
                />
                <button
                  v-if="eventSearchQuery"
                  class="clear-button"
                  @click="clearEventInput"
                >
                  &times;
                </button>
              </div>

              <ul v-if="showEventSuggestions && filteredEventOptions.length" class="suggestions-list">
                <li v-for="event in filteredEventOptions" :key="event" @click="selectEventSuggestion(event)">
                  {{ event }}
                </li>
              </ul>
            </div>
          </div>

          <div class="filter-group">
            <label for="filter-role">Filtrar por Rol en el Evento:</label>
            <select id="filter-role" v-model="selectedRole">
              <option value="">Todos los Roles</option>
              <option v-for="role in rolesOptions" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filter-status">Filtrar por Estado:</label>
            <select id="filter-status" v-model="selectedStatus">
              <option value="">Todos los Estados</option>
              <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>

          <!-- Alumni Filter Group -->
          <div class="filter-group">
            <label for="filter-alumni">Filtrar por Alumni:</label>
            <select id="filter-alumni" v-model="selectedAlumni">
              <option value="">Todos</option>
              <option v-for="option in alumniOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="clearFilters">Limpiar Filtros</button>
          <button class="btn btn-primary" @click="applyFilters">Aplicar Filtros</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Existing styles for modal-overlay, modal-content, modal-header, etc. */
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
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px 30px;
  border-radius: 10px;
  width: 450px;
  max-width: 90%;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
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
  font-size: 1.6rem;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
}

.close-button:hover {
  color: #666;
}

.modal-body {
  flex-grow: 1;
  margin-bottom: 20px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 0.95em;
}

.autocomplete-wrapper {
  position: relative;
}

.input-with-clear {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-group input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
  background-color: #f8f8f8;
  transition: border-color 0.2s, box-shadow 0.2s;
  padding-right: 30px;
}

.filter-group input[type="text"]:focus {
  border-color: #174384;
  box-shadow: 0 0 0 3px rgba(23, 67, 132, 0.2);
  outline: none;
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
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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

.filter-group select {
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
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-group select:focus {
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
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.btn-primary {
  background-color: #174384;
  color: white;
  border: 1px solid #174384;
}

.btn-primary:hover {
  background-color: #123466;
  border-color: #123466;
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

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
</style>
