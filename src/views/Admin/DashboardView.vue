<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import * as XLSX from 'xlsx'

// ===== VARIABLES REACTIVAS =====
const loading = ref(false)
const showEventModal = ref(false)
const eventos = ref([])
const selectedEvento = ref(null)
const searchEvento = ref('')

// ===== FUNCIONES PARA OBTENER EVENTOS =====
const fetchEventos = async () => {
  try {
    loading.value = true
    const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    eventos.value = response.data
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    alert('Error al cargar los eventos')
  } finally {
    loading.value = false
  }
}

// ===== FILTRAR EVENTOS POR BÚSQUEDA =====
const eventosFiltrados = computed(() => {
  if (!searchEvento.value) return eventos.value
  return eventos.value.filter(evento =>
    evento.nombre.toLowerCase().includes(searchEvento.value.toLowerCase()) ||
    evento.descripcion?.toLowerCase().includes(searchEvento.value.toLowerCase())
  )
})

// ===== FUNCIONES PARA EL MODAL =====
const openEventModal = async () => {
  showEventModal.value = true
  if (eventos.value.length === 0) {
    await fetchEventos()
  }
}

const closeEventModal = () => {
  showEventModal.value = false
  selectedEvento.value = null
  searchEvento.value = ''
}

const selectEvento = (evento) => {
  selectedEvento.value = evento
}

// ===== FUNCIÓN PARA EXPORTAR RESULTADOS =====
const downloadResultadosAsExcel = (data, eventoNombre) => {
  // Mapear los datos para Excel
  const mappedData = data.map((item, index) => ({
    'Posición': item.ranking_evento || index + 1,
    'Evento ID': item.evento_id,
    'Nombre del Evento': item.nombre_evento,
    'Equipo ID': item.equipo_id,
    'Nombre del Equipo': item.nombre_equipo,
    'Total Evaluaciones': item.total_evaluaciones,
    'Promedio Puntaje': parseFloat(item.promedio_puntaje).toFixed(2),
    'Ranking en Evento': item.ranking_evento,
    'Fecha Exportación': new Date().toLocaleDateString('es-ES')
  }))

  // Crear hoja de Excel
  const worksheet = XLSX.utils.json_to_sheet(mappedData)

  // Ajustar ancho de columnas
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 12 },
    { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
  ]

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados Evaluación')

  // Nombre del archivo
  const fecha = new Date().toISOString().split('T')[0]
  const nombreArchivo = `resultados_${eventoNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${fecha}.xlsx`
  XLSX.writeFile(workbook, nombreArchivo)
}

