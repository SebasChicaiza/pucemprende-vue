// stores/eventos.js
import { defineStore } from 'pinia';
import axios from 'axios';

export const useEventosStore = defineStore('eventos', {
    state: () => ({
        events: [],
        totalEvents: 0,
        loading: false,
        error: null,
        currentPage: 1,
        itemsPerPage: 20,
        searchQuery: '',
        currentEventToEdit: null,
        allEventsList: [], // NEW: To store all events for filtering/autocomplete
        loadingAllEvents: false, // NEW: Loading state for fetching all events
        allEventsError: null, // NEW: Error state for fetching all events
    }),
    getters: {
        totalPages: (state) => Math.ceil(state.totalEvents / state.itemsPerPage),
    },
    actions: {
        async fetchEvents() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                this.events = [];
                this.totalEvents = 0;
                return;
            }

            this.loading = true;
            this.error = null;

            const offset = (this.currentPage - 1) * this.itemsPerPage;
            let url = `${import.meta.env.VITE_URL_BACKEND}/api/eventos/limit-offset?limit=${this.itemsPerPage}&offset=${offset}`;

            if (this.searchQuery) {
                url += `&search=${encodeURIComponent(this.searchQuery)}`;
            }

            try {
                const response = await axios.get(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                this.events = Array.isArray(response.data.data) ? response.data.data : [];
                this.totalEvents = typeof response.data.total === 'number' ? response.data.total : 0;
            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log('Solicitud cancelada:', err.message);
                    return;
                }
                if (err.response) {
                    console.error('Error del servidor (Axios):', err.response.data);
                    const errorMessage = err.response.data?.message || err.response.statusText || `HTTP Error ${err.response.status}`;
                    this.error = `Error al cargar los eventos: ${errorMessage}`;
                } else if (err.request) {
                    console.error('No se recibió respuesta del servidor (Axios):', err.request);
                    this.error = 'No se pudo conectar con el servidor. Verifique su conexión de red.';
                } else {
                    console.error('Error al configurar la solicitud (Axios):', err.message);
                    this.error = `Fallo en la solicitud: ${err.message}`;
                }
                this.events = [];
                this.totalEvents = 0;
            } finally {
                this.loading = false;
            }
        },

        // NEW ACTION: Fetch all events without pagination
        async fetchAllEventsForFilter() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.allEventsError = 'Token de autenticación no encontrado.';
                this.loadingAllEvents = false;
                this.allEventsList = [];
                return;
            }

            this.loadingAllEvents = true;
            this.allEventsError = null;

            try {
                // Assuming /api/eventos returns all events without pagination by default
                // If your backend requires a specific parameter for "all", adjust here.
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                this.allEventsList = Array.isArray(response.data) ? response.data : [];
            } catch (err) {
                console.error('Error fetching all events for filter:', err.response?.data || err.message);
                this.allEventsError = `Error al cargar todos los eventos: ${err.response?.data?.message || err.message}`;
                this.allEventsList = [];
            } finally {
                this.loadingAllEvents = false;
            }
        },

        async fetchEventDetailsForEdit(eventId) {
            const token = localStorage.getItem('token');
            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                return null;
            }

            this.loading = true;
            try {
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos-cronogramas/${eventId}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log('Detailed Event Data for Edit (from store):', response.data);
                this.currentEventToEdit = response.data;
                return response.data;
            } catch (err) {
                console.error('Error fetching detailed event for edit (from store):', err.response?.data || err.message);
                this.error = `Error al cargar detalles del evento: ${err.response?.data?.message || err.message}`;
                return null;
            } finally {
                this.loading = false;
            }
        },

        setCurrentPage(page) {
            this.currentPage = page;
        },

        setSearchQuery(query) {
            this.searchQuery = query;
        },

        clearCurrentEventToEdit() {
            this.currentEventToEdit = null;
        },

        // NUEVA ACCIÓN: Obtener los últimos eventos para la página de inicio
        async fetchUltimosEventos() {
            this.loadingAllEvents = true;
            this.allEventsError = null;

            try {
                // Usar el endpoint específico que ya tienes creado
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos/ultimos`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Últimos eventos obtenidos:', response.data);

                // Guardar los eventos en allEventsList para mantener consistencia con el store
                this.allEventsList = Array.isArray(response.data) ? response.data : [];
                return this.allEventsList;
            } catch (err) {
                console.error('Error fetching últimos eventos:', err.response?.data || err.message);
                this.allEventsError = `Error al cargar los últimos eventos: ${err.response?.data?.message || err.message}`;
                this.allEventsList = [];
                return [];
            } finally {
                this.loadingAllEvents = false;
            }
        },

        // NUEVA ACCIÓN: Obtener los próximos eventos para la página de eventos
        async fetchProximosEventos() {
            this.loading = true;
            this.error = null;

            try {
                // Usar el endpoint específico para próximos eventos
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/eventos/proximos`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Próximos eventos obtenidos:', response.data);
                
                // Guardar los eventos en events para la vista de eventos
                this.events = Array.isArray(response.data) ? response.data : [];
                this.totalEvents = this.events.length;
                return this.events;
            } catch (err) {
                console.error('Error fetching próximos eventos:', err.response?.data || err.message);
                this.error = `Error al cargar los próximos eventos: ${err.response?.data?.message || err.message}`;
                this.events = [];
                this.totalEvents = 0;
                return [];
            } finally {
                this.loading = false;
            }
        }
    }
});
