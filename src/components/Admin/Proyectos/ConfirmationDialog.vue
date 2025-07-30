<template>
  <div v-if="visible" class="modal-backdrop-custom">
    <div class="modal-content-custom">
      <div class="modal-header-custom">
        <h5 class="modal-title-custom">Confirmación</h5>
        <button class="close-btn-custom" @click="cancel">&times;</button>
      </div>
      <div class="modal-body-custom">
        <p>{{ message }}</p>
      </div>
      <div class="modal-footer-custom">
        <button class="btn btn-outline-secondary" @click="cancel">Cancelar</button>
        <button class="btn btn-danger" @click="confirm">Confirmar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: '¿Estás seguro de que quieres realizar esta acción?',
  },
})

const emit = defineEmits(['confirm', 'cancel'])

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Higher z-index to appear above other modals if any */
}

.modal-content-custom {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 400px;
  max-width: 90%;
  text-align: center;
}

.modal-header-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.modal-title-custom {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
}

.close-btn-custom {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn-custom:hover {
  color: #333;
}

.modal-body-custom {
  margin-bottom: 1.5rem;
}

.modal-body-custom p {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.modal-footer-custom {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-outline-secondary {
  background-color: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  color: white;
}
</style>
