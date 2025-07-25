<script setup>
import { ref, watch, defineEmits, defineProps } from 'vue';
import { Modal } from 'bootstrap'; // Assuming Bootstrap's Modal JS is used

const props = defineProps({
  show: Boolean,
  initialData: Object, // The user object to edit
  rolesOptions: Array, // Array of roles from the API
});

const emit = defineEmits(['close', 'edit-user']);

const editUserModalRef = ref(null);
let bsModal = null;

const userId = ref(null);
const userNombre = ref('');
const userApellido = ref('');
const editedEmail = ref('');
const editedRoleId = ref(null);

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (!bsModal) {
      bsModal = new Modal(editUserModalRef.value, { backdrop: 'static', keyboard: false });
    }
    bsModal.show();
    if (props.initialData) {
      userId.value = props.initialData.id;
      userNombre.value = props.initialData.nombre;
      userApellido.value = props.initialData.apellido;
      editedEmail.value = props.initialData.email;
      editedRoleId.value = props.initialData.rol_id;
    }
  } else {
    bsModal?.hide();
  }
});

const closeModal = () => {
  emit('close');
};

const handleEditConfirm = () => {
  emit('edit-user', {
    id: userId.value,
    email: editedEmail.value,
    rol_id: editedRoleId.value,
  });
  closeModal();
};
</script>

<template>
  <div class="modal fade" tabindex="-1" aria-labelledby="editGlobalUserModalLabel" aria-hidden="true" ref="editUserModalRef">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="editGlobalUserModalLabel">Editar Usuario: {{ userNombre }} {{ userApellido }}</h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleEditConfirm">
            <div class="mb-3">
              <label for="userEmail" class="form-label">Email</label>
              <input type="email" class="form-control" id="userEmail" v-model="editedEmail" required />
            </div>
            <div class="mb-3">
              <label for="userRole" class="form-label">Rol</label>
              <select class="form-select" id="userRole" v-model="editedRoleId" required>
                <option v-for="role in rolesOptions" :key="role.id" :value="role.id">
                  {{ role.nombre }}
                </option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn btn-primary" @click="handleEditConfirm">Guardar Cambios</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for this modal if necessary */
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
</style>
