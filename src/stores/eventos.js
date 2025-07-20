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
        }
    }
});
