<script setup>
import { defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 4000,
  },
});

const emit = defineEmits(['close']);

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      setTimeout(() => {
        emit('close');
      }, props.duration);
    }
  },
  { immediate: true }
);
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="mini-modal-overlay">
      <div class="mini-modal-content">
        <button class="close-button" @click="emit('close')">&times;</button>
        <div class="error-icon-circle">
          <i class="error-icon fas fa-times"></i>
        </div>
        <h3>¡Error!</h3>
        <p v-html="message"></p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Mini Modal Styles (from OkModal) */
.mini-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.mini-modal-content {
  position: relative;
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 300px;
  width: 90%;
}

/* Error Specific Styles */
.mini-modal-content h3 {
  color: #dc3545; /* Red for error */
  margin-top: 15px;
  margin-bottom: 10px;
}

.mini-modal-content p {
  color: #333;
  font-size: 0.9em;
}

/* Error Icon Animation (adapted from checkmark) */
.error-icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #dc3545; /* Red background */
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px auto;
  box-shadow: 0 2px 10px rgba(220, 53, 69, 0.4);
  animation: scaleIn 0.3s ease-out forwards;
}

.error-icon {
  color: white;
  font-size: 40px;
  transform: scale(0);
  animation: drawCross 0.4s ease-out 0.2s forwards; /* New animation for cross */
}

/* Keyframes (kept the same for fade-in effect) */
@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes drawCross {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #dc3545;
}
</style>
