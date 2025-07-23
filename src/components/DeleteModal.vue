<template>
  <div
    class="modal fade"
    id="confirmationModal"
    tabindex="-1"
    aria-labelledby="confirmationModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="confirmationModalLabel">Confirmar Acción</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body text-center">
          <div class="alert-icon-container mb-3">
            <i class="fas fa-exclamation-triangle fa-3x text-warning animated-alert-icon"></i>
          </div>
          <p>{{ message }}</p>
          <p class="text-danger fw-bold">{{ warning }}</p>
        </div>
        <div class="modal-footer justify-content-center">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-danger" @click="confirmAction">
            <i class="fas fa-trash-alt me-2"></i>{{ confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { Modal } from 'bootstrap' // Import Bootstrap's Modal class

const props = defineProps({
  message: {
    type: String,
    default: '¿Estás seguro de realizar esta acción?',
  },
  warning: {
    type: String,
    default: '¡Esta acción no se puede deshacer!',
  },
  confirmButtonText: {
    type: String,
    default: 'Eliminar',
  },
})

const emit = defineEmits(['confirmed'])

let bsModal = null // Variable to hold the Bootstrap modal instance

const show = () => {
  if (!bsModal) {
    bsModal = new Modal(document.getElementById('confirmationModal'))
  }
  bsModal.show()
}

const hide = () => {
  if (bsModal) {
    bsModal.hide()
  }
}

const confirmAction = () => {
  emit('confirmed')
  hide()
}

// Expose show and hide methods to the parent component
defineExpose({ show, hide })
</script>

<style scoped>
.animated-alert-icon {
  animation: pulse-warning 1.5s infinite;
}

@keyframes pulse-warning {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  border-bottom: none;
}

.modal-footer {
  border-top: none;
}
</style>
