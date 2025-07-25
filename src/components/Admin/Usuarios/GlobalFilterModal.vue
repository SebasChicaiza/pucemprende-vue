<!-- components/Admin/Usuarios/GlobalFilterModal.vue -->
<script setup>
import { ref, watch, defineEmits, defineProps, onMounted, onUnmounted } from 'vue'
import { Modal } from 'bootstrap'

const props = defineProps({
  show: Boolean,
  rolesOptions: Array, // e.g., [{ id: 1, nombre: 'Admin' }, { id: 2, nombre: 'Usuario' }]
  statusOptions: Array, // e.g., ['Activo', 'Inactivo']
  initialFilters: Object, // { role: '', status: '' }
})

const emit = defineEmits(['close', 'apply-filters', 'clear-filters'])

const filterModalRef = ref(null)
let bsModal = null

const selectedRole = ref('')
const selectedStatus = ref('')

onMounted(() => {
  if (filterModalRef.value) {
    bsModal = new Modal(filterModalRef.value, { backdrop: 'static', keyboard: false })
    filterModalRef.value.addEventListener('hidden.bs.modal', () => emit('close'))
  }
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
    if (newVal) {
      bsModal?.show()
      // Initialize form fields with current filters from props
      selectedRole.value = props.initialFilters.role || ''
      selectedStatus.value = props.initialFilters.status || ''
    } else {
      bsModal?.hide()
    }
  },
)

const applyFilters = () => {
  emit('apply-filters', {
    role: selectedRole.value,
    status: selectedStatus.value,
  })
  // No need to call closeModal here, parent will handle it
}

const clearFilters = () => {
  selectedRole.value = ''
  selectedStatus.value = ''
  emit('clear-filters')
  // No need to call closeModal here, parent will handle it
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <div
      class="modal fade"
      tabindex="-1"
      aria-labelledby="globalFilterModalLabel"
      aria-hidden="true"
      ref="filterModalRef"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="globalFilterModalLabel">Filtrar Usuarios Globales</h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="applyFilters">
              <div class="mb-3">
                <label for="filterRole" class="form-label">Rol:</label>
                <select class="form-select" id="filterRole" v-model="selectedRole">
                  <option value="">Todos los roles</option>
                  <option v-for="role in rolesOptions" :key="role.id" :value="role.nombre">
                    {{ role.nombre }}
                  </option>
                </select>
              </div>
              <div class="mb-3">
                <label for="filterStatus" class="form-label">Estado:</label>
                <select class="form-select" id="filterStatus" v-model="selectedStatus">
                  <option value="">Todos los estados</option>
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="clearFilters">
              Limpiar Filtros
            </button>
            <button type="button" class="btn btn-primary" @click="applyFilters">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-title {
  font-weight: bold;
  color: #234e8f;
}
.form-label {
  font-weight: 500;
  color: #333;
}
.btn-primary {
  background-color: #174384;
  border-color: #174384;
}
.btn-primary:hover {
  background-color: #123466;
  border-color: #123466;
}
.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}
.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}
</style>
