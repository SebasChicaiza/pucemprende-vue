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
    .map((e) => e.id) // Asegúrate que ese campo exista

}


const eventosUsuario = JSON.parse(localStorage.getItem('eventos')) || []

export function puedeEditarProyecto(proyecto) {
  const usuario = user.value
  if (!usuario || !proyecto) return false

  // Superadmin (rol_id: 8) puede todo
  if (usuario.rol_id === 8) return true

  // Verifica si el usuario es Gestor o AdminEvento en el evento del proyecto
  const tienePermisoEvento = eventosUsuario.some(
    (e) =>
      e.evento_id === proyecto.evento_id &&
      (e.rol_id === 2 || e.rol_id === 3) // Gestor o AdminEvento
  )

  if (tienePermisoEvento) return true

  // Verifica si es miembro del equipo y además líder (rol_id 1)
  const esLiderDeSuEquipo = proyecto.equipo?.some(
    (miembro) =>
      miembro.persona_id === usuario.persona_id && miembro.rol_id === 1
  )

  return esLiderDeSuEquipo
}




