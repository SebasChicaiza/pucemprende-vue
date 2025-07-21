<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import OkModal from '@/components/OkModal.vue'
import ScrollBar from '@/components/ScrollBar.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue'; // Corrected import path if needed
import ErrorModal from '@/components/ErrorModal.vue';

const route = useRoute()
const router = useRouter() // Initialize useRouter
const loading = ref(false)

const showErrorModal = ref(false);
const errorMessage = ref('');

// Modals state (initialize these if they are used in the template, even if not fully implemented here)
const showOkModal = ref(false);
const okModalMessage = ref('');
const showReactivateConfirmModal = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const modalWarning = ref('');
const modalConfirmText = ref('');
const universalDeleteModalRef = ref(null); // Ref for DeleteModal

// Placeholder functions for modals (if they are called in the template)
const handleOkModalClose = () => { showOkModal.value = false; };
const handleErrorModalClose = () => { showErrorModal.value = false; errorMessage.value = ''; };
const handleReactivateConfirm = () => { /* Logic to reactivate */ showReactivateConfirmModal.value = false; okModalMessage.value = 'Evento reactivado con éxito (simulado)!'; showOkModal.value = true; };
const handleReactivateCancel = () => { showReactivateConfirmModal.value = false; };
const handleDeleteConfirmed = () => { /* Logic to delete */ universalDeleteModalRef.value.hide(); okModalMessage.value = 'Elemento eliminado con éxito (simulado)!'; showOkModal.value = true; };


// Function to navigate based on user selection
const selectUserManagementOption = (option) => {
  if (option === 'general') {
    // Navigate to the general user management route
    router.push("/admin/usuarios/generales"); // Replace 'AdminGeneralUsers' with your actual route name
  } else if (option === 'events') {
    // Navigate to the event user management route
    router.push("/admin/usuarios/eventos"); // Replace 'AdminEventUsers' with your actual route name
  }
};

</script>

<template>
  <LoaderComponent v-if="loading" />
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute/>
        <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
          <div class="user-management-container">
            <h2 class="section-main-title mb-4">Gestión de Usuarios</h2>
            <p class="section-description mb-5">
              En esta sección, puedes administrar los diferentes tipos de usuarios del sistema.
              Selecciona una opción a continuación para empezar a editar o visualizar la información de los usuarios.
            </p>

            <div class="row g-4 justify-content-center">
              <!-- Option 1: General System Users -->
              <div class="col-12 col-md-6 col-lg-5">
                <div class="user-option-card" @click="selectUserManagementOption('general')">
                  <div class="icon-wrapper mb-3">
                    <i class="fas fa-users fa-3x option-icon"></i>
                  </div>
                  <h3 class="option-title">Editar Usuarios Generales del Sistema</h3>
                  <p class="option-description">
                    Administra todos los usuarios registrados en la plataforma, incluyendo su información básica, roles y permisos globales.
                    Ideal para la gestión de administradores, moderadores y usuarios estándar del sistema.
                  </p>

                  <button class="btn btn-outline-primary mt-3">
                    Gestionar Usuarios <i class="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>

              <!-- Option 2: Event Users -->
              <div class="col-12 col-md-6 col-lg-5">
                <div class="user-option-card" @click="selectUserManagementOption('events')">
                  <div class="icon-wrapper mb-3">
                    <i class="fas fa-user-tag fa-3x option-icon"></i>
                  </div>
                  <h3 class="option-title">Editar Usuarios de Eventos</h3>
                  <p class="option-description">
                    Gestiona los usuarios específicamente asociados a eventos, como Staff, Jurado, Miembro, Mentor, Gestor y administradores
                     de eventos.
                    Enfocado en la administración de roles y datos relacionados con eventos específicos.
                  </p>
                  <button class="btn btn-outline-primary mt-3">
                    Gestionar Usuarios <i class="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>

  <OkModal :show="showOkModal" :message="okModalMessage" :duration="1000" @close="handleOkModalClose" />

  <ConfirmationModal :show="showReactivateConfirmModal" title="Reactivar Evento"
    message="¿Estás seguro de que quieres reactivar este evento? El evento volverá a estar visible y activo."
    confirmText="Sí, Reactivar" cancelText="Cancelar" @confirm="handleReactivateConfirm"
    @cancel="handleReactivateCancel" />

  <DeleteModal ref="universalDeleteModalRef" :title="modalTitle" :message="modalMessage" :warning="modalWarning"
    :confirmButtonText="modalConfirmText" @confirmed="handleDeleteConfirmed" />

  <ErrorModal :show="showErrorModal" :message="errorMessage" @close="handleErrorModalClose" />
</template>

<style scoped>
.user-management-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 0;
  text-align: center;
}

.section-main-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #174384; /* Deep blue for main title */
}

.section-description {
  font-size: 1.1rem;
  color: #6c757d;
  line-height: 1.6;
  max-width: 700px;
  margin: 0 auto 2.5rem auto;
}

.user-option-card {
  background-color: #ffffff;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%; /* Ensure cards have equal height */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}

.user-option-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #174384; /* Highlight border on hover */
}

.icon-wrapper {
  color: #174384; /* Icon color */
  margin-bottom: 1.5rem;
}

.option-icon {
  font-size: 4rem; /* Larger icons */
}

.option-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #343a40;
  margin-bottom: 1rem;
}

.option-description {
  font-size: 0.95rem;
  color: #6c757d;
  line-height: 1.5;
  flex-grow: 1; /* Allow description to take available space */
}

.btn-outline-primary {
  border-color: #174384;
  color: #174384;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 50px; /* Pill shape */
  transition: all 0.3s ease;
}

.btn-outline-primary:hover {
  background-color: #174384;
  color: #ffffff;
  transform: scale(1.05); /* Subtle grow effect */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .section-main-title {
    font-size: 2rem;
  }
  .section-description {
    font-size: 1rem;
  }
  .user-option-card {
    padding: 2rem;
  }
  .option-title {
    font-size: 1.4rem;
  }
  .option-icon {
    font-size: 3.5rem;
  }
}

@media (max-width: 576px) {
  .user-management-container {
    padding: 1rem;
  }
  .section-main-title {
    font-size: 1.8rem;
  }
  .section-description {
    font-size: 0.9rem;
  }
  .user-option-card {
    padding: 1.5rem;
  }
  .option-title {
    font-size: 1.2rem;
  }
  .option-icon {
    font-size: 3rem;
  }
}
</style>
