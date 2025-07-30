<script setup>
import Sidebar from '@/components/Admin/AdminSidebar.vue'
import PageHeaderRoute from '@/components/PageHeaderRoute.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const proyectoId = parseInt(route.params.id)

const titulo = ref('')
const descripcion = ref('')
const selectedEquipo = ref(null)
const equipos = ref([])
const logoImage = ref({ file: null, url: '', id: null })
const loading = ref(true)
const error = ref('')
const dynamicTitle = ref('Editar Proyecto')
const estado = ref('ACTIVO') // default

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const [
      { data: proyectos },
      { data: equiposData },
      { data: archivosProyecto },
      { data: archivos },
    ] = await Promise.all([
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/equipos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_URL_BACKEND}/api/archivos`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    equipos.value = equiposData.filter((e) => !e.estado_borrado)

    const proyecto = proyectos.find((p) => p.id === proyectoId)
    if (!proyecto) throw new Error('Proyecto no encontrado')

    titulo.value = proyecto.titulo
    descripcion.value = proyecto.descripcion
    selectedEquipo.value = proyecto.equipo_id
    estado.value = proyecto.estado

    // Logo
    const relacion = archivosProyecto.find((r) => r.proyecto_id === proyecto.id)
    const archivo = archivos.find((a) => a.id === relacion?.archivo_id && !a.estado_borrado)
    if (archivo) {
      logoImage.value.url = archivo.url
      logoImage.value.id = archivo.id
    }
  } catch (err) {
    console.error(err)
    error.value = 'Error al cargar el proyecto.'
  } finally {
    loading.value = false
  }
})

function onLogoChange(event) {
  const file = event.target.files[0]
  if (!file) return
  logoImage.value.file = file
  logoImage.value.url = URL.createObjectURL(file)
}
async function subirLogoProyecto(file, proyectoId) {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('Token no encontrado')
    return null
  }

  try {
    //  Subir el archivo (ya crea el registro en la tabla archivos)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.split('.')[0])
    formData.append('proyecto_id', proyectoId)

    const uploadResponse = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos/proyecto/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    console.log('Archivo subido:', uploadResponse.data)

    // Crear la relación en archivos-proyecto usando el ID devuelto
    const archivoId = uploadResponse.data.file.id // ID del archivo creado

    const relacionData = {
      proyecto_id: proyectoId,
      archivo_id: archivoId,
    }

    const relacionResponse = await axios.post(
      `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`,
      relacionData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    console.log('Relación proyecto-archivo creada:', relacionResponse.data)

    return {
      archivo: uploadResponse.data.file,
      relacion: relacionResponse.data,
    }
  } catch (err) {
    console.error('Error al subir y vincular el logo:', err.response?.data || err.message)
    alert('Error al subir el logo del proyecto.')
    return null
  }
}

async function submitEdicion() {
  const token = localStorage.getItem('token')
  if (!titulo.value || !descripcion.value || !selectedEquipo.value) {
    alert('Todos los campos son obligatorios.')
    return
  }

  try {
    loading.value = true

    // Actualizar el proyecto
    await axios.put(
      `${import.meta.env.VITE_URL_BACKEND}/api/proyecto/${proyectoId}`,
      {
        titulo: titulo.value,
        descripcion: descripcion.value,
        equipo_id: selectedEquipo.value,
        estado: estado.value,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )

    if (logoImage.value.file) {
      try {
        const relacionesResponse = await axios.get(
          `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        // Filtrar todas las relaciones de este proyecto
        const relacionesProyecto = relacionesResponse.data.data?.filter(
          (r) => r.proyecto_id === proyectoId,
        )

        for (const relacion of relacionesProyecto) {
          // 1. Eliminar la relación
          await axios.delete(
            `${import.meta.env.VITE_URL_BACKEND}/api/archivos-proyecto/${relacion.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          )

          // 2. Eliminar el archivo si existe
          if (relacion.archivo_id) {
            await axios.delete(
              `${import.meta.env.VITE_URL_BACKEND}/api/archivos/${relacion.archivo_id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            )
          }
        }

        console.log('Relaciones y archivos anteriores eliminados')
      } catch (deleteErr) {
        console.warn('Error eliminando logos anteriores:', deleteErr)
      }

      // Subir el nuevo logo y crear la nueva relación
      const resultado = await subirLogoProyecto(logoImage.value.file, proyectoId)
      if (resultado) {
        console.log('Logo actualizado exitosamente:', resultado)
      }
    }

    alert('Proyecto actualizado correctamente')
    router.push(`/admin/proyectos/${proyectoId}`)
  } catch (err) {
    console.error('Error completo:', err)
    console.error('Respuesta del servidor:', err.response?.data)

    if (err.response?.status === 403) {
      alert('No tienes permisos para actualizar este proyecto')
    } else if (err.response?.status === 404) {
      alert('Proyecto no encontrado')
    } else {
      alert('Error actualizando proyecto: ' + (err.response?.data?.message || err.message))
    }
  } finally {
    loading.value = false
  }
}
async function eliminarProyecto() {
  const confirmacion = confirm(
    '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.',
  )

  if (!confirmacion) return

  const token = localStorage.getItem('token')
  if (!token) {
    alert('Token no encontrado')
    return
  }

  try {
    loading.value = true

    await axios.delete(`${import.meta.env.VITE_URL_BACKEND}/api/proyecto/${proyectoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    alert('Proyecto eliminado correctamente.')
    router.push('/admin/proyectos')
  } catch (err) {
    console.error('Error eliminando proyecto:', err.response?.data || err.message)
    alert('No se pudo eliminar el proyecto.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="d-flex" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <div class="flex-grow-1 d-flex flex-column">
      <PageHeaderRoute :dynamicTitle="dynamicTitle" :currentRouteName="'ProyectoEditar'" />
      <div class="p-4 overflow-y-scroll flex-grow-1" style="height: calc(100vh - 60px)">
        <h3 class="mb-4">Editar Proyecto</h3>
        <button class="btn btn-danger" @click="eliminarProyecto">Eliminar Proyecto</button>
        <div class="card p-4">
          <div class="mb-3 text-center">
            <img v-if="logoImage.url" :src="logoImage.url" class="rounded-circle" width="80" />
            <input type="file" class="form-control mt-2" @change="onLogoChange" accept="image/*" />
          </div>

          <div class="mb-3">
            <label>Título</label>
            <input v-model="titulo" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label>Descripción</label>
            <textarea v-model="descripcion" class="form-control" rows="3"></textarea>
          </div>

          <div class="mb-3">
            <label>Equipo</label>
            <select v-model="selectedEquipo" class="form-select">
              <option value="" disabled>Selecciona un equipo</option>
              <option v-for="e in equipos" :key="e.id" :value="e.id">{{ e.nombre }}</option>
            </select>
          </div>
          <div class="mb-3">
            <label>Estado</label>
            <select v-model="estado" class="form-select">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          <button class="btn btn-primary" @click="submitEdicion">Guardar Cambios</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.btn-danger {
  margin-bottom: 1rem;
  width: 20rem;
}
</style>
