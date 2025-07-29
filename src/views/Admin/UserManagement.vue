<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ScrollBar from '@/components/ScrollBar.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ErrorModal from '@/components/ErrorModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const showErrorModal = ref(false)
const errorMessage = ref('')

// --- Existing Modals State ---
const showOkModal = ref(false)
const okModalMessage = ref('')
const universalDeleteModalRef = ref(null)

// --- Dynamic Confirmation Modal State ---
const showConfirmationModal = ref(false) // Controls visibility of the dynamic modal
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')
const confirmModalCancelText = ref('Cancelar')

// Stores the callback function to execute when the dynamic confirmation is accepted
let onConfirmCallback = () => {}

// Placeholder functions for other modals
const handleOkModalClose = () => {
  showOkModal.value = false
}
const handleErrorModalClose = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}
const handleDeleteConfirmed = () => {
  universalDeleteModalRef.value.hide()
  okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'
  showOkModal.value = true
}

// --- Handlers for the dynamic ConfirmationModal's events ---
const handleDynamicConfirm = () => {
  onConfirmCallback() // Execute the stored callback
  showConfirmationModal.value = false // Hide the modal after confirmation
}

const handleDynamicCancel = () => {
  showConfirmationModal.value = false // Just hide the modal on cancel
}
</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <h1>Administracion de usuarios</h1>
      </div>
    </div>
  </div>

  <OkModal
    :show="showOkModal"
    :message="okModalMessage"
    :duration="1000"
    @close="handleOkModalClose"
  />

  <ConfirmationModal
    :show="showConfirmationModal"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :confirmText="confirmModalConfirmText"
    :cancelText="confirmModalCancelText"
    @confirm="handleDynamicConfirm"
    @cancel="handleDynamicCancel"
  />

  <DeleteModal
    ref="universalDeleteModalRef"
    :title="modalTitle"
    :message="modalMessage"
    :warning="modalWarning"
    :confirmButtonText="modalConfirmText"
    @confirmed="handleDeleteConfirmed"
  />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />
</template>
