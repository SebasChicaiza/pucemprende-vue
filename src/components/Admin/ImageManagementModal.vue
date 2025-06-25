<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Administrar Imágenes del Evento</h5>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <section class="mb-4">
            <h6 class="section-title">Imágenes actuales</h6>
            <div v-if="currentImages.length > 0" class="current-images-grid">
              <div
                v-for="image in currentImages"
                :key="image.id"
                class="image-thumbnail-wrapper"
              >
                <img :src="image.url" class="img-fluid rounded thumbnail-manage-img" :alt="'Imagen del evento'" />
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
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentImages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'delete-image', 'upload-images']);

const selectedFiles = ref([]);

watch(() => props.show, (newVal) => {
  if (!newVal) {
    selectedFiles.value = []; // Clear selected files when modal closes
  }
});

const handleFileChange = (event) => {
  selectedFiles.value = Array.from(event.target.files);
};

const uploadFiles = () => {
  if (selectedFiles.value.length > 0) {
    emit('upload-images', selectedFiles.value);
    selectedFiles.value = []; // Clear files after emitting
  }
};

const confirmDelete = (image) => {
  emit('delete-image', image);
};

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Slightly darker backdrop */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-dialog {
  background: #ffffff; /* White background for the modal content */
  border-radius: 10px; /* Softer corners */
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); /* Subtle shadow */
  width: 100%; /* Ensure it takes full width for responsive design */
  max-width: 700px; /* Max width for larger screens */
}

.modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa; /* Light grey header */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem; /* Slightly larger title */
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

.modal-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1.5rem; /* More padding */
  background-color: #fdfdfd; /* Off-white body background */
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 1rem;
  border-left: 4px solid #174384; /* Accent border */
  padding-left: 0.5rem;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: #5a6268;
  margin-bottom: 0.75rem;
}

.current-images-grid {
  display: grid; /* Use CSS Grid for better control */
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); /* Responsive grid */
  gap: 15px; /* Increased gap */
  justify-items: center; /* Center items in their grid cells */
}

.image-thumbnail-wrapper {
  position: relative;
  width: 100%; /* Take full width of grid cell */
  padding-bottom: 70%; /* Aspect ratio 100:70 for images */
  overflow: hidden;
  border: 2px solid #e9ecef; /* Lighter border */
  border-radius: 8px; /* Softer corners for thumbnails */
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); /* Very subtle shadow */
}

.image-thumbnail-wrapper:hover {
  border-color: #007bff; /* Primary color on hover */
  transform: translateY(-2px); /* Slight lift effect */
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

.delete-image-btn {
  position: absolute;
  top: 8px; /* Slightly adjusted position */
  right: 8px; /* Slightly adjusted position */
  background-color: rgba(220, 53, 69, 0.9); /* More opaque */
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px; /* Slightly larger button */
  height: 32px; /* Slightly larger button */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  transform: scale(0.8); /* Start smaller */
  cursor: pointer;
}

.image-thumbnail-wrapper:hover .delete-image-btn {
  opacity: 1;
  transform: scale(1); /* Grow to full size */
}

.delete-image-btn:hover {
  background-color: #c82333; /* Darker red on hover */
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
  background-color: #174384; /* Your primary brand color */
  border-color: #174384;
  font-weight: 600;
  padding: 0.6rem 1.2rem;
  border-radius: 0.375rem; /* Match Bootstrap's larger border-radius */
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  background-color: #14386b; /* Slightly darker on hover */
  border-color: #14386b;
  box-shadow: 0 4px 8px rgba(23, 67, 132, 0.2); /* Subtle shadow on hover */
}

.btn-primary:disabled {
  background-color: #aebacd; /* Lighter disabled state */
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
</style>
