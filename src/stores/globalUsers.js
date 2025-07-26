// stores/globalUsers.js
import { defineStore } from 'pinia';
import axios from 'axios';

export const useGlobalUsersStore = defineStore('globalUsers', {
    state: () => ({
        users: [],
        loading: false,
        error: null,
        currentPage: 1,
        itemsPerPage: 10,
        totalUsersCount: 0,
        roles: [],
        currentFilters: {
            role: '',
            status: '',
        },
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
                this.users = Array.isArray(response.data) ? response.data : [];
                this.totalUsersCount = this.users.length;
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

        async updateUser(userId, payload) {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                return false;
            }

            try {
                const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/usuario/${userId}`, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                await this.fetchUsers(); // Re-fetch all users to reflect changes
                return true;
            } catch (err) {
                console.error('Error updating user:', err.response?.data || err.message);
                this.error = `Error al actualizar usuario: ${err.response?.data?.message || err.message}`;
                return false;
            } finally {
                this.loading = false;
            }
        },

        // NEW ACTION: For deleting/deactivating a user via DELETE request
        async deleteUser(userId) {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                return false;
            }

            try {
                await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/usuario/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                await this.fetchUsers(); // Re-fetch all users to reflect changes
                return true;
            } catch (err) {
                console.error('Error deleting user:', err.response?.data || err.message);
                this.error = `Error al desactivar usuario: ${err.response?.data?.message || err.message}`;
                return false;
            } finally {
                this.loading = false;
            }
        },

        async updateUserStatus(userId, newStatus) {
            this.loading = true;
            this.error = null;
            const token = localStorage.getItem('token');

            if (!token) {
                this.error = 'Token de autenticación no encontrado.';
                this.loading = false;
                return false;
            }

            try {
                const estadoBorradoValue = newStatus; // True if 'Inactivo', False if 'Activo'
                const payload = { estado_borrado: estadoBorradoValue };

                const response = await axios.put(`${import.meta.env.VITE_URL_BACKEND}/api/usuario/${userId}`, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                await this.fetchUsers(); // Re-fetch all users to reflect changes
                return true;
            } catch (err) {
                console.error('Error updating user status:', err.response?.data || err.message);
                this.error = `Error al cambiar estado del usuario: ${err.response?.data?.message || err.message}`;
                return false;
            } finally {
                this.loading = false;
            }
        },

        setCurrentPage(page) {
            this.currentPage = page;
        },

        setItemsPerPage(perPage) {
            this.itemsPerPage = perPage;
            this.currentPage = 1;
        },

        async fetchRoles() {
            this.loading = true;
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

        setFilters(filters) {
            this.currentFilters = { ...filters };
        },
    },
});
