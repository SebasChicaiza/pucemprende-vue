<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Administrar Imágenes del Evento</h5>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="closeModal"></button>
        </div>
        <ScrollBar :maxHeight="'60vh'">
          <div class="modal-body-content">
            <section class="mb-4">
              <h6 class="section-title">Imágenes actuales</h6>
              <div v-if="currentImages.length > 0" class="current-images-grid">
                <div
                  v-for="image in currentImages"
                  :key="image.id"
                  class="image-thumbnail-wrapper"
                >
                  <img :src="image.url" class="img-fluid rounded thumbnail-manage-img" :alt="image.name || 'Imagen del evento'" />
                  <button
                    class="btn btn-danger btn-sm delete-image-btn"
                    @click="confirmDelete(image)"
                    title="Eliminar imagen"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <p v-else class="text-muted text-center py-3">No hay imágenes actuales para este evento.</p>
            </section>

            <hr class="my-4">

            <section>
              <h6 class="section-title">Subir nuevas imágenes</h6>
              <div class="mb-3">
                <label for="imageUpload" class="form-label">
                  Selecciona uno o más archivos de imagen (JPG, PNG, GIF, SVG, WEBP, máx. 10MB c/u):
                </label>
                <input
                  type="file"
                  class="form-control"
                  id="imageUpload"
                  multiple
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml,image/webp"
                  @change="handleFileChange"
                >
              </div>

              <div v-if="newImagePreviews.length > 0" class="mt-3">
                  <h6 class="section-subtitle">Vista Previa de Nuevas Imágenes:</h6>
                  <div class="new-image-previews-grid">
                      <div v-for="(preview, index) in newImagePreviews" :key="index" class="image-thumbnail-wrapper">
                          <img :src="preview.url" class="img-fluid rounded thumbnail-manage-img" :alt="preview.name" />
                          <button class="btn btn-danger btn-sm delete-new-image-btn" @click="removeNewImage(index)">
                              <i class="fas fa-times"></i>
                          </button>
                      </div>
                  </div>
              </div>

              <div v-if="selectedFiles.length > 0" class="mt-3">
                <h6 class="section-subtitle">Archivos seleccionados:</h6>
                <ul class="list-group list-group-flush border rounded-3 overflow-auto" style="max-height: 150px;">
                  <li v-for="(file, index) in selectedFiles" :key="index" class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                    <span class="file-name text-truncate me-2">{{ file.name }}</span>
                    <span class="badge bg-secondary-subtle text-secondary rounded-pill fw-normal">{{ (file.size / 1024).toFixed(2) }} KB</span>
                  </li>
                </ul>
              </div>
              <button class="btn btn-primary mt-3 w-100" @click="uploadFiles" :disabled="selectedFiles.length === 0">
                <i class="fas fa-upload me-2"></i>Subir Imágenes Seleccionadas
              </button>
            </section>
          </div>
          <LoaderComponent v-if="isLoading" class="modal-loader-overlay"/>
        </ScrollBar>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import LoaderComponent from '@/components/LoaderComponent.vue';
import ScrollBar from '@/components/ScrollBar.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentImages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'delete-image', 'upload-images', 'images-uploaded-success']); // Added new event

const selectedFiles = ref([]);
const newImagePreviews = ref([]);

watch(() => props.show, (newVal) => {
  if (!newVal) {
    // Revoke all object URLs when the modal closes to prevent memory leaks
    newImagePreviews.value.forEach(preview => URL.revokeObjectURL(preview.url));
    selectedFiles.value = [];
    newImagePreviews.value = [];
  }
}, { immediate: true });

const handleFileChange = (event) => {
  // Revoke previous object URLs before creating new ones for selected files
  newImagePreviews.value.forEach(preview => URL.revokeObjectURL(preview.url));

  selectedFiles.value = Array.from(event.target.files);
  newImagePreviews.value = []; // Clear previous previews

  selectedFiles.value.forEach(file => {
    if (file.type.startsWith('image/')) {
      newImagePreviews.value.push({
        url: URL.createObjectURL(file),
        name: file.name
      });
    }
  });
  // Clear the input file element's value to allow re-selecting the same file(s)
  event.target.value = '';
};

const removeNewImage = (index) => {
    URL.revokeObjectURL(newImagePreviews.value[index].url); // Revoke URL for the removed preview
    newImagePreviews.value.splice(index, 1);
    selectedFiles.value.splice(index, 1);
};

const uploadFiles = () => {
  if (selectedFiles.value.length > 0) {
    emit('upload-images', selectedFiles.value);
    // DO NOT CLEAR selectedFiles and newImagePreviews here.
    // The parent component will handle the actual upload and then trigger a refresh.
    // The preview should remain until the upload is confirmed.
  }
};

// This function will be called by the parent after a successful upload
const clearUploadState = () => {
  selectedFiles.value = [];
  newImagePreviews.value.forEach(preview => URL.revokeObjectURL(preview.url));
  newImagePreviews.value = [];
};
defineExpose({ clearUploadState }); // Expose the function to the parent

const confirmDelete = (image) => {
  emit('delete-image', image);
};

const closeModal = () => {
  // Ensure cleanup happens when the modal is closed via the close button
  newImagePreviews.value.forEach(preview => URL.revokeObjectURL(preview.url));
  selectedFiles.value = [];
  newImagePreviews.value = [];
  emit('close');
};
</script>

<style scoped>
/* Your styles are unchanged */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.modal-dialog {
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 700px;
  position: relative;
}

.modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #343a40;
}

.btn-close {
  font-size: 1rem;
  color: #6c757d;
  opacity: 0.7;
}
.btn-close:hover {
  opacity: 1;
}

.modal-body-content {
  padding: 1.5rem;
  background-color: #fdfdfd;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 1rem;
  border-left: 4px solid #174384;
  padding-left: 0.5rem;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: #5a6268;
  margin-bottom: 0.75rem;
}

.current-images-grid, .new-image-previews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  justify-items: center;
}

.image-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 70%;
  overflow: hidden;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.image-thumbnail-wrapper:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.thumbnail-manage-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.delete-image-btn, .delete-new-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  transform: scale(0.8);
  cursor: pointer;
  z-index: 2;
}

.image-thumbnail-wrapper:hover .delete-image-btn,
.image-thumbnail-wrapper:hover .delete-new-image-btn {
  opacity: 1;
  transform: scale(1);
}

.delete-image-btn:hover, .delete-new-image-btn:hover {
  background-color: #c82333;
}

.form-label {
  font-weight: 500;
  color: #495057;
}

.form-control {
  border-radius: 0.25rem;
  border: 1px solid #ced4da;
  padding: 0.5rem 0.75rem;
}

.list-group-item {
  font-size: 0.9rem;
}

.file-name {
  color: #343a40;
}

.badge {
  padding: 0.4em 0.7em;
  font-size: 0.75em;
  font-weight: 600;
}

.btn-primary {
  background-color: #174384;
  border-color: #174384;
  font-weight: 600;
  padding: 0.6rem 1.2rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  background-color: #14386b;
  border-color: #14386b;
  box-shadow: 0 4px 8px rgba(23, 67, 132, 0.2);
}

.btn-primary:disabled {
  background-color: #aebacd;
  border-color: #aebacd;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  font-weight: 500;
  padding: 0.6rem 1.2rem;
  border-radius: 0.375rem;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #5a6268;
}

.modal-footer {
  border-top: 1px solid #e0e0e0;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: flex-end;
}

.modal-loader-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
</style>
