<script setup>
import { defineProps, defineEmits } from 'vue';

// Define props that the component will accept
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
    default: 4000, // Default duration of 2 seconds
  },
});

const emit = defineEmits(['close', 'hidden']);

import { watch } from 'vue';
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
        <div class="checkmark-circle">
          <i class="checkmark fas fa-check"></i>
        </div>
        <h3>¡Éxito!</h3>
        <p v-html="message"></p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>

/* Mini Modal Styles */
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
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 300px;
  width: 90%;
}

.mini-modal-content h3 {
  color: #28a745;
  margin-top: 15px;
  margin-bottom: 10px;
}

.mini-modal-content p {
  color: #333;
  font-size: 0.9em;
}

/* Checkmark Animation */
.checkmark-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #28a745;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px auto;
  box-shadow: 0 2px 10px rgba(40, 167, 69, 0.4);
  animation: scaleIn 0.3s ease-out forwards;
}

.checkmark {
  color: white;
  font-size: 40px;
  transform: scale(0);
  animation: drawCheck 0.4s ease-out 0.2s forwards;
}

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

@keyframes drawCheck {
  from {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0deg);
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

</style>
