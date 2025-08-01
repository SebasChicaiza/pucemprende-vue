// stores/eventosInscritos.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useEventosInscritosStore = defineStore('eventosInscritos', {
  state: () => ({
    eventos: [], // array de evento_id
    cargado: false,
  }),

  actions: {
    async fetchEventosInscritos() {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/eventos-por-persona`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        this.eventos = res.data.map((e) => e.evento_id)
        console.log('Eventos inscritos cargados:', this.eventos)
        this.cargado = true
      } catch (error) {
        console.error('Error al cargar eventos inscritos:', error)
        this.eventos = []
      }
    },

    estaInscrito(eventoId) {
      return this.eventos.includes(eventoId)
    },
  },
})
