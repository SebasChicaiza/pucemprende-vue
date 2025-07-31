import { defineStore } from 'pinia';
import axios from 'axios';

export const usePlantillasEvaluacionStore = defineStore('plantillas_evaluacion', {
  state: () => ({
    plantillasByEvent: {}, // Cache for projects: { eventId: [{ projectData, teamData }] }
    loading: false,
    error: null,
  }),
  actions: {
    async fetchPlantillasForEvent(eventId) {
      if (!eventId) {
        this.error = 'Event ID is required to fetch evaluation templates.';
        return;
      }

      // Check if data is already cached
      if (this.plantillasByEvent[eventId]) {
        console.log(`[Plantillas Store] Data for event ${eventId} found in cache. Using cached data.`);
        return; // Use cached data
      }

      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');

      if (!token) {
        this.error = 'Token de autenticación no encontrado para cargar plantillas de evaluación.';
        this.loading = false;
        return;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/procesos-evaluacion-detalle`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const allProcesosDetalle = response.data;
        // Filter processes relevant to the current eventId, ensuring type consistency
        const numericEventId = Number(eventId); // Convert eventId to a number for comparison
        console.log(`[Plantillas Store] Fetching for numericEventId: ${numericEventId}`);

        const relevantProcesos = allProcesosDetalle.filter(
          (proceso) => proceso.procesoEventoId === numericEventId
        );
        console.log(`[Plantillas Store] Filtered relevantProcesos for event ${numericEventId}:`, relevantProcesos);


        this.plantillasByEvent[eventId] = relevantProcesos; // Cache the filtered data
      } catch (err) {
        console.error('[Plantillas Store] Error fetching evaluation templates:', err.response?.data || err.message);
        this.error = `Error al cargar las plantillas de evaluación: ${err.response?.data?.message || err.message}`;
        this.plantillasByEvent[eventId] = []; // Ensure it's an empty array on error
      } finally {
        this.loading = false;
      }
    },
    clearPlantillas() {
      this.plantillasByEvent = {};
      this.error = null;
      console.log('[Plantillas Store] Cache cleared.');
    }
  },
  getters: {
    getPlantillasForEvent: (state) => (eventId) => {
      return state.plantillasByEvent[eventId] || [];
    },
    isLoadingPlantillas: (state) => state.loading,
    getPlantillasError: (state) => state.error,
  }
});
