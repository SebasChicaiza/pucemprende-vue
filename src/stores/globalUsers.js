// stores/globalUsers.js
import { defineStore } from 'pinia';
import axios from 'axios';

export const useGlobalUsersStore = defineStore('globalUsers', {
    state: () => ({
        users: [],
        loading: false,
        error: null,
        currentPage: 1,
        itemsPerPage: 10, // Default items per page
        totalUsersCount: 0,
        roles: [], // To store global roles if needed later
    }),
    getters: {
        totalPages: (state) => Math.ceil(state.totalUsersCount / state.itemsPerPage),
    },
    actions: {
        async fetchUsers() {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                this.users = [];
                this.totalUsersCount = 0;
                return false;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/usuario`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                // Assuming the API returns an array of user objects directly
                this.users = Array.isArray(response.data) ? response.data : [];
                this.totalUsersCount = this.users.length; // Update total count
                return true;
            } catch (err) {
                console.error('Error fetching global users:', err.response?.data || err.message);
                this.error = `Error al cargar usuarios globales: ${err.response?.data?.message || err.message}`;
                this.users = [];
                this.totalUsersCount = 0;
                return false;
            } finally {
                this.loading = false;
            }
        },

        async searchUserByIdentificacion(identificacion) {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                return null;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/usuario/${identificacion}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                // Assuming the API returns an array, even for a single result
                return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
            } catch (err) {
                console.error('Error searching user by identificacion:', err.response?.data || err.message);
                if (err.response && err.response.status === 404) {
                    this.error = `No se encontró ningún usuario con la identificación: ${identificacion}`;
                } else {
                    this.error = `Error al buscar usuario: ${err.response?.data?.message || err.message}`;
                }
                return null;
            } finally {
                this.loading = false;
            }
        },

        setCurrentPage(page) {
            this.currentPage = page;
        },

        setItemsPerPage(perPage) {
            this.itemsPerPage = perPage;
            this.currentPage = 1; // Reset to first page when items per page changes
        },

        // Placeholder for future API calls (e.g., update user status)
        async updateUserStatus(userId, newStatus) {
            // This will be implemented later
            console.log(`Simulating update for user ${userId} to status ${newStatus}`);
            // In a real scenario, you'd make a PUT/PATCH request here
            // For now, we'll simulate success and re-fetch users
            await this.fetchUsers();
            return true;
        },

        async fetchRoles() {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                this.roles = [];
                return false;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/rol`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                this.roles = Array.isArray(response.data) ? response.data : [];
                return true;
            } catch (err) {
                console.error('Error fetching roles:', err.response?.data || err.message);
                this.error = `Error al cargar roles: ${err.response?.data?.message || err.message}`;
                this.roles = [];
                return false;
            } finally {
                this.loading = false;
            }
        },
    },
});
