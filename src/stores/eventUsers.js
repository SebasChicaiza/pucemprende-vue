import { defineStore } from 'pinia';
import axios from 'axios';

export const useEventUsersStore = defineStore('eventUsers', {
  state: () => ({
    users: [],
    loading: false,
    error: null,
    currentPage: 1,
    itemsPerPage: 10,
    totalUsersCount: 0,
    roles: [],
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/detalles`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        this.users = response.data.map((user) => ({
          ...user,
          status: user.estado_borrado ? 'Inactivo' : 'Activo',
        }));
        this.totalUsersCount = this.users.length;
        return true;
      } catch (err) {
        this.error = `Error al cargar los usuarios del evento: ${err.response?.data?.message || err.message}`;
        console.error('Error fetching event users:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async searchPersonByCedula(cedula) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return null;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/persona/cedula/${cedula}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data && response.data.length > 0) {
          return response.data[0];
        }
        return null;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          this.error = 'Persona no encontrada con la cédula especificada.';
        } else {
          this.error = `Error al buscar persona por cédula: ${err.response?.data?.message || err.message}`;
        }
        console.error('Error searching person by cedula:', err.response?.data || err.message);
        return null;
      } finally {
        this.loading = false;
      }
    },
    async deleteUserById(userId) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }

      try {
        await axios.delete(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${userId}/borrar`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const index = this.users.findIndex((user) => user.id === userId);
        if (index !== -1) {
          this.users[index].estado_borrado = true;
          this.users[index].status = 'Inactivo';
        }
        return true;
      } catch (err) {
        this.error = `Error al desactivar el usuario: ${err.response?.data?.message || err.message}`;
        console.error('Error deactivating user:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async activateUserById(userId) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }

      try {
        await axios.patch(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${userId}/activar`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const index = this.users.findIndex((user) => user.id === userId);
        if (index !== -1) {
          this.users[index].estado_borrado = false;
          this.users[index].status = 'Activo';
        }
        return true;
      } catch (err) {
        this.error = `Error al activar el usuario: ${err.response?.data?.message || err.message}`;
        console.error('Error activating user:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async addUserToEvent(person, event, role) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }

      try {
        const payload = {
          persona_id: person.id,
          evento_id: event.id,
          rol_id: role.id,
          estado_borrado: false,
        };

        await axios.post(`${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        await this.fetchUsers();

        return true;
      } catch (err) {
        this.error = `Error al asignar usuario al evento: ${err.response?.data?.message || err.message}`;
        console.error('Error adding user to event:', err);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async editUserAssignment(assignmentId, person, event, role) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }

      try {
        const payload = {
          persona_id: person.id,
          evento_id: event.id,
          rol_id: role.id,
        };

        await axios.put(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/${assignmentId}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        await this.fetchUsers();
        return true;
      } catch (err) {
        this.error = `Error al actualizar la asignación: ${err.response?.data?.message || err.message}`;
        console.error('Error editing user assignment:', err);
        return false;
      } finally {
        this.loading = false;
      }
    },
    setCurrentPage(page) {
      this.currentPage = page;
    },
    async fetchRoles() {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/rolEvento`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        this.roles = response.data;
        return true;
      } catch (err) {
        this.error = `Error al cargar roles: ${err.response?.data?.message || err.message}`;
        console.error('Error fetching roles:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async createRole(roleName) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_URL_BACKEND}/api/rolEvento`,
          { nombre: roleName },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        this.roles.push(response.data);
        return true;
      } catch (err) {
        this.error = `Error al crear rol: ${err.response?.data?.message || err.message}`;
        console.error('Error creating role:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async updateRole(roleId, newName) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }
      try {
        await axios.put(
          `${import.meta.env.VITE_URL_BACKEND}/api/rolEvento/${roleId}`,
          { nombre: newName },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const index = this.roles.findIndex((role) => role.id === roleId);
        if (index !== -1) {
          this.roles[index].nombre = newName;
        }
        return true;
      } catch (err) {
        this.error = `Error al actualizar rol: ${err.response?.data?.message || err.message}`;
        console.error('Error updating role:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async deleteRole(roleId) {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Token de autenticación no encontrado.';
        this.loading = false;
        return false;
      }
      try {
        await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/rolEvento/${roleId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        this.roles = this.roles.filter((role) => role.id !== roleId);
        return true;
      } catch (err) {
        if (err.response && err.response.status === 500) {
          this.error = 'El rol está asignado a una persona y no puede ser eliminado.';
        } else {
          this.error = `Error al eliminar rol: ${err.response?.data?.message || err.message}`;
        }
        console.error('Error deleting role:', err.response?.data || err.message);
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
