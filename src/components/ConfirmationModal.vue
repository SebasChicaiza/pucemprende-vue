<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirmar Acción',
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Continuar',
  },
  cancelText: {
    type: String,
    default: 'Cancelar',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="confirmation-modal-overlay">
      <div class="confirmation-modal-content">
        <h3>{{ title }}</h3>
        <p v-html="message"></p>
        <div class="modal-actions">
          <button @click="handleCancel" class="btn btn-secondary">
            {{ cancelText }}
          </button>
          <button @click="handleConfirm" class="btn btn-primary">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>

.confirmation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 150;
}


.confirmation-modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 400px;
  width: 90%;
  transform: translateY(-20px);
  animation: slideIn 0.3s ease-out forwards;
  z-index: 1000;
}

.confirmation-modal-content h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.2em;
}

.confirmation-modal-content p {
  color: #555;
  margin-bottom: 25px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: bold;
}

.btn-primary {
  background-color: #174384;
  color: white;
  border: 1px solid #174384;
}

.btn-primary:hover {
  background-color: #123466;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: 1px solid #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
}


.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
