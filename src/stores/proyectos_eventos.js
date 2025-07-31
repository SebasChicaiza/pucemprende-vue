import { defineStore } from 'pinia';
import axios from 'axios';

export const useProyectosEventosStore = defineStore('proyectos_eventos', {
  state: () => ({
    projectsByEvent: {}, // Cache for projects: { eventId: [{ projectData, teamData }] }
    loading: false,
    error: null,
  }),
  actions: {
    async fetchProjectsAndTeams(eventId) {
      if (!eventId) {
        this.error = 'Event ID is required to fetch projects.';
        return;
      }

      // Check if data is already cached
      if (this.projectsByEvent[eventId]) {
        // console.log(`Projects for event ${eventId} found in cache.`);
        return; // Use cached data
      }

      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');

      if (!token) {
        this.error = 'Token de autenticación no encontrado para cargar proyectos.';
        this.loading = false;
        return;
      }

      try {
        // Fetch projects for the event
        const projectsResponse = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/proyecto/proyectosPorEvento/${eventId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const projectsData = projectsResponse.data.flat();
        const projectsWithTeams = [];

        for (const project of projectsData) {
          if (project.equipo_id) {
            try {
              const teamResponse = await axios.get(
                `${import.meta.env.VITE_URL_BACKEND}/api/equipos/${project.equipo_id}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              projectsWithTeams.push({
                ...project,
                team: teamResponse.data
              });
            } catch (teamErr) {
              console.warn(`Error fetching team ${project.equipo_id} for project ${project.id}:`, teamErr.response?.data || teamErr.message);
              projectsWithTeams.push({
                ...project,
                team: { nombre: 'Equipo no encontrado', estado_borrado: true }
              });
            }
          } else {
            projectsWithTeams.push({
              ...project,
              team: { nombre: 'Sin equipo asignado', estado_borrado: false }
            });
          }
        }
        this.projectsByEvent[eventId] = projectsWithTeams; // Cache the fetched data
      } catch (err) {
        console.error('Error fetching event projects:', err.response?.data || err.message);
        this.error = `Error al cargar los proyectos del evento: ${err.response?.data?.message || err.message}`;
        this.projectsByEvent[eventId] = []; // Ensure it's an empty array on error
      } finally {
        this.loading = false;
      }
    },
    clearProjects() {
      this.projectsByEvent = {};
      this.error = null;
    }
  },
  getters: {
    getProjectsForEvent: (state) => (eventId) => {
      return state.projectsByEvent[eventId] || [];
    },
    isLoadingProjects: (state) => state.loading,
    getProjectsError: (state) => state.error,
  }
});