// ===== FUNCIÓN PARA DESCARGAR RESULTADOS DEL EVENTO SELECCIONADO =====
const downloadSelectedEventResults = async () => {
  if (!selectedEvento.value) {
    alert('Por favor selecciona un evento')
    return
  }

  try {
    loading.value = true

    const response = await axios.get(
      `${import.meta.env.VITE_URL_BACKEND}/api/resultado-proceso-evaluacion/evento/${selectedEvento.value.id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    )

    if (response.data && response.data.length > 0) {
      downloadResultadosAsExcel(response.data, selectedEvento.value.nombre)
      closeEventModal()
      alert(`Resultados de "${selectedEvento.value.nombre}" descargados exitosamente`)
    } else {
      alert('No hay resultados de evaluación para este evento')
    }
  } catch (error) {
    console.error('Error al obtener resultados:', error)
    alert('Error al obtener los resultados del evento')
  } finally {
    loading.value = false
  }
}

// ===== CARGAR EVENTOS AL MONTAR EL COMPONENTE =====
onMounted(() => {
  // Los eventos se cargarán cuando se abra el modal
})
</script>

<template>
  <LoaderComponent v-if="loading" />

  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />

    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh">
      <PageHeaderRoute />

      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">

        <!-- ===== BOTÓN PARA DESCARGAR RESULTADOS ===== -->
        <div class="d-flex justify-content-end mb-3">
          <button
            @click="openEventModal"
            class="btn btn-success export-btn"
            :disabled="loading"
          >
            <i class="fas fa-download me-2"></i>
            {{ loading ? 'Cargando...' : 'Descargar Resultados por Evento' }}
          </button>
        </div>

        <!-- ===== IFRAME DE POWER BI ===== -->
        <iframe
          title="PUCEMPRENDE_PBI"
          width="100%"
          height="100%"
          src="https://app.powerbi.com/view?r=eyJrIjoiYmNiMTZlMTEtNjhiMS00YjViLThlMzctMjgwMTM5Y2MzM2M1IiwidCI6IjU0NDc0ZmIzLTYzNTktNDBjMS1iNzI2LTVkNTZhN2RkMjk3NiIsImMiOjR9"
          frameborder="0"
          allowFullScreen="true"
        ></iframe>
      </div>
    </div>
  </div>

  <!-- ===== MODAL PARA SELECCIONAR EVENTO ===== -->
  <div v-if="showEventModal" class="modal-overlay" @click.self="closeEventModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Seleccionar Evento</h3>
        <button @click="closeEventModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Buscador -->
        <div class="search-container mb-3">
          <input
            v-model="searchEvento"
            type="text"
            placeholder="Buscar evento por nombre..."
            class="form-control"
          >
          <i class="fas fa-search search-icon"></i>
        </div>

        <!-- Lista de eventos -->
        <div class="eventos-list">
          <div
            v-for="evento in eventosFiltrados"
            :key="evento.id"
            class="evento-item"
            :class="{ 'selected': selectedEvento?.id === evento.id }"
            @click="selectEvento(evento)"
          >
            <div class="evento-info">
              <h5>{{ evento.nombre }}</h5>
              <p class="evento-descripcion">{{ evento.descripcion || 'Sin descripción' }}</p>
              <small class="evento-fecha">
                <i class="fas fa-calendar me-1"></i>
                {{ new Date(evento.fecha_inicio).toLocaleDateString('es-ES') }} -
                {{ new Date(evento.fecha_fin).toLocaleDateString('es-ES') }}
              </small>
            </div>
            <div class="evento-check" v-if="selectedEvento?.id === evento.id">
              <i class="fas fa-check-circle"></i>
            </div>
          </div>
        </div>

        <!-- Mensaje si no hay eventos -->
        <div v-if="eventosFiltrados.length === 0" class="no-eventos">
          <i class="fas fa-calendar-times"></i>
          <p>No se encontraron eventos</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeEventModal" class="btn btn-secondary">
          Cancelar
        </button>
        <button
          @click="downloadSelectedEventResults"
          class="btn btn-primary"
          :disabled="!selectedEvento || loading"
        >
          <i class="fas fa-download me-2"></i>
          {{ loading ? 'Descargando...' : 'Descargar Resultados' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== ESTILOS PARA EL BOTÓN ===== */
.export-btn {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.export-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ===== ESTILOS PARA EL MODAL ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 5px;
  border-radius: 4px;
  transition: color 0.3s ease;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  flex-grow: 1;
  overflow-y: auto;
}

.search-container {
  position: relative;
}

.search-container input {
  padding-left: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 40px 10px 40px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.eventos-list {
  max-height: 300px;
  overflow-y: auto;
}

.evento-item {
  padding: 15px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.evento-item:hover {
  border-color: #007bff;
  background-color: #f8f9fa;
}

.evento-item.selected {
  border-color: #007bff;
  background-color: #e3f2fd;
}

.evento-info h5 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.evento-descripcion {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
}

.evento-fecha {
  color: #888;
  font-size: 12px;
}

.evento-check {
  color: #007bff;
  font-size: 20px;
}

.no-eventos {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-eventos i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #ddd;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-footer .btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: 1px solid #6c757d;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: 1px solid #007bff;
}

.btn-primary:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-header, .modal-body, .modal-footer {
    padding: 15px;
  }

  .evento-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .evento-check {
    align-self: flex-end;
    margin-top: 10px;
  }
}
</style>
