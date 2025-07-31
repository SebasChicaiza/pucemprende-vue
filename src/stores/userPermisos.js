import { ref, computed } from 'vue'
import axios from 'axios'

export const user = ref(JSON.parse(localStorage.getItem('user')))
export const eventosPermitidos = ref([])

export async function cargarEventosPermitidos() {
  if (!user.value) return

  const token = localStorage.getItem('token')
  const { data } = await axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/evento-rol-persona/detalles`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  eventosPermitidos.value = data
    .filter(
      (e) =>
        !e.estado_borrado &&
        ['Gestor', 'AdminEvento'].includes(e.rol)
    )
    .map((e) => e.evento_id) // Asegúrate que ese campo exista
}
export function puedeEditarProyecto(proyecto) {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user?.rol_id === 8) return true // superadmin

  const eventosPermitidos = JSON.parse(localStorage.getItem('eventosPermitidos') || '[]')
  if (eventosPermitidos.includes(proyecto.evento_id)) return true

  return proyecto.equipo?.some(
    (miembro) => miembro.persona_id === user?.persona_id
  )
}
