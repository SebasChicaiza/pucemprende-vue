import { ref, computed } from 'vue'

// Cargar el usuario desde localStorage
export const user = ref(JSON.parse(localStorage.getItem('user')))

// Computed para verificar si es superadmin
export const isSuperAdmin = computed(() => user.value?.rol_id === 8)

// Puedes agregar más funciones aquí luego para permisos finos por rol:
export function tienePermiso(permiso) {
  // Aquí se podría validar contra una lista que venga desde la API de roles/permisos
  // Por ahora devuelves true si es superadmin
  if (isSuperAdmin.value) return true

  // lógica futura para otros roles
  return false
}
